/**
 * memberApi.ts — 마이페이지 / 회원 프로필 관련 API 함수 모음
 *
 * 백엔드 MemberController (/api/users/me) 엔드포인트 연동
 *
 * GET   /api/users/me                       — 내 프로필 조회
 * PATCH /api/users/me                       — 내 프로필 수정 (JSON + profileImageUrl)
 * POST  /api/users/me/profile-image         — 프로필 이미지 업로드 → URL 반환
 * POST  /api/users/me/interest-setting      — 관심 설정 저장
 * GET   /api/users/me/interest-setting      — 관심 설정 조회
 * GET   /api/users/me/reviews               — 받은 매너 리뷰 목록 조회
 *
 * 응답은 모두 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 */
import apiClient from '../../../lib/axios'
import type {PageResponse} from '../../../types/api'
import type {InterestSettingRequest, InterestSettingResponse, SportType} from '../../auth/api/authApi'

// ── 응답 타입 (백엔드 DTO 기준) ────────────────────────────────────────────────

export type {SportType, InterestSettingRequest, InterestSettingResponse}

/**
 * 회원 상태 (MemberStatus enum)
 */
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN'

/**
 * 회원 권한 (Role enum)
 */
export type Role = 'USER' | 'ADMIN'

/**
 * 내 프로필 응답 (ProfileResponseDTO)
 * 마이페이지 전반에서 사용
 */
export interface ProfileResponse {
  memberId: number
  email: string
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  mannerScore: number              // BigDecimal → number
  role: Role
  status: MemberStatus
  pointBalance: number             // 총 보유 예치금
  pointWithdrawable: number        // 출금 가능 예치금
  pointPending: number             // 정산 대기 예치금
  totalSales: number               // 완료 판매 건수
  totalPurchases: number           // 완료 구매 건수
  interest: InterestSettingResponse | null
  createdAt: string                // ISO 8601
}

/**
 * 프로필 수정 요청 (ProfileUpdateRequestDTO)
 * JSON 방식 — 변경할 필드만 전송
 * 이미지 수정: 먼저 /profile-image API로 URL을 받아 profileImageUrl에 전달
 */
export interface ProfileUpdateRequest {
  nickname?: string
  bio?: string
  profileImageUrl?: string         // 사전 업로드한 이미지 URL
}

/**
 * 받은 매너 리뷰 항목 (ReviewResponseDTO)
 */
export interface ReviewItem {
  mannerId: number
  tradeId: number
  buyer: { memberId: number; nickname: string; profileImageUrl: string | null }
  seller: { memberId: number; nickname: string; profileImageUrl: string | null }
  score: number                    // 1~5
  content: string | null
  createdAt: string
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 내 프로필 조회
 * GET /api/users/me
 */
export async function getMyProfile(): Promise<ProfileResponse> {
  const {data} = await apiClient.get<ProfileResponse>('/users/me')
  return data
}

/**
 * 프로필 이미지 업로드
 * POST /api/users/me/profile-image (multipart/form-data)
 * 프로필 수정 전에 먼저 호출해 URL을 받아야 함
 *
 * @param file 업로드할 프로필 이미지 파일
 * @returns 업로드된 이미지 URL
 */
export async function uploadProfileImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('profileImage', file)
  
  const {data} = await apiClient.post<{ profileImageUrl: string }>(
    '/users/me/profile-image',
    fd,
    {headers: {'Content-Type': 'multipart/form-data'}},
  )
  return data.profileImageUrl
}

/**
 * 내 프로필 수정
 * PATCH /api/users/me (JSON)
 * 프로필 이미지 변경 시: 먼저 uploadProfileImage()로 URL을 받아 request.profileImageUrl에 전달
 */
export async function updateMyProfile(request: ProfileUpdateRequest): Promise<ProfileResponse> {
  const {data} = await apiClient.patch<ProfileResponse>('/users/me', request)
  return data
}

/**
 * 관심 설정 저장
 * POST /api/users/me/interest-setting
 */
export async function saveInterestSetting(request: InterestSettingRequest): Promise<void> {
  await apiClient.post('/users/me/interest-setting', request)
}

/**
 * 관심 설정 조회
 * GET /api/users/me/interest-setting
 */
export async function getInterestSetting(): Promise<InterestSettingResponse> {
  const {data} = await apiClient.get<InterestSettingResponse>('/users/me/interest-setting')
  return data
}

/**
 * 받은 매너 리뷰 목록 조회
 * GET /api/users/me/reviews
 */
export async function getMyReviews(params?: {
  page?: number
  size?: number
}): Promise<PageResponse<ReviewItem>> {
  const {data} = await apiClient.get<PageResponse<ReviewItem>>('/users/me/reviews', {params})
  return data
}
