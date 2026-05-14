/**
 * paymentApi.ts — 결제 관련 API 함수
 *
 * 백엔드 endpoints:
 *   POST /api/payments/init              — 결제 초기화 (주문 생성, tossOrderId 발급)
 *   POST /api/payments/confirm           — 토스 결제 승인
 *   GET  /api/payments/{tradeId}         — 결제 정보 조회
 *   POST /api/payments/{paymentKey}/cancel — 결제 취소/환불
 */
import axiosInstance from '../../../lib/axios'

// ── 타입 ─────────────────────────────────────────────────────────────────────

/**
 * 결제 수단 (백엔드 PayMethod enum 일치)
 * Card — 신용/체크카드
 * Pay  — Toss Pay (간편결제)
 */
export type PayMethod = 'Card' | 'Pay'

/**
 * 결제 상태 (백엔드 PaymentStatus enum 일치)
 */
export type PaymentStatus = 'READY' | 'PAID' | 'FAILED' | 'CANCELED' | 'REFUNDED'

/**
 * 결제 초기화 요청 DTO
 * tradeId  — 거래 ID
 * payMethod — 결제 수단 (Card | Pay)
 */
export interface PaymentInitRequest {
  tradeId: number
  payMethod: PayMethod
}

/**
 * 결제 초기화 응답 DTO
 * tossOrderId — Toss SDK에 전달할 orderId
 * orderName   — 상품명 (Toss 결제창 표시용)
 * amount      — 결제 금액
 */
export interface PaymentInitResponse {
  tossOrderId: string
  orderName: string
  amount: number
}

/**
 * 결제 승인 요청 DTO
 * paymentKey — Toss가 발급한 결제 키
 * orderId    — 우리가 발급한 주문 ID (tossOrderId)
 * amount     — 결제 금액 (위변조 검증용)
 */
export interface PaymentConfirmRequest {
  paymentKey: string
  orderId: string
  amount: number
}

/**
 * 결제 응답 DTO (공통)
 */
export interface PaymentResponse {
  paymentId: number
  tradeId: number
  payMethod: PayMethod
  amount: number
  status: PaymentStatus
  approvalNo: string | null
  paidAt: string | null
}

/**
 * 결제 취소 요청 DTO
 * cancelReason — 취소 사유
 * cancelType   — 'CANCEL' (구매 전 취소) | 'REFUND' (구매 후 환불)
 */
export interface PaymentCancelRequest {
  cancelReason: string
  cancelType: 'CANCEL' | 'REFUND'
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 결제 초기화 — 백엔드에 주문 생성 요청, tossOrderId 발급
 * 이후 Toss SDK에 tossOrderId를 넘겨 결제창 오픈
 */
export async function initPayment(request: PaymentInitRequest): Promise<PaymentInitResponse> {
  const {data} = await axiosInstance.post<PaymentInitResponse>('/payments/init', request)
  return data
}

/**
 * 결제 승인 — Toss 결제 완료 콜백 후 백엔드에 최종 승인 요청
 * Toss 서버 → 우리 백엔드 → DB 상태 업데이트
 */
export async function confirmPayment(request: PaymentConfirmRequest): Promise<PaymentResponse> {
  const {data} = await axiosInstance.post<PaymentResponse>('/payments/confirm', request)
  return data
}

/**
 * 결제 정보 조회 — tradeId로 결제 내역 조회
 */
export async function getPayment(tradeId: number): Promise<PaymentResponse> {
  const {data} = await axiosInstance.get<PaymentResponse>(`/payments/${tradeId}`)
  return data
}

/**
 * 결제 취소 / 환불
 * cancelType: 'CANCEL' — 미배송 상태에서 구매 취소
 * cancelType: 'REFUND' — 수령 후 환불
 */
export async function cancelPayment(
  paymentKey: string,
  request: PaymentCancelRequest,
): Promise<PaymentResponse> {
  const {data} = await axiosInstance.post<PaymentResponse>(
    `/payments/${paymentKey}/cancel`,
    request,
  )
  return data
}
