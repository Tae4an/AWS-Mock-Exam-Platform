import { createClient } from '@supabase/supabase-js'

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true, // 자동 토큰 갱신 활성화
    persistSession: true, // 세션을 로컬 스토리지에 유지
    detectSessionInUrl: true, // URL에서 세션 감지
    storage: window.localStorage, // 세션 저장소 설정
  }
})

export interface User {
  id: string
  username: string
  email?: string
  role: 'user' | 'admin'
  created_at: string
}

export interface QuizResult {
  id: string
  user_id: string
  quiz_mode: 'practice' | 'exam'
  quiz_length: 'short' | 'full'
  total_questions: number
  correct_answers: number
  score: number
  time_taken?: number
  started_at: string
  completed_at: string
  created_at: string
}

export interface QuizQuestionResult {
  id: string
  quiz_result_id: string
  question_index: number
  question_text: string
  user_answer: string | string[]
  correct_answer: string | string[]
  is_correct: boolean
  created_at: string
}

export interface Question {
  id: string
  question_text: string
  options: Record<string, string>
  answer: string | string[]
  explanation?: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  created_by?: string
  created_at: string
  updated_at: string
}

// Authentication service with real Supabase integration
export const authService = {
  async signUp(username: string, password: string) {
    try {
      console.log('🔄 Supabase 회원가입 시작:', { username })

      // Validate username format (영문 + 숫자만)
      if (!/^[a-zA-Z0-9]+$/.test(username)) {
        return { user: null, error: '아이디는 영문과 숫자만 사용 가능합니다.' }
      }

      if (username.length < 4 || username.length > 20) {
        return { user: null, error: '아이디는 4-20자 사이여야 합니다.' }
      }

      if (password.length < 6) {
        return { user: null, error: '비밀번호는 6자 이상이어야 합니다.' }
      }

      // Check if username already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle()

      if (existingProfile) {
        return { user: null, error: '이미 사용 중인 아이디입니다.' }
      }

      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${username}@awsmockexam.local`,
        password: password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (authError) {
        console.error('❌ Supabase Auth 오류:', authError)
        
        if (authError.message.includes('already registered')) {
          return { user: null, error: '이미 등록된 계정입니다.' }
        }
        
        return { user: null, error: authError.message || '회원가입 중 오류가 발생했습니다.' }
      }

      if (!authData.user) {
        return { user: null, error: '사용자 생성에 실패했습니다.' }
      }

      console.log('✅ Supabase Auth 사용자 생성 성공:', authData.user.id)

      // Wait for trigger to create profile, then fetch it
      await new Promise(resolve => setTimeout(resolve, 500)) // 0.5초 대기

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profileData) {
        console.error('❌ 프로필 조회 오류:', profileError)
        // Fallback: 프로필이 없으면 생성 시도
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            username: username,
            role: 'user'
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ 프로필 생성 오류:', insertError)
          return { user: null, error: '프로필 생성에 실패했습니다.' }
        }

      const user: User = {
        id: authData.user.id,
        username: username,
        email: authData.user.email,
        role: newProfile.role,
        created_at: authData.user.created_at || new Date().toISOString()
      }

      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('session_created_at', new Date().getTime().toString())
      console.log('✅ Supabase 회원가입 완료 (수동 생성, 세션 유효기간: 7일):', user)
      return { user, error: null }
      }

      const user: User = {
        id: authData.user.id,
        username: username,
        email: authData.user.email,
        role: profileData.role,
        created_at: authData.user.created_at || new Date().toISOString()
      }

      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('session_created_at', new Date().getTime().toString())

      console.log('✅ Supabase 회원가입 완료 (세션 유효기간: 7일):', user)
      return { user, error: null }

    } catch (error) {
      console.error('❌ 회원가입 예외 오류:', error)
      return { user: null, error: '회원가입 중 예상치 못한 오류가 발생했습니다.' }
    }
  },

  async signIn(username: string, password: string) {
    try {
      console.log('🔄 Supabase 로그인 시작:', { username })

      // Validate input
      if (!/^[a-zA-Z0-9]+$/.test(username) || username.length < 4) {
        return { user: null, error: '올바른 아이디를 입력해주세요.' }
      }

      if (password.length < 6) {
        return { user: null, error: '올바른 비밀번호를 입력해주세요.' }
      }

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${username}@awsmockexam.local`,
        password: password
      })

      if (authError) {
        console.error('❌ Supabase 로그인 오류:', authError)
        
        if (authError.message.includes('Invalid login credentials')) {
          return { user: null, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
        }
        
        return { user: null, error: authError.message || '로그인 중 오류가 발생했습니다.' }
      }

      if (!authData.user) {
        return { user: null, error: '로그인에 실패했습니다.' }
      }

      console.log('✅ Supabase Auth 로그인 성공:', authData.user.id)

      // Set session creation timestamp (7일 세션 관리용)
      localStorage.setItem('session_created_at', new Date().getTime().toString())

      // Get user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.error('❌ 프로필 조회 오류:', profileError)
        // Fallback to auth metadata
        const user: User = {
          id: authData.user.id,
          username: authData.user.user_metadata?.username || username,
          email: authData.user.email,
          role: 'user',
          created_at: authData.user.created_at || new Date().toISOString()
        }
        localStorage.setItem('user', JSON.stringify(user))
        return { user, error: null }
      }

      const user: User = {
        id: authData.user.id,
        username: profileData.username,
        email: authData.user.email,
        role: profileData.role || 'user',
        created_at: profileData.created_at
      }

      localStorage.setItem('user', JSON.stringify(user))

      console.log('✅ Supabase 로그인 완료 (세션 유효기간: 7일):', user)
      return { user, error: null }

    } catch (error) {
      console.error('❌ 로그인 예외 오류:', error)
      return { user: null, error: '로그인 중 예상치 못한 오류가 발생했습니다.' }
    }
  },

  async signOut() {
    try {
      console.log('🔄 Supabase 로그아웃 시작')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Supabase 로그아웃 오류:', error)
      } else {
        console.log('✅ Supabase 로그아웃 성공')
      }
      
      localStorage.removeItem('user')
      localStorage.removeItem('session_created_at')
      
      return { error: null }
    } catch (error) {
      console.error('❌ 로그아웃 예외 오류:', error)
      localStorage.removeItem('user')
      localStorage.removeItem('session_created_at')
      return { error: null }
    }
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single()

      if (error && error.code === 'PGRST116') {
        return true
      }

      return !data
    } catch (error) {
      console.error('❌ 아이디 중복 확인 오류:', error)
      return false
    }
  },

  async initializeAuth(): Promise<User | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ 세션 조회 오류:', error)
        return null
      }

      if (!session?.user) {
        localStorage.removeItem('user')
        return null
      }

      console.log('🔄 기존 세션 발견:', session.user.id)
      
      // Check session age and validity (7일 = 7 * 24 * 60 * 60 * 1000)
      const MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
      const sessionCreatedAt = localStorage.getItem('session_created_at')
      const now = new Date().getTime()
      
      if (sessionCreatedAt) {
        const sessionAge = now - parseInt(sessionCreatedAt)
        if (sessionAge > MAX_SESSION_AGE) {
          console.log('⏰ 세션이 7일을 초과하여 만료됨 - 재로그인 필요')
          await supabase.auth.signOut()
          localStorage.removeItem('user')
          localStorage.removeItem('session_created_at')
          return null
        }
        
        const remainingDays = Math.floor((MAX_SESSION_AGE - sessionAge) / (1000 * 60 * 60 * 24))
        const remainingHours = Math.floor(((MAX_SESSION_AGE - sessionAge) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        console.log(`⏰ 세션 유효 기간: ${remainingDays}일 ${remainingHours}시간 남음 (최대 7일)`)
      }
      
      // Log token expiry time
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000)
        const tokenRemainingMinutes = Math.floor((expiresAt.getTime() - now) / (1000 * 60))
        console.log(`🔑 액세스 토큰 만료: 약 ${tokenRemainingMinutes}분 남음 (자동 갱신됨)`)
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('❌ 프로필 조회 오류:', profileError)
        return null
      }

      const user: User = {
        id: session.user.id,
        username: profileData.username,
        email: session.user.email,
        role: profileData.role || 'user',
        created_at: profileData.created_at
      }

      localStorage.setItem('user', JSON.stringify(user))
      console.log('✅ 세션 복원 완료:', user)
      
      return user
    } catch (error) {
      console.error('❌ 인증 초기화 오류:', error)
      return null
    }
  },

  async getSessionInfo() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return null
      }

      return {
        userId: session.user.id,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null,
        refreshToken: !!session.refresh_token,
      }
    } catch (error) {
      console.error('❌ 세션 정보 조회 오류:', error)
      return null
    }
  }
}

