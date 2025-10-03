export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  createdAt: string;
}

export interface ExamResult {
  id: string;
  userId: string;
  examType: 'practice' | 'timed';
  questionCount: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpent: number;
  completedAt: string;
  wrongQuestions: number[];
}

export interface WrongQuestion {
  questionIndex: number;
  userAnswer: string;
  correctAnswer: string;
  questionText: string;
  options: Record<string, string>;
  attemptedAt: string;
}

export interface UserStats {
  totalExams: number;
  averageScore: number;
  bestScore: number;
  totalTimeSpent: number;
  weakAreas: string[];
  improvementTrend: number[];
}