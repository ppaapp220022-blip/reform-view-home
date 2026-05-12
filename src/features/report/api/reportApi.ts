/**
 * reportApi.ts — 신고 관련 API 함수 모음
 *
 * 백엔드 ReportController (/api/reports) 엔드포인트 연동
 *
 * POST /api/reports       — 신고 등록
 * GET  /api/reports/my    — 내 신고 내역 조회 (페이징)
 *
 * 응답은 ApiResponse<T> 래퍼 — axios 인터셉터에서 자동 언래핑
 */
import apiClient from '../../../lib/axios'
import type { PageResponse } from '../../../types/api'

// ── 타입 (백엔드 Enum / DTO 기준) ─────────────────────────────────────────────

/** 신고 대상 타입 */
export type ReportTargetType = 'POST' | 'COMMUNITY_POST'

/** 신고 사유 */
export type ReportReason = 'FAKE' | 'INAPPROPRIATE' | 'FRAUD' | 'ETC'

/** 신고 처리 상태 */
export type ReportStatus = 'PENDING' | 'NORMAL' | 'WARNING' | 'DELETED'

/** 신고 사유 한글 레이블 */
export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  FAKE:          '허위 매물',
  INAPPROPRIATE: '부적절한 게시글',
  FRAUD:         '사기 의심',
  ETC:           '기타',
}

/** 신고 처리 상태 한글 레이블 */
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: '접수됨',
  NORMAL:  '문제 없음',
  WARNING: '주의',
  DELETED: '게시글 삭제',
}

/**
 * 신고 등록 요청 (ReportRequestDTO)
 */
export interface ReportRequest {
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  detail?: string            // 상세 설명 (최대 500자)
}

/**
 * 신고 응답 항목 (ReportResponseDTO)
 */
export interface ReportItem {
  reportId: number
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  detail: string | null
  status: ReportStatus
  createdAt: string          // ISO 8601
}

// ── API 함수 ──────────────────────────────────────────────────────────────────

/**
 * 신고 등록
 * POST /api/reports
 * ReportModal에서 사용
 * @returns 생성된 신고 ID
 */
export async function addReport(request: ReportRequest): Promise<number> {
  const { data } = await apiClient.post<{ reportId: number }>('/reports', request)
  return data.reportId
}

/**
 * 내 신고 내역 조회
 * GET /api/reports/my
 * MyPage 신고 내역 탭에서 사용
 */
export async function getMyReports(params?: {
  page?: number
  size?: number
}): Promise<PageResponse<ReportItem>> {
  const { data } = await apiClient.get<PageResponse<ReportItem>>('/reports/my', { params })
  return data
}