// Question service - now using database instead of hardcoded
export const questionService = {
  async getAllQuestions(): Promise<{ success: boolean; data?: Question[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ 문제 조회 오류:', error)
        return { success: false, error: '문제를 불러오는데 실패했습니다.' }
      }

      // Parse JSON fields
      const questions = data.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        answer: typeof q.answer === 'string' && q.answer.startsWith('[') ? JSON.parse(q.answer) : q.answer
      }))

      return { success: true, data: questions }
    } catch (error) {
      console.error('❌ 문제 조회 예외:', error)
      return { success: false, error: '문제 조회 중 오류가 발생했습니다.' }
    }
  },

  async getQuestionsPaginated(page: number = 1, limit: number = 10): Promise<{ 
    success: boolean; 
    data?: Question[]; 
    total?: number; 
    totalPages?: number;
    error?: string 
  }> {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.error('❌ 문제 개수 조회 오류:', countError)
        return { success: false, error: '문제 개수 조회에 실패했습니다.' }
      }

      const totalCount = count || 0
      const totalPages = Math.ceil(totalCount / limit)
      const offset = (page - 1) * limit

      // Get paginated data
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('❌ 문제 페이지 조회 오류:', error)
        return { success: false, error: '문제를 불러오는데 실패했습니다.' }
      }

      // Parse JSON fields
      const questions = data.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        answer: typeof q.answer === 'string' && q.answer.startsWith('[') ? JSON.parse(q.answer) : q.answer
      }))

      return { success: true, data: questions, total: totalCount, totalPages }
    } catch (error) {
      console.error('❌ 문제 페이지 조회 예외:', error)
      return { success: false, error: '문제 조회 중 오류가 발생했습니다.' }
    }
  },

  async createQuestion(questionData: {
    question_text: string
    options: Record<string, string>
    answer: string | string[]
    explanation?: string
    category?: string
    difficulty?: 'easy' | 'medium' | 'hard'
  }): Promise<{ success: boolean; data?: Question; error?: string }> {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        return { success: false, error: '관리자 권한이 필요합니다.' }
      }

      const { data, error } = await supabase
        .from('questions')
        .insert({
          ...questionData,
          created_by: user.id,
          category: questionData.category || 'SAA',
          difficulty: questionData.difficulty || 'medium'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ 문제 생성 오류:', error)
        return { success: false, error: '문제 생성에 실패했습니다.' }
      }

      const question = {
        ...data,
        options: typeof data.options === 'string' ? JSON.parse(data.options) : data.options,
        answer: typeof data.answer === 'string' && data.answer.startsWith('[') ? JSON.parse(data.answer) : data.answer
      }

      console.log('✅ 문제 생성 완료:', question.id)
      return { success: true, data: question }
    } catch (error) {
      console.error('❌ 문제 생성 예외:', error)
      return { success: false, error: '문제 생성 중 오류가 발생했습니다.' }
    }
  },

  async updateQuestion(
    questionId: string,
    questionData: {
      question_text?: string
      options?: Record<string, string>
      answer?: string | string[]
      explanation?: string
      category?: string
      difficulty?: 'easy' | 'medium' | 'hard'
    }
  ): Promise<{ success: boolean; data?: Question; error?: string }> {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        return { success: false, error: '관리자 권한이 필요합니다.' }
      }

      const { data, error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', questionId)
        .select()
        .single()

      if (error) {
        console.error('❌ 문제 수정 오류:', error)
        return { success: false, error: '문제 수정에 실패했습니다.' }
      }

      const question = {
        ...data,
        options: typeof data.options === 'string' ? JSON.parse(data.options) : data.options,
        answer: typeof data.answer === 'string' && data.answer.startsWith('[') ? JSON.parse(data.answer) : data.answer
      }

      console.log('✅ 문제 수정 완료:', question.id)
      return { success: true, data: question }
    } catch (error) {
      console.error('❌ 문제 수정 예외:', error)
      return { success: false, error: '문제 수정 중 오류가 발생했습니다.' }
    }
  },

  async deleteQuestion(questionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        return { success: false, error: '관리자 권한이 필요합니다.' }
      }

      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)

      if (error) {
        console.error('❌ 문제 삭제 오류:', error)
        return { success: false, error: '문제 삭제에 실패했습니다.' }
      }

      console.log('✅ 문제 삭제 완료:', questionId)
      return { success: true }
    } catch (error) {
      console.error('❌ 문제 삭제 예외:', error)
      return { success: false, error: '문제 삭제 중 오류가 발생했습니다.' }
    }
  },

  async searchQuestions(searchTerm: string, page: number = 1, limit: number = 10): Promise<{ 
    success: boolean; 
    data?: Question[]; 
    total?: number; 
    totalPages?: number;
    error?: string 
  }> {
    try {
      const offset = (page - 1) * limit

      // Get total count with search
      const { count, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .ilike('question_text', `%${searchTerm}%`)

      if (countError) {
        console.error('❌ 검색 결과 개수 조회 오류:', countError)
        return { success: false, error: '검색에 실패했습니다.' }
      }

      const totalCount = count || 0
      const totalPages = Math.ceil(totalCount / limit)

      // Get paginated search results
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .ilike('question_text', `%${searchTerm}%`)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('❌ 검색 결과 조회 오류:', error)
        return { success: false, error: '검색 결과를 불러오는데 실패했습니다.' }
      }

      // Parse JSON fields
      const questions = data.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        answer: typeof q.answer === 'string' && q.answer.startsWith('[') ? JSON.parse(q.answer) : q.answer
      }))

      return { success: true, data: questions, total: totalCount, totalPages }
    } catch (error) {
      console.error('❌ 검색 예외:', error)
      return { success: false, error: '검색 중 오류가 발생했습니다.' }
    }
  }
}

