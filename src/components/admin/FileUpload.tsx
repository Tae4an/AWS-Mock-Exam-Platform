import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Plus,
  Trash2
} from 'lucide-react';
import { Question } from '@/data/sampleQuestions';

interface ParsedQuestion {
  question: string;
  options: string[];
  correctAnswers: number[];
  type: 'single' | 'multiple';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

interface FileUploadProps {
  onQuestionsUploaded: (questions: Question[]) => void;
}

export default function FileUpload({ onQuestionsUploaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const parseTextContent = (content: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentQuestion: Partial<ParsedQuestion> = {};
    let questionIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Question detection
      if (line.match(/^(문제|질문|Q\d*)[:s]/i) || line.match(/^\d+\./)) {
        if (currentQuestion.question) {
          // Save previous question if complete
          if (isQuestionComplete(currentQuestion)) {
            questions.push(finalizeQuestion(currentQuestion, questionIndex++));
          }
          currentQuestion = {};
        }
        currentQuestion.question = line.replace(/^(문제|질문|Q\d*)[:s]|\d+\./i, '').trim();
      }
      
      // Options detection
      else if (line.match(/^[A-D]\)|^[1-4]\)|^[가-라]\)/)) {
        if (!currentQuestion.options) {
          currentQuestion.options = [];
        }
        const optionText = line.replace(/^[A-D]\)|^[1-4]\)|^[가-라]\)/, '').trim();
        currentQuestion.options.push(optionText);
      }
      
      // Multiple choice format (A) B) C) D) in one line)
      else if (line.match(/[A-D]\)/g)) {
        const optionMatches = line.split(/(?=[A-D]\))/);
        currentQuestion.options = optionMatches
          .filter(opt => opt.trim())
          .map(opt => opt.replace(/^[A-D]\)/, '').trim());
      }
      
      // Correct answer detection
      else if (line.match(/^(정답|답|answer)[:s]/i)) {
        const answerText = line.replace(/^(정답|답|answer)[:s]/i, '').trim();
        currentQuestion.correctAnswers = parseAnswers(answerText);
        currentQuestion.type = currentQuestion.correctAnswers.length > 1 ? 'multiple' : 'single';
      }
      
      // Explanation detection
      else if (line.match(/^(해설|설명|explanation)[:s]/i)) {
        currentQuestion.explanation = line.replace(/^(해설|설명|explanation)[:s]/i, '').trim();
      }
      
      // Category detection
      else if (line.match(/^(영역|분야|category)[:s]/i)) {
        currentQuestion.category = line.replace(/^(영역|분야|category)[:s]/i, '').trim();
      }
      
      // Difficulty detection
      else if (line.match(/^(난이도|difficulty)[:s]/i)) {
        const diffText = line.replace(/^(난이도|difficulty)[:s]/i, '').trim().toLowerCase();
        if (diffText.includes('쉬움') || diffText.includes('easy')) {
          currentQuestion.difficulty = 'easy';
        } else if (diffText.includes('어려움') || diffText.includes('hard')) {
          currentQuestion.difficulty = 'hard';
        } else {
          currentQuestion.difficulty = 'medium';
        }
      }
    }
    
    // Add last question
    if (currentQuestion.question && isQuestionComplete(currentQuestion)) {
      questions.push(finalizeQuestion(currentQuestion, questionIndex));
    }
    
    return questions;
  };

  const parseAnswers = (answerText: string): number[] => {
    const answers: number[] = [];
    const cleanText = answerText.replace(/[,\s]/g, '');
    
    for (const char of cleanText) {
      if (char >= 'A' && char <= 'D') {
        answers.push(char.charCodeAt(0) - 'A'.charCodeAt(0));
      } else if (char >= '1' && char <= '4') {
        answers.push(parseInt(char) - 1);
      } else if (char >= 'a' && char <= 'd') {
        answers.push(char.charCodeAt(0) - 'a'.charCodeAt(0));
      }
    }
    
    return answers.length > 0 ? answers : [0];
  };

  const isQuestionComplete = (q: Partial<ParsedQuestion>): boolean => {
    return !!(q.question && q.options && q.options.length >= 2 && q.correctAnswers);
  };

  const finalizeQuestion = (q: Partial<ParsedQuestion>, index: number): ParsedQuestion => {
    return {
      question: q.question || '',
      options: q.options || [],
      correctAnswers: q.correctAnswers || [0],
      type: q.type || 'single',
      category: q.category || '기타',
      difficulty: q.difficulty || 'medium',
      explanation: q.explanation
    };
  };

  const handleFileRead = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);
    
    try {
      const content = await readFileContent(file);
      
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const parsed = parseTextContent(content);
      
      if (parsed.length === 0) {
        throw new Error('파일에서 문제를 찾을 수 없습니다. 파일 형식을 확인해주세요.');
      }
      
      setParsedQuestions(parsed);
      setUploadStatus('success');
      setErrorMessage('');
      
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      
      reader.onerror = () => {
        reject(new Error('파일을 읽을 수 없습니다.'));
      };
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file, 'utf-8');
      } else {
        reject(new Error('현재 TXT 파일만 지원됩니다. Word 파일 지원은 곧 추가될 예정입니다.'));
      }
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => 
      file.type === 'text/plain' || 
      file.name.endsWith('.txt') ||
      file.name.endsWith('.docx')
    );
    
    if (validFile) {
      handleFileRead(validFile);
    } else {
      setUploadStatus('error');
      setErrorMessage('TXT 또는 DOCX 파일만 업로드 가능합니다.');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileRead(file);
    }
  };

  const handleConfirmUpload = () => {
    const questions: Question[] = parsedQuestions.map((q, index) => ({
      id: `uploaded_${Date.now()}_${index}`,
      ...q
    }));
    
    onQuestionsUploaded(questions);
    
    // Reset state
    setParsedQuestions([]);
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  const updateQuestion = (index: number, field: keyof ParsedQuestion, value: string | string[] | number[] | 'single' | 'multiple' | 'easy' | 'medium' | 'hard') => {
    setParsedQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const removeQuestion = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const downloadTemplate = () => {
    const template = `문제: 다음 중 올바른 답은?
A) 선택지 1
B) 선택지 2
C) 선택지 3
D) 선택지 4
정답: A
영역: 수학
난이도: 쉬움
해설: 이것이 정답인 이유입니다.

문제: 복수 정답 문제 예시
A) 첫 번째 정답
B) 틀린 답
C) 두 번째 정답
D) 틀린 답
정답: A,C
영역: 과학
난이도: 보통
해설: A와 C가 모두 정답입니다.`;

    const blob = new Blob([template], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '문제_업로드_템플릿.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            문제 파일 업로드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">파일 업로드</TabsTrigger>
              <TabsTrigger value="template">템플릿 다운로드</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  파일을 드래그하여 업로드하거나 클릭하여 선택하세요
                </h3>
                <p className="text-gray-500 mb-4">
                  TXT 파일을 지원합니다 (DOCX 지원 예정)
                </p>
                <Input
                  type="file"
                  accept=".txt,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    파일 선택
                  </Button>
                </Label>
              </div>

              {/* Upload Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>파일 처리 중...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* Upload Status */}
              {uploadStatus === 'success' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {parsedQuestions.length}개의 문제가 성공적으로 파싱되었습니다.
                  </AlertDescription>
                </Alert>
              )}

              {uploadStatus === 'error' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="template" className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">파일 형식 가이드</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>문제:</strong> [문제 내용]</p>
                  <p><strong>선택지:</strong> A) 선택지1 B) 선택지2 C) 선택지3 D) 선택지4</p>
                  <p><strong>정답:</strong> A (단일 선택) 또는 A,C (복수 선택)</p>
                  <p><strong>영역:</strong> 수학, 과학, 국어, 영어, 역사 등</p>
                  <p><strong>난이도:</strong> 쉬움, 보통, 어려움</p>
                  <p><strong>해설:</strong> [해설 내용] (선택사항)</p>
                </div>
              </div>
              
              <Button onClick={downloadTemplate} className="w-full flex items-center gap-2">
                <Download className="h-4 w-4" />
                템플릿 파일 다운로드
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Parsed Questions Preview */}
      {parsedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>파싱된 문제 미리보기 ({parsedQuestions.length}개)</span>
              <Button onClick={handleConfirmUpload} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                문제 추가 확정
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {parsedQuestions.map((question, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-2">
                        <Badge variant="outline">문제 {index + 1}</Badge>
                        <Badge variant={question.difficulty === 'easy' ? 'secondary' : 
                                      question.difficulty === 'medium' ? 'default' : 'destructive'}>
                          {question.difficulty === 'easy' ? '쉬움' : 
                           question.difficulty === 'medium' ? '보통' : '어려움'}
                        </Badge>
                        <Badge variant="outline">{question.category}</Badge>
                        <Badge variant={question.type === 'single' ? 'default' : 'secondary'}>
                          {question.type === 'single' ? '단일선택' : '복수선택'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">문제</Label>
                        <p className="text-sm mt-1">{question.question}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">선택지</Label>
                        <div className="mt-1 space-y-1">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2 text-sm">
                              <span className={`font-medium ${
                                question.correctAnswers.includes(optIndex) 
                                  ? 'text-green-600' 
                                  : 'text-gray-600'
                              }`}>
                                {String.fromCharCode(65 + optIndex)})
                              </span>
                              <span className={
                                question.correctAnswers.includes(optIndex) 
                                  ? 'text-green-600 font-medium' 
                                  : ''
                              }>
                                {option}
                              </span>
                              {question.correctAnswers.includes(optIndex) && (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {question.explanation && (
                        <div>
                          <Label className="text-sm font-medium">해설</Label>
                          <p className="text-sm mt-1 text-gray-600">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}