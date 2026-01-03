
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Difficulty } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateQuizQuestions(topic: string, count: number = 15, difficulty: Difficulty = 'Medium'): Promise<Question[]> {
  const difficultyContext = {
    'Easy': 'Focus on basic definitions, common drug names, and fundamental concepts. Questions should be straightforward.',
    'Medium': 'A balanced mix of theory, classifications, and clinical applications. Include some multi-step reasoning.',
    'Hard': 'Focus on complex clinical scenarios, rare side effects, intricate legal clauses of Indian Pharmacy Acts, and advanced pharmaceutical calculations. Questions should require deep subject matter expertise.'
  };

  const prompt = `Generate exactly ${count} professional multiple choice questions for the topic: "${topic}". 

  Difficulty Level: ${difficulty}.
  Context: ${difficultyContext[difficulty]}

  Target Audience: Candidates for Indian Government Pharmacist Exams (RRB, ESIC, GPAT, State PSC).
  
  Instructions:
  1. Use Google Search to verify the latest regulations, drug schedules, and clinical facts.
  2. Content: Focus on drug classifications, mechanisms, side effects, legal acts (India), and clinical calculations.
  3. Formatting: Use proper scientific names. 

  Return the data in a structured JSON format.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `You are an elite Pharmaceutical Exam Expert.
      
      CRITICAL ACCURACY RULES:
      1. SEARCH GROUNDING: You MUST use Google Search to verify every pharmaceutical fact, drug schedule (e.g., Schedule H, X, G), and Indian government regulation (Drugs and Cosmetics Act 1940) before providing the answer.
      2. ZERO HALLUCINATION: Only provide verified, high-yield content.
      3. CORRECT INDEX: Ensure the 'correctAnswer' index is 100% accurate.
      4. INDIAN CONTEXT: Focus on Indian CDSCO/DCI regulations.`,
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

  // Extract source links from grounding metadata
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
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to generate questions. Please try again.");
  }
}

export interface DeepDiveResponse {
  explanation: string;
  suggestions: string[];
  sources?: { title: string; uri: string }[];
}

export async function getDetailedExplanation(question: string, selectedOption: string, correctOption: string): Promise<DeepDiveResponse> {
  const prompt = `Act as an expert Pharmaceutical Chemistry and Pharmacology professor. 
  A student is confused by this question: "${question}".
  They chose "${selectedOption}" but the correct answer is "${correctOption}".
  
  Task:
  1. Use Google Search to provide an accurate Deep Dive explanation in MARKDOWN.
  2. Suggest 1-2 highly specific related topics.

  Return a JSON object.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are an academic expert providing depth to validated questions. Use Search Grounding to verify all clinical and legal claims.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING },
          suggestions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }
          }
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
    return {
      ...result,
      sources: sources.length > 0 ? sources : undefined
    };
  } catch (error) {
    console.error("Failed to parse Deep Dive response:", error);
    return {
      explanation: "Detailed explanation currently unavailable.",
      suggestions: []
    };
  }
}
