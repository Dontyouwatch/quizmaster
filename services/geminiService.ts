
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question, Difficulty } from "../types";

/**
 * Configuration for the Fallback Strategy.
 */
interface FallbackConfig {
  model: string;
  getApiKey: () => string | undefined;
  useSearch: boolean;
  displayLabel: string;
}

export interface FallbackStatus {
  label: string;
}

/**
 * Vite requires STATIC access to environment variables (import.meta.env.VITE_...)
 * to replace them during the build process. Dynamic keys like env[varName] fail in production.
 */
const getViteKey = (name: string): string | undefined => {
  const env = (import.meta as any).env;
  
  // Explicitly mapping keys so Vite can see and replace them during build
  if (name === 'VITE_GEMINI_API_KEY_1') return env.VITE_GEMINI_API_KEY_1;
  if (name === 'VITE_GEMINI_API_KEY_2') return env.VITE_GEMINI_API_KEY_2;
  if (name === 'VITE_API_KEY') return env.VITE_API_KEY;
  
  // Fallback to process.env for local development / other environments
  try {
    return (process.env as any)[name];
  } catch (e) {
    return undefined;
  }
};

/**
 * Strict fallback order as requested:
 * 1. API 1 → gemini-3
 * 2. API 2 → gemini-3
 * 3. API 1 → gemini-2.5-latest
 * 4. API 2 → gemini-flash-latest
 * 5. API 1 → Gemini fast
 */
const FALLBACK_STRATEGY: FallbackConfig[] = [
  { 
    model: 'gemini-3-flash-preview', 
    getApiKey: () => getViteKey('VITE_GEMINI_API_KEY_1'), 
    useSearch: true, 
    displayLabel: 'API 1 → gemini-3' 
  },
  { 
    model: 'gemini-3-flash-preview', 
    getApiKey: () => getViteKey('VITE_GEMINI_API_KEY_2'), 
    useSearch: true, 
    displayLabel: 'API 2 → gemini-3' 
  },
  { 
    model: 'gemini-2.5-flash-lite', 
    getApiKey: () => getViteKey('VITE_GEMINI_API_KEY_1'), 
    useSearch: true, 
    displayLabel: 'API 1 → gemini-2.5-latest' 
  },
  { 
    model: 'gemini-flash-lite', 
    getApiKey: () => getViteKey('VITE_GEMINI_API_KEY_2'), 
    useSearch: true, 
    displayLabel: 'API 2 → gemini-flash-latest' 
  },
  { 
    model: 'gemini-3-flash-preview', 
    getApiKey: () => getViteKey('VITE_API_KEY') || getViteKey('VITE_GEMINI_API_KEY_1'), 
    useSearch: false, 
    displayLabel: 'API 1 → Gemini fast' 
  },
];

function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (innerE) {
        throw new Error("JSON parse error");
      }
    }
    throw new Error("No JSON found");
  }
}

async function executeWithFallback<T>(
  taskLabel: string,
  onStatusUpdate: (status: FallbackStatus) => void,
  executor: (ai: GoogleGenAI, config: FallbackConfig) => Promise<T>
): Promise<T> {
  let attempts = 0;
  for (const config of FALLBACK_STRATEGY) {
    const apiKey = config.getApiKey();
    
    if (!apiKey) {
      console.debug(`[Fallback] Skipping ${config.displayLabel} - Key not found.`);
      continue;
    }

    attempts++;
    onStatusUpdate({ label: config.displayLabel });

    try {
      const ai = new GoogleGenAI({ apiKey });
      return await executor(ai, config);
    } catch (error: any) {
      console.warn(`[Fallback] ${taskLabel} failed on ${config.displayLabel}: ${error?.message}`);
      // If it's a 404 or specific error, we definitely want to move to next
      continue;
    }
  }
  throw new Error("Service Congestion: All laboratory paths are busy. Ensure VITE_GEMINI_API_KEY_1 & VITE_GEMINI_API_KEY_2 are set in Cloudflare Settings and REDEPLOY your app.");
}

export async function generateQuizQuestions(
  topic: string, 
  count: number = 15, 
  difficulty: Difficulty = 'Medium',
  onStatusUpdate: (status: FallbackStatus) => void = () => {}
): Promise<Question[]> {
  const prompt = `Generate ${count} MCQs for "${topic}" (${difficulty}). Indian Pharmacist Exam. JSON Array format: [{text, options:[4], correctAnswer:0-3, explanation, distractorRationale}]`;

  return await executeWithFallback("Generate Quiz", onStatusUpdate, async (ai, config) => {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        systemInstruction: "You are a fast Pharmacy MCQ Generator. Output ONLY JSON.",
        tools: config.useSearch ? [{ googleSearch: {} }] : [],
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Reference",
        uri: chunk.web.uri
      }));

    const rawQuestions = extractJSON(text);
    return rawQuestions.map((q: any, idx: number) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`,
      topic,
      sources: sources.length > 0 ? sources : undefined
    }));
  });
}

export interface DeepDiveResponse {
  explanation: string;
  suggestions: string[];
  sources?: { title: string; uri: string }[];
}

export async function getDetailedExplanation(
  question: string, 
  selectedOption: string, 
  correctOption: string,
  onStatusUpdate: (status: FallbackStatus) => void = () => {}
): Promise<DeepDiveResponse> {
  const prompt = `Compare "${correctOption}" vs "${selectedOption}" for: "${question}". JSON: {explanation: string, suggestions: string[]}`;

  return await executeWithFallback("Deep Dive", onStatusUpdate, async (ai, config) => {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        tools: config.useSearch ? [{ googleSearch: {} }] : [],
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const result = extractJSON(response.text);
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Source",
        uri: chunk.web.uri
      }));

    return {
      explanation: result.explanation || "Analysis loading...",
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      sources: sources.length > 0 ? sources : undefined
    };
  });
}
