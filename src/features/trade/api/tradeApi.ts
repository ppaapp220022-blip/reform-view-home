/**
 * tradeApi.ts — 거래 관련 API 함수 모음
 *
 * 백엔드 TradeController (/api/trades) 엔드포인트 연동
 *
 * POST  /api/trades                   — 거래 생성 (구매하기)
 * GET   /api/trades/{id}              — 거래 상세 조회
 * PATCH /api/trades/{id}/accept       — 거래 수락 (판매자)
 * PATCH /api/trades/{id}/confirm      — 구매 확정 (구매자)
 * PATCH /api/trades/{id}/delivery     — 배송지 수정
 * PATCH /api/trades/{id}/shipping     — 배송 정보 입력 (택배사+송장번호)
 * GET   /api/trades/{id}/tracking     — 배송 추적 조회
 * POST  /api/trades/{id}/reviews      — 매너 리뷰 등록
 * GET   /api/trades/my                — 내 거래 목록 (구매자/판매자)
 *
 * 응답은 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 */
import apiClient from '../../../lib/axios'
import type {PageResponse} from '../../../types/api'
import type {TradeStatus} from '../../../types/listing'
import type {DeliveryTrackingTraceResponse} from '../../delivery/api/deliveryApi'

// ── 응답 타입 (백엔드 DTO 기준) ────────────────────────────────────────────────

/** 회원 요약 정보 (MemberBriefDTO) */
export interface MemberBrief {
  memberId: number
  nickname: string
  profileImageUrl: string | null
}

/** 판매글 요약 정보 (PostBriefDTO) */
export interface PostBrief {
  postId: number
  title: string
  thumbnailUrl: string | null
  price: number
  status: string // PostStatus
}

/**
 * 거래 배송 방식 (백엔드 TradeDeliveryType enum 일치)
 * DIRECT   — 직거래
 * DELIVERY — 택배
 */
export type TradeDeliveryType = 'DIRECT' | 'DELIVERY'

/**
 * 거래 상세 응답 (TradeResponseDTO)
 */
export interface TradeResponse {
  tradeId: number
  post: PostBrief
  buyer: MemberBrief
  seller: MemberBrief
  status: TradeStatus
  deliveryType: TradeDeliveryType
  deliveryAddress: string | null
  courierCode: string | null     // 택배사 코드 (배송 입력 후)
  trackingNumber: string | null  // 송장번호 (배송 입력 후)
  tradePrice: number
  completedAt: string | null     // ISO 8601
  confirmedAt: string | null
  createdAt: string
  hasReview: boolean             // 현재 사용자의 리뷰 작성 여부
}

/** 리뷰 응답 (ReviewResponseDTO) */
export interface ReviewResponse {
  mannerId: number
  tradeId: number
  buyer: MemberBrief
  seller: MemberBrief
  score: number                  // 1~5
  content: string | null
  createdAt: string
}

// ── 요청 타입 ─────────────────────────────────────────────────────────────────

/**
 * 거래 생성 요청 (TradeRequestDTO 기준)
 */
export interface TradeCreateRequest {
  postId: number
  deliveryType: TradeDeliveryType
}

/**
 * 배송지 수정 요청 (DeliveryRequestDTO 기준)
 */
export interface DeliveryUpdateRequest {
  deliveryAddress: string
  deliveryType?: TradeDeliveryType
}

/**
 * 배송 정보 입력 요청 (TradeShippingRequestDTO)
 * 판매자가 택배사와 송장번호를 입력해 배송을 시작할 때 사용
 */
export interface ShippingRequest {
  courierCode: string    // 택배사 코드 (deliveryapi.co.kr 코드: "cj", "lotte" 등)
  courierName: string    // 택배사 이름 — 백엔드가 외부 API를 재호출하지 않도록 프론트에서 전달
  trackingNumber: string // 송장번호
}

/**
 * 매너 리뷰 작성 요청 (CreateReviewRequest 기준)
 */
