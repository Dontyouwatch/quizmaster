import { ExamTopic } from './types';

export const TOPICS_METADATA = [
  {
    id: ExamTopic.Pharmacology,
    name: "Pharmacology",
    description: "Drug action, mechanisms, and clinical therapeutics.",
    icon: "💊",
    color: "bg-blue-500"
  },
  {
    id: ExamTopic.Pharmaceutics,
    name: "Pharmaceutics",
    description: "Formulation, dosage forms, and manufacturing.",
    icon: "🧪",
    color: "bg-green-500"
  },
  {
    id: ExamTopic.Jurisprudence,
    name: "Jurisprudence",
    description: "Pharmacy Act, D&C Act, and ethics in India.",
    icon: "⚖️",
    color: "bg-purple-500"
  },
  {
    id: ExamTopic.HospitalPharmacy,
    name: "Hospital Pharmacy",
    description: "Clinical practice, distribution, and ICU pharmacy.",
    icon: "🏥",
    color: "bg-red-500"
  },
  {
    id: "DSBM",
    name: "DSBM",
    description: "Drug Store and Business Management for Pharmacists.",
    icon: "📈",
    color: "bg-cyan-500"
  },
  {
    id: "CommunityPharmacy",
    name: "Community Pharmacy",
    description: "Patient counseling and retail pharmacy management.",
    icon: "🤝",
    color: "bg-pink-500"
  },
  {
    id: ExamTopic.Pharmacognosy,
    name: "Pharmacognosy",
    description: "Natural products, phytochemistry, and herbs.",
    icon: "🌿",
    color: "bg-emerald-500"
  },
  {
    id: ExamTopic.PharmaceuticalAnalysis,
    name: "Analysis",
    description: "Titrations, Spectroscopy, and QA/QC methods.",
    icon: "🔬",
    color: "bg-indigo-500"
  },
  {
    id: ExamTopic.Biochemistry,
    name: "Biochemistry",
    description: "Metabolism, enzymes, and clinical path labs.",
    icon: "🧬",
    color: "bg-amber-500"
  },
  {
    id: ExamTopic.Anatomy,
    name: "Anatomy & Physiology",
    description: "Body systems and pathological conditions.",
    icon: "🫁",
    color: "bg-orange-500"
  }
];

export const EXAM_TARGETS = [
  "ESIC Pharmacist",
  "RRB Pharmacist",
  "GPAT",
  "State PSC (DHS/DME)",
  "NHM Pharmacist",
  "D.Pharm Exit Exam (DPEE)"
];