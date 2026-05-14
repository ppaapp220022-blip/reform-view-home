/**
 * deliveryApi.ts — 택배 배송 추적 API 함수 모음
 *
 * 백엔드 DeliveryTrackingController (/api/delivery/tracking) 엔드포인트 연동
 *
 * GET  /api/delivery/tracking/couriers — 지원 택배사 목록 조회
 * POST /api/delivery/tracking/trace    — 송장번호로 배송 상태 조회
 *
 * 응답은 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 *
 * 사용 시나리오:
 *   1. /couriers 호출 → 사용자가 택배사 선택
 *   2. /trace 호출 → 배송 상태 타임라인 표시
 *   (거래 상세에서도 GET /api/trades/{id}/tracking으로 간접 호출됨)
 */
import apiClient from '../../../lib/axios'

// ── 택배사 목록 ────────────────────────────────────────────────────────────────

/** 단일 택배사 정보 (DeliveryCourierListResponseDTO 내 항목) */
export interface Courier {
  code: string   // 택배사 코드 (예: "kr.cjlogistics")
  name: string   // 택배사 이름 (예: "CJ대한통운")
}

/** 택배사 목록 응답 (DeliveryCourierListResponseDTO) */
export interface DeliveryCourierListResponse {
  couriers: Courier[]
}

/**
 * 지원 택배사 목록 조회
 * GET /api/delivery/tracking/couriers
 * 로그인 불필요
 */
export async function getCouriers(): Promise<DeliveryCourierListResponse> {
  const {data} = await apiClient.get<DeliveryCourierListResponse>(
    '/delivery/tracking/couriers',
  )
  return data
}

// ── 배송 추적 ─────────────────────────────────────────────────────────────────

/** 배송 추적 요청 (DeliveryTrackingTraceRequestDTO) */
export interface DeliveryTrackingTraceRequest {
  courierCode: string      // 택배사 코드
  trackingNumbers: string[] // 송장번호 목록
}

/** 배송 단계 이력 항목 */
export interface DeliveryTraceEvent {
  time: string       // ISO 8601
  status: string     // 상태 코드 (예: "in_transit")
  location: string   // 현재 위치
  description: string // 이력 설명
}

/** 단일 송장 배송 결과 */
export interface DeliveryTraceResult {
  trackingNumber: string
  status: string                   // 현재 배송 상태 코드
  statusLabel: string              // 현재 배송 상태 한국어 레이블
  from: string                     // 출발지
  to: string                       // 도착지
  estimatedDelivery: string | null // 예상 도착일 (없을 수 있음)
  lastEvent: DeliveryTraceEvent | null
  events: DeliveryTraceEvent[]     // 전체 이력 (최신 순)
}

/** 배송 추적 응답 (DeliveryTrackingTraceResponseDTO) */
export interface DeliveryTrackingTraceResponse {
  results: DeliveryTraceResult[]
}

/**
 * 송장번호 배송 추적
 * POST /api/delivery/tracking/trace
 * 서버가 외부 deliveryapi.co.kr에 중계 요청 후 결과 반환
 */
export async function traceDelivery(
  request: DeliveryTrackingTraceRequest,
): Promise<DeliveryTrackingTraceResponse> {
  const {data} = await apiClient.post<DeliveryTrackingTraceResponse>(
    '/delivery/tracking/trace',
    request,
  )
  return data
}
