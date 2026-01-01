
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index
  explanation: string;
  distractorRationale: string; // Brief explanation of why other options are wrong
  topic: string;
}

export interface QuizAttempt {
  id: string;
  date: string;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  difficulty: Difficulty;
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, number>;
  isFinished: boolean;
}

export enum ExamTopic {
  Pharmacology = "Pharmacology",
  Pharmaceutics = "Pharmaceutics",
  Pharmacognosy = "Pharmacognosy",
  PharmaceuticalAnalysis = "Pharmaceutical Analysis",
  Biochemistry = "Biochemistry",
  Microbiology = "Microbiology",
  HospitalPharmacy = "Hospital and Clinical Pharmacy",
  Jurisprudence = "Pharmaceutical Jurisprudence",
  Anatomy = "Human Anatomy & Physiology"
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface UserStats {
  totalAttempted: number;
  correctAnswers: number;
  topicMastery: Record<string, number>;
  attempts: QuizAttempt[];
}
