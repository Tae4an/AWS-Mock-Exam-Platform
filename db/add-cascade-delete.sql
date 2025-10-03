-- user_profiles 삭제 시 관련 데이터도 함께 삭제되도록 CASCADE 설정
-- 수파베이스 SQL 에디터에서 실행하세요

-- 기존 외래 키 제약 조건 확인
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS foreign_table
FROM pg_constraint
WHERE confrelid = 'user_profiles'::regclass;

-- quiz_results 테이블의 user_id 외래 키를 CASCADE로 변경
ALTER TABLE quiz_results 
DROP CONSTRAINT IF EXISTS quiz_results_user_id_fkey;

ALTER TABLE quiz_results
ADD CONSTRAINT quiz_results_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id) 
ON DELETE CASCADE;

-- Auth 사용자 삭제 시 user_profiles도 삭제하는 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (이미 있다면 재생성)
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_deleted();

-- 확인
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname LIKE '%user_id%' AND conrelid::regclass::text LIKE '%quiz%';

