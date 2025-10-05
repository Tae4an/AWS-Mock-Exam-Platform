# AWS Mock Exam Platform

AWS Solutions Architect Associate (SAA-C03) 자격증 모의고사 플랫폼

## 서비스 이용

**바로 시작하기**: [https://your-app-url.vercel.app](https://your-app-url.vercel.app)

회원가입 후 994개의 AWS SAA 문제로 실전 대비 연습을 시작하세요!

### 주요 기능

- **994개의 AWS SAA 연습 문제**
- **연습 모드**: 즉시 정답 확인 및 해설 제공
- **실전 모드**: 130분 시간제한 모의고사 (65문제)
- **응시 기록**: 개인별 응시 기록 및 성적 분석

## 기술 스택

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth)
- **Deploy**: Vercel / Netlify

## 개발자용 - 로컬 실행

### 설치

```bash
git clone https://github.com/Tae4an/AWS-Mock-Exam-Platform.git
cd AWS-Mock-Exam-Platform
pnpm install
```

### 환경 설정

```bash
cp .env.example .env
# .env 파일에 Supabase 정보 입력
```

### 실행

```bash
pnpm dev
# http://localhost:5173 접속
```

## 라이센스

MIT License

---

**Made with ❤️ for AWS Certification**

