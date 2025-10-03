import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, BarChart3, Settings } from 'lucide-react';
import QuestionManager from './QuestionManager';

const Dashboard: React.FC = () => {
  const stats = {
    totalQuestions: 100, // Fixed to 100 AWS questions
    totalUsers: 0, // No user management needed
    totalExams: 0, // No exam history tracking
    systemStatus: 'Active'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
        <Badge variant="outline" className="text-sm">
          AWS 모의고사 시스템
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 문제 수</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              AWS 솔루션 아키텍트 문제
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">문제 은행</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">준비됨</div>
            <p className="text-xs text-muted-foreground">
              모든 문제 로드 완료
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">시험 유형</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              연습 & 시간제한 모드
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">시스템 상태</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">활성</div>
            <p className="text-xs text-muted-foreground">
              모든 시스템 정상 작동
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>시스템 개요</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">AWS 모의고사 시스템</h3>
              <p className="text-sm text-blue-800">
                이 시스템은 신중하게 선별된 100개의 AWS 솔루션 아키텍트 어소시에이트 시험 문제를 포함합니다. 
                사용자는 AWS 자격증 준비를 위해 연습 시험 또는 시간 제한 시험을 볼 수 있습니다.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">사용 가능한 기능:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 연습 모드 (시간 제한 없음)</li>
                  <li>• 시간 제한 모드 (65분)</li>
                  <li>• 상세한 답안 해설</li>
                  <li>• 점수 추적 및 분석</li>
                  <li>• 완료 후 문제 검토</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">문제 범위:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 모든 AWS 핵심 서비스</li>
                  <li>• 아키텍처 모범 사례</li>
                  <li>• 보안 및 규정 준수</li>
                  <li>• 비용 최적화</li>
                  <li>• 성능 및 확장성</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Management */}
      <QuestionManager />
    </div>
  );
};

export default Dashboard;