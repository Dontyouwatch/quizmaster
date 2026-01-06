
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Difficulty } from "../types";

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Ultra-robust utility to handle retries with exponential backoff + jitter.
 * Designed to survive heavy 429 rate limiting.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, initialDelay = 2000): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Extract status code from various possible locations in the error object
      const status = error?.status || error?.response?.status || error?.target?.status;
      const message = error?.message?.toLowerCase() || "";
      
      const isRateLimit = status === 429 || message.includes("429") || message.includes("too many requests");
      const isServerError = (status >= 500 && status <= 599) || message.includes("500") || message.includes("503");

      if (isRateLimit || isServerError) {
        // Exponential backoff: 2s, 4s, 8s, 16s... 
        // Plus random jitter (up to 1s) to desynchronize requests
        const jitter = Math.random() * 1000;
        const delay = (initialDelay * Math.pow(2, i)) + jitter;
        
        console.warn(`[API ${isRateLimit ? 'Rate Limit' : 'Server Busy'}] Attempt ${i + 1}/${maxRetries}. Retrying in ${Math.round(delay)}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's a 400, 401, or 403, it's not a temporary issue - throw immediately
      throw error;
    }
  }
  throw lastError;
}

export async function generateQuizQuestions(topic: string, count: number = 15, difficulty: Difficulty = 'Medium'): Promise<Question[]> {
  const difficultyContext = {
    'Easy': 'Core definitions and common drug names.',
    'Medium': 'Clinical applications and Indian regulations.',
    'Hard': 'Complex clinical scenarios and detailed pharmacy laws.'
  };

  const prompt = `Generate exactly ${count} pharmacist MCQs on: "${topic}". 
  Difficulty: ${difficulty}. (${difficultyContext[difficulty]})
  Format: JSON. Verify facts via Google Search for Indian Pharmacist Exam standards.`;

  return await withRetry(async () => {
    // Using 'gemini-2.5-flash-lite-latest' for maximum reliability and efficiency
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are an Indian Pharmacist Exam Expert. Use Google Search to ensure 100% accuracy for drug schedules and D&C Act 1940 regulations. No hallucinations.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              distractorRationale: { type: Type.STRING }
            },
            required: ["text", "options", "correctAnswer", "explanation", "distractorRationale"],
          }
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Source",
        uri: chunk.web.uri
      }));

    try {
      const rawQuestions = JSON.parse(response.text);
      return rawQuestions.map((q: any, idx: number) => ({
        ...q,
        id: `q-${Date.now()}-${idx}`,
        topic: topic,
        sources: sources.length > 0 ? sources : undefined
      }));
    } catch (error) {
      throw new Error("Failed to parse AI response. The laboratory data was corrupted.");
    }
  });
}

export interface DeepDiveResponse {
  explanation: string;
  suggestions: string[];
  sources?: { title: string; uri: string }[];
}

export async function getDetailedExplanation(question: string, selectedOption: string, correctOption: string): Promise<DeepDiveResponse> {
  const prompt = `Question: "${question}". Correct: "${correctOption}". Student chose: "${selectedOption}". Explain why in Markdown.`;

  return await withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a Pharmacology Professor. Provide verified clinical rationale.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["explanation", "suggestions"]
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Source",
        uri: chunk.web.uri
      }));

    try {
      const result = JSON.parse(response.text);
      return { ...result, sources: sources.length > 0 ? sources : undefined };
    } catch (error) {
      return { explanation: "Detailed explanation temporarily unavailable.", suggestions: [] };
    }
  });
}
