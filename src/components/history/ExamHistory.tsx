import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Target, Award, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ExamResult } from '@/types/user';

interface ExamHistoryProps {
  onViewWrongQuestions: () => void;
}

export default function ExamHistory({ onViewWrongQuestions }: ExamHistoryProps) {
  const { getExamHistory } = useAuth();
  const examHistory = getExamHistory();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 70) return 'text-blue-600 bg-blue-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const calculateStats = () => {
    if (examHistory.length === 0) return null;

    const totalExams = examHistory.length;
    const averageScore = Math.round(
      examHistory.reduce((sum, exam) => sum + exam.percentage, 0) / totalExams
    );
    const bestScore = Math.max(...examHistory.map(exam => exam.percentage));
    const totalTimeSpent = examHistory.reduce((sum, exam) => sum + exam.timeSpent, 0);

    return { totalExams, averageScore, bestScore, totalTimeSpent };
  };

  const stats = calculateStats();

  if (examHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">아직 응시한 시험이 없습니다</h3>
        <p className="text-gray-600 mb-6">첫 번째 모의고사를 응시해보세요!</p>
        <Button onClick={() => window.location.reload()}>
          모의고사 시작하기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalExams}</div>
              <div className="text-sm text-gray-600">총 응시 횟수</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.averageScore}%</div>
              <div className="text-sm text-gray-600">평균 점수</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.bestScore}%</div>
              <div className="text-sm text-gray-600">최고 점수</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{formatTime(stats.totalTimeSpent)}</div>
              <div className="text-sm text-gray-600">총 학습 시간</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wrong Questions Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">응시 기록</h2>
        <Button onClick={onViewWrongQuestions} variant="outline">
          틀린 문제 복습하기
        </Button>
      </div>

      {/* Exam History List */}
      <div className="space-y-4">
        {examHistory
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
          .map((exam) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${getScoreColor(exam.percentage)}`}>
                      <span className="text-xl font-bold">{exam.percentage}%</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={exam.examType === 'timed' ? 'default' : 'secondary'}>
                          {exam.examType === 'timed' ? '시간 제한' : '연습 모드'}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {exam.questionCount}문제
                        </span>
                      </div>
                      
                      <div className="text-lg font-semibold text-gray-900 mb-1">
                        {exam.score}/{exam.totalQuestions} 정답
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(exam.completedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatTime(exam.timeSpent)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge 
                      variant={exam.percentage >= 70 ? 'default' : 'destructive'}
                      className="mb-2"
                    >
                      {exam.percentage >= 70 ? '합격' : '불합격'}
                    </Badge>
                    <div className="text-sm text-gray-600">
                      틀린 문제: {exam.wrongQuestions.length}개
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}