import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, FileText, BarChart3, Settings, Shield, Edit, Crown, User as UserIcon, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminService, quizService, User, QuizResult } from '../lib/supabase';

interface AdminStats {
  totalUsers: number;
  totalQuizzes: number;
  averageScore: number;
  activeUsers: number;
}

export default function Admin() {
  const { user, signOut } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalQuizzes: 0,
    averageScore: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Load users
      const usersResult = await adminService.getAllUsers();
      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data);
      }

      // Load quiz results
      const quizResultsResult = await adminService.getAllQuizResults();
      if (quizResultsResult.success && quizResultsResult.data) {
        setQuizResults(quizResultsResult.data);
      }

      // Calculate stats
      const totalUsers = usersResult.data?.length || 0;
      const totalQuizzes = quizResultsResult.data?.length || 0;
      const averageScore = totalQuizzes > 0 
        ? Math.round(quizResultsResult.data!.reduce((sum, result) => sum + result.score, 0) / totalQuizzes)
        : 0;
      const activeUsers = usersResult.data?.filter(u => 
        quizResultsResult.data?.some(q => q.user_id === u.id)
      ).length || 0;

      setStats({
        totalUsers,
        totalQuizzes,
        averageScore,
        activeUsers
      });

    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole: 'user' | 'admin') => {
    if (!selectedUser) return;

    const result = await adminService.updateUserRole(selectedUser.id, newRole);
    
    if (result.success) {
      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, role: newRole }
          : u
      ));
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
    } else {
      alert(`역할 변경 실패: ${result.error}`);
    }
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  // Check admin access
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-slate-800">접근 권한 없음</CardTitle>
            <CardDescription>
              관리자 권한이 필요한 페이지입니다.
              <br />
              현재 사용자: {user?.username || '로그인 필요'}
              <br />
              현재 역할: {user?.role || '없음'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              <Home className="h-4 w-4 mr-2" />
              메인으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">관리자 대시보드</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-100 rounded-full">
                <Crown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">{user.username} (관리자)</span>
              </div>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Home className="h-4 w-4 mr-2" />
                메인으로
              </Button>
              <Button 
                onClick={signOut}
                variant="outline" 
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">전체 사용자</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">총 응시 횟수</p>
                  <p className="text-3xl font-bold text-teal-600">{stats.totalQuizzes}</p>
                </div>
                <FileText className="h-8 w-8 text-teal-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">평균 점수</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.averageScore}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">활성 사용자</p>
                  <p className="text-3xl font-bold text-indigo-600">{stats.activeUsers}</p>
                </div>
                <Settings className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1">
            <TabsTrigger value="users" className="data-[state=active]:bg-slate-100">
              <Users className="h-4 w-4 mr-2" />
              사용자 관리
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-slate-100">
              <FileText className="h-4 w-4 mr-2" />
              응시 기록
            </TabsTrigger>
          </TabsList>

          {/* Users Management */}
          <TabsContent value="users">
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-800">사용자 관리</CardTitle>
                <CardDescription>
                  등록된 사용자 목록과 역할을 관리할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>사용자명</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>응시 횟수</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const userQuizCount = quizResults.filter(q => q.user_id === user.id).length;
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                {user.role === 'admin' ? '관리자' : '사용자'}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(user.created_at)}</TableCell>
                            <TableCell>{userQuizCount}</TableCell>
                            <TableCell>
                              <Button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsRoleDialogOpen(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="border-slate-200 hover:bg-slate-50"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                역할 변경
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiz Results */}
          <TabsContent value="quizzes">
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-800">응시 기록</CardTitle>
                <CardDescription>
                  모든 사용자의 퀴즈 응시 기록을 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>사용자</TableHead>
                        <TableHead>모드</TableHead>
                        <TableHead>문제 수</TableHead>
                        <TableHead>정답 수</TableHead>
                        <TableHead>점수</TableHead>
                        <TableHead>소요 시간</TableHead>
                        <TableHead>완료 시간</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizResults.map((result) => {
                        const resultUser = users.find(u => u.id === result.user_id);
                        return (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">
                              {resultUser?.username || '알 수 없음'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={result.quiz_mode === 'exam' ? 'default' : 'secondary'}>
                                {result.quiz_mode === 'exam' ? '실전' : '연습'}
                              </Badge>
                            </TableCell>
                            <TableCell>{result.total_questions}</TableCell>
                            <TableCell>{result.correct_answers}</TableCell>
                            <TableCell>
                              <span className={`font-bold ${result.score >= 720 ? 'text-teal-600' : 'text-orange-600'}`}>
                                {result.score}
                              </span>
                            </TableCell>
                            <TableCell>{formatDuration(result.time_taken)}</TableCell>
                            <TableCell>{formatDate(result.completed_at)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>사용자 역할 변경</DialogTitle>
            <DialogDescription>
              {selectedUser?.username}님의 역할을 변경하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">현재 역할:</span>
                <Badge variant={selectedUser?.role === 'admin' ? 'destructive' : 'secondary'}>
                  {selectedUser?.role === 'admin' ? '관리자' : '사용자'}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsRoleDialogOpen(false)}
            >
              취소
            </Button>
            <Button 
              onClick={() => handleRoleChange(selectedUser?.role === 'admin' ? 'user' : 'admin')}
              className={selectedUser?.role === 'admin' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'}
            >
              {selectedUser?.role === 'admin' ? '사용자로 변경' : '관리자로 변경'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}