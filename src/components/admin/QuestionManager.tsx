import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, BarChart3, BookOpen } from 'lucide-react';
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
    F?: string;
  };
  answer: string | string[];
}

export default function QuestionManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Load questions from Supabase
  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      const result = await questionService.getAllQuestions();
      if (result.success && result.data) {
        const mappedQuestions = result.data.map((q, idx) => ({
          question_number: idx + 1,
          question_text: q.question_text,
          options: q.options,
          answer: q.answer
        }));
        setQuestions(mappedQuestions);
        setFilteredQuestions(mappedQuestions);
      }
      setLoading(false);
    };
    loadQuestions();
  }, []);

  useEffect(() => {
    const filtered = questions.filter(question =>
      question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.question_number.toString().includes(searchTerm)
    );
    setFilteredQuestions(filtered);
  }, [searchTerm, questions]);

  const getQuestionStats = () => {
    const totalQuestions = questions.length;
    const multipleChoiceCount = questions.filter(q => Object.keys(q.options).length === 4).length;
    const extendedChoiceCount = questions.filter(q => Object.keys(q.options).length === 5).length;
    
    return {
      total: totalQuestions,
      multipleChoice: multipleChoiceCount,
      extendedChoice: extendedChoiceCount
    };
  };

  const stats = getQuestionStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AWS 문제 은행 관리</h2>
          <p className="text-gray-600">AWS 솔루션 아키텍트 시험 문제를 관리하세요</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            개요
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            문제 은행
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 문제 수</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
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
                  표준 객관식
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">5지선다 문제</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.extendedChoice}</div>
                <p className="text-xs text-muted-foreground">
                  확장 객관식
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>문제 은행 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <h3 className="font-semibold text-green-800">AWS 솔루션 아키텍트 문제 은행</h3>
                    <p className="text-sm text-green-600">100개의 전문가 수준 문제가 로드되어 준비됨</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">활성</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">문제 범위:</span> 1-100
                  </div>
                  <div>
                    <span className="font-medium">형식:</span> 객관식
                  </div>
                  <div>
                    <span className="font-medium">난이도:</span> 전문가 수준
                  </div>
                  <div>
                    <span className="font-medium">출처:</span> AWS 공인 솔루션 아키텍트
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>문제 은행 ({questions.length}개 문제)</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="문제 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Badge variant="outline">
                  {filteredQuestions.length} / {questions.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredQuestions.map((question, index) => (
                  <div key={question.question_number} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline">문제 {question.question_number}</Badge>
                      <Badge variant="secondary">
                        {Object.keys(question.options).length}지선다
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-800 mb-3 line-clamp-3">
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
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}