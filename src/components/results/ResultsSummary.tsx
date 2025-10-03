import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trophy, 
  Clock, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  ArrowLeft,
  BarChart3
} from 'lucide-react';
import { Question, sampleQuestions } from '@/data/sampleQuestions';
import { useAuth } from '@/contexts/AuthContext';

interface ExamResult {
  questionId: string;
  selectedAnswers: number[];
  isCorrect: boolean;
  timeSpent: number;
}

interface ResultsSummaryProps {
  examId: string;
  results: ExamResult[];
  totalTime: number;
  onRetakeWrongAnswers: () => void;
  onRetakeExam: () => void;
  onBackToList: () => void;
}

export default function ResultsSummary({ 
  examId, 
  results, 
  totalTime, 
  onRetakeWrongAnswers, 
  onRetakeExam, 
  onBackToList 
}: ResultsSummaryProps) {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('summary');

  // Calculate statistics
  const totalQuestions = results.length;
  const correctAnswers = results.filter(r => r.isCorrect).length;
  const wrongAnswers = totalQuestions - correctAnswers;
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const averageTimePerQuestion = Math.round(totalTime / totalQuestions / 1000);

  // Get wrong answer details
  const wrongResults = results.filter(r => !r.isCorrect);
  const wrongQuestions = wrongResults.map(result => {
    const question = sampleQuestions.find(q => q.id === result.questionId);
    return { result, question };
  }).filter(item => item.question);

  // Category analysis
  const categoryStats = sampleQuestions.reduce((acc, question) => {
    const result = results.find(r => r.questionId === question.id);
    if (result) {
      if (!acc[question.category]) {
        acc[question.category] = { total: 0, correct: 0 };
      }
      acc[question.category].total++;
      if (result.isCorrect) {
        acc[question.category].correct++;
      }
    }
    return acc;
  }, {} as Record<string, { total: number; correct: number }>);

  // Difficulty analysis
  const difficultyStats = sampleQuestions.reduce((acc, question) => {
    const result = results.find(r => r.questionId === question.id);
    if (result) {
      if (!acc[question.difficulty]) {
        acc[question.difficulty] = { total: 0, correct: 0 };
      }
      acc[question.difficulty].total++;
      if (result.isCorrect) {
        acc[question.difficulty].correct++;
      }
    }
    return acc;
  }, {} as Record<string, { total: number; correct: number }>);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분 ${seconds % 60}초`;
    }
    return `${minutes}분 ${seconds % 60}초`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGrade = (score: number) => {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  };

  // Save results to localStorage for history
  React.useEffect(() => {
    const examHistory = JSON.parse(localStorage.getItem(`examHistory_${user?.id}`) || '[]');
    const newResult = {
      examId,
      date: new Date().toISOString(),
      score,
      correctAnswers,
      totalQuestions,
      totalTime,
      grade: getGrade(score)
    };
    
    examHistory.unshift(newResult);
    // Keep only last 10 results
    if (examHistory.length > 10) {
      examHistory.splice(10);
    }
    
    localStorage.setItem(`examHistory_${user?.id}`, JSON.stringify(examHistory));
  }, [examId, score, correctAnswers, totalQuestions, totalTime, user?.id]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={onBackToList} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                목록으로
              </Button>
              <Badge variant="outline" className="text-sm">
                모의고사 #{examId} 결과
              </Badge>
            </div>
            <div className="text-sm text-gray-600">
              {new Date().toLocaleDateString('ko-KR')} 응시
            </div>
          </div>

          {/* Score Display */}
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Trophy className={`h-12 w-12 ${getScoreColor(score)}`} />
              <div>
                <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
                  {score}
                </div>
                <div className="text-2xl font-semibold text-gray-600">
                  {getGrade(score)}
                </div>
              </div>
            </div>
            <p className="text-lg text-gray-600">
              {totalQuestions}문제 중 {correctAnswers}문제 정답 ({score}점)
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                <div className="text-sm text-gray-600">정답</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{wrongAnswers}</div>
                <div className="text-sm text-gray-600">오답</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{averageTimePerQuestion}초</div>
                <div className="text-sm text-gray-600">평균 소요시간</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">{formatTime(totalTime)}</div>
                <div className="text-sm text-gray-600">총 소요시간</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Analysis */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">요약</TabsTrigger>
            <TabsTrigger value="wrong">오답 분석</TabsTrigger>
            <TabsTrigger value="category">영역별 분석</TabsTrigger>
            <TabsTrigger value="difficulty">난이도별 분석</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  성적 분석
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>정답률</span>
                      <span className="font-semibold">{score}%</span>
                    </div>
                    <Progress value={score} className="h-3" />
                  </div>
                  
                  <Alert>
                    <AlertDescription>
                      {score >= 90 ? (
                        <span className="text-green-700">
                          🎉 훌륭합니다! 매우 우수한 성적입니다.
                        </span>
                      ) : score >= 80 ? (
                        <span className="text-blue-700">
                          👍 좋은 성적입니다! 조금만 더 노력하면 더 좋은 결과를 얻을 수 있습니다.
                        </span>
                      ) : score >= 70 ? (
                        <span className="text-yellow-700">
                          📚 보통 수준입니다. 틀린 문제를 다시 풀어보며 실력을 향상시켜보세요.
                        </span>
                      ) : (
                        <span className="text-red-700">
                          💪 더 많은 학습이 필요합니다. 기초부터 차근차근 다시 공부해보세요.
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-4 pt-4">
                    <Button onClick={onRetakeExam} className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      다시 응시하기
                    </Button>
                    {wrongAnswers > 0 && (
                      <Button variant="outline" onClick={onRetakeWrongAnswers} className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        오답만 다시 풀기 ({wrongAnswers}문제)
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wrong" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  오답 분석 ({wrongAnswers}문제)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {wrongAnswers === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-green-700">모든 문제를 맞혔습니다!</p>
                    <p className="text-gray-600">완벽한 점수입니다. 축하합니다! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wrongQuestions.map(({ result, question }, index) => (
                      <Card key={result.questionId} className="border-red-200">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <Badge variant="destructive" className="text-xs">
                                문제 {sampleQuestions.findIndex(q => q.id === question!.id) + 1}
                              </Badge>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {question!.category}
                                </Badge>
                                <Badge variant={question!.difficulty === 'easy' ? 'secondary' : 
                                              question!.difficulty === 'medium' ? 'default' : 'destructive'} 
                                       className="text-xs">
                                  {question!.difficulty === 'easy' ? '쉬움' : 
                                   question!.difficulty === 'medium' ? '보통' : '어려움'}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="font-medium">{question!.question}</div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-red-600 mb-2">당신의 답:</p>
                                <div className="space-y-1">
                                  {result.selectedAnswers.map(answerIndex => (
                                    <div key={answerIndex} className="text-sm p-2 bg-red-50 rounded border-l-4 border-red-400">
                                      {question!.options[answerIndex]}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-sm font-medium text-green-600 mb-2">정답:</p>
                                <div className="space-y-1">
                                  {question!.correctAnswers.map(answerIndex => (
                                    <div key={answerIndex} className="text-sm p-2 bg-green-50 rounded border-l-4 border-green-400">
                                      {question!.options[answerIndex]}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            {question!.explanation && (
                              <Alert>
                                <AlertDescription>
                                  <strong>해설:</strong> {question!.explanation}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="category" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>영역별 성적 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(categoryStats).map(([category, stats]) => {
                    const percentage = Math.round((stats.correct / stats.total) * 100);
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{category}</span>
                          <span className="text-sm text-gray-600">
                            {stats.correct}/{stats.total} ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="difficulty" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>난이도별 성적 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(difficultyStats).map(([difficulty, stats]) => {
                    const percentage = Math.round((stats.correct / stats.total) * 100);
                    const difficultyLabel = difficulty === 'easy' ? '쉬움' : 
                                          difficulty === 'medium' ? '보통' : '어려움';
                    return (
                      <div key={difficulty} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{difficultyLabel}</span>
                          <span className="text-sm text-gray-600">
                            {stats.correct}/{stats.total} ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}