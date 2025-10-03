import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Target, TrendingUp, Award, FileText } from 'lucide-react';
import { questionService } from '@/lib/supabase';

interface DashboardProps {
  onStartExam: (type: 'practice' | 'timed', questionCount: number) => void;
}

export default function Dashboard({ onStartExam }: DashboardProps) {
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    const loadQuestionCount = async () => {
      const result = await questionService.getAllQuestions();
      if (result.success && result.data) {
        setTotalQuestions(result.data.length);
      }
    };
    loadQuestionCount();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">AWS 솔루션 아키텍트 모의고사</h1>
        <p className="text-gray-600">
          {totalQuestions}개의 전문 AWS 자격증 문제로 연습하세요
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 문제 수</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              AWS 인증 문제
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">문제 유형</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">객관식</div>
            <p className="text-xs text-muted-foreground">
              문제당 4-5개 선택지
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">난이도</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">전문가</div>
            <p className="text-xs text-muted-foreground">
              AWS SAA-C03 수준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">합격 점수</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">70%</div>
            <p className="text-xs text-muted-foreground">
              최소 합격 점수
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exam Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              연습 모드
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              시간 제한 없이 자신의 속도에 맞춰 연습하고 즉시 피드백을 받으세요.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">빠른 연습</span>
                <Badge variant="outline">25문제</Badge>
              </div>
              <Button 
                onClick={() => onStartExam('practice', 25)}
                variant="outline" 
                className="w-full"
              >
                빠른 연습 시작
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">절반 시험</span>
                <Badge variant="outline">50문제</Badge>
              </div>
              <Button 
                onClick={() => onStartExam('practice', 50)}
                variant="outline" 
                className="w-full"
              >
                절반 시험 시작
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">전체 연습</span>
                <Badge variant="outline">100문제</Badge>
              </div>
              <Button 
                onClick={() => onStartExam('practice', 100)}
                variant="outline" 
                className="w-full"
              >
                전체 연습 시작
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              시간 제한 시험
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              실제 시험 환경을 시뮬레이션하여 시간 제한과 최종 점수로 실력을 테스트하세요.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">빠른 테스트</span>
                <Badge variant="outline">25문제 • 37.5분</Badge>
              </div>
              <Button 
                onClick={() => onStartExam('timed', 25)}
                variant="outline" 
                className="w-full"
              >
                빠른 테스트 시작
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">절반 시험</span>
                <Badge variant="outline">50문제 • 75분</Badge>
              </div>
              <Button 
                onClick={() => onStartExam('timed', 50)}
                variant="outline" 
                className="w-full"
              >
                절반 시험 시작
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">전체 시험</span>
                <Badge variant="outline">100문제 • 150분</Badge>
              </div>
              <Button 
                onClick={() => onStartExam('timed', 100)}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                전체 시험 시작
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Study Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            AWS 시험 팁
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">시작하기 전에:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• AWS Well-Architected Framework 검토</li>
                <li>• 핵심 AWS 서비스 이해</li>
                <li>• 실습 랩으로 연습</li>
                <li>• 보안 및 비용 최적화에 집중</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">시험 중에:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 문제를 주의 깊게 읽기</li>
                <li>• 명백히 틀린 답안 제거</li>
                <li>• 비용 효율성 고려</li>
                <li>• 운영 우수성 생각하기</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}