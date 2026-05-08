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
