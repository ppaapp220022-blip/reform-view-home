/**
 * authApi.ts — 인증 관련 API 함수 모음
 *
 * 이메일 로그인 : POST /auth/login
 * 소셜 로그인   : OAuth 리다이렉트 (백엔드가 redirect_uri 처리)
 */
import apiClient from '../../../lib/axios'
import type { AuthUser } from '../../../store/authStore'

// ── 요청/응답 타입 ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

// ── 이메일 로그인 ─────────────────────────────────────────────────────────────

/**
 * 이메일 + 비밀번호 로그인
 * @returns accessToken + 유저 정보
 */
export async function loginWithEmail(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', body)
  return data
}

// ── 소셜 로그인 (OAuth 리다이렉트) ────────────────────────────────────────────

const SOCIAL_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * 카카오 OAuth 로그인 페이지로 리다이렉트
 * 백엔드에서 /auth/oauth2/kakao 로 Spring Security OAuth2 처리
 */
export function redirectToKakao(): void {
  window.location.href = `${SOCIAL_BASE}/auth/oauth2/kakao`
}

/**
 * 구글 OAuth 로그인 페이지로 리다이렉트
 */
export function redirectToGoogle(): void {
  window.location.href = `${SOCIAL_BASE}/auth/oauth2/google`
}

// ── 회원가입 ──────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string
  nickname: string
  password: string
  /** 마케팅 정보 수신 동의 (선택) */
  marketingAgreed: boolean
}

export interface RegisterResponse {
  accessToken: string
  user: AuthUser
}

/**
 * 이메일 회원가입
 * 성공 시 자동 로그인 처리 (accessToken + user 반환)
 */
export async function registerWithEmail(body: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/auth/register', body)
  return data
}

/**
 * 닉네임 중복 확인
 * @returns true = 사용 가능
 */
export async function checkNickname(nickname: string): Promise<boolean> {
  const { data } = await apiClient.get<{ available: boolean }>('/auth/check-nickname', {
    params: { nickname },
  })
  return data.available
}

// ── 관심 설정 (온보딩) ─────────────────────────────────────────────────────────

/**
 * 사용자가 선택할 수 있는 종목 타입
 * OnboardingPage / WelcomePage / useOnboarding 에서 공유
 */
export type SportType = 'soccer' | 'baseball' | 'basketball' | 'volleyball' | 'esports'

/**
 * 관심 설정 저장 요청 바디
 * - sports:   선택한 종목 코드 배열
 * - leagues:  선택한 리그명 배열
 * - teams:    선택한 팀명 배열
 * - keywords: 직접 입력한 키워드 배열
 */
export interface InterestSettingRequest {
  sports:   SportType[]
  leagues:  string[]
  teams:    string[]
  keywords: string[]
}

/**
 * 관심 설정 저장
 * POST /auth/interests
 * 성공 시 서버가 빈 응답(204) 또는 확인 메시지를 반환
 */
export async function saveInterestSetting(body: InterestSettingRequest): Promise<void> {
  await apiClient.post('/auth/interests', body)
}
