# AWS Mock Exam Platform

AWS Solutions Architect Associate (SAA-C03) 자격증 모의고사 플랫폼
## 서비스 이용
[AWS Mock Exam Platform 바로가기](https://aws-mock-exam-platform.vercel.app/)

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
- **Deploy**: Vercel

## 시스템 아키텍처

이 프로젝트는 **BaaS(Backend as a Service) 기반 Serverless** 아키텍처를 채택하고 있습니다.
<img width="1395" height="385" alt="image" src="https://github.com/user-attachments/assets/56b1c84d-5e4d-4972-b90e-d18560b78ef0" />


### 인프라 구성

| 계층 | 서비스 | 역할 |
|------|--------|------|
| **Frontend** | Vercel | React SPA 호스팅, Global CDN |
| **Backend** | Supabase | 인증, API, 실시간 통신, 스토리지 |
| **Database** | PostgreSQL | 데이터 저장 및 관리 (Supabase Managed) |

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

