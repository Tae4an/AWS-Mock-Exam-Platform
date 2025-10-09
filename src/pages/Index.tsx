import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, CheckCircle, XCircle, RotateCcw, ChevronLeft, ChevronRight, BookOpen, User, Award, Timer, Zap, Target, LogOut, Home, AlertTriangle, Shield, Crown, Info, Shuffle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { quizService, questionService, Question } from '../lib/supabase';
import { examQuestions } from '../data/examQuestions';

type QuizMode = 'practice' | 'exam';
type QuizLength = 'short' | 'full';

interface QuizState {
  mode: QuizMode;
  length: QuizLength;
  currentQuestionIndex: number;
  selectedAnswers: (string | string[])[];
  showResults: boolean;
  showCurrentAnswer: boolean;
  score: number;
  timeRemaining: number;
  isTimerActive: boolean;
  startTime: number;
}

interface QuizResult {
  questionIndex: number;
  question: Question;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
}

const QUIZ_QUESTIONS = {
  short: 65,  // 빠른 연습
  full: 0     // 0 = 전체 문제
};

const TIME_LIMITS = {
  short: 20 * 60, // 20분
  full: 130 * 60  // 130분
};

// Fisher-Yates 셔플 알고리즘
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMarkdown(md?: string) {
  if (!md) return ''
  let html = escapeHtml(md)
  // Code blocks ``` ```
  html = html.replace(/```([\s\S]*?)```/g, (_m, p1) => `<pre class="bg-slate-900/90 text-slate-100 rounded-md p-3 overflow-auto"><code>${p1.replace(/\n/g, '<br/>')}</code></pre>`) 
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 rounded px-1 py-0.5 text-sm">$1</code>')
  // Links [text](url) - only http/https
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1<\/a>')
  // Autolink bare URLs (http/https)
  html = html.replace(/(^|\s)(https?:\/\/[^\s<]+)(?=$|\s)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$2<\/a>')
  // Bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Italic _text_ or *text*
  html = html.replace(/(^|\W)_(.*?)_(?=\W|$)/g, '$1<em>$2</em>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  // Headings #, ##, ### (line-start)
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-base font-semibold mt-3 mb-1">$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-1">$1</h1>')
  // Lists - item
  html = html.replace(/^(\s*)-\s+(.+)$/gm, '$1• $2')
  // Line breaks
  html = html.replace(/\n\n+/g, '</p><p>')
  html = `<p>${html}</p>`
  return html
}

export default function Index() {
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [resumeSnapshot, setResumeSnapshot] = useState<any | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isQuestionListOpen, setIsQuestionListOpen] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>({
    mode: 'practice',
    length: 'full',
    currentQuestionIndex: 0,
    selectedAnswers: [],
    showResults: false,
    showCurrentAnswer: false,
    score: 0,
    timeRemaining: TIME_LIMITS.full,
    isTimerActive: false,
    startTime: 0
  });

  // Load questions from database on component mount
  useEffect(() => {
    loadQuestions();
  }, []);

  // Load quiz history when user logs in
  useEffect(() => {
    if (user) {
      loadQuizHistory();
    } else {
      setQuizHistory([]);
    }
  }, [user]);

  // Check resume availability for practice-full
  useEffect(() => {
    if (!user) {
      setResumeAvailable(false)
      setResumeSnapshot(null)
      return
    }
    const key = `resume:practice:full:${user.id}`
    const raw = localStorage.getItem(key)
    if (!raw) {
      setResumeAvailable(false)
      setResumeSnapshot(null)
      return
    }
    try {
      const data = JSON.parse(raw)
      // Basic validation
      if (
        data &&
        Array.isArray(data.questionIds) &&
        typeof data.currentQuestionIndex === 'number' &&
        data.currentQuestionIndex >= 1 // 1번(인덱스 0)은 이어하기 대상 제외
      ) {
        setResumeAvailable(true)
        setResumeSnapshot(data)
      } else {
        setResumeAvailable(false)
        setResumeSnapshot(null)
      }
    } catch {
      setResumeAvailable(false)
      setResumeSnapshot(null)
    }
  }, [user, allQuestions.length])

  // Debug user role
  useEffect(() => {
    console.log('🔍 현재 사용자 정보:', {
      user: user,
      username: user?.username,
      role: user?.role,
      isAdmin: user?.role === 'admin'
    });
  }, [user]);

  const loadQuestions = async () => {
    setLoading(true);
    console.log('🔄 문제 로드 시작...');
    
    try {
      // Try to load from database first
      const result = await questionService.getAllQuestions();
      if (result.success && result.data && result.data.length > 0) {
        setAllQuestions(result.data);
        console.log('✅ 데이터베이스에서 문제 로드 완료:', result.data.length, '개');
      } else {
        // Fallback to local exam questions
        console.log('📝 데이터베이스가 비어있음, 로컬 문제 사용');
        const localQuestions = examQuestions.map(q => ({
          id: q.id.toString(),
          question_text: q.question_text,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation || '',
          category: 'SAA',
          difficulty: 'medium' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        setAllQuestions(localQuestions);
        console.log('✅ 로컬 문제 로드 완료:', localQuestions.length, '개');
      }
    } catch (error) {
      console.error('❌ 문제 로드 중 오류:', error);
      // Use local questions as final fallback
      const localQuestions = examQuestions.map(q => ({
        id: q.id.toString(),
        question_text: q.question_text,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation || '',
        category: 'SAA',
        difficulty: 'medium' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      setAllQuestions(localQuestions);
      console.log('🔄 오류 발생, 로컬 문제로 대체:', localQuestions.length, '개');
    }
    
    setLoading(false);
  };

  const loadQuizHistory = async () => {
    console.log('🔄 응시 기록 로드 시작...');
    const result = await quizService.getUserQuizHistory();
    if (result.success && result.data) {
      setQuizHistory(result.data);
      console.log('✅ 응시 기록 로드 완료:', result.data.length, '개');
    } else {
      console.error('❌ 응시 기록 로드 실패:', result.error);
      setQuizHistory([]);
    }
  };

  // 타이머 효과 (실전 모드에서만)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (quizState.mode === 'exam' && quizState.isTimerActive && quizState.timeRemaining > 0 && !quizState.showResults) {
      interval = setInterval(() => {
        setQuizState(prev => {
          if (prev.timeRemaining <= 1) {
            finishQuizInternal(prev);
            return { ...prev, timeRemaining: 0, showResults: true, isTimerActive: false };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [quizState.mode, quizState.isTimerActive, quizState.timeRemaining, quizState.showResults]);

  const startQuiz = (mode: QuizMode, length: QuizLength) => {
    // Ensure any pending modals are closed when starting
    setIsResumeModalOpen(false)
    setIsQuestionListOpen(false)
    if (allQuestions.length === 0) {
      alert('문제를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    // 문제 개수 결정
    let questionCount;
    if (mode === 'exam') {
      // 시험 모드는 항상 65문제 (또는 전체 문제가 65개 미만이면 전체)
      questionCount = Math.min(65, allQuestions.length);
    } else if (length === 'full') {
      // 연습 모드 - 전체 연습: 전체 문제
      questionCount = allQuestions.length;
    } else {
      // 연습 모드 - 빠른 연습: 65문제
      questionCount = Math.min(QUIZ_QUESTIONS.short, allQuestions.length);
    }
    
    const timeLimit = mode === 'exam' ? TIME_LIMITS[length] : 0;
    
    // 연습 모드의 전체 연습은 순서대로, 나머지는 랜덤 섞기
    let selectedQuestions;
    if (mode === 'practice' && length === 'full') {
      // 전체 연습 모드: 순서대로 (섞지 않음)
      selectedQuestions = allQuestions.slice(0, questionCount);
      console.log('📚 전체 연습 모드: 문제 순서대로 출제 (' + questionCount + '개)');
    } else {
      // 빠른 연습, 실전 모드: 랜덤으로 섞기
      selectedQuestions = shuffleArray(allQuestions).slice(0, questionCount);
      console.log('🔀 문제 랜덤 섞기 활성화 (' + questionCount + '개)');
    }
    
    setQuestions(selectedQuestions);
    setQuizState({
      mode,
      length,
      currentQuestionIndex: 0,
      selectedAnswers: new Array(questionCount).fill(null),
      showResults: false,
      showCurrentAnswer: false,
      score: 0,
      timeRemaining: timeLimit,
      isTimerActive: mode === 'exam',
      startTime: Date.now()
    });
    setQuizStarted(true);
    setQuizResults([]);
  };

  const handleStartPracticeFull = () => {
    // If there's a resume snapshot, ask user whether to resume or start over
    if (user && resumeAvailable && resumeSnapshot) {
      setIsResumeModalOpen(true)
      return
    }
    startQuiz('practice', 'full')
  }

  const confirmResume = () => {
    setIsResumeModalOpen(false)
    resumePracticeFull()
  }
  const startOver = () => {
    setIsResumeModalOpen(false)
    clearResume()
    startQuiz('practice', 'full')
  }

  // Auto-save progress for practice full (user-scoped)
  useEffect(() => {
    if (!user) return
    if (!quizStarted) return
    if (!(quizState.mode === 'practice' && quizState.length === 'full')) return
    // 1번(인덱스 0)은 이어하기에 포함하지 않음
    if (quizState.currentQuestionIndex < 1) return
    const key = `resume:practice:full:${user.id}`
    const snapshot = {
      userId: user.id,
      questionIds: questions.map(q => q.id),
      currentQuestionIndex: quizState.currentQuestionIndex,
      selectedAnswers: quizState.selectedAnswers,
      startedAt: quizState.startTime,
      savedAt: Date.now()
    }
    try {
      localStorage.setItem(key, JSON.stringify(snapshot))
      // Offer resume when saving initial snapshot
      setResumeAvailable(true)
      setResumeSnapshot(snapshot)
    } catch {}
  }, [user, quizStarted, quizState.mode, quizState.length, quizState.currentQuestionIndex, quizState.selectedAnswers, quizState.startTime, questions])

  // Clear resume on finish/cancel
  const clearResume = () => {
    if (!user) return
    try {
      localStorage.removeItem(`resume:practice:full:${user.id}`)
    } catch {}
    setResumeAvailable(false)
    setResumeSnapshot(null)
  }

  const resumePracticeFull = () => {
    if (!user || !resumeSnapshot) return
    const { questionIds, selectedAnswers, currentQuestionIndex, startedAt } = resumeSnapshot
    const idToQuestion = new Map(allQuestions.map(q => [q.id, q]))
    const restoredQuestions: Question[] = []
    for (const qid of questionIds) {
      const q = idToQuestion.get(qid)
      if (q) restoredQuestions.push(q)
    }
    const finalQuestions = restoredQuestions.length === questionIds.length ? restoredQuestions : allQuestions

    setQuestions(finalQuestions)
    setQuizState({
      mode: 'practice',
      length: 'full',
      currentQuestionIndex: Math.max(1, Math.min(currentQuestionIndex || 0, finalQuestions.length - 1)), // 최소 2번째 문제(인덱스 1)
      selectedAnswers: Array.isArray(selectedAnswers) ? selectedAnswers : [],
      showResults: false,
      showCurrentAnswer: false,
      score: 0,
      timeRemaining: TIME_LIMITS.full,
      isTimerActive: false,
      startTime: startedAt || Date.now()
    })
    setQuizStarted(true)
  }

  const handleAnswerSelect = (answer: string) => {
    const currentQuestion = questions[quizState.currentQuestionIndex];
    const isMultipleChoice = Array.isArray(currentQuestion.answer);
    
    setQuizState(prev => {
      const newSelectedAnswers = [...prev.selectedAnswers];
      
      if (isMultipleChoice) {
        const currentAnswers = newSelectedAnswers[prev.currentQuestionIndex] as string[] || [];
        if (currentAnswers.includes(answer)) {
          newSelectedAnswers[prev.currentQuestionIndex] = currentAnswers.filter(a => a !== answer);
        } else {
          newSelectedAnswers[prev.currentQuestionIndex] = [...currentAnswers, answer];
        }
      } else {
        newSelectedAnswers[prev.currentQuestionIndex] = answer;
      }
      
      return { 
        ...prev, 
        selectedAnswers: newSelectedAnswers
      };
    });
  };

  const nextQuestion = () => {
    if (quizState.currentQuestionIndex < questions.length - 1) {
      setQuizState(prev => ({ 
        ...prev, 
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        showCurrentAnswer: false
      }));
    } else {
      finishQuiz();
    }
  };

  const showAnswerAndNext = () => {
    if (quizState.mode === 'practice') {
      setQuizState(prev => ({ 
        ...prev, 
        showCurrentAnswer: true
      }));
    }
  };

  const previousQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({ 
        ...prev, 
        currentQuestionIndex: prev.currentQuestionIndex - 1,
        showCurrentAnswer: false
      }));
    }
  };

  const finishQuizInternal = (currentState: QuizState) => {
    const results: QuizResult[] = [];
    let correctCount = 0;
    
    questions.forEach((question, index) => {
      const userAnswer = currentState.selectedAnswers[index];
      const correctAnswer = question.answer;
      let isCorrect = false;
      
      if (Array.isArray(correctAnswer)) {
        const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
        isCorrect = correctAnswer.length === userAnswerArray.length && 
                   correctAnswer.every(ans => userAnswerArray.includes(ans));
      } else {
        isCorrect = userAnswer === correctAnswer;
      }
      
      if (isCorrect) correctCount++;
      
      results.push({
        questionIndex: index,
        question,
        userAnswer: userAnswer || (Array.isArray(correctAnswer) ? [] : ''),
        correctAnswer,
        isCorrect
      });
    });

    const score = Math.round((correctCount / questions.length) * 1000);
    setQuizResults(results);
    
    return { correctCount, score };
  };

  const finishQuiz = async () => {
    const { correctCount, score } = finishQuizInternal(quizState);
    
    setQuizState(prev => ({ 
      ...prev, 
      score, 
      showResults: true, 
      isTimerActive: false 
    }));

    // Save quiz result to Supabase if user is logged in
    if (user) {
      const totalTime = quizState.mode === 'exam' 
        ? TIME_LIMITS[quizState.length] - quizState.timeRemaining
        : Math.floor((Date.now() - quizState.startTime) / 1000);

      const quizData = {
        quiz_mode: quizState.mode,
        quiz_length: quizState.length,
        total_questions: questions.length,
        correct_answers: correctCount,
        score: score,
        time_taken: totalTime,
        started_at: new Date(quizState.startTime).toISOString(),
        question_results: quizResults.map((result, index) => ({
          question_index: index,
          question_text: result.question.question_text,
          user_answer: result.userAnswer,
          correct_answer: result.correctAnswer,
          is_correct: result.isCorrect
        }))
      };

      const saveResult = await quizService.saveQuizResult(quizData);
      if (saveResult.success) {
        console.log('✅ 퀴즈 결과가 Supabase에 저장되었습니다.');
      } else {
        console.error('❌ 퀴즈 결과 저장 실패:', saveResult.error);
      }
    }
    clearResume()
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setQuestions([]);
    setQuizResults([]);
    setQuizState({
      mode: 'practice',
      length: 'full',
      currentQuestionIndex: 0,
      selectedAnswers: [],
      showResults: false,
      showCurrentAnswer: false,
      score: 0,
      timeRemaining: TIME_LIMITS.full,
      isTimerActive: false,
      startTime: 0
    });
    // Reload quiz history after completing a quiz
    if (user) {
      loadQuizHistory();
    }
  };

  const handleCancelQuiz = () => {
    setIsCancelDialogOpen(false);
    resetQuiz();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (timeRemaining: number) => {
    if (timeRemaining <= 300) return 'text-red-500';
    if (timeRemaining <= 600) return 'text-orange-500';
    return 'text-teal-600';
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">문제를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 메인 시작 화면
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">AWS Mock Exam Platform</h1>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {user ? (
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${
                      user.role === 'admin' ? 'bg-red-100' : 'bg-slate-100'
                    }`}>
                      {user.role === 'admin' ? (
                        <Crown className="h-4 w-4 text-red-600" />
                      ) : (
                        <User className="h-4 w-4 text-slate-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        user.role === 'admin' ? 'text-red-700' : 'text-slate-700'
                      }`}>
                        {user.username}
                      </span>
                    </div>
                    {quizHistory.length > 0 && (
                      <Button 
                        onClick={() => {
                          const historySection = document.getElementById('quiz-history');
                          if (historySection) {
                            historySection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Award className="h-4 w-4 mr-2" />
                        응시 기록
                      </Button>
                    )}
                    {user.role === 'admin' && (
                      <Button 
                        onClick={() => window.location.href = '/admin'}
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        관리자
                      </Button>
                    )}
                    <Button 
                      onClick={signOut}
                      variant="outline" 
                      size="sm"
                      className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      로그아웃
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Button 
                      onClick={() => setIsAuthModalOpen(true)}
                      variant="outline"
                      size="sm"
                      className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      로그인
                    </Button>
                    <Button 
                      onClick={() => setIsAuthModalOpen(true)}
                      size="sm"
                      className="bg-teal-500 hover:bg-teal-600 text-white"
                    >
                      회원가입
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="max-w-6xl mx-auto px-6 py-16">
          {/* 이어하기 배너 제거: 버튼 클릭 시 모달로 처리 */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Target className="h-4 w-4 mr-2" />
              Solutions Architect Associate Certification
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 mb-6 leading-tight">
              AWS Solutions Architect
              <span className="block text-teal-600">Associate</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Master your AWS certification with our comprehensive practice platform featuring real exam scenarios
            </p>
            <div className="flex items-center justify-center space-x-8 text-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                <span className="font-semibold">{allQuestions.length}</span>
                <span>Practice Questions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="font-semibold">Real Exam</span>
                <span>Environment</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                <span className="font-semibold">Instant</span>
                <span>Feedback</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-16">
            <Card className="group relative overflow-hidden bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-teal-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-teal-100 text-teal-700 px-3 py-1">
                    Learning Mode
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-slate-800 mb-2">연습 모드</CardTitle>
                <CardDescription className="text-slate-600 text-sm leading-relaxed">
                  시간 제한 없이 차근차근 학습하세요. 각 문제마다 정답과 상세한 해설을 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                    <Timer className="h-4 w-4 text-teal-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">무제한</div>
                      <div className="text-xs text-slate-600">시간</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                    <Zap className="h-4 w-4 text-teal-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">즉시</div>
                      <div className="text-xs text-slate-600">피드백</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                    <Shuffle className="h-4 w-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">선택</div>
                      <div className="text-xs text-slate-600">섞기</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={() => startQuiz('practice', 'short')} 
                    variant="outline"
                    className="w-full h-10 text-sm border-teal-200 hover:border-teal-300 hover:bg-teal-50 flex items-center justify-center gap-2"
                    disabled={allQuestions.length === 0}
                  >
                    <Shuffle className="h-4 w-4" />
                    빠른 연습 ({QUIZ_QUESTIONS.short}문제 랜덤)
                  </Button>
                  <Button 
                    onClick={handleStartPracticeFull} 
                    className="w-full h-10 text-sm bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center gap-2"
                    disabled={allQuestions.length === 0}
                  >
                    <BookOpen className="h-4 w-4" />
                    전체 연습 ({allQuestions.length}문제)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-1">
                    Exam Mode
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-slate-800 mb-2">시간제한 모의고사</CardTitle>
                <CardDescription className="text-slate-600 text-sm leading-relaxed">
                  실제 AWS 시험 환경을 완벽 재현합니다. 시간 압박 속에서 문제 해결 능력을 향상시키세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">130분</div>
                      <div className="text-xs text-slate-600">제한</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                    <Award className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">실전</div>
                      <div className="text-xs text-slate-600">환경</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                    <Shuffle className="h-4 w-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">랜덤</div>
                      <div className="text-xs text-slate-600">섞기</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 pt-6 pb-2">
                  <Button 
                    onClick={() => startQuiz('exam', 'full')} 
                    className="w-full h-12 text-base bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center gap-2"
                    disabled={allQuestions.length === 0}
                  >
                    <Shuffle className="h-5 w-5" />
                    정규 모의고사 시작 (65문제 랜덤, 130분)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {allQuestions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-500 mb-4">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">문제를 불러오는 중입니다...</p>
                <p className="text-sm">잠시만 기다려 주세요.</p>
              </div>
            </div>
          )}

          {user && quizHistory.length > 0 && (
            <div id="quiz-history" className="mt-16 scroll-mt-20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">내 응시 기록</h2>
                <Button 
                  onClick={() => setShowHistory(!showHistory)}
                  variant="outline"
                  size="sm"
                >
                  {showHistory ? '숨기기' : '전체 보기'}
                </Button>
              </div>
              
              <div className="grid gap-4">
                {(showHistory ? quizHistory : quizHistory.slice(0, 3)).map((record) => {
                  const percentage = Math.round((record.correct_answers / record.total_questions) * 100);
                  return (
                  <Card key={record.id} className="bg-white border border-slate-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                            percentage >= 70 ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            <span className="text-xl font-bold">{percentage}%</span>
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={record.quiz_mode === 'exam' ? 'default' : 'secondary'}>
                                {record.quiz_mode === 'exam' ? '시험 모드' : '연습 모드'}
                              </Badge>
                              <Badge variant="outline">
                                {record.quiz_length === 'short' ? '빠른' : '정규'} ({record.total_questions}문제)
                              </Badge>
                            </div>
                            
                            <div className="text-sm font-semibold text-slate-900 mb-1">
                              {record.correct_answers}/{record.total_questions} 정답
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-slate-600">
                              <span>{new Date(record.completed_at).toLocaleDateString('ko-KR', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                              {record.time_taken && (
                                <span>⏱️ {Math.floor(record.time_taken / 60)}분</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {percentage >= 70 ? (
                            <Badge className="bg-teal-500">합격</Badge>
                          ) : (
                            <Badge variant="destructive">불합격</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-center mt-16">
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              Professional AWS Certification Platform
            </h2>
            <p className="text-base text-slate-600 max-w-2xl mx-auto">
              Join thousands of professionals who have successfully passed their AWS certification with our comprehensive practice platform.
            </p>
          </div>
        </div>

        {/* 이어하기 확인 모달 - 시작 화면에서도 렌더 */}
        <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-800">이어서 진행하시겠습니까?</DialogTitle>
              <DialogDescription className="text-slate-600">
                {resumeSnapshot ? `이전에 진행하던 전체 연습이 있습니다. 문제 ${(resumeSnapshot.currentQuestionIndex || 0) + 1}번부터 이어서 하시겠습니까?` : '이전 진행 내역을 찾을 수 없습니다.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setIsResumeModalOpen(false)} className="border-slate-200">취소</Button>
              <Button variant="outline" onClick={startOver} className="border-slate-200">처음부터</Button>
              <Button onClick={confirmResume} className="bg-teal-500 hover:bg-teal-600 text-white">이어하기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  // 결과 화면
  if (quizState.showResults) {
    const correctCount = quizResults.filter(r => r.isCorrect).length;
    const totalTime = (quizState.mode === 'exam' ? TIME_LIMITS[quizState.length] : 0) - quizState.timeRemaining;
    const isPassed = quizState.score >= 720;

    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="overflow-hidden bg-white border border-slate-200 shadow-lg">
            <CardHeader className={`text-center text-white ${isPassed ? 'bg-teal-500' : 'bg-orange-500'}`}>
              <CardTitle className="text-3xl font-bold mb-2">
                {isPassed ? '🎉 축하합니다!' : '📚 아쉽네요'}
              </CardTitle>
              <CardDescription className="text-lg text-white/90">
                {quizState.mode === 'practice' ? '연습 모드' : '시간제한 모의고사'} 완료
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center mb-8">
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-teal-600">{quizState.score}</div>
                  <div className="text-sm font-medium text-slate-600">최종 점수 (1000점 만점)</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-blue-500">{correctCount}</div>
                  <div className="text-sm font-medium text-slate-600">정답 수</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-orange-500">{questions.length - correctCount}</div>
                  <div className="text-sm font-medium text-slate-600">오답 수</div>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-indigo-500">
                    {quizState.mode === 'exam' ? formatTime(totalTime) : '∞'}
                  </div>
                  <div className="text-sm font-medium text-slate-600">소요 시간</div>
                </div>
              </div>
              
              <div className="text-center mb-6">
                <div className="inline-flex items-center px-4 py-2 bg-slate-100 rounded-full">
                  <Award className="h-4 w-4 text-slate-600 mr-2" />
                  <span className="text-base font-medium text-slate-700">
                    합격 기준: 720점 이상 (약 {Math.round(questions.length * 0.7)}문제 이상 정답)
                  </span>
                </div>
              </div>
              
              <div className="flex justify-center gap-4">
                <Button 
                  onClick={resetQuiz} 
                  variant="outline" 
                  size="lg"
                  className="px-6 py-2 border-slate-200 hover:bg-slate-50"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  다시 시작
                </Button>
                <Button 
                  onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} 
                  size="lg"
                  className="px-6 py-2 bg-teal-500 hover:bg-teal-600"
                >
                  상세 결과 보기
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-200 bg-slate-50">
              <CardTitle className="text-xl font-bold text-slate-800">문제별 상세 분석</CardTitle>
              <CardDescription className="text-slate-600">
                각 문제의 정답과 해설을 통해 학습 포인트를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {quizResults.map((result, index) => (
                <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm font-semibold px-3 py-1 border-slate-300">
                        문제 {index + 1}
                      </Badge>
                      {result.isCorrect ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-teal-500" />
                          <span className="font-bold text-teal-600 text-base">정답</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-orange-500" />
                          <span className="font-bold text-orange-600 text-base">오답</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-800 leading-relaxed text-base">
                        {result.question.question_text}
                      </h4>
                    </div>
                    
                    <div className="grid gap-2">
                      {Object.entries(result.question.options).map(([key, value]) => {
                        const isUserAnswer = Array.isArray(result.userAnswer) 
                          ? result.userAnswer.includes(key)
                          : result.userAnswer === key;
                        const isCorrectAnswer = Array.isArray(result.correctAnswer)
                          ? result.correctAnswer.includes(key)
                          : result.correctAnswer === key;
                        
                        let bgColor = 'bg-white';
                        let textColor = 'text-slate-800';
                        let borderColor = 'border-slate-200';
                        
                        if (isCorrectAnswer) {
                          bgColor = 'bg-teal-50';
                          borderColor = 'border-teal-300';
                          textColor = 'text-teal-800';
                        } else if (isUserAnswer && !isCorrectAnswer) {
                          bgColor = 'bg-orange-50';
                          borderColor = 'border-orange-300';
                          textColor = 'text-orange-800';
                        }
                        
                        return (
                          <div key={key} className={`p-3 rounded-lg border ${bgColor} ${borderColor}`}>
                            <div className="flex items-start gap-3">
                              <span className={`font-bold ${textColor} text-base min-w-[1.5rem]`}>{key}.</span>
                              <span className={`${textColor} flex-1 leading-relaxed text-sm`}>{value}</span>
                              {isCorrectAnswer && (
                                <CheckCircle className="h-5 w-5 text-teal-500 flex-shrink-0" />
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <XCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200">
                      <div className="bg-white rounded-lg p-4 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-bold text-slate-700 text-sm">정답: </span>
                            <span className="text-teal-600 font-bold text-sm">
                              {Array.isArray(result.correctAnswer) 
                                ? result.correctAnswer.join(', ')
                                : result.correctAnswer}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 text-sm">선택한 답: </span>
                            <span className={`font-bold text-sm ${result.isCorrect ? 'text-teal-600' : 'text-orange-600'}`}>
                              {Array.isArray(result.userAnswer) 
                                ? result.userAnswer.length > 0 ? result.userAnswer.join(', ') : '선택 안함'
                                : result.userAnswer || '선택 안함'}
                            </span>
                          </div>
                        </div>
                        
                        {/* 해설 표시 */}
                        {result.question.explanation && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="font-bold text-blue-800 text-sm mb-2">해설</h5>
                                <p className="text-blue-700 text-sm leading-relaxed">
                                  {result.question.explanation}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 퀴즈 진행 화면
  const currentQuestion = questions[quizState.currentQuestionIndex];
  const isMultipleChoice = Array.isArray(currentQuestion.answer);
  const userAnswer = quizState.selectedAnswers[quizState.currentQuestionIndex];
  const progress = ((quizState.currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = quizState.selectedAnswers.filter(answer => 
    Array.isArray(answer) ? answer.length > 0 : answer !== null && answer !== undefined
  ).length;

  const isAnswerCorrect = () => {
    if (!quizState.showCurrentAnswer || !userAnswer) return null;
    
    if (Array.isArray(currentQuestion.answer)) {
      const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
      return currentQuestion.answer.length === userAnswerArray.length && 
             currentQuestion.answer.every(ans => userAnswerArray.includes(ans));
    } else {
      return userAnswer === currentQuestion.answer;
    }
  };

  const correctAnswer = quizState.showCurrentAnswer ? currentQuestion.answer : null;
  const hasSelectedAnswer = Array.isArray(userAnswer) 
    ? userAnswer.length > 0 
    : userAnswer !== null && userAnswer !== undefined;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* 축소된 헤더 */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="px-3 py-1 text-sm font-semibold border-slate-300">
                    {quizState.mode === 'practice' ? '연습 모드' : '시간제한 모의고사'}
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1 text-sm bg-slate-100 text-slate-700">
                    {`${questions.length}문제`}
                  </Badge>
                </div>
                <h1 className="text-xl font-bold text-slate-800">AWS Solutions Architect Associate</h1>
                <div className="flex items-center gap-6 text-slate-600 text-sm">
                  <span>
                    문제 <span className="font-bold text-slate-800">{quizState.currentQuestionIndex + 1}</span> / {questions.length}
                  </span>
                  <span>
                    답변 완료: <span className="font-bold text-slate-800">{answeredCount}</span>/{questions.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {quizState.mode === 'exam' && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white border shadow-sm ${getTimeColor(quizState.timeRemaining)}`}>
                    <Clock className="h-5 w-5" />
                    <span className="font-mono text-lg font-bold">
                      {formatTime(quizState.timeRemaining)}
                    </span>
                  </div>
                )}
                <Button 
                  onClick={() => setIsCancelDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Home className="h-4 w-4 mr-2" />
                  메인으로
                </Button>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-700">진행률</span>
                <span className="text-sm text-slate-600 font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-slate-200" />
            </div>
          </CardContent>
        </Card>

        {/* 문제 영역 */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <CardTitle className="text-lg leading-relaxed text-slate-800 pr-4">
                  {currentQuestion.question_text}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {quizState.mode === 'practice' && quizState.length === 'full' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-slate-200 hover:bg-slate-50"
                    onClick={() => setIsQuestionListOpen(true)}
                  >
                    문제 목록
                  </Button>
                )}
                {isMultipleChoice && (
                  <Badge variant="outline" className="ml-2 shrink-0 px-3 py-1 text-sm font-semibold border-slate-300">
                    다중 선택
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
                {isMultipleChoice ? (
                  <div className="space-y-3">
                    {Object.entries(currentQuestion.options).map(([key, value]) => {
                      const isSelected = Array.isArray(userAnswer) && userAnswer.includes(key);
                      const isCorrect = quizState.showCurrentAnswer && Array.isArray(correctAnswer) && correctAnswer.includes(key);
                      const isWrong = quizState.showCurrentAnswer && isSelected && !isCorrect;
                      
                      let borderColor = 'border-slate-200 hover:border-slate-300';
                      let bgColor = 'bg-white hover:bg-slate-50';
                      
                      if (quizState.showCurrentAnswer) {
                        if (isCorrect) {
                          borderColor = 'border-teal-300';
                          bgColor = 'bg-teal-50';
                        } else if (isWrong) {
                          borderColor = 'border-orange-300';
                          bgColor = 'bg-orange-50';
                        }
                      } else if (isSelected) {
                        borderColor = 'border-blue-300';
                        bgColor = 'bg-blue-50';
                      }
                      
                      return (
                        <div
                          key={key}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${borderColor} ${bgColor}`}
                          onClick={() => !quizState.showCurrentAnswer && handleAnswerSelect(key)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox 
                              checked={isSelected} 
                              disabled={quizState.showCurrentAnswer}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <span className="font-bold text-blue-600 text-base mr-2">{key}.</span>
                              <span className="text-slate-800 leading-relaxed text-base">{value}</span>
                            </div>
                            {quizState.showCurrentAnswer && isCorrect && (
                              <CheckCircle className="h-5 w-5 text-teal-500 flex-shrink-0" />
                            )}
                            {quizState.showCurrentAnswer && isWrong && (
                              <XCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <RadioGroup 
                    value={userAnswer as string || ''} 
                    onValueChange={(value) => !quizState.showCurrentAnswer && handleAnswerSelect(value)}
                    className="space-y-3"
                  >
                    {Object.entries(currentQuestion.options).map(([key, value]) => {
                      const isSelected = userAnswer === key;
                      const isCorrect = quizState.showCurrentAnswer && correctAnswer === key;
                      const isWrong = quizState.showCurrentAnswer && isSelected && !isCorrect;
                      
                      let borderColor = 'border-slate-200 hover:border-slate-300';
                      let bgColor = 'bg-white hover:bg-slate-50';
                      
                      if (quizState.showCurrentAnswer) {
                        if (isCorrect) {
                          borderColor = 'border-teal-300';
                          bgColor = 'bg-teal-50';
                        } else if (isWrong) {
                          borderColor = 'border-orange-300';
                          bgColor = 'bg-orange-50';
                        }
                      } else if (isSelected) {
                        borderColor = 'border-blue-300';
                        bgColor = 'bg-blue-50';
                      }
                      
                      return (
                        <div
                          key={key}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${borderColor} ${bgColor}`}
                          onClick={() => !quizState.showCurrentAnswer && handleAnswerSelect(key)}
                        >
                          <div className="flex items-start gap-3">
                            <RadioGroupItem 
                              value={key} 
                              id={key}
                              className="mt-0.5"
                              disabled={quizState.showCurrentAnswer}
                            />
                            <Label htmlFor={key} className="flex-1 cursor-pointer">
                              <span className="font-bold text-blue-600 text-base mr-2">{key}.</span>
                              <span className="text-slate-800 leading-relaxed text-base">{value}</span>
                            </Label>
                            {quizState.showCurrentAnswer && isCorrect && (
                              <CheckCircle className="h-5 w-5 text-teal-500 flex-shrink-0" />
                            )}
                            {quizState.showCurrentAnswer && isWrong && (
                              <XCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}

                {/* 연습 모드 정답 표시 */}
                {quizState.mode === 'practice' && quizState.showCurrentAnswer && (
                  <Card className={`border ${isAnswerCorrect() ? 'border-teal-300 bg-teal-50' : 'border-orange-300 bg-orange-50'}`}>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        {isAnswerCorrect() ? (
                          <CheckCircle className="h-6 w-6 text-teal-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-orange-500" />
                        )}
                        <span className={`font-bold text-lg ${isAnswerCorrect() ? 'text-teal-700' : 'text-orange-700'}`}>
                          {isAnswerCorrect() ? '정답입니다!' : '틀렸습니다.'}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-bold text-slate-700">정답: </span>
                        <span className="text-teal-600 font-bold">
                          {Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}
                        </span>
                      </div>
                      
                      {/* 해설 표시 */}
                      {currentQuestion.explanation && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="w-full">
                              <h5 className="font-bold text-slate-800 text-sm mb-2">해설</h5>
                              <div 
                                className="prose prose-sm max-w-none text-slate-700"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(currentQuestion.explanation) }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                  <Button 
                    variant="outline" 
                    onClick={previousQuestion}
                    disabled={quizState.currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-6 py-2 border-slate-200 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전 문제
                  </Button>
                  
                  <div className="flex gap-3">
                    {quizState.mode === 'practice' && !quizState.showCurrentAnswer && hasSelectedAnswer && (
                      <Button 
                        onClick={showAnswerAndNext}
                        className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 px-6 py-2 text-white"
                      >
                        정답 확인
                      </Button>
                    )}
                    
                    {(quizState.mode === 'exam' || quizState.showCurrentAnswer || quizState.currentQuestionIndex === questions.length - 1) && (
                      <>
                        {quizState.currentQuestionIndex === questions.length - 1 ? (
                          <Button 
                            onClick={finishQuiz}
                            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 px-6 py-2 text-white"
                          >
                            <CheckCircle className="h-4 w-4" />
                            {quizState.mode === 'practice' ? '결과 보기' : '시험 완료'}
                          </Button>
                        ) : (
                          <Button 
                            onClick={nextQuestion}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-6 py-2 text-white"
                          >
                            다음 문제
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
          </CardContent>
        </Card>

        {/* 취소 확인 다이얼로그 */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                {quizState.mode === 'practice' ? '연습 취소' : '시험 취소'}
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                {quizState.mode === 'practice' 
                  ? '연습을 중단하고 메인 화면으로 돌아가시겠습니까? 진행 상황은 자동 저장됩니다.'
                  : '시험을 취소하고 메인 화면으로 돌아가시겠습니까? 지금까지의 답안이 모두 사라집니다.'
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCancelDialogOpen(false)}
                className="border-slate-200 hover:bg-slate-50"
              >
                계속하기
              </Button>
              <Button 
                onClick={handleCancelQuiz}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {quizState.mode === 'practice' ? '연습 취소' : '시험 취소'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 이어하기 확인 모달 */}
        <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-800">이어서 진행하시겠습니까?</DialogTitle>
              <DialogDescription className="text-slate-600">
                {resumeSnapshot ? `이전에 진행하던 전체 연습이 있습니다. 문제 ${(resumeSnapshot.currentQuestionIndex || 0) + 1}번부터 이어서 하시겠습니까?` : '이전 진행 내역을 찾을 수 없습니다.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setIsResumeModalOpen(false)} className="border-slate-200">취소</Button>
              <Button variant="outline" onClick={startOver} className="border-slate-200">처음부터</Button>
              <Button onClick={confirmResume} className="bg-teal-500 hover:bg-teal-600 text-white">이어하기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 문제 목록 모달 (전체 연습) */}
        <Dialog open={isQuestionListOpen} onOpenChange={setIsQuestionListOpen}>
          <DialogContent className="sm:max-w-lg bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-800">문제 목록</DialogTitle>
              <DialogDescription className="text-slate-600">번호를 선택해 해당 문제로 이동하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-[60vh] overflow-auto">
              {questions.map((_, idx) => {
                const answered = quizState.selectedAnswers[idx]
                const isCurrent = idx === quizState.currentQuestionIndex
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuizState(prev => ({ ...prev, currentQuestionIndex: idx, showCurrentAnswer: false }))
                      setIsQuestionListOpen(false)
                    }}
                    className={`h-9 rounded-md border text-sm font-medium transition-colors ${
                      isCurrent ? 'border-blue-400 bg-blue-50 text-blue-700' : answered ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                    title={`문제 ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuestionListOpen(false)} className="border-slate-200">닫기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}