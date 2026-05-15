/**
 * Zustand 인증 스토어
 *
 * user            : 로그인한 유저 정보 (AuthUserDTO 기준)
 * accessToken     : JWT 액세스 토큰
 * refreshToken    : JWT 리프레시 토큰 (재발급 시 기존 토큰 유지)
 * isAuthenticated : 로그인 여부
 *
 * login()             : 로그인/회원가입 성공 후 호출 — localStorage + 스토어 동시 저장
 * logout()            : localStorage 전체 초기화 + 스토어 리셋
 * restore()           : 하위 호환 유지용 no-op (store 생성 시 이미 동기 복원됨)
 * setAccessToken()    : 토큰 재발급 후 accessToken만 교체
 *
 * ★ 핵심 변경: store가 create()되는 시점에 localStorage를 즉시 읽어 상태를 초기화한다.
 *   기존 방식(App.tsx useEffect → restore())은 첫 렌더 사이클이 끝난 뒤에야 실행되어
 *   isAuthenticated=false 상태로 컴포넌트가 한 번 렌더되는 타이밍 버그가 있었음.
 */
import {create} from 'zustand'

// ── 유저 타입 (백엔드 AuthUserDTO 기준) ────────────────────────────────────────

/** 로그인/회원가입 응답에 포함되는 인증 사용자 정보 */
export interface AuthUser {
  id: number
  email: string
  nickname: string
  profileImageUrl?: string
  role: 'USER' | 'ADMIN'
  mannerScore: number // BigDecimal → 프론트에서 number로 수신
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
  /**
   * 하위 호환 유지용 no-op.
   * store 생성 시점에 이미 localStorage에서 동기 복원되므로 호출 불필요.
   * App.tsx의 useEffect에서 호출해도 무해함.
   */
  restore: () => void
  /** 토큰 재발급 후 accessToken만 교체 (refreshToken은 그대로 유지) */
  setAccessToken: (accessToken: string) => void
}

// ── localStorage 동기 복원 헬퍼 ────────────────────────────────────────────────

/**
 * localStorage에서 인증 상태를 동기적으로 읽어 반환.
 * store 생성 시 즉시 호출하여 초기 상태를 설정한다.
 */
function readAuthFromStorage(): {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
} {
  // SSR 환경 대비 (localStorage 미존재 시 빈 상태 반환)
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {user: null, accessToken: null, refreshToken: null, isAuthenticated: false}
  }
  
  const accessToken = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')
  const userRaw = localStorage.getItem('authUser')
  const user: AuthUser | null = userRaw ? (JSON.parse(userRaw) as AuthUser) : null
  
  return {
    user: accessToken ? user : null,
    accessToken: accessToken ?? null,
    refreshToken: refreshToken ?? null,
    isAuthenticated: !!accessToken,
  }
}

// ── 스토어 구현 ────────────────────────────────────────────────────────────────

const useAuthStore = create<AuthState>(() => ({
  // store 생성 시 localStorage에서 동기 복원 (타이밍 버그 해소)
  ...readAuthFromStorage(),
  
  login: (user, accessToken, refreshToken) => {
    // localStorage에 인증 정보 저장
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('authUser', JSON.stringify(user)) // restore용 유저 정보
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
    
    // Zustand 스토어 업데이트
    useAuthStore.setState({
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
    localStorage.removeItem('authUser')
    
    useAuthStore.setState({user: null, accessToken: null, refreshToken: null, isAuthenticated: false})
  },
  
  /** no-op: store 생성 시 이미 동기 복원됨. 하위 호환 유지용. */
  restore: () => {
    // 아무 동작도 하지 않음 — readAuthFromStorage()가 create() 시점에 이미 실행됨
  },
  
  setAccessToken: (accessToken) => {
    // 재발급된 accessToken만 교체 (refreshToken은 그대로 유지)
    localStorage.setItem('accessToken', accessToken)
    useAuthStore.setState({accessToken})
  },
}))

export default useAuthStore
