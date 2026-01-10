
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
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
  let value: string | undefined;
  
  if (name === 'VITE_GEMINI_API_KEY_1') value = env.VITE_GEMINI_API_KEY_1;
  else if (name === 'VITE_GEMINI_API_KEY_2') value = env.VITE_GEMINI_API_KEY_2;
  else if (name === 'VITE_API_KEY') value = env.VITE_API_KEY;
  
  // Fallback to process.env for local development / other environments
  if (!value) {
    try {
      value = (process.env as any)[name];
    } catch (e) {
      value = undefined;
    }
  }
  
  return value?.trim();
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
    model: 'gemini-2.5-flash-lite-latest', 
    getApiKey: () => getViteKey('VITE_GEMINI_API_KEY_1'), 
    useSearch: true, 
    displayLabel: 'API 1 → gemini-2.5-lite-latest' 
  },
  { 
    model: 'gemini-flash-lite-latest', 
    getApiKey: () => getViteKey('VITE_GEMINI_API_KEY_2'), 
    useSearch: true, 
    displayLabel: 'API 2 → gemini-flash-lite-latest' 
  },
  { 
    model: 'gemini-3-flash-preview', 
    getApiKey: () => getViteKey('VITE_API_KEY') || getViteKey('VITE_GEMINI_API_KEY_1'), 
    useSearch: false, 
    displayLabel: 'API 1 → Gemini fast' 
  },
];

/**
 * Improved JSON extraction to handle model conversational filler
 */
function extractJSON(text: string): any {
  if (!text) throw new Error("Received empty response from AI");
  
  const trimmedText = text.trim();
  
  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmedText);
  } catch (e) {
    // 2. Try to find content between triple backticks
    const match = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (innerE) {}
    }
    
    // 3. Last ditch effort: find the first '[' or '{' and last ']' or '}'
    const firstBracket = trimmedText.indexOf('[');
    const lastBracket = trimmedText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(trimmedText.substring(firstBracket, lastBracket + 1));
      } catch (innerE) {}
    }

    const firstBrace = trimmedText.indexOf('{');
    const lastBrace = trimmedText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmedText.substring(firstBrace, lastBrace + 1));
      } catch (innerE) {}
    }
    
    console.error("Failed to parse AI response as JSON:", text);
    throw new Error("Invalid format received from AI. Please try generating again.");
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
      console.warn(`[Fallback] Tier ${attempts + 1} (${config.displayLabel}): API Key not found.`);
      attempts++;
      continue;
    }

    attempts++;
    onStatusUpdate({ label: config.displayLabel });

    try {
      const ai = new GoogleGenAI({ apiKey });
      return await executor(ai, config);
    } catch (error: any) {
      const status = error?.status || error?.code;
      const message = error?.message || 'Unknown error';
      
      console.error(`[Fallback] ${taskLabel} failed on ${config.displayLabel}. Status: ${status}. Error: ${message}`);
      
      // If we're on the last attempt, don't sleep, just exit
      if (attempts < FALLBACK_STRATEGY.length) {
        // Small delay between retries to mitigate rate limits
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      continue;
    }
  }
  
  throw new Error("Service Congestion: All laboratory paths are busy. Please verify your VITE_GEMINI_API_KEY_1 and VITE_GEMINI_API_KEY_2 are correctly set in Cloudflare and that you have triggered a new deployment after saving them.");
}

export async function generateQuizQuestions(
  topic: string, 
  count: number = 15, 
  difficulty: Difficulty = 'Medium',
  onStatusUpdate: (status: FallbackStatus) => void = () => {}
): Promise<Question[]> {
  const prompt = `Generate exactly ${count} Multiple Choice Questions (MCQs) for the topic: "${topic}" at ${difficulty} difficulty level. 
Context: Indian Government Pharmacist Exams (ESIC, RRB, GPAT). 

Return ONLY a JSON array of objects with this structure:
[
  {
    "text": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed scientific rationale",
    "distractorRationale": "Why other options are incorrect"
  }
]`;

  return await executeWithFallback("Generate Quiz", onStatusUpdate, async (ai, config) => {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Indian Pharmacy Exam content generator. You provide high-quality, scientifically accurate MCQs in valid JSON format only.",
        tools: config.useSearch ? [{ googleSearch: {} }] : [],
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No response candidates returned from model");
    }

    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = (groundingChunks as any[])
      .filter((chunk) => chunk.web)
      .map((chunk) => ({
        title: chunk.web.title || "Scientific Reference",
        uri: chunk.web.uri
      }));

    const rawQuestions = extractJSON(text);
    if (!Array.isArray(rawQuestions)) {
      throw new Error("AI returned an object instead of a list of questions.");
    }

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
  const prompt = `Provide a deep-dive pharmaceutical analysis comparing the correct answer "${correctOption}" with the selected answer "${selectedOption}" for the question: "${question}". 
Return a JSON object: {"explanation": "detailed markdown string", "suggestions": ["Related Topic 1", "Related Topic 2"]}`;

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
    const sources = (groundingChunks as any[])
      .filter((chunk) => chunk.web)
      .map((chunk) => ({
        title: chunk.web.title || "Scientific Verification",
        uri: chunk.web.uri
      }));

    return {
      explanation: result.explanation || "Detailed analysis is unavailable at this moment.",
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      sources: sources.length > 0 ? sources : undefined
    };
  });
}
