
import { ExamTopic } from './types';

export const TOPICS_METADATA = [
  {
    id: ExamTopic.Pharmacology,
    name: "Pharmacology",
    description: "Drug action, mechanisms, and therapeutics.",
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
    id: ExamTopic.Pharmacognosy,
    name: "Pharmacognosy",
    description: "Natural products and crude drugs.",
    icon: "🌿",
    color: "bg-emerald-500"
  },
  {
    id: ExamTopic.HospitalPharmacy,
    name: "Hospital Pharmacy",
    description: "Clinical practice and drug distribution.",
    icon: "🏥",
    color: "bg-red-500"
  },
  {
    id: ExamTopic.Jurisprudence,
    name: "Jurisprudence",
    description: "Pharmacy laws and ethics in India.",
    icon: "⚖️",
    color: "bg-purple-500"
  },
  {
    id: ExamTopic.Biochemistry,
    name: "Biochemistry",
    description: "Metabolism and biological processes.",
    icon: "🧬",
    color: "bg-amber-500"
  }
];

export const EXAM_TARGETS = [
  "ESIC Pharmacist",
  "RRB Pharmacist",
  "GPAT",
  "State PSC (DHS/DME)",
  "NHM Pharmacist",
  "B.Pharm/D.Pharm Exit Exams"
];
