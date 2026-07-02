import type { AssessmentLength, Difficulty } from "./types";

export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "Just the basics" },
  { value: "intermediate", label: "Intermediate", description: "A solid working grasp" },
  { value: "advanced", label: "Advanced", description: "Deep, well-rounded knowledge" },
  { value: "expert", label: "Expert", description: "Nuances & edge cases" },
];

export const LENGTH_OPTIONS: { value: AssessmentLength; label: string; description: string }[] = [
  { value: 5, label: "Quick", description: "5 questions" },
  { value: 10, label: "Standard", description: "10 questions" },
  { value: 15, label: "Deep", description: "15 questions" },
];

export const EXAMPLE_TOPICS = [
  "Chennai",
  "Ancient Egypt",
  "Basketball",
  "Chess",
  "World War II",
  "Docker",
  "The Solar System",
  "Cooking",
];
