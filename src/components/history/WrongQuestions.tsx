import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WrongQuestion } from '@/types/user';

interface WrongQuestionsProps {
  onBack: () => void;
}

export default function WrongQuestions({ onBack }: WrongQuestionsProps) {
  const { getWrongQuestions } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  
  const wrongQuestions = getWrongQuestions();

  const handleNext = () => {
    if (currentIndex < wrongQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowAnswer(false);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (wrongQuestions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">틀린 문제 복습</h1>
        </div>

        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">모든 문제를 맞혔습니다!</h3>
          <p className="text-gray-600 mb-6">틀린 문제가 없습니다. 계속해서 좋은 성과를 유지하세요!</p>
          <Button onClick={onBack}>
            응시 기록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = wrongQuestions[currentIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">틀린 문제 복습</h1>
        </div>
        
        <Badge variant="outline" className="text-lg px-4 py-2">
          {currentIndex + 1} / {wrongQuestions.length}
        </Badge>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              문제 {currentQuestion.questionIndex + 1}
            </CardTitle>
            <Badge variant="secondary">
              {formatDate(currentQuestion.attemptedAt)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {currentQuestion.questionText}
          </p>

          <div className="space-y-3">
            {Object.entries(currentQuestion.options).map(([key, value]) => {
              let buttonClass = 'w-full text-left p-4 rounded-lg border-2 transition-colors ';
              
              if (showAnswer) {
                if (key === currentQuestion.correctAnswer) {
                  buttonClass += 'border-green-500 bg-green-50';
                } else if (key === currentQuestion.userAnswer) {
                  buttonClass += 'border-red-500 bg-red-50';
                } else {
                  buttonClass += 'border-gray-200 bg-gray-50';
                }
              } else {
                buttonClass += 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
              }

              return (
                <div key={key} className={buttonClass}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600 flex-shrink-0">
                        {key}.
                      </span>
                      {showAnswer && key === currentQuestion.correctAnswer && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {showAnswer && key === currentQuestion.userAnswer && key !== currentQuestion.correctAnswer && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <span className="text-gray-800">{value}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {showAnswer && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">답안 해설</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">정답:</span>{' '}
                  <span className="text-green-600 font-medium">
                    {currentQuestion.correctAnswer}: {currentQuestion.options[currentQuestion.correctAnswer]}
                  </span>
                </p>
                <p>
                  <span className="font-medium">선택한 답:</span>{' '}
                  <span className="text-red-600 font-medium">
                    {currentQuestion.userAnswer}: {currentQuestion.options[currentQuestion.userAnswer]}
                  </span>
                </p>
              </div>
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
              disabled={currentIndex === 0}
              variant="outline"
            >
              이전 문제
            </Button>

            <div className="flex gap-2">
              {!showAnswer ? (
                <Button onClick={handleShowAnswer}>
                  정답 확인
                </Button>
              ) : (
                <Button onClick={() => setShowAnswer(false)} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  다시 풀기
                </Button>
              )}
            </div>

            <Button
              onClick={handleNext}
              disabled={currentIndex === wrongQuestions.length - 1}
            >
              다음 문제
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}