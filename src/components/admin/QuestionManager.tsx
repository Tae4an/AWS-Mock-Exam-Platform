import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, Edit, Trash2, Plus, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { questionService, Question as DBQuestion } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
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
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function QuestionManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const { toast } = useToast();

  // Load questions with pagination
  useEffect(() => {
    loadQuestions();
  }, [currentPage, searchTerm, itemsPerPage]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      let result;
      
      if (searchTerm) {
        result = await questionService.searchQuestions(searchTerm, currentPage, itemsPerPage);
      } else {
        result = await questionService.getQuestionsPaginated(currentPage, itemsPerPage);
      }

      if (result.success && result.data) {
        setQuestions(result.data as Question[]);
        setTotalPages(result.totalPages || 1);
        setTotalQuestions(result.total || 0);
      } else {
        toast({
          title: '오류',
          description: result.error || '문제를 불러오는데 실패했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('문제 로드 오류:', error);
      toast({
        title: '오류',
        description: '문제를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question: Question) => {
    setSelectedQuestion(question);
    setEditForm(question);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (question: Question) => {
    setSelectedQuestion(question);
    setIsDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditForm({
      question_text: '',
      options: { A: '', B: '', C: '', D: '' },
      answer: '',
      explanation: '',
      category: 'SAA',
      difficulty: 'medium'
    });
    setIsAddDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedQuestion) return;

    const result = await questionService.deleteQuestion(selectedQuestion.id);
    if (result.success) {
      toast({
        title: '성공',
        description: '문제가 삭제되었습니다.',
      });
      setIsDeleteDialogOpen(false);
      loadQuestions();
    } else {
      toast({
        title: '오류',
        description: result.error || '문제 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const saveEdit = async () => {
    if (!selectedQuestion || !editForm) return;

    const result = await questionService.updateQuestion(selectedQuestion.id, {
      question_text: editForm.question_text,
      options: editForm.options,
      answer: editForm.answer,
      explanation: editForm.explanation,
      category: editForm.category,
      difficulty: editForm.difficulty,
    });

    if (result.success) {
      toast({
        title: '성공',
        description: '문제가 수정되었습니다.',
      });
      setIsEditDialogOpen(false);
      loadQuestions();
    } else {
      toast({
        title: '오류',
        description: result.error || '문제 수정에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const saveNew = async () => {
    if (!editForm.question_text || !editForm.options || !editForm.answer) {
      toast({
        title: '오류',
        description: '필수 항목을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const result = await questionService.createQuestion({
      question_text: editForm.question_text,
      options: editForm.options as Record<string, string>,
      answer: editForm.answer,
      explanation: editForm.explanation,
      category: editForm.category || 'SAA',
      difficulty: editForm.difficulty || 'medium',
    });

    if (result.success) {
      toast({
        title: '성공',
        description: '새 문제가 추가되었습니다.',
      });
      setIsAddDialogOpen(false);
      loadQuestions();
    } else {
      toast({
        title: '오류',
        description: result.error || '문제 추가에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const getQuestionStats = () => {
    return {
      total: totalQuestions,
      multipleChoice: questions.filter(q => Object.keys(q.options).length === 4).length,
      extendedChoice: questions.filter(q => Object.keys(q.options).length > 4).length
    };
  };

  const stats = getQuestionStats();

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AWS 문제 은행 관리</h2>
          <p className="text-gray-600">AWS 솔루션 아키텍트 시험 문제를 관리하세요</p>
        </div>
        <Button onClick={handleAddNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          새 문제 추가
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 문제 수</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              AWS 솔루션 아키텍트 문제
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">4지선다 문제</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.multipleChoice}</div>
            <p className="text-xs text-muted-foreground">
              현재 페이지 기준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">확장 선택 문제</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.extendedChoice}</div>
            <p className="text-xs text-muted-foreground">
              5지선다 이상
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 페이지</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPages}</div>
            <p className="text-xs text-muted-foreground">
              {itemsPerPage}개씩 표시
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Question List */}
      <Card>
        <CardHeader>
          <CardTitle>문제 은행 ({totalQuestions}개 문제)</CardTitle>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="문제 검색..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">표시 개수:</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10개</SelectItem>
                  <SelectItem value="20">20개</SelectItem>
                  <SelectItem value="50">50개</SelectItem>
                  <SelectItem value="100">100개</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline">
              페이지 {currentPage} / {totalPages}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {questions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    문제가 없습니다.
                  </div>
                ) : (
                  questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            #{(currentPage - 1) * itemsPerPage + index + 1}
                          </Badge>
                          <Badge variant="secondary">
                            {Object.keys(question.options).length}지선다
                          </Badge>
                          <Badge 
                            variant={
                              question.difficulty === 'easy' ? 'default' : 
                              question.difficulty === 'hard' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {question.difficulty === 'easy' ? '쉬움' : 
                             question.difficulty === 'hard' ? '어려움' : '보통'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(question)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-800 mb-3">
                        {question.question_text.length > 200 
                          ? `${question.question_text.substring(0, 200)}...` 
                          : question.question_text}
                      </p>
                      
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        {Object.entries(question.options).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className={`font-medium ${question.answer === key ? 'text-green-600' : 'text-gray-500'}`}>
                              {key}:
                            </span>
                            <span className={`${question.answer === key ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                              {value.length > 100 ? `${value.substring(0, 100)}...` : value}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-xs text-green-600 font-medium">
                          정답: {question.answer}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
                
                <div className="text-sm text-gray-600">
                  {totalQuestions > 0 && (
                    <span>
                      {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalQuestions)} / {totalQuestions}
                    </span>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  다음
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>문제 수정</DialogTitle>
            <DialogDescription>
              문제의 내용을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">문제 내용</label>
              <Textarea
                value={editForm.question_text || ''}
                onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {editForm.options && Object.entries(editForm.options).map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm font-medium">선택지 {key}</label>
                  <Input
                    value={value}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      options: { ...editForm.options, [key]: e.target.value }
                    })}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">정답</label>
                <Input
                  value={editForm.answer || ''}
                  onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                  placeholder="A, B, C, D..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">카테고리</label>
                <Input
                  value={editForm.category || ''}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">난이도</label>
                <Select
                  value={editForm.difficulty}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                    setEditForm({ ...editForm, difficulty: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">쉬움</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="hard">어려움</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">해설</label>
              <Textarea
                value={editForm.explanation || ''}
                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={saveEdit}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 문제 추가</DialogTitle>
            <DialogDescription>
              새로운 문제를 추가합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">문제 내용 *</label>
              <Textarea
                value={editForm.question_text || ''}
                onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                rows={4}
                className="mt-1"
                placeholder="문제 내용을 입력하세요"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {['A', 'B', 'C', 'D', 'E', 'F'].map((key) => (
                <div key={key}>
                  <label className="text-sm font-medium">선택지 {key} {key <= 'D' ? '*' : ''}</label>
                  <Input
                    value={editForm.options?.[key as keyof typeof editForm.options] || ''}
                    onChange={(e) => {
                      const newOptions = { ...editForm.options };
                      if (e.target.value) {
                        newOptions[key as keyof typeof newOptions] = e.target.value;
                      } else if (key > 'D') {
                        delete newOptions[key as keyof typeof newOptions];
                      }
                      setEditForm({ ...editForm, options: newOptions });
                    }}
                    className="mt-1"
                    placeholder={`선택지 ${key}`}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">정답 *</label>
                <Input
                  value={editForm.answer || ''}
                  onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                  placeholder="A, B, C, D..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">카테고리</label>
                <Input
                  value={editForm.category || 'SAA'}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">난이도</label>
                <Select
                  value={editForm.difficulty || 'medium'}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                    setEditForm({ ...editForm, difficulty: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">쉬움</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="hard">어려움</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">해설</label>
              <Textarea
                value={editForm.explanation || ''}
                onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                rows={3}
                className="mt-1"
                placeholder="정답 해설을 입력하세요"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={saveNew}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문제 삭제</DialogTitle>
            <DialogDescription>
              정말 이 문제를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuestion && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-800 line-clamp-3">
                {selectedQuestion.question_text}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
