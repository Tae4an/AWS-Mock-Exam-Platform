import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { questionService, Question as DBQuestion } from '@/lib/supabase';

interface Question {
  question_number: number;
  question_text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E?: string;
  };
  answer: string;
}

interface ExamInterfaceProps {
  examType?: 'practice' | 'timed';
  questionCount?: number;
  timeLimit?: number;
}

export default function ExamInterface({ examType = 'practice', questionCount = 50, timeLimit }: ExamInterfaceProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [showInstantFeedback, setShowInstantFeedback] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(examType === 'practice');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [examStartTime, setExamStartTime] = useState<number>(0);

  const { isAuthenticated, saveExamResult, saveWrongQuestion } = useAuth();

  // Initialize questions from Supabase
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true);
        console.log('🔄 문제 로드 시작...');
        
        const result = await questionService.getAllQuestions();
        
        if (!result.success || !result.data || result.data.length === 0) {
          setError('문제 데이터를 불러올 수 없습니다.');
          setLoading(false);
          return;
        }

        // Shuffle and select questions
        const shuffledQuestions = [...result.data]
          .sort(() => Math.random() - 0.5)
          .slice(0, questionCount)
          .map((q, idx) => ({
            question_number: idx + 1,
            question_text: q.question_text,
            options: q.options,
            answer: q.answer
          }));
        
        setQuestions(shuffledQuestions);
        setError('');
        console.log('✅ 문제 로드 완료:', shuffledQuestions.length, '개');

        // Set time limit based on exam type and question count
        if (examType === 'timed') {
          const minutes = timeLimit || (questionCount === 65 ? 130 : 20);
          setTimeRemaining(minutes * 60);
        }

        setExamStartTime(Date.now());
        setLoading(false);
      } catch (error) {
        console.error('❌ 문제 로딩 중 에러 발생:', error);
        setError('문제를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    loadQuestions();
  }, [questionCount, examType, timeLimit]);

  // Timer logic
  useEffect(() => {
    if (examType === 'timed' && examStarted && timeRemaining > 0 && !showResults) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setShowResults(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examType, examStarted, timeRemaining, showResults]);

  const handleAnswerSelect = (answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));

    // For practice mode, show instant feedback
    if (examType === 'practice') {
      setShowInstantFeedback(true);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowInstantFeedback(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowInstantFeedback(false);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
    saveExamData();
  };

  const saveExamData = () => {
    if (!isAuthenticated) return;

    const timeSpent = Math.floor((Date.now() - examStartTime) / 1000);
    let correct = 0;
    const wrongQuestionIndices: number[] = [];

    questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      if (userAnswer === question.answer) {
        correct++;
      } else {
        wrongQuestionIndices.push(index);
        
        // Save wrong question for review
        saveWrongQuestion({
          questionIndex: index,
          userAnswer: userAnswer || '',
          correctAnswer: question.answer,
          questionText: question.question_text,
          options: question.options
        });
      }
    });

    const percentage = Math.round((correct / questions.length) * 100);

    // Save exam result
    saveExamResult({
      examType,
      questionCount: questions.length,
      score: correct,
      totalQuestions: questions.length,
      percentage,
      timeSpent,
      wrongQuestions: wrongQuestionIndices
    });
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowResults(false);
    setShowInstantFeedback(false);
    setTimeRemaining(examType === 'timed' ? (timeLimit || (questionCount === 65 ? 130 : 20)) * 60 : 0);
    setExamStarted(examType === 'practice');
    setExamStartTime(Date.now());
    
    // Reshuffle questions
    try {
      const shuffledQuestions = [...examQuestions]
        .sort(() => Math.random() - 0.5)
        .slice(0, questionCount);
      setQuestions(shuffledQuestions);
    } catch (error) {
      console.error('재시작 중 에러:', error);
      setError('문제를 다시 불러올 수 없습니다.');
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      if (userAnswers[index] === question.answer) {
        correct++;
      }
    });
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">AWS 시험 문제를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <p className="text-red-600 mb-2">문제를 불러올 수 없습니다</p>
            <p className="text-sm text-gray-600 mb-4">
              {error || '문제 데이터가 없습니다.'}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              페이지 새로고침
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!examStarted && examType === 'timed') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            시간 제한 AWS 모의고사
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <p className="text-lg">시간 제한 시험을 시작하시겠습니까?</p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold">시험 정보:</p>
              <p>문제 수: {questionCount}개</p>
              <p>제한 시간: {formatTime(timeRemaining)}</p>
              <p>문제당 시간: 약 {Math.round(timeRemaining / questionCount / 60)}분</p>
            </div>
            <Button onClick={() => setExamStarted(true)} size="lg">
              시험 시작
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const score = calculateScore();
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            AWS 시험 결과
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-blue-600">{score.percentage}%</div>
            <p className="text-xl">
              총 {score.total}문제 중 {score.correct}문제 정답
            </p>
            <Badge variant={score.percentage >= 70 ? "default" : "destructive"} className="text-lg px-4 py-2">
              {score.percentage >= 70 ? "합격" : "불합격"}
            </Badge>
            
            {isAuthenticated && (
              <p className="text-sm text-green-600">
                ✅ 응시 기록이 저장되었습니다. 홈에서 응시 기록을 확인하세요!
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">문제 검토:</h3>
            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {questions.map((question, index) => {
                const userAnswer = userAnswers[index];
                const isCorrect = userAnswer === question.answer;
                
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-2">문제 {index + 1}</p>
                        <p className="text-sm text-gray-600 mb-2">{question.question_text.substring(0, 100)}...</p>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">선택한 답:</span>{' '}
                            <span className={userAnswer ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-gray-500'}>
                              {userAnswer ? `${userAnswer}: ${question.options[userAnswer as keyof typeof question.options]}` : '답안 미선택'}
                            </span>
                          </p>
                          {!isCorrect && (
                            <p>
                              <span className="font-medium">정답:</span>{' '}
                              <span className="text-green-600">
                                {question.answer}: {question.options[question.answer as keyof typeof question.options]}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleRestart} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              다시 시험보기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const userAnswer = userAnswers[currentQuestionIndex];
  const isCorrect = userAnswer === currentQuestion.answer;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                문제 {currentQuestionIndex + 1} / {questions.length}
              </Badge>
              {examType === 'timed' && (
                <Badge variant={timeRemaining < 300 ? "destructive" : "secondary"} className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(timeRemaining)}
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600">
              AWS 솔루션 아키텍트 모의고사
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">문제 {currentQuestionIndex + 1}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {currentQuestion.question_text}
          </p>

          <div className="space-y-3">
            {Object.entries(currentQuestion.options).map(([key, value]) => {
              let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-colors ';
              
              if (showInstantFeedback && userAnswer) {
                if (key === currentQuestion.answer) {
                  buttonClass += 'border-green-500 bg-green-50';
                } else if (key === userAnswer) {
                  buttonClass += 'border-red-500 bg-red-50';
                } else {
                  buttonClass += 'border-gray-200 bg-gray-50';
                }
              } else if (userAnswer === key) {
                buttonClass += 'border-blue-500 bg-blue-50';
              } else {
                buttonClass += 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
              }

              return (
                <button
                  key={key}
                  onClick={() => handleAnswerSelect(key)}
                  className={buttonClass}
                  disabled={showInstantFeedback && examType === 'practice'}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600 flex-shrink-0">{key}.</span>
                      {showInstantFeedback && key === currentQuestion.answer && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {showInstantFeedback && key === userAnswer && key !== currentQuestion.answer && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <span className="text-gray-800">{value}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Instant Feedback for Practice Mode */}
          {showInstantFeedback && examType === 'practice' && userAnswer && (
            <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {isCorrect ? '정답입니다!' : '틀렸습니다'}
                </span>
              </div>
              
              {!isCorrect && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">정답:</span>{' '}
                  <span className="text-green-700 font-medium">
                    {currentQuestion.answer}: {currentQuestion.options[currentQuestion.answer]}
                  </span>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              variant="outline"
            >
              이전 문제
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {Object.keys(userAnswers).length} / {questions.length} 문제 완료
              </span>
            </div>

            <div className="flex gap-2">
              {currentQuestionIndex === questions.length - 1 ? (
                <Button onClick={handleSubmit}>
                  시험 제출
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  다음 문제
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}