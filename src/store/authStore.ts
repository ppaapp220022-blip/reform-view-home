/**
 * Zustand 인증 스토어
 *
 * user         : 로그인한 유저 정보 (AuthUserDTO 기준)
 * accessToken  : JWT 액세스 토큰
 * refreshToken : JWT 리프레시 토큰 (SecurityConfig 활성화 이후 갱신 로직 사용)
 * isAuthenticated : 로그인 여부
 *
 * login()   : 로그인/회원가입 성공 후 호출 — localStorage + 스토어 동시 저장
 * logout()  : localStorage 전체 초기화 + 스토어 리셋
 * restore() : 앱 마운트 시 localStorage에서 토큰 + 유저 복원
 */
import { create } from 'zustand'

// ── 유저 타입 (백엔드 AuthUserDTO 기준) ────────────────────────────────────────

/** 로그인/회원가입 응답에 포함되는 인증 사용자 정보 */
export interface AuthUser {
  id: number               // 회원 번호 (X-Member-Id 헤더 값으로도 사용)
  email: string
  nickname: string
  profileImageUrl?: string
  role: 'USER' | 'ADMIN'
  mannerScore: number      // BigDecimal → 프론트에서 number로 수신
}

// ── 스토어 타입 ────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  /** 로그인/회원가입 성공 후 호출 */
  login: (user: AuthUser, accessToken: string, refreshToken?: string) => void
  /** 로그아웃 */
  logout: () => void
  /** 앱 초기 마운트 시 localStorage에서 토큰·유저 복원 */
  restore: () => void
}

// ── 스토어 구현 ────────────────────────────────────────────────────────────────

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  login: (user, accessToken, refreshToken) => {
    // localStorage에 인증 정보 저장
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('memberId', String(user.id))  // X-Member-Id 헤더용
    localStorage.setItem('authUser', JSON.stringify(user))   // restore용 유저 정보
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }

    // Zustand 스토어 업데이트
    set({
      user,
      accessToken,
      refreshToken: refreshToken ?? null,
      isAuthenticated: true,
    })
  },

  logout: () => {
    // 모든 인증 관련 localStorage 항목 제거
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('memberId')
    localStorage.removeItem('authUser')

    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
  },

  restore: () => {
    // 토큰 및 유저 정보 복원
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    // 저장된 유저 정보가 있으면 파싱하여 복원
    const userRaw = localStorage.getItem('authUser')
    const user: AuthUser | null = userRaw ? (JSON.parse(userRaw) as AuthUser) : null

    if (accessToken) {
      set({
        accessToken,
        refreshToken: refreshToken ?? null,
        user,
        isAuthenticated: true,
      })
    }
  },
}))

export default useAuthStore
