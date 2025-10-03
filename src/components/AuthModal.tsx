import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { User, Lock, UserPlus, Eye, EyeOff } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9]+$/
    if (!username) return '아이디를 입력해주세요.'
    if (username.length < 3) return '아이디는 3자 이상이어야 합니다.'
    if (username.length > 20) return '아이디는 20자 이하여야 합니다.'
    if (!usernameRegex.test(username)) return '아이디는 영문과 숫자만 사용 가능합니다.'
    return null
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const usernameError = validateUsername(username)
    if (usernameError) {
      setError(usernameError)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    const result = await signIn(username, password)
    
    if (result.success) {
      onClose()
      setUsername('')
      setPassword('')
    } else {
      setError(result.error || '로그인에 실패했습니다.')
    }
    
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const usernameError = validateUsername(username)
    if (usernameError) {
      setError(usernameError)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    const result = await signUp(username, password)
    
    if (result.success) {
      onClose()
      setUsername('')
      setPassword('')
      setConfirmPassword('')
    } else {
      setError(result.error || '회원가입에 실패했습니다.')
    }
    
    setLoading(false)
  }

  const resetForm = () => {
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm()
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-slate-800">
            AWS Mock Exam Platform
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="signin" className="w-full" onValueChange={resetForm}>
          <TabsList className="grid w-full grid-cols-2 bg-slate-100">
            <TabsTrigger value="signin" className="data-[state=active]:bg-white">로그인</TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-white">회원가입</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card className="border-0 bg-white shadow-none">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-teal-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-800">로그인</CardTitle>
                <CardDescription className="text-slate-600">
                  계정에 로그인하여 학습 기록을 저장하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-username" className="text-slate-700">아이디</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signin-username"
                        type="text"
                        placeholder="아이디를 입력하세요 (영문+숫자)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-teal-300 bg-white"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-slate-700">비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호를 입력하세요"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 border-slate-200 focus:border-teal-300 bg-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white" 
                    disabled={loading}
                  >
                    {loading ? '로그인 중...' : '로그인'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card className="border-0 bg-white shadow-none">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl text-slate-800">회원가입</CardTitle>
                <CardDescription className="text-slate-600">
                  새 계정을 만들어 학습을 시작하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-slate-700">아이디</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="아이디 (영문+숫자, 3-20자)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 border-slate-200 focus:border-blue-300 bg-white"
                        required
                      />
                    </div>
                    <p className="text-xs text-slate-500">영문과 숫자만 사용 가능, 3-20자</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-700">비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호 (6자 이상)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 border-slate-200 focus:border-blue-300 bg-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-slate-700">비밀번호 확인</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="비밀번호를 다시 입력하세요"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 border-slate-200 focus:border-blue-300 bg-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white" 
                    disabled={loading}
                  >
                    {loading ? '가입 중...' : '회원가입'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}