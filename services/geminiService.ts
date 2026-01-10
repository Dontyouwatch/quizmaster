import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Question, Difficulty } from "../types";

/**
 * World-class Gemini Service for PharmaQuiz Pro
 * - Implements strict fallback: model sequence -> key sequence
 * - Resolves the Google Search + JSON mode 400 conflict
 * - Auto-discovers API keys from environment
 */

/** Utility to retrieve environment variables across different environments (Vite/Node/CF) */
function getEnvKey(key: string): string | undefined {
  try {
    // @ts-ignore - Vite envs
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) return import.meta.env[key];
    // @ts-ignore - Node/Process envs
    if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
  } catch (e) {}
  return undefined;
}

/** Auto-discovers GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc. prioritizing standard API_KEY */
function getAllAvailableKeys(): string[] {
  const keys: string[] = [];
  
  // 1. Primary key from system instructions
  const primary = getEnvKey('API_KEY');
  if (primary) keys.push(primary);

  // 2. Secondary/Fallback keys
  let i = 1;
  while (i < 10) {
    const k = getEnvKey(`GEMINI_API_KEY_${i}`);
    if (k && !keys.includes(k)) keys.push(k);
    i++;
  }

  // 3. Last resort check for process.env.API_KEY if not caught by getEnvKey
  if (keys.length === 0 && typeof process !== 'undefined' && process.env.API_KEY) {
    keys.push(process.env.API_KEY);
  }

  return keys;
}

/** 
 * Preferred working model list. 
 * 'gemini-3-flash-preview' is the high-performance default for text tasks.
 * 'gemini-2.0-flash-exp' is a reliable modern fallback.
 */
const FALLBACK_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.0-flash-exp',
  'gemini-3-pro-preview'
];

/** Execution wrapper that handles the model/key fallback logic */
async function executeWithPipeline<T>(
  task: (ai: GoogleGenAI, model: string) => Promise<T>
): Promise<T> {
  const keys = getAllAvailableKeys();
  if (keys.length === 0) {
    throw new Error("API configuration missing. Please ensure process.env.API_KEY is set.");
  }

  const errors: string[] = [];

  for (const model of FALLBACK_MODELS) {
    for (const key of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        return await task(ai, model);
      } catch (err: any) {
        const errorMsg = err.message || "Unknown error";
        console.warn(`[Pipeline] Failed ${model} with key ${key.slice(0, 6)}...: ${errorMsg}`);
        errors.push(`${model}: ${errorMsg}`);
      }
    }
  }

  throw new Error(`Service Congestion: All laboratory paths are busy. Final error: ${errors[errors.length - 1]}`);
}

/** Robust JSON extraction helper */
function parseJsonSafe(text: string | undefined): any {
  if (!text) throw new Error("Received empty response from AI");
  const trimmed = text.trim();
  
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // Attempt to extract from markdown blocks
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlock) {
      try {
        return JSON.parse(codeBlock[1].trim());
      } catch (inner) {}
    }
    
    // Brute force array/object search
    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      try {
        return JSON.parse(trimmed.substring(firstBracket, lastBracket + 1));
      } catch (inner) {}
    }
    
    throw new Error("The AI response could not be parsed as valid JSON.");
  }
}

/** Generates MCQ questions for specific pharmacy topics */
export async function generateQuizQuestions(
  topic: string, 
  count: number = 15, 
  difficulty: Difficulty = 'Medium'
): Promise<Question[]> {
  return executeWithPipeline(async (ai, model) => {
    const prompt = `Generate exactly ${count} Multiple Choice Questions (MCQs) for the topic: "${topic}" at ${difficulty} difficulty level. 
Context: Indian Government Pharmacist Exams (ESIC, RRB, GPAT, DHS). 
Output format: JSON array of objects.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Indian Pharmacy Exam content generator. Ensure high clinical accuracy and focus on the Indian pharmacy curriculum. Output valid JSON only.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              distractorRationale: { type: Type.STRING }
            },
            required: ["text", "options", "correctAnswer", "explanation", "distractorRationale"]
          }
        }
      }
    });

    const data = parseJsonSafe(response.text);
    return data.map((q: any, idx: number) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`,
      topic
    }));
  });
}

export interface DeepDiveResponse {
  explanation: string;
  suggestions: string[];
  sources?: { title: string; uri: string }[];
}

/** Provides a grounded, detailed clinical analysis */
export async function getDetailedExplanation(
  question: string, 
  selectedOption: string, 
  correctOption: string
): Promise<DeepDiveResponse> {
  return executeWithPipeline(async (ai, model) => {
    const prompt = `Perform a deep-dive pharmaceutical analysis for: "${question}". 
Compare Correct Answer: "${correctOption}" vs Selected Answer: "${selectedOption}".
Discuss mechanism of action, side effects, and clinical indications relevant to Indian Pharmacist exams.`;

    // CRITICAL: We avoid responseMimeType when using googleSearch to prevent the 400 conflict.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are a clinical pharmacy professor specializing in Indian competitive exams. Provide detailed Markdown explanations and extract key related topics.",
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "";
    const groundingChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[]) || [];
    const sources = groundingChunks
      .filter((chunk) => chunk.web)
      .map((chunk) => ({
        title: chunk.web?.title || "Scientific Reference",
        uri: chunk.web?.uri || "#"
      }));

    return {
      explanation: text,
      suggestions: [`Pharmacology of ${correctOption}`, "NLEM 2022 Guidelines", "Dose Calculations"],
      sources: sources.length > 0 ? sources : undefined
    };
  });
}