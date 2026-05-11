/**
 * authApi.ts — 인증 관련 API 함수 모음
 *
 * POST /api/auth/register        — 이메일 회원가입
 * GET  /api/auth/check-nickname  — 닉네임 중복 확인
 * POST /api/auth/login           — 이메일 로그인 (백엔드 SecurityConfig 활성화 후 동작)
 * POST /api/users/me/interest-setting — 관심 설정 저장 (온보딩)
 *
 * 모든 Auth/Member 엔드포인트의 응답은 ApiResponse<T> 래퍼로 감싸져 있으나,
 * axios 인터셉터에서 자동 언래핑되므로 여기서는 내부 DTO 타입만 명시.
 */
import apiClient from '../../../lib/axios'
import type { AuthUser } from '../../../store/authStore'

// ── 로그인 ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

/**
 * 로그인 성공 응답 (백엔드 LoginResponseDTO 기준)
 * accessToken  : JWT 액세스 토큰
 * refreshToken : JWT 리프레시 토큰
 * user         : 인증 사용자 정보 (AuthUserDTO)
 */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

/**
 * 이메일 + 비밀번호 로그인
 * TODO: 백엔드 SecurityConfig 활성화 이후 실제 연동 (현재 엔드포인트 미구현)
 */
export async function loginWithEmail(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', body)
  return data
}

// ── 회원가입 ──────────────────────────────────────────────────────────────────

/**
 * 이메일 회원가입 요청 바디
 * 백엔드 AuthController.RegisterRequest record와 1:1 매핑
 *
 * agreeTerms    : 이용약관 동의 (필수, true)
 * agreePrivacy  : 개인정보처리방침 동의 (필수, true)
 * agreeMarketing: 마케팅 정보 수신 동의 (선택)
 */
export interface RegisterRequest {
  email: string
  nickname: string
  password: string
  agreeTerms: boolean
  agreePrivacy: boolean
  agreeMarketing: boolean
}

/**
 * 회원가입 성공 응답 (백엔드 MemberResponseDTO 기준)
 * 회원가입 즉시 자동 로그인 처리됨
 */
export interface RegisterResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

/**
 * 이메일 회원가입
 * POST /api/auth/register
 */
export async function registerWithEmail(body: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/auth/register', body)
  return data
}

/**
 * 닉네임 중복 확인
 * GET /api/auth/check-nickname
 * @returns true = 사용 가능, false = 이미 사용 중
 */
export async function checkNickname(nickname: string): Promise<boolean> {
  const { data } = await apiClient.get<{ available: boolean }>('/auth/check-nickname', {
    params: { nickname },
  })
  // axios 인터셉터가 ApiResponse 언래핑 후 NicknameResponseDTO가 data에 담김
  return data.available
}

// ── 소셜 로그인 (OAuth 리다이렉트) ────────────────────────────────────────────

const SOCIAL_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * 카카오 OAuth 로그인 페이지로 리다이렉트
 * 백엔드 Spring Security OAuth2 처리 경로
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

// ── 관심 설정 (온보딩) ─────────────────────────────────────────────────────────

/**
 * 종목 타입 (백엔드 Sport enum 일치, UPPERCASE)
 * ETC: 기타 종목 포함
 */
export type SportType = 'SOCCER' | 'BASEBALL' | 'BASKETBALL' | 'VOLLEYBALL' | 'ESPORTS' | 'ETC'

/**
 * 관심 설정 저장 요청 바디
 * 백엔드 OnboardingRequestDTO record와 1:1 매핑
 *
 * sport    : 관심 종목 (단일, 필수)
 * team     : 관심 구단명 (선택, 최대 100자)
 * keywords : 관심 키워드 목록 (최대 10개)
 */
export interface InterestSettingRequest {
  sport: SportType
  team?: string
  keywords?: string[]
}

/**
 * 관심 설정 조회 응답 바디
 * 백엔드 OnboardingResponseDTO record 기준
 */
export interface InterestSettingResponse {
  sport: SportType
  team: string | null
  keywords: string[]
}

/**
 * 관심 설정 저장
 * POST /api/users/me/interest-setting
 */
export async function saveInterestSetting(body: InterestSettingRequest): Promise<void> {
  await apiClient.post('/users/me/interest-setting', body)
}

/**
 * 관심 설정 조회
 * GET /api/users/me/interest-setting
 */
export async function getInterestSetting(): Promise<InterestSettingResponse> {
  const { data } = await apiClient.get<InterestSettingResponse>('/users/me/interest-setting')
  return data
}