// Quiz result service
export const quizService = {
  async saveQuizResult(quizData: {
    quiz_mode: 'practice' | 'exam'
    quiz_length: 'short' | 'full'
    total_questions: number
    correct_answers: number
    score: number
    time_taken?: number
    started_at: string
    question_results: Array<{
      question_index: number
      question_text: string
      user_answer: string | string[]
      correct_answer: string | string[]
      is_correct: boolean
    }>
  }) {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        throw new Error('사용자가 로그인되어 있지 않습니다.')
      }

      console.log('💾 퀴즈 결과 저장 시작:', quizData)

      // Save main quiz result
      const { data: quizResult, error: quizError } = await supabase
        .from('quiz_results')
        .insert({
          user_id: user.id,
          quiz_mode: quizData.quiz_mode,
          quiz_length: quizData.quiz_length,
          total_questions: quizData.total_questions,
          correct_answers: quizData.correct_answers,
          score: quizData.score,
          time_taken: quizData.time_taken,
          started_at: quizData.started_at
        })
        .select()
        .single()

      if (quizError) {
        console.error('❌ 퀴즈 결과 저장 오류:', quizError)
        throw new Error('퀴즈 결과 저장에 실패했습니다.')
      }

      // Save detailed question results
      const questionResults = quizData.question_results.map(result => ({
        quiz_result_id: quizResult.id,
        question_index: result.question_index,
        question_text: result.question_text,
        user_answer: Array.isArray(result.user_answer) 
          ? JSON.stringify(result.user_answer) 
          : result.user_answer,
        correct_answer: Array.isArray(result.correct_answer)
          ? JSON.stringify(result.correct_answer)
          : result.correct_answer,
        is_correct: result.is_correct
      }))

      const { error: questionsError } = await supabase
        .from('quiz_question_results')
        .insert(questionResults)

      if (questionsError) {
        console.error('❌ 문제별 결과 저장 오류:', questionsError)
      }

      console.log('✅ 퀴즈 결과 저장 완료:', quizResult.id)
      return { success: true, quiz_result_id: quizResult.id }

    } catch (error) {
      console.error('❌ 퀴즈 결과 저장 예외:', error)
      return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
    }
  },

  async getUserQuizHistory(userId?: string) {
    try {
      const user = authService.getCurrentUser()
      const targetUserId = userId || user?.id

      if (!targetUserId) {
        throw new Error('사용자 ID가 필요합니다.')
      }

      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', targetUserId)
        .order('completed_at', { ascending: false })

      if (error) {
        console.error('❌ 퀴즈 기록 조회 오류:', error)
        throw new Error('퀴즈 기록 조회에 실패했습니다.')
      }

      return { success: true, data }
    } catch (error) {
      console.error('❌ 퀴즈 기록 조회 예외:', error)
      return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
    }
  }
}

