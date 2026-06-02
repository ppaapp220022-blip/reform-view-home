/**
 * statisticsApi.ts
 *
 * GET /api/statistics
 * 메인 화면 히어로 섹션에 표시할 통계 수치를 백엔드(Redis)에서 조회한다.
 *
 * 응답 필드:
 *   tradeCount   — 누적 거래 수
 *   productCount — 등록 상품 수
 *   memberCount  — 활성 회원 수
 *   satisfaction — 만족도 (%)
 *
 * 인증 불필요 (permitAll): 비로그인 방문자에게도 노출
 */
import apiClient from '../../../lib/axios'

// ── 응답 타입 ─────────────────────────────────────────────────────────────────

export interface StatisticsResponse {
  tradeCount: number    // 누적 거래 수
  productCount: number  // 등록 상품 수
  memberCount: number   // 활성 회원 수
  satisfaction: number  // 만족도 (%)
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 메인 통계 조회
 * @returns StatisticsResponse
 */
export async function getStatistics(): Promise<StatisticsResponse> {
  const { data } = await apiClient.get<StatisticsResponse>('/statistics')
  return data
}
