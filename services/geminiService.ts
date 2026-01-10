
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
 * Strict fallback order:
 * 1. API 1 → gemini-3
 * 2. API 2 → gemini-3
 * 3. API 1 → gemini-2.5-latest
 * 4. API 2 → gemini-flash-latest
 * 5. API 1 → Gemini fast (System)
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
    model: 'gemini-2.5-flash-lite-latest', 
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
  for (const config of FALLBACK_STRATEGY) {
    const apiKey = (process.env as any)[config.apiKeyEnv];
    if (!apiKey) continue;

    onStatusUpdate({ label: config.displayLabel });

    try {
      const ai = new GoogleGenAI({ apiKey });
      return await executor(ai, config);
    } catch (error: any) {
      console.warn(`[Fallback] ${taskLabel} failed on ${config.displayLabel}. Error: ${error?.message}`);
      continue;
    }
  }
  throw new Error("All Gemini models exhausted. Please try again later.");
}

export async function generateQuizQuestions(
  topic: string, 
  count: number = 15, 
  difficulty: Difficulty = 'Medium',
  onStatusUpdate: (status: FallbackStatus) => void = () => {}
): Promise<Question[]> {
  // Minimized prompt for faster parsing and lower latency
  const prompt = `Return ${count} MCQs for "${topic}" (${difficulty}). 
  Region: India (ESIC/RRB/GPAT). 
  JSON: Array<{text, options:[4], correctAnswer:0-3, explanation, distractorRationale}>.`;

  return await executeWithFallback("Generate Quiz", onStatusUpdate, async (ai, config) => {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        systemInstruction: "You are an efficient MCQ generator for Indian Pharmacists. Use IP standards.",
        tools: config.useSearch ? [{ googleSearch: {} }] : [],
        responseMimeType: "application/json",
        // Disable thinking budget for maximum speed on flash models
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Source",
        uri: chunk.web.uri
      }));

    const rawQuestions = extractJSON(response.text);
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
  const prompt = `Explain "${correctOption}" vs "${selectedOption}" for: "${question}". JSON: {explanation, suggestions:[]}`;

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
        title: chunk.web.title || "Reference",
        uri: chunk.web.uri
      }));

    return {
      explanation: result.explanation || "Analysis unavailable.",
      suggestions: result.suggestions || [],
      sources: sources.length > 0 ? sources : undefined
    };
  });
}
