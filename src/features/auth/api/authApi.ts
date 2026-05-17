/**
 * authApi.ts — 인증 관련 API 함수 모음
 *
 * 로그인 2단계 플로우:
 *   Step 1) POST /api/auth/login         → challengeId 발급 (이메일로 6자리 코드 발송)
 *   Step 2) POST /api/auth/login/verify  → challengeId + code 검증 → JWT 발급
 *
 * 소셜 로그인 플로우:
 *   브라우저가 /api/auth/oauth2/kakao|google 로 이동
 *   → Spring Security OAuth2 처리
 *   → 성공 시 프론트 콜백 URL로 #accessToken=...&refreshToken=... fragment 전달
 *   → handleSocialCallback()로 hash에서 토큰 추출
 *
 * 기타:
 *   POST /api/auth/token/refresh  — accessToken 재발급
 *   POST /api/auth/logout         — 로그아웃 (refreshToken 무효화)
 *   POST /api/auth/password/reset — 비밀번호 재설정
 *   GET  /api/auth/check-nickname — 닉네임 중복 확인
 *   POST /api/auth/register       — 회원가입
 *   POST /api/users/me/interest-setting — 관심 설정 저장 (온보딩)
 */
import apiClient from '../../../lib/axios'
import type {AuthUser} from '../../../store/authStore'

// ── 로그인 Step 1 ─────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

/**
 * 로그인 1단계 응답 (백엔드 LoginChallengeResponseDTO)
 * 비밀번호 인증 후 이메일로 6자리 코드가 발송됨
 * challengeId를 Step 2에서 코드와 함께 전달
 */
export interface LoginChallengeResponse {
  challengeId: string
  email: string
}

/**
 * 로그인 1단계 — 이메일 + 비밀번호 확인
 * POST /api/auth/login
 * 성공 시 이메일로 6자리 코드 발송됨
 */
export async function loginStep1(body: LoginRequest): Promise<LoginChallengeResponse> {
  const {data} = await apiClient.post<LoginChallengeResponse>('/auth/login', body)
  return data
}

// ── 로그인 Step 2 ─────────────────────────────────────────────────────────────

export interface LoginVerifyRequest {
  challengeId: string
  code: string
}

/**
 * 로그인 최종 응답 (백엔드 LoginResponseDTO)
 * accessToken / refreshToken / user 포함
 */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

/**
 * 로그인 2단계 — challengeId + 인증코드 검증 → JWT 발급
 * POST /api/auth/login/verify
 */
export async function loginStep2(body: LoginVerifyRequest): Promise<LoginResponse> {
  const {data} = await apiClient.post<LoginResponse>('/auth/login/verify', body)
  return data
}

// ── 회원가입 ──────────────────────────────────────────────────────────────────

/**
 * 이메일 회원가입 요청 바디
 * 백엔드 AuthController.RegisterRequest record와 1:1 매핑
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
  const {data} = await apiClient.post<RegisterResponse>('/auth/register', body)
  return data
}

// ── 닉네임 중복 확인 ──────────────────────────────────────────────────────────

/**
 * 닉네임 중복 확인
 * GET /api/auth/check-nickname
 * @returns true = 사용 가능, false = 이미 사용 중
 */
export async function checkNickname(nickname: string): Promise<boolean> {
  const {data} = await apiClient.get<{ available: boolean }>('/auth/check-nickname', {
    params: {nickname},
  })
  return data.available
}

// ── 토큰 재발급 ───────────────────────────────────────────────────────────────

/**
 * accessToken 재발급
 * POST /api/auth/token/refresh
 * refreshToken은 기존 것을 그대로 유지 (서버가 같은 세션에서 재사용)
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const {data} = await apiClient.post<{ accessToken: string }>('/auth/token/refresh', {
    refreshToken,
  })
  return data.accessToken
}

// ── 로그아웃 ──────────────────────────────────────────────────────────────────

/**
 * 현재 세션 로그아웃
 * POST /api/auth/logout
 * refreshToken을 무효화하고 accessToken을 블랙리스트에 등록
 */
export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', {refreshToken})
}

// ── 비밀번호 재설정 ───────────────────────────────────────────────────────────

export interface PasswordResetRequest {
  email: string
  nickname: string
  newPassword: string
}

/**
 * 비밀번호 재설정
 * POST /api/auth/password/reset
 * 이메일 + 닉네임 일치 확인 후 새 비밀번호로 변경
 */
export async function resetPassword(body: PasswordResetRequest): Promise<void> {
  await apiClient.post('/auth/password/reset', body)
}

// ── 소셜 로그인 (OAuth 리다이렉트) ────────────────────────────────────────────

const SOCIAL_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * 카카오 OAuth 로그인 페이지로 리다이렉트
 * 백엔드 /api/auth/oauth2/kakao → Spring Security /oauth2/authorization/kakao 처리
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

/**
 * 소셜 로그인 성공 후 콜백 처리
 * 백엔드가 프론트 콜백 URL에 #accessToken=...&refreshToken=... 형태로 리다이렉트
 * window.location.hash에서 토큰을 추출하고 hash fragment를 제거한다.
 *
 * @returns LoginResponse | null (hash에 토큰이 없으면 null)
 */
export function handleSocialCallback(): LoginResponse | null {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = hash.get('accessToken')
  const refreshToken = hash.get('refreshToken')
  
  if (!accessToken) return null
  
  // URL에서 hash fragment 제거 (뒤로가기·새로고침 시 재처리 방지)
  window.history.replaceState({}, document.title, window.location.pathname)
  
  // user 정보는 accessToken 디코딩 또는 /api/auth/me 호출로 가져와야 하나
  // 소셜 로그인 후 별도 me 요청을 하는 것이 안전하므로 user는 null로 반환
  // 호출자가 /api/auth/me를 호출해서 user를 채워야 함
  return {
    accessToken,
    refreshToken: refreshToken ?? '',
    user: null as unknown as AuthUser, // 호출자가 /api/auth/me로 채울 것
  }
}

// ── 관심 설정 (온보딩) ─────────────────────────────────────────────────────────

/**
 * 종목 타입 (백엔드 Sport enum 일치, UPPERCASE)
 */
export type SportType = 'SOCCER' | 'BASEBALL' | 'BASKETBALL' | 'VOLLEYBALL' | 'ESPORTS' | 'ETC'

/**
 * 관심 설정 저장 요청 바디 (OnboardingRequestDTO)
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
 * 관심 설정 조회 응답 바디 (OnboardingResponseDTO)
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
  const {data} = await apiClient.get<InterestSettingResponse>('/users/me/interest-setting')
  return data
}


// ── 세션 관리 ────────────────────────────────────────────────────────────────

/** 세션 정보 (AuthSessionResponseDTO) */
export interface AuthSession {
  sessionId: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  isCurrent: boolean
}

/**
 * 내 세션 목록 조회
 * GET /api/auth/sessions
 */
export async function readSessions(): Promise<AuthSession[]> {
  const {data} = await apiClient.get<AuthSession[]>('/auth/sessions')
  return data
}

/**
 * 특정 세션 로그아웃
 * POST /api/auth/logout/session
 */
export async function logoutSession(sessionId: string): Promise<void> {
  await apiClient.post('/auth/logout/session', {sessionId})
}

/**
 * 전체 세션 로그아웃
 * POST /api/auth/logout/all
 */
export async function logoutAll(): Promise<void> {
  await apiClient.post('/auth/logout/all')
}
