
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Question, Difficulty } from "../types";

/**
 * Configuration for the Fallback Strategy.
 * This list strictly defines the order of attempts.
 */
interface FallbackConfig {
  model: string;
  apiKeyEnv: string;
  useSearch: boolean;
}

/**
 * Fallback order based on requirements:
 * 1. Gemini 3 (Key 1)
 * 2. Gemini 3 (Key 2)
 * 3. Gemini 2.5 (Key 1)
 * 4. Gemini 2.5 (Key 2)
 */
const FALLBACK_STRATEGY: FallbackConfig[] = [
  // Gemini 3 - Primary
  { model: 'gemini-3-pro-preview', apiKeyEnv: 'GEMINI_API_KEY_1', useSearch: true },
  // Gemini 3 - Secondary
  { model: 'gemini-3-pro-preview', apiKeyEnv: 'GEMINI_API_KEY_2', useSearch: true },
  // Gemini 2.5 - Primary
  { model: 'gemini-2.5-flash-lite-latest', apiKeyEnv: 'GEMINI_API_KEY_1', useSearch: true },
  // Gemini 2.5 - Secondary
  { model: 'gemini-2.5-flash-lite-latest', apiKeyEnv: 'GEMINI_API_KEY_2', useSearch: true },
  
  // Extra fallbacks including default API_KEY
  { model: 'gemini-3-pro-preview', apiKeyEnv: 'API_KEY', useSearch: true },
  { model: 'gemini-2.5-flash-lite-latest', apiKeyEnv: 'API_KEY', useSearch: true },
  
  // Non-search fallbacks (Higher reliability for JSON schema)
  { model: 'gemini-3-flash-preview', apiKeyEnv: 'API_KEY', useSearch: false },
  { model: 'gemini-2.5-flash-lite-latest', apiKeyEnv: 'API_KEY', useSearch: false },
];

/**
 * Utility to extract JSON from text that might contain markdown blocks
 */
function extractJSON(text: string): any {
  try {
    // Attempt direct parse
    return JSON.parse(text);
  } catch (e) {
    // Attempt markdown block extraction
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (innerE) {
        throw new Error("Found JSON block but failed to parse it.");
      }
    }
    throw new Error("Could not find valid JSON in the response.");
  }
}

/**
 * Core Fallback Execution Engine
 */
async function executeWithFallback<T>(
  taskLabel: string,
  executor: (ai: GoogleGenAI, config: FallbackConfig) => Promise<T>
): Promise<T> {
  let lastError: any = null;

  for (const config of FALLBACK_STRATEGY) {
    const apiKey = (process.env as any)[config.apiKeyEnv];
    
    // Skip if the specific environment variable is not set
    if (!apiKey) {
      console.debug(`[Fallback] Skipping ${config.apiKeyEnv} - Not configured.`);
      continue;
    }

    try {
      console.debug(`[Fallback] Attempting ${taskLabel} with ${config.model} (${config.apiKeyEnv})...`);
      const ai = new GoogleGenAI({ apiKey });
      return await executor(ai, config);
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      const message = error?.message || "Unknown error";
      
      console.warn(
        `[Fallback Warning] ${taskLabel} failed on ${config.model} via ${config.apiKeyEnv}. ` +
        `Error: ${status || 'N/A'} - ${message.substring(0, 100)}... ` +
        `Retrying next in sequence.`
      );
      
      // Continue to next strategy
      continue;
    }
  }

  console.error(`[Critical Error] All Gemini models exhausted for task: ${taskLabel}`);
  throw new Error("All Gemini models exhausted. The laboratory is temporarily offline due to high demand. Please try again in a few minutes.");
}

export async function generateQuizQuestions(topic: string, count: number = 15, difficulty: Difficulty = 'Medium'): Promise<Question[]> {
  const difficultyContext = {
    'Easy': 'Core definitions, drug names, and common pharmacy math.',
    'Medium': 'Clinical applications, drug-drug interactions, and standard Indian pharmacy laws.',
    'Hard': 'Complex clinical scenarios, detailed pharmacokinetics, and intricate D&C Act 1940 / Pharmacy Act 1948 regulations.'
  };

  const systemPrompt = `You are a Senior Pharmaceutical Examiner for Indian Government Exams (ESIC, RRB, GPAT). 
  Your task is to generate high-quality, scientifically accurate Multiple Choice Questions.
  - Context: Indian Pharmacopoeia and Indian drug regulations.
  - Accuracy: Ensure correct answers are verified.
  - Format: Return strictly JSON.`;

  const userPrompt = `Generate exactly ${count} MCQs on the topic: "${topic}".
  Difficulty Level: ${difficulty} (${difficultyContext[difficulty]}).
  
  Return an array of objects with the following schema:
  {
    "text": "The question string",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": index_of_correct_option_0_to_3,
    "explanation": "Brief scientific rationale for the correct answer",
    "distractorRationale": "Why common wrong choices are incorrect"
  }`;

  return await executeWithFallback("Generate Quiz", async (ai, config) => {
    const params: any = {
      model: config.model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
      }
    };

    // When not using search, we can use the strict JSON schema mode
    if (!config.useSearch) {
      params.config.responseMimeType = "application/json";
      params.config.responseSchema = {
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
          required: ["text", "options", "correctAnswer", "explanation", "distractorRationale"],
        }
      };
    } else {
      // With search, guidelines suggest not relying on JSON schema output
      params.config.tools = [{ googleSearch: {} }];
    }

    const response: GenerateContentResponse = await ai.models.generateContent(params);
    const text = response.text;
    
    if (!text) throw new Error("Empty response from AI");

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Reference Source",
        uri: chunk.web.uri
      }));

    const rawQuestions = extractJSON(text);
    if (!Array.isArray(rawQuestions)) throw new Error("AI did not return an array of questions.");

    return rawQuestions.map((q: any, idx: number) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`,
      topic: topic,
      sources: sources.length > 0 ? sources : undefined
    }));
  });
}

export interface DeepDiveResponse {
  explanation: string;
  suggestions: string[];
  sources?: { title: string; uri: string }[];
}

export async function getDetailedExplanation(question: string, selectedOption: string, correctOption: string): Promise<DeepDiveResponse> {
  const userPrompt = `A student studying for the Indian Pharmacist Exam had this question: "${question}". 
  The correct answer is "${correctOption}". The student chose "${selectedOption}".
  
  Please provide:
  1. A detailed explanation of why the correct answer is right and why the selected answer is wrong. Use Markdown formatting.
  2. A list of 2-3 related sub-topics for further study.
  
  Format the output as JSON:
  {
    "explanation": "Detailed markdown explanation",
    "suggestions": ["Topic 1", "Topic 2"]
  }`;

  return await executeWithFallback("Deep Dive", async (ai, config) => {
    const params: any = {
      model: config.model,
      contents: userPrompt,
      config: {
        systemInstruction: "You are a Pharmacy Professor. Provide clinical rationale and study guidance.",
      }
    };

    if (!config.useSearch) {
      params.config.responseMimeType = "application/json";
      params.config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["explanation", "suggestions"]
      };
    } else {
      params.config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent(params);
    const text = response.text;
    if (!text) throw new Error("Empty response");

    const result = extractJSON(text);
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Scientific Reference",
        uri: chunk.web.uri
      }));

    return {
      explanation: result.explanation || "Detailed analysis could not be generated.",
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      sources: sources.length > 0 ? sources : undefined
    };
  });
}