export interface ReviewCreateRequest {
  score: number           // 1~5 별점
  comment?: string        // 후기 본문 (최대 500자, 선택)
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 거래 생성
 * POST /api/trades
 * 판매글에서 "구매하기" 클릭 → 거래 생성 → 결제 페이지로 이동
 * @returns 생성된 tradeId + 초기 TradeStatus
 */
export async function createTrade(
  request: TradeCreateRequest,
): Promise<{ tradeId: number; status: TradeStatus }> {
  const {data} = await apiClient.post<{ tradeId: number; status: TradeStatus }>(
    '/trades',
    request,
  )
  return data
}

/**
 * 거래 상세 조회
 * GET /api/trades/{id}
 */
export async function getTrade(tradeId: number): Promise<TradeResponse> {
  const {data} = await apiClient.get<TradeResponse>(`/trades/${tradeId}`)
  return data
}

/**
 * 거래 수락 (판매자 전용)
 * PATCH /api/trades/{id}/accept
 * 판매자가 구매 요청을 수락 → ACCEPTED 상태로 전환
 */
export async function acceptTrade(tradeId: number): Promise<TradeStatus> {
  const {data} = await apiClient.patch<{ status: TradeStatus }>(`/trades/${tradeId}/accept`)
  return data.status
}

/**
 * 구매 확정 (구매자 전용)
 * PATCH /api/trades/{id}/confirm
 * 구매자가 상품 수령 후 "구매 확정" 버튼 클릭 시 호출
 * @returns 업데이트된 TradeStatus (CONFIRMED)
 */
export async function confirmTrade(tradeId: number): Promise<TradeStatus> {
  const {data} = await apiClient.patch<{ status: TradeStatus }>(`/trades/${tradeId}/confirm`)
  return data.status
}

/**
 * 배송지 수정
 * PATCH /api/trades/{id}/delivery
 * 택배 거래: 구매자가 배송지 수정
 * 직거래: 판매자가 만남 주소 수정
 */
export async function updateDelivery(
  tradeId: number,
  request: DeliveryUpdateRequest,
): Promise<TradeStatus> {
  const {data} = await apiClient.patch<{ status: TradeStatus }>(
    `/trades/${tradeId}/delivery`,
    request,
  )
  return data.status
}

/**
 * 배송 정보 입력 (판매자 전용)
 * PATCH /api/trades/{id}/shipping
 * 판매자가 택배사 코드와 송장번호를 입력해 배송을 시작
 */
export async function startShipping(
  tradeId: number,
  request: ShippingRequest,
): Promise<TradeStatus> {
  const {data} = await apiClient.patch<{ status: TradeStatus }>(
    `/trades/${tradeId}/shipping`,
    request,
  )
  return data.status
}

/**
 * 배송 추적 조회
 * GET /api/trades/{id}/tracking
 * 거래에 등록된 송장번호로 실시간 배송 상태를 조회
 */
export async function getTradeTracking(
  tradeId: number,
): Promise<DeliveryTrackingTraceResponse> {
  const {data} = await apiClient.get<DeliveryTrackingTraceResponse>(
    `/trades/${tradeId}/tracking`,
  )
  return data
}

/**
 * 매너 리뷰 등록
 * POST /api/trades/{id}/reviews
 * 거래 완료 후 상대방에 대한 별점·후기 작성
 * @returns 생성된 reviewId
 */
export async function createReview(
  tradeId: number,
  request: ReviewCreateRequest,
): Promise<number> {
  const {data} = await apiClient.post<{ reviewId: number }>(
    `/trades/${tradeId}/reviews`,
    request,
  )
  return data.reviewId
}

/**
 * 내 거래 목록 조회
 * GET /api/trades/my
 * role: 'buyer' (구매자) | 'seller' (판매자)
 * status: 특정 거래 상태로 필터링 (선택)
 */
export async function getMyTrades(params: {
  role?: 'buyer' | 'seller'
  status?: TradeStatus
  page?: number
  size?: number
}): Promise<PageResponse<TradeResponse>> {
  const {data} = await apiClient.get<PageResponse<TradeResponse>>('/trades/my', {params})
  return data
}
