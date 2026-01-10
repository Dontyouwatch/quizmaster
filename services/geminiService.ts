
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question, Difficulty } from "../types";

/**
 * Configuration for the Fallback Strategy.
 */
interface FallbackConfig {
  model: string;
  apiKeyEnv: string;
  useSearch: boolean;
  displayLabel: string;
}

export interface FallbackStatus {
  label: string;
}

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
    apiKeyEnv: 'GEMINI_API_KEY_1', 
    useSearch: true, 
    displayLabel: 'API 1 → gemini-3' 
  },
  { 
    model: 'gemini-3-flash-preview', 
    apiKeyEnv: 'GEMINI_API_KEY_2', 
    useSearch: true, 
    displayLabel: 'API 2 → gemini-3' 
  },
  { 
    model: 'gemini-2.5-flash-lite-latest', 
    apiKeyEnv: 'GEMINI_API_KEY_1', 
    useSearch: true, 
    displayLabel: 'API 1 → gemini-2.5-latest' 
  },
  { 
    model: 'gemini-flash-lite-latest', 
    apiKeyEnv: 'GEMINI_API_KEY_2', 
    useSearch: true, 
    displayLabel: 'API 2 → gemini-flash-latest' 
  },
  { 
    model: 'gemini-3-flash-preview', 
    apiKeyEnv: 'API_KEY', 
    useSearch: false, 
    displayLabel: 'API 1 → Gemini fast' 
  },
];

/**
 * Enhanced Env Access: Cloudflare and Vite often require different access patterns.
 * We prioritize process.env but fall back to checking if the key is available globally.
 */
function getEnvKey(keyName: string): string | undefined {
  try {
    // 1. Standard process.env check
    if (typeof process !== 'undefined' && process.env && (process.env as any)[keyName]) {
      return (process.env as any)[keyName];
    }
    // 2. Vite specific import.meta.env check
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[keyName]) {
      return metaEnv[keyName];
    }
  } catch (e) {
    // Fallback if environment access throws
  }
  return undefined;
}

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
    const apiKey = getEnvKey(config.apiKeyEnv);
    
    // If specific key isn't found, try the primary API_KEY as a last resort for this tier
    const finalKey = apiKey || getEnvKey('API_KEY');

    if (!finalKey) {
      console.debug(`[Fallback] Skipping ${config.displayLabel} - No Key Found.`);
      continue;
    }

    attempts++;
    onStatusUpdate({ label: config.displayLabel });

    try {
      const ai = new GoogleGenAI({ apiKey: finalKey });
      return await executor(ai, config);
    } catch (error: any) {
      console.warn(`[Fallback] ${taskLabel} attempt ${attempts} failed (${config.displayLabel}). Error: ${error?.message}`);
      // Continue to next configuration
      continue;
    }
  }
  throw new Error("Service Congestion: All laboratory paths are busy. Please check your API keys or try again in 60 seconds.");
}

export async function generateQuizQuestions(
  topic: string, 
  count: number = 15, 
  difficulty: Difficulty = 'Medium',
  onStatusUpdate: (status: FallbackStatus) => void = () => {}
): Promise<Question[]> {
  // ULTRA-MINIMAL PROMPT for max speed
  const prompt = `Return ${count} MCQs for "${topic}" (${difficulty}). Indian Pharmacist Exam context. JSON: Array<{text, options:[4], correctAnswer:0-3, explanation, distractorRationale}>.`;

  return await executeWithFallback("Generate Quiz", onStatusUpdate, async (ai, config) => {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        systemInstruction: "Fast Indian Pharmacy MCQ Generator. Strict JSON.",
        tools: config.useSearch ? [{ googleSearch: {} }] : [],
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for speed
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
  const prompt = `Explain why "${correctOption}" is right and "${selectedOption}" is wrong for: "${question}". JSON: {explanation: string, suggestions: string[]}`;

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
        title: chunk.web.title || "Scientific Proof",
        uri: chunk.web.uri
      }));

    return {
      explanation: result.explanation || "Detailed analysis is loading...",
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      sources: sources.length > 0 ? sources : undefined
    };
  });
}
