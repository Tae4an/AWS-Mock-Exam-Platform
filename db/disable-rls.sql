-- RLS 정책 비활성화 (개발용)
-- 수파베이스 SQL 에디터에서 실행하세요

-- 1. questions 테이블 RLS 비활성화
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;

-- 2. user_profiles 테이블 RLS 비활성화  
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. quiz_results 테이블 RLS 비활성화
ALTER TABLE public.quiz_results DISABLE ROW LEVEL SECURITY;

-- 4. quiz_question_results 테이블 RLS 비활성화
ALTER TABLE public.quiz_question_results DISABLE ROW LEVEL SECURITY;

-- 확인용 쿼리
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('questions', 'user_profiles', 'quiz_results', 'quiz_question_results');

