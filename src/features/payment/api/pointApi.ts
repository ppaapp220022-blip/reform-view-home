/**
 * pointApi.ts — 포인트 관련 API 함수 모음
 *
 * 백엔드 PointController (/api/points) 엔드포인트 연동
 *
 * GET /api/points/wallet  — 포인트 지갑 조회 (보유/출금가능/정산대기)
 * GET /api/points/history — 포인트 내역 목록 조회
 *
 * 백엔드 PointController는 ApiResponse 래퍼 없이 DTO를 직접 반환하므로
 * axios 인터셉터 언래핑 미적용 (그대로 통과)
 */
import apiClient from '../../../lib/axios'

// ── 타입 (백엔드 DTO 기준) ────────────────────────────────────────────────────

/**
 * 포인트 내역 타입 (PointHistoryType enum 일치)
 * EARN     — 포인트 적립 (거래 완료 정산)
 * WITHDRAW — 포인트 출금
 */
export type PointHistoryType = 'EARN' | 'WITHDRAW'

/**
 * 포인트 지갑 정보 (PointWalletResponseDTO)
 * balance      : 총 보유 포인트
 * withdrawable : 출금 가능 포인트 (구매 확정 완료분)
 * pending      : 정산 대기 포인트 (구매 확정 전, 에스크로 보관 중)
 */
export interface PointWallet {
  balance: number
  withdrawable: number
  pending: number
}

/**
 * 포인트 내역 항목 (PointHistoryItemDTO)
 * pointId      : 내역 ID
 * type         : EARN | WITHDRAW
 * changeAmount : 변동량 (적립 시 양수, 출금 시 음수)
 * balance      : 변동 후 잔액
 * tradeId      : 연결된 거래 ID (null 가능 — 출금 시 없음)
 * createdAt    : 발생 일시
 */
export interface PointHistoryItem {
  pointId: number
  type: PointHistoryType
  changeAmount: number
  balance: number
  tradeId: number | null
  createdAt: string              // ISO 8601
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 포인트 지갑 조회
 * GET /api/points/wallet?memberId={memberId}
 * 마이페이지 포인트 탭에서 사용
 */
export async function getPointWallet(memberId: number): Promise<PointWallet> {
  const { data } = await apiClient.get<PointWallet>('/points/wallet', {
    params: { memberId },
  })
  return data
}

/**
 * 포인트 내역 목록 조회
 * GET /api/points/history?memberId={memberId}
 * 최신순 전체 목록 (서버 측 페이지네이션 없음 — 배열 반환)
 */
export async function getPointHistory(memberId: number): Promise<PointHistoryItem[]> {
  const { data } = await apiClient.get<PointHistoryItem[]>('/points/history', {
    params: { memberId },
  })
  return data
}
