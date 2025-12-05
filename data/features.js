import { BrainCircuit, Briefcase, LineChart, ScrollText } from "lucide-react";

export const features = [

  {
    icon: <Briefcase className="w-10 h-10 mb-4 text-primary" />,
    title: "Interview Preparation",
    description:
      "Practice with role-specific questions and get instant feedback to improve your performance.",
  },
   {
    icon: <BrainCircuit className="w-10 h-10 mb-4 text-primary" />,
    title: "Build Your Cover Letter",
    description:
      "Generate a personalized cover letter that matches your skills to the job description.",
  },
  {
    icon: <LineChart className="w-10 h-10 mb-4 text-primary" />,
    title: "Industry Insights",
    description:
      "Stay ahead with real-time industry trends, salary data, and market analysis.",
  },
  {
    icon: <ScrollText className="w-10 h-10 mb-4 text-primary" />,
    title: "Smart Resume Creation",
    description: "Generate ATS-optimized resumes with AI assistance.",
  },
];