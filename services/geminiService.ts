
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
  
  Guidelines:
  1. Content: Focus on drug classifications, mechanisms, side effects, legal acts (India), and clinical calculations.
  2. Formatting: Use proper scientific names. 

  Return the data in a structured JSON format.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The MCQ question text." },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Four distinct options (A-D)."
            },
            correctAnswer: { 
              type: Type.INTEGER, 
              description: "Zero-based index (0-3)." 
            },
            explanation: { 
              type: Type.STRING, 
              description: "Brief professional explanation of the correct answer." 
            },
            distractorRationale: {
              type: Type.STRING,
              description: "Brief explanation of why the distractor options are incorrect or less appropriate."
            }
          },
          required: ["text", "options", "correctAnswer", "explanation", "distractorRationale"],
        }
      }
    }
  });

  try {
    const rawQuestions = JSON.parse(response.text);
    return rawQuestions.map((q: any, idx: number) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`,
      topic: topic
    }));
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to generate questions. Please try again.");
  }
}

export interface DeepDiveResponse {
  explanation: string;
  suggestions: string[];
}

export async function getDetailedExplanation(question: string, selectedOption: string, correctOption: string): Promise<DeepDiveResponse> {
  const prompt = `Act as an expert Pharmaceutical Chemistry and Pharmacology professor. 
  A student is confused by this question: "${question}".
  They chose "${selectedOption}" but the correct answer is "${correctOption}".
  
  Task:
  1. Provide a "Deep Dive" explanation in MARKDOWN.
  2. Suggest 1-2 highly specific related topics or questions the user might want to explore next.

  Explanation Structure:
  ### Deep Dive: [Concept Title]
  [Intro paragraph summarizing the core concept]
  
  #### 1. The Key Differentiator
  *   **[Correct Option Name]:** [Detailed Explanation]
  *   **[Selected Option Name]:** [Why it differs]
  
  #### 2. Mechanism / Legal Framework
  [A paragraph on foundation with bolding for receptors/acts.]
  
  #### 3. Verdict / Exam Tip
  **Verdict:** [Clear summary]

  Return a JSON object.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING, description: "The full markdown content." },
          suggestions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "1-2 suggested topics/questions."
          }
        },
        required: ["explanation", "suggestions"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse Deep Dive response:", error);
    return {
      explanation: "Detailed explanation currently unavailable.",
      suggestions: []
    };
  }
}
