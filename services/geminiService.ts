
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Question, Difficulty } from "../types";

/**
 * World-class Gemini Service for PharmaQuiz Pro
 * Adheres to strict @google/genai guidelines.
 */

interface GroundingChunk {
  web?: {
    title?: string;
    uri: string;
  };
}

/**
 * Robust JSON extraction to handle model conversational filler and markdown blocks.
 */
function extractJSON(text: string): any {
  if (!text) throw new Error("Received empty response from AI");
  
  const trimmedText = text.trim();
  
  // 1. Direct parse
  try {
    return JSON.parse(trimmedText);
  } catch (e) {
    // 2. Try code blocks
    const match = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (innerE) {}
    }
    
    // 3. Brute force boundaries
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
    
    throw new Error("Invalid format received from AI. Please try again.");
  }
}

/**
 * Generates MCQs for specific Indian Pharmacist exam topics.
 */
export async function generateQuizQuestions(
  topic: string, 
  count: number = 15, 
  difficulty: Difficulty = 'Medium'
): Promise<Question[]> {
  // Fix: Obtained exclusively from process.env.API_KEY
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key configuration missing.");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Generate exactly ${count} Multiple Choice Questions (MCQs) for the topic: "${topic}" at ${difficulty} difficulty level. 
Target: Indian Government Pharmacist Exams (ESIC, RRB, GPAT, DHS).`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "You are an expert Indian Pharmacy Exam content generator. Ensure high clinical accuracy. Output valid JSON array.",
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      // Fix: Recommended way is to configure a responseSchema.
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

  const text = response.text;
  const groundingChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
  const sources = groundingChunks
    .filter((chunk) => chunk.web)
    .map((chunk) => ({
      title: chunk.web?.title || "Scientific Reference",
      uri: chunk.web?.uri || "#"
    }));

  const rawQuestions = extractJSON(text || "[]");
  return rawQuestions.map((q: any, idx: number) => ({
    ...q,
    id: `q-${Date.now()}-${idx}`,
    topic,
    sources: sources.length > 0 ? sources : undefined
  }));
}

export interface DeepDiveResponse {
  explanation: string;
  suggestions: string[];
  sources?: { title: string; uri: string }[];
}

/**
 * Provides an in-depth clinical analysis for a specific question.
 */
export async function getDetailedExplanation(
  question: string, 
  selectedOption: string, 
  correctOption: string
): Promise<DeepDiveResponse> {
  // Fix: Obtained exclusively from process.env.API_KEY
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key configuration missing.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Perform a deep-dive pharmaceutical analysis for: "${question}". 
Compare Correct: "${correctOption}" vs Selected: "${selectedOption}".`;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      // Fix: Recommended way is to configure a responseSchema.
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

  const result = extractJSON(response.text || "{}");
  const groundingChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]) || [];
  const sources = groundingChunks
    .filter((chunk) => chunk.web)
    .map((chunk) => ({
      title: chunk.web?.title || "Verification Source",
      uri: chunk.web?.uri || "#"
    }));

  return {
    explanation: result.explanation || "Detailed analysis currently unavailable.",
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    sources: sources.length > 0 ? sources : undefined
  };
}
