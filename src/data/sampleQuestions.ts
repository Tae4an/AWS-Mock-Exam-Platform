// This file is now empty - all sample questions have been removed
// Only the 100 AWS questions from examQuestions.ts will be used
export const sampleQuestions: Question[] = [];

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  type: 'single' | 'multiple';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}