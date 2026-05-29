/**
 * listingApi.ts — 판매글 관련 API 함수 모음
 *
 * 백엔드 PostController (/api/listings) 엔드포인트 연동
 *
 * GET    /api/listings             — 판매글 목록 조회 (필터/정렬/페이지네이션, AI 유사검색)
 * GET    /api/listings/{id}        — 판매글 상세 조회
 * POST   /api/listings/images      — 이미지 파일 업로드 → URL 목록 반환
 * POST   /api/listings             — 판매글 등록 (JSON + imageUrls[])
 * PATCH  /api/listings/{id}        — 판매글 수정 (JSON + imageUrls[])
 * DELETE /api/listings/{id}        — 판매글 삭제 (소프트)
 * POST   /api/listings/{id}/like   — 찜 토글 (추가/취소)
 *
 * 응답은 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 */
import apiClient from '../../../lib/axios'
import type {PageResponse} from '../../../types/api'
import type {DeliveryType, Grade, PostStatus, RiskLevel, Sport} from '../../../types/listing'

// ── 응답 타입 (백엔드 DTO 기준) ────────────────────────────────────────────────

/** 판매자 요약 정보 (SellerBriefDTO) */
export interface SellerBrief {
  memberId: number
  nickname: string
  profileImageUrl: string | null
  mannerScore: number
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
  isWished: boolean          // 로그인 사용자 기준 찜 여부 (비로그인 시 false)
  thumbnailUrl: string | null
  timeAgo: string            // 서버에서 계산된 "3시간 전" 형식 문자열
  createdAt: string          // ISO 8601
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
  riskLevel: RiskLevel       // AI 사기 탐지 위험도
  viewCount: number
  wishCount: number
  isWished: boolean
  imageUrls: string[]
  timeAgo: string            // 서버에서 계산된 "3시간 전" 형식 문자열
  createdAt: string
  updatedAt: string
  seller: SellerBrief
  tradeId: number | null     // 연결된 거래 번호 (거래 시작 이후)
}

// ── 요청 타입 ─────────────────────────────────────────────────────────────────

/** 판매글 목록 조회 파라미터 */
export interface ListingQueryParams {
  sport?: Sport
  keyword?: string
  tradeType?: DeliveryType
  condition?: Grade          // 컨디션 필터 (Grade 기준)
  minPrice?: number          // 최소 가격 필터
  maxPrice?: number          // 최대 가격 필터
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'popular' | 'ai_recommend'
  page?: number              // 0-based
  size?: number
}

/**
 * 판매글 등록 요청 (ListingCreateRequestDTO)
 * 이미지는 먼저 /images 업로드 후 URL 목록을 imageUrls에 전달
 *
 * 백엔드 필드명 주의:
 *   description (content X) — 본문
 *   condition   (grade X)   — 컨디션 등급 (S/A/B/C)
 *   tradeType   (deliveryType X) — 거래 방식
 *   uniformName 백엔드에서 title로 자동 채움 → 전송 불필요
 */
export interface ListingCreateRequest {
  title: string
  description: string        // 백엔드: description (ListingCreateRequestDTO)
  sport: Sport
  team: string
  condition: Grade           // 백엔드: condition (PostCardDTO 응답은 grade로 반환)
  size?: string
  marking?: boolean
  price: number
  tradeType: DeliveryType    // 백엔드: tradeType (PostCardDTO 응답은 deliveryType으로 반환)
  imageUrls: string[]        // 사전 업로드된 이미지 URL 목록
}

/**
 * 판매글 수정 요청 (ListingUpdateRequestDTO)
 * PATCH이므로 변경할 필드만 전송 (undefined는 생략)
 *
 * 백엔드 필드명: description / condition / tradeType (Create와 동일)
 */
export interface ListingUpdateRequest {
  title?: string
  description?: string       // 백엔드: description
  sport?: Sport
  team?: string
  uniformName?: string
  price?: number
  condition?: Grade          // 백엔드: condition
  size?: string
  marking?: boolean
  tradeType?: DeliveryType   // 백엔드: tradeType
  imageUrls?: string[]       // 새 이미지 URL 목록 (기존 이미지 대체)
}

