/**
 * AdminReportsPage — 관리자 신고 목록 (/admin/reports)
 *
 * 기능:
 *   - 신고 목록 조회 (상태 필터 + 페이지네이션)
 *   - 미처리(PENDING) 신고 우선 노출
 *   - 신고 상세 페이지 링크 (/admin/reports/:id)
 *   - 인라인 처리: 정상(NORMAL) / 경고(WARNING) / 삭제(DELETED)
 */
import {useState} from 'react'
import {Link} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {ChevronLeft, ChevronRight, Flag, Loader2} from 'lucide-react'
import type {AdminReportActionRequest, ReportStatus} from '../../features/admin/api/adminApi'
import {getAdminReports, processAdminReport} from '../../features/admin/api/adminApi'

// ── 상수 ─────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: '미처리',
  NORMAL: '정상',
  WARNING: '경고',
  DELETED: '삭제',
}

const STATUS_COLORS: Record<ReportStatus, { color: string; bg: string }> = {
  PENDING: {color: 'var(--color-accent)', bg: 'rgba(255,46,77,.1)'},
  NORMAL: {color: 'var(--color-success)', bg: 'rgba(0,179,110,.1)'},
  WARNING: {color: 'var(--color-warning)', bg: 'rgba(255,149,0,.1)'},
  DELETED: {color: 'var(--color-text-hint)', bg: 'rgba(0,0,0,.06)'},
}

const REASON_LABELS: Record<string, string> = {
  FAKE: '허위매물',
  INAPPROPRIATE: '부적절한 내용',
  FRAUD: '사기 의심',
  ETC: '기타',
}

const TARGET_LABELS: Record<string, string> = {
  POST: '판매글',
  COMMUNITY_POST: '커뮤니티',
}

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  {value: '', label: '전체'},
  {value: 'PENDING', label: '미처리'},
  {value: 'NORMAL', label: '정상'},
  {value: 'WARNING', label: '경고'},
  {value: 'DELETED', label: '삭제'},
]

const PAGE_SIZE = 20

// ── 인라인 처리 버튼 ──────────────────────────────────────────────────────────

