/**
 * listingApi.ts — 판매글 관련 API 함수 모음
 *
 * 백엔드 PostController (/api/listings) 엔드포인트 연동
 *
 * GET    /api/listings          — 판매글 목록 조회 (페이지네이션)
 * GET    /api/listings/{id}     — 판매글 상세 조회
 * POST   /api/listings          — 판매글 등록 (multipart/form-data)
 * PUT    /api/listings/{id}     — 판매글 수정 (multipart/form-data)
 * DELETE /api/listings/{id}     — 판매글 삭제
 *
 * 응답은 모두 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 */
import apiClient from '../../../lib/axios'
import type { PageResponse } from '../../../types/api'
import type { Sport, DeliveryType, Grade, PostStatus, RiskLevel } from '../../../types/listing'

// ── 응답 타입 (백엔드 DTO 기준) ────────────────────────────────────────────────

/** 판매자 요약 정보 (SellerBriefDTO) */
export interface SellerBrief {
  memberId: number
  nickname: string
  profileImageUrl: string | null
  mannerScore: number          // BigDecimal → number
}

/**
 * 판매글 목록 카드 (PostCardDTO)
 * 목록 페이지·검색 결과에서 사용
 */
export interface PostCard {
  postId: number
  title: string
  team: string
  sport: Sport
  price: number
  grade: Grade
  size: string | null
  deliveryType: DeliveryType
  status: PostStatus
  viewCount: number
  wishCount: number
  isWished: boolean            // 로그인 사용자 기준 찜 여부 (비로그인 시 false)
  thumbnailUrl: string | null
  timeAgo: string              // 서버에서 계산된 "3시간 전" 형식 문자열
  createdAt: string            // ISO 8601
  seller: SellerBrief
}

/**
 * 판매글 상세 (PostDetailDTO)
 * 상세 페이지에서 사용
 */
export interface PostDetail {
  postId: number
  title: string
  content: string
  sport: Sport
  team: string
  uniformName: string
  grade: Grade
  size: string | null
  marking: boolean | null
  price: number
  deliveryType: DeliveryType
  status: PostStatus
  riskLevel: RiskLevel         // AI 사기 탐지 위험도
  viewCount: number
  wishCount: number
  isWished: boolean
  imageUrls: string[]
  createdAt: string
  updatedAt: string
  seller: SellerBrief
  tradeId: number | null       // 연결된 거래 번호 (거래 시작 이후)
}

// ── 요청 타입 ─────────────────────────────────────────────────────────────────

/** 판매글 목록 조회 파라미터 */
export interface ListingQueryParams {
  sport?: Sport
  keyword?: string
  tradeType?: DeliveryType
  condition?: Grade            // 컨디션 필터 (Grade 기준)
  minPrice?: number            // 최소 가격 필터
  maxPrice?: number            // 최대 가격 필터
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'popular'  // 정렬
  page?: number                // 0-based
  size?: number
}

/**
 * 판매글 등록/수정 폼 데이터 (PostRequestDTO 기준)
 * multipart/form-data로 전송 — 이미지 파일 포함
 */
export interface PostFormData {
  title: string
  content: string
  sport: Sport
  team: string
  uniformName: string
  grade: Grade
  size?: string
  marking?: boolean
  price: number
  deliveryType: DeliveryType
  images?: File[]             // 첨부 이미지 파일 목록
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 판매글 목록 조회
 * GET /api/listings
 * 비로그인 시에도 접근 가능 (X-Member-Id 없이도 동작)
 */
export async function getListings(
  params?: ListingQueryParams,
): Promise<PageResponse<PostCard>> {
  const { data } = await apiClient.get<PageResponse<PostCard>>('/listings', { params })
  return data
}

/**
 * 판매글 상세 조회
 * GET /api/listings/{id}
 */
export async function getListingDetail(postId: number): Promise<PostDetail> {
  const { data } = await apiClient.get<PostDetail>(`/listings/${postId}`)
  return data
}

/**
 * 판매글 등록
 * POST /api/listings (multipart/form-data)
 * @returns 생성된 판매글 ID
 */
export async function createListing(formData: PostFormData): Promise<number> {
  const fd = buildFormData(formData)
  const { data } = await apiClient.post<{ id: number }>('/listings', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.id
}

/**
 * 판매글 수정
 * PUT /api/listings/{id} (multipart/form-data)
 * @returns 수정된 판매글 ID
 */
export async function updateListing(postId: number, formData: PostFormData): Promise<number> {
  const fd = buildFormData(formData)
  const { data } = await apiClient.put<{ id: number }>(`/listings/${postId}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.id
}

/**
 * 판매글 삭제 (소프트 삭제 — 상태를 DELETED로 변경)
 * DELETE /api/listings/{id}
 */
export async function deleteListing(postId: number): Promise<void> {
  await apiClient.delete(`/listings/${postId}`)
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

/**
 * PostFormData → FormData 변환
 * 이미지 파일 포함, undefined/null 필드 제외
 */
function buildFormData(form: PostFormData): FormData {
  const fd = new FormData()
  fd.append('title', form.title)
  fd.append('content', form.content)
  fd.append('sport', form.sport)
  fd.append('team', form.team)
  fd.append('uniformName', form.uniformName)
  fd.append('grade', form.grade)
  if (form.size) fd.append('size', form.size)
  if (form.marking !== undefined) fd.append('marking', String(form.marking))
  fd.append('price', String(form.price))
  fd.append('deliveryType', form.deliveryType)
  if (form.images) {
    form.images.forEach((file) => fd.append('images', file))
  }
  return fd
}
