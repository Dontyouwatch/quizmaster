import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Question, Difficulty } from "../types";

/**
 * World-class Gemini Service for PharmaQuiz Pro
 */

export interface DeepDiveResponse {
  explanation: string;
  suggestions: string[];
  sources: { title: string; uri: string }[];
}

/**
 * Generates quiz questions for a specific topic and difficulty.
 */
export async function generateQuizQuestions(
  topic: string, 
  count: number = 15, 
  difficulty: Difficulty = 'Medium'
): Promise<Question[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please ensure process.env.API_KEY is configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-2.5-pro'; 
  
  const prompt = `Generate exactly ${count} Multiple Choice Questions (MCQs) for the topic: "${topic}" at ${difficulty} difficulty level. 
Context: Indian Government Pharmacist Exams (ESIC, RRB, GPAT, DHS). 
Output format: JSON array of objects. Include detailed explanations and rationale for distractors.`;
  
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

  try {
    const questions = JSON.parse(response.text);
    return questions.map((q: any, i: number) => ({
      ...q, id: `q-${Date.now()}-${i}`, topic
    }));
  } catch (e) {
    console.error("JSON Parse Error:", response.text);
    throw new Error("Failed to parse quiz data. The AI response was not in the expected format.");
  }
}

/**
 * Gets a detailed clinical explanation with search grounding.
 */
export async function getDetailedExplanation(
  question: string, 
  selectedOption: string, 
  correctOption: string
): Promise<DeepDiveResponse> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-pro-preview';

  const response = await ai.models.generateContent({
    model,
    contents: `Analyze the following pharmacist exam question: "${question}". 
The correct answer is "${correctOption}". Explain why this is correct and why the student's choice of "${selectedOption}" is clinically incorrect. 
Reference Indian Pharmacopoeia (IP) or NLEM guidelines if applicable.`,
    config: {
      systemInstruction: "You are a clinical pharmacy professor. Provide clear, professional, and cited explanations in Markdown format.",
      tools: [{ googleSearch: {} }]
    }
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter(c => c.web && c.web.uri)
    .map(c => ({ 
      title: c.web?.title || "Pharmacology Reference", 
      uri: c.web?.uri || "" 
    }));

  return {
    explanation: response.text || "No detailed analysis available.",
    suggestions: ["Mechanism of Action", "Adverse Drug Reactions", "Therapeutic Monitoring"],
    sources
  };
}
