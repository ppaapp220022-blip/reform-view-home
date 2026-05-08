/**
 * Zustand 인증 스토어
 * - user: 로그인한 유저 정보
 * - accessToken: JWT 토큰
 * - login / logout 액션
 * - 초기화 시 localStorage에서 토큰 복원
 */
import { create } from 'zustand'

/** 유저 기본 정보 타입 (백엔드 응답에 맞춰 수정 필요) */
export interface AuthUser {
  id: number
  email: string
  nickname: string
  profileImageUrl?: string
  role: 'USER' | 'ADMIN'
  mannerScore: number
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean

  /** 로그인 성공 후 호출 */
  login: (user: AuthUser, token: string) => void
  /** 로그아웃 */
  logout: () => void
  /** 앱 초기 마운트 시 localStorage 토큰 복원 */
  restore: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  login: (user, token) => {
    localStorage.setItem('accessToken', token)
    set({ user, accessToken: token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    set({ user: null, accessToken: null, isAuthenticated: false })
  },

  restore: () => {
    // 토큰만 복원 (유저 정보는 /api/auth/me 호출로 채워야 함)
    const token = localStorage.getItem('accessToken')
    if (token) {
      set({ accessToken: token, isAuthenticated: true })
    }
  },
}))

export default useAuthStore