// Admin service
export const adminService = {
  async getAllUsers() {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        throw new Error('관리자 권한이 필요합니다.')
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ 사용자 목록 조회 오류:', error)
        throw new Error('사용자 목록 조회에 실패했습니다.')
      }

      return { success: true, data }
    } catch (error) {
      console.error('❌ 사용자 목록 조회 예외:', error)
      return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
    }
  },

  async updateUserRole(userId: string, role: 'user' | 'admin') {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        throw new Error('관리자 권한이 필요합니다.')
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId)

      if (error) {
        console.error('❌ 사용자 역할 업데이트 오류:', error)
        throw new Error('사용자 역할 업데이트에 실패했습니다.')
      }

      console.log('✅ 사용자 역할 업데이트 완료:', { userId, role })
      return { success: true }
    } catch (error) {
      console.error('❌ 사용자 역할 업데이트 예외:', error)
      return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
    }
  },

  async getAllQuizResults() {
    try {
      const user = authService.getCurrentUser()
      if (!user || user.role !== 'admin') {
        throw new Error('관리자 권한이 필요합니다.')
      }

      const { data, error } = await supabase
        .from('quiz_results')
        .select(`
          *,
          user_profiles:user_id (username)
        `)
        .order('completed_at', { ascending: false })

      if (error) {
        console.error('❌ 전체 퀴즈 결과 조회 오류:', error)
        throw new Error('퀴즈 결과 조회에 실패했습니다.')
      }

      return { success: true, data }
    } catch (error) {
      console.error('❌ 전체 퀴즈 결과 조회 예외:', error)
      return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' }
    }
  }
}

// Log Supabase configuration
console.log('🔧 Supabase 실제 연결 설정:', {
  url: supabaseUrl,
  configured: true,
  timestamp: new Date().toISOString()
})

// Listen to auth changes and handle automatic token refresh
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('🔄 Supabase Auth 상태 변경:', event, session?.user?.id)
  
  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('user')
  }
  
  // Update localStorage when token is refreshed
  if (event === 'TOKEN_REFRESHED' && session?.user) {
    console.log('🔄 토큰 자동 갱신됨:', session.user.id)
    
    // Update user data in localStorage
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    if (profileData) {
      const user: User = {
        id: session.user.id,
        username: profileData.username,
        email: session.user.email,
        role: profileData.role || 'user',
        created_at: profileData.created_at
      }
      localStorage.setItem('user', JSON.stringify(user))
      console.log('✅ 사용자 정보 갱신됨')
    }
  }
  
  // Handle initial session
  if (event === 'INITIAL_SESSION' && session?.user) {
    console.log('✅ 초기 세션 확인됨:', session.user.id)
  }
  
  // Log session expiry
  if (event === 'SIGNED_OUT' && !session) {
    console.log('⏰ 세션 만료됨 - 재로그인 필요')
  }
})