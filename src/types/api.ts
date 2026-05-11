/**
 * api.ts — 백엔드 공통 응답 래퍼 TypeScript 타입
 *
 * 백엔드 ApiResponse / PageResponse record와 1:1 매핑
 */

// ── 공통 응답 래퍼 ─────────────────────────────────────────────────────────────

/**
 * 모든 API 응답의 공통 래퍼
 * success : 처리 성공 여부
 * message : 서버 메시지 (성공/실패 설명)
 * data    : 실제 페이로드 (성공 시)
 *
 * PaymentController · PointController 등 일부 컨트롤러는 래퍼 없이 DTO를 직접 반환하므로,
 * axios 인터셉터에서 success 필드가 있으면 자동 언래핑한다.
 */
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// ── 페이지네이션 응답 ──────────────────────────────────────────────────────────

/**
 * 페이지네이션이 적용된 목록 응답
 * content       : 현재 페이지 데이터 배열
 * totalElements : 전체 아이템 수
 * totalPages    : 전체 페이지 수
 * size          : 페이지 크기
 * number        : 현재 페이지 번호 (0-based 서버 → 응답 시 1부터로 전환됨)
 * first         : 첫 번째 페이지 여부
 * last          : 마지막 페이지 여부
 */
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}
