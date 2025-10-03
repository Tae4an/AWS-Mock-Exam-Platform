import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService, User } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔄 인증 상태 초기화 시작')
      setLoading(true)
      
      try {
        // Try to restore session from Supabase
        const sessionUser = await authService.initializeAuth()
        
        if (sessionUser) {
          setUser(sessionUser)
          console.log('✅ 세션 복원됨:', sessionUser.username)
        } else {
          // Fallback to localStorage
          const localUser = authService.getCurrentUser()
          if (localUser) {
            setUser(localUser)
            console.log('📱 로컬 사용자 복원됨:', localUser.username)
          }
        }
      } catch (error) {
        console.error('❌ 인증 초기화 실패:', error)
        // Clear any corrupted data
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
        console.log('✅ 인증 초기화 완료')
      }
    }

    initializeAuth()
  }, [])

  const signUp = async (username: string, password: string) => {
    setLoading(true)
    console.log('📝 회원가입 시도:', { username, passwordLength: password.length })
    
    try {
      const { user: newUser, error } = await authService.signUp(username, password)
      
      if (newUser) {
        setUser(newUser)
        console.log('✅ 회원가입 성공 - Supabase에 저장됨:', newUser)
        return { success: true }
      } else {
        console.error('❌ 회원가입 실패:', error)
        return { success: false, error: error || '회원가입에 실패했습니다.' }
      }
    } catch (error) {
      console.error('❌ 회원가입 예외:', error)
      return { success: false, error: '회원가입 중 오류가 발생했습니다.' }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (username: string, password: string) => {
    setLoading(true)
    console.log('🔑 로그인 시도:', { username })
    
    try {
      const { user: loggedInUser, error } = await authService.signIn(username, password)
      
      if (loggedInUser) {
        setUser(loggedInUser)
        console.log('✅ 로그인 성공 - Supabase 인증됨:', loggedInUser)
        return { success: true }
      } else {
        console.error('❌ 로그인 실패:', error)
        return { success: false, error: error || '로그인에 실패했습니다.' }
      }
    } catch (error) {
      console.error('❌ 로그인 예외:', error)
      return { success: false, error: '로그인 중 오류가 발생했습니다.' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('🚪 로그아웃 시도')
    
    try {
      await authService.signOut()
      setUser(null)
      console.log('✅ 로그아웃 완료 - Supabase 세션 종료됨')
    } catch (error) {
      console.error('❌ 로그아웃 오류:', error)
      // Force logout locally even if Supabase fails
      setUser(null)
      localStorage.removeItem('user')
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}