/** 찜 토글 응답 */
export interface WishToggleResponse {
  isLiked: boolean
  likeCount: number
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 판매글 목록 조회
 * GET /api/listings
 * - keyword가 있으면 AI 기반 유사 의미 검색
 * - keyword가 없으면 필터/정렬 기반 목록 조회
 * 비로그인 시에도 접근 가능
 */
export async function getListings(
  params?: ListingQueryParams,
): Promise<PageResponse<PostCard>> {
  const {data} = await apiClient.get<PageResponse<PostCard>>('/listings', {params})
  return data
}

/**
 * 판매글 상세 조회
 * GET /api/listings/{id}
 */
export async function getListingDetail(postId: number): Promise<PostDetail> {
  const {data} = await apiClient.get<PostDetail>(`/listings/${postId}`)
  return data
}

/**
 * 판매글 이미지 업로드
 * POST /api/listings/images (multipart/form-data)
 * 판매글 등록/수정 전에 먼저 호출해 imageUrls[]를 받아야 함
 *
 * @param files 업로드할 이미지 파일 목록
 * @returns 업로드된 이미지 URL 목록
 */
export async function uploadListingImages(files: File[]): Promise<string[]> {
  const fd = new FormData()
  files.forEach((file) => fd.append('images', file))
  
  const {data} = await apiClient.post<{ urls: string[] }>('/listings/images', fd, {
    headers: {'Content-Type': 'multipart/form-data'},
  })
  return data.urls
}

/**
 * 판매글 등록
 * POST /api/listings (JSON)
 * imageUrls[]는 사전에 /images API로 업로드한 URL 목록
 * @returns 생성된 판매글 ID
 */
export async function createListing(request: ListingCreateRequest): Promise<number> {
  const {data} = await apiClient.post<{ id: number }>('/listings', request)
  return data.id
}

/**
 * 판매글 수정
 * PATCH /api/listings/{id} (JSON)
 * @returns 수정된 판매글 ID
 */
export async function updateListing(
  postId: number,
  request: ListingUpdateRequest,
): Promise<number> {
  const {data} = await apiClient.patch<{ id: number }>(`/listings/${postId}`, request)
  return data.id
}

/**
 * 판매글 삭제 (소프트 삭제 — 상태를 DELETED로 변경)
 * DELETE /api/listings/{id}
 */
export async function deleteListing(postId: number): Promise<void> {
  await apiClient.delete(`/listings/${postId}`)
}

/**
 * 판매글 찜 토글
 * POST /api/listings/{id}/like
 * 로그인 필수 (미로그인 시 401 반환)
 * @returns isLiked: 현재 찜 상태, likeCount: 최신 찜 수
 */
export async function toggleWish(postId: number): Promise<WishToggleResponse> {
  const {data} = await apiClient.post<WishToggleResponse>(`/listings/${postId}/like`)
  return data
}

/**
 * 내 찜 목록 조회
 * GET /api/listings/my/likes
 * 로그인 사용자가 찜한 판매글을 최신순으로 반환 (삭제·숨김 글 제외)
 */
export async function getMyWishes(): Promise<PostCard[]> {
  const {data} = await apiClient.get<PostCard[]>('/listings/my/likes')
  return data
}

// ── AI 판매글 도우미 API ──────────────────────────────────────────────────────

/**
 * AI 판매글 제목/설명 자동 제안
 * POST /api/listings/ai-suggest (multipart/form-data)
 *
 * 이미지 파일을 업로드하면 Spring AI가 판매글 제목과 설명을 자동 추천
 * @param image 분석할 이미지 파일 (첫 번째 사진 권장)
 * @returns { title: string, description: string }
 */
export async function suggestListingFromImage(
  image: File,
): Promise<{ title: string; description: string }> {
  const formData = new FormData()
  formData.append('image', image)
  const {data} = await apiClient.post<{ title: string; description: string }>(
    '/listings/ai-suggest',
    formData,
    {headers: {'Content-Type': 'multipart/form-data'}},
  )
  return data
}


// ── 인기·검색 도우미 API ──────────────────────────────────────────────────────

/**
 * 인기 판매글 목록 조회 (배치 처리 인기순)
 * GET /api/listings?sort=popular&size={size}
 *
 * 백엔드 배치 스케줄러가 viewCount·wishCount 기반으로 인기글을 주기적으로 갱신.
 * SearchPage "인기 매물" 섹션과 GNB 검색 자동완성 기본 목록에 활용.
 */
export async function getPopularListings(size = 8): Promise<PostCard[]> {
  const res = await getListings({sort: 'popular', size, page: 0})
  return res.content
}

/**
 * 검색 자동완성용 키워드 매물 조회 (AI 의미 기반 유사 검색)
 * GET /api/listings?keyword={keyword}&size={size}
 *
 * keyword 존재 시 백엔드가 Spring AI + Vector Store 기반 유사 의미 검색 실행.
 * GNB 검색창에서 300ms 디바운스 후 호출 — 빈 keyword는 빈 배열 반환.
 */
export async function getSearchSuggestions(keyword: string, size = 5): Promise<PostCard[]> {
  if (!keyword.trim()) return []
  const res = await getListings({keyword, size, page: 0})
  return res.content
}
