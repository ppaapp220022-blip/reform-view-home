/**
 * pointApi.ts — 포인트 관련 API 함수 모음
 *
 * 백엔드 PointController (/api/points) 엔드포인트 연동
 *
 * GET    /api/users/me/points             — 포인트 지갑 조회 (보유/출금가능/정산대기)
 * GET    /api/users/me/points/history      — 포인트 내역 목록 조회
 * POST   /api/users/me/points/withdraw     — 출금 요청
 * GET    /api/users/me/points/withdraw     — 내 출금 요청 목록
 * DELETE /api/users/me/points/withdraw/{id}— 출금 요청 취소
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
export async function getPointWallet(): Promise<PointWallet> {
  const {data} = await apiClient.get<PointWallet>('/users/me/points')
  return data
}

/**
 * 포인트 내역 목록 조회
 * GET /api/points/history?memberId={memberId}
 * 최신순 전체 목록 (서버 측 페이지네이션 없음 — 배열 반환)
 */
export async function getPointHistory(): Promise<PointHistoryItem[]> {
  const {data} = await apiClient.get<PointHistoryItem[]>('/users/me/points/history')
  return data
}

// ── 출금 요청 타입 ─────────────────────────────────────────────────────────────

/** 출금 처리 상태 (백엔드 PointRequestStatus enum 일치) */
export type WithdrawStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'

/**
 * 출금 요청 항목 (WithdrawResponseDTO)
 * withdrawId    : 출금 요청 ID
 * requestAmount : 출금 신청 금액 (백엔드 필드명 requestAmount, 기존 amount 오기입 수정)
 * bankName      : 은행명
 * accountNumber : 계좌번호
 * status        : PENDING | APPROVED | REJECTED | CANCELED
 * createdAt     : 신청 일시
 */
export interface WithdrawItem {
  withdrawId: number
  requestAmount: number      // ← 백엔드 필드명 (이전에 amount로 잘못 정의됨)
  bankName: string
  accountNumber: string
  status: WithdrawStatus
  createdAt: string          // ISO 8601
}

/**
 * 출금 요청 본문 (WithdrawRequestDTO 필드명 일치)
 * requestAmount : 출금 금액 (백엔드 @NotNull @Min(1000), 이전에 amount로 잘못 전송)
 * bankName      : 은행명
 * accountNumber : 계좌번호
 * bankCode      : 은행 코드 (2026-05-15 추가, @NotBlank — 예: "090" 카카오뱅크)
 * holderInfo    : 계좌주 생년월일 6자리 YYMMDD (2026-05-15 추가, @NotBlank)
 */
export interface WithdrawRequest {
  requestAmount: number      // ← 백엔드 필드명 (이전에 amount로 잘못 전송됨)
  bankName: string
  accountNumber: string
  bankCode: string           // 은행 코드 (예: "090" = 카카오뱅크)
  holderInfo: string         // 계좌주 생년월일 6자리 (예: "990101")
}

/**
 * 출금 요청 등록
 * POST /api/users/me/points/withdraw
 */
export async function requestWithdraw(request: WithdrawRequest): Promise<WithdrawItem> {
  const {data} = await apiClient.post<WithdrawItem>('/users/me/points/withdraw', request)
  return data
}

/**
 * 내 출금 요청 목록 조회
 * GET /api/users/me/points/withdraw
 */
export async function getMyWithdrawList(): Promise<WithdrawItem[]> {
  const {data} = await apiClient.get<WithdrawItem[]>('/users/me/points/withdraw')
  return data
}

/**
 * 출금 요청 취소
 * DELETE /api/users/me/points/withdraw/{withdrawId}
 */
export async function cancelWithdraw(withdrawId: number): Promise<void> {
  await apiClient.delete(`/users/me/points/withdraw/${withdrawId}`)
}