function ActionButtons({reportId, currentStatus}: { reportId: number; currentStatus: ReportStatus }) {
  const qc = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: (request: AdminReportActionRequest) => processAdminReport(reportId, request),
    onSuccess: () => void qc.invalidateQueries({queryKey: ['admin-reports']}),
  })
  
  // 이미 처리된 신고는 버튼 숨김
  if (currentStatus !== 'PENDING') return null
  
  return (
    <div className="flex items-center gap-1">
      {(['NORMAL', 'WARNING', 'DELETED'] as ReportStatus[]).map(action => (
        <button
          key={action}
          onClick={e => {
            e.preventDefault()   // Link 클릭 막기
            /**
             * 목록 인라인 처리에서도 백엔드가 추가로 받는 adminMemo를 함께 보낼 수 있게 한다.
             * 취소를 누르면 빠른 처리를 중단하고, 빈 문자열은 메모 없음으로 취급한다.
             */
            const memo = window.prompt(`${STATUS_LABELS[action]} 처리 메모를 입력하세요. 비워두면 메모 없이 처리됩니다.`, '')
            if (memo === null) return

            mutation.mutate({
              action,
              adminMemo: memo.trim() || undefined,
            })
          }}
          disabled={mutation.isPending}
          className="text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-opacity disabled:opacity-50"
          style={{
            background: STATUS_COLORS[action].bg,
            color: STATUS_COLORS[action].color,
            border: `1px solid ${STATUS_COLORS[action].color}30`,
          }}
        >
          {STATUS_LABELS[action]}
        </button>
      ))}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('')
  const [page, setPage] = useState(0)
  
  const {data, isLoading} = useQuery({
    queryKey: ['admin-reports', statusFilter, page],
    queryFn: () =>
      getAdminReports({
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      }),
    staleTime: 30_000,
  })
  
  const reports = data?.content ?? []
  const totalPages = data ? Math.ceil(data.totalElements / PAGE_SIZE) : 0
  
  return (
    <div className="p-6 md:p-8" style={{color: 'var(--color-text-main)'}}>
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background: 'rgba(255,46,77,.1)', color: 'var(--color-accent)'}}
        >
          <Flag size={18}/>
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{fontFamily: "'Giants','Pretendard',sans-serif"}}
          >
            신고 관리
          </h1>
          <p className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>
            미처리 신고 우선 처리 · 상세 페이지에서 게시글·회원 조치 가능
          </p>
        </div>
      </div>
      
      {/* 상태 필터 탭 */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_FILTER_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => {
              setStatusFilter(o.value as ReportStatus | '')
              setPage(0)
            }}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={{
              background: statusFilter === o.value
                ? 'var(--color-primary)'
                : 'var(--color-surface)',
              color: statusFilter === o.value ? '#fff' : 'var(--color-text-sub)',
              border: `1px solid ${statusFilter === o.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      
      {/* 테이블 */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{border: '1px solid var(--color-border)'}}
      >
        {/* 헤더 */}
        <div
          className="grid text-xs font-semibold px-4 py-3"
          style={{
            gridTemplateColumns: '60px 80px 80px 1fr 100px 120px 1fr',
            background: 'var(--color-surface-sunken)',
            color: 'var(--color-text-hint)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span>ID</span>
          <span>대상 유형</span>
          <span>대상 ID</span>
          <span>신고 사유</span>
          <span>상태</span>
          <span>신고일</span>
          <span>처리</span>
        </div>
        
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{color: 'var(--color-accent)'}}/>
          </div>
        )}
        
        {!isLoading && reports.length === 0 && (
          <div className="py-16 text-center text-sm" style={{color: 'var(--color-text-hint)'}}>
            조건에 맞는 신고가 없습니다.
          </div>
        )}
        
        {!isLoading && reports.map(r => {
          const sc = STATUS_COLORS[r.status]
          return (
            <Link
              key={r.reportId}
              to={`/admin/reports/${r.reportId}`}
              className="grid items-center px-4 py-3 text-sm no-underline transition-colors hover:bg-[var(--color-surface-raised)]"
              style={{
                gridTemplateColumns: '60px 80px 80px 1fr 100px 120px 1fr',
                borderBottom: '1px solid var(--color-border)',
                color: 'var(--color-text-main)',
              }}
            >
              {/* ID */}
              <span
                className="text-xs"
                style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
              >
                {r.reportId}
              </span>
              {/* 대상 유형 */}
              <span className="text-xs" style={{color: 'var(--color-text-sub)'}}>
                {TARGET_LABELS[r.targetType] ?? r.targetType}
              </span>
              {/* 대상 ID */}
              <span
                className="text-xs"
                style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
              >
                #{r.targetId}
              </span>
              {/* 사유 */}
              <span className="font-semibold truncate pr-2">
                {REASON_LABELS[r.reason] ?? r.reason}
                {r.detail && (
                  <span className="ml-1 font-normal text-xs" style={{color: 'var(--color-text-hint)'}}>
                    — {r.detail}
                  </span>
                )}
              </span>
              {/* 상태 배지 */}
              <span>
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{color: sc.color, background: sc.bg}}
                >
                  {STATUS_LABELS[r.status]}
                </span>
              </span>
              {/* 신고일 */}
              <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>
                {r.createdAt.slice(0, 10)}
              </span>
              {/* 인라인 처리 버튼 */}
              <ActionButtons reportId={r.reportId} currentStatus={r.status}/>
            </Link>
          )
        })}
      </div>
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{border: '1px solid var(--color-border)', color: 'var(--color-text-sub)'}}
          >
            <ChevronLeft size={15}/>
          </button>
          <span className="text-sm px-2" style={{color: 'var(--color-text-sub)'}}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            style={{border: '1px solid var(--color-border)', color: 'var(--color-text-sub)'}}
          >
            <ChevronRight size={15}/>
          </button>
        </div>
      )}
    </div>
  )
}
