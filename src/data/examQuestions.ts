export interface ExamQuestion {
  id: number;
  question_text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E?: string;
    F?: string;
  };
  answer: string | string[];
  explanation?: string;
}

// AWS Solutions Architect Associate 연습 문제
export const examQuestions: ExamQuestion[] = [
    
];