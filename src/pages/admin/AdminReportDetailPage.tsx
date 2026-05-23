/**
 * AdminReportDetailPage — 관리자 신고 처리 상세
 *
 * 기능:
 *   - 신고 단건 상세 조회
 *   - 신고자/대상자/신고 대상 스냅샷 확인
 *   - 신고 처리 상태 변경
 *
 * 데이터:
 *   - GET /api/admin/reports/{id}
 *   - PATCH /api/admin/reports/{id}
 */
import {Link, useParams} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {useEffect, useState} from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  FileText,
  Flag,
  Loader2,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react'
import type {AdminReportDetail, ReportStatus} from '../../features/admin/api/adminApi'
import {getAdminReport, processAdminReport} from '../../features/admin/api/adminApi'

const ACTION_OPTIONS: Array<{
  key: Exclude<ReportStatus, 'PENDING'>
  label: string
  desc: string
  color: string
  icon: typeof CheckCircle2
}> = [
  {
    key: 'NORMAL',
    label: '정상 처리',
    desc: '신고 내용 검토 결과 규정 위반이 없음. 게시글 유지.',
    color: 'var(--color-success)',
    icon: CheckCircle2,
  },
  {
    key: 'WARNING',
    label: '경고 처리',
    desc: '규정 위반 확인. 대상자에게 경고를 부여합니다.',
    color: 'var(--color-warning)',
    icon: AlertTriangle,
  },
  {
    key: 'DELETED',
    label: '삭제 처리',
    desc: '중대 위반. 신고 대상을 즉시 삭제 상태로 처리합니다.',
    color: 'var(--color-accent)',
    icon: Trash2,
  },
]

const REASON_LABEL: Record<AdminReportDetail['reason'], string> = {
  FAKE: '허위 매물',
  INAPPROPRIATE: '부적절한 게시글',
  FRAUD: '사기 의심',
  ETC: '기타',
}

const STATUS_META: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  PENDING: {label: '미처리', color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.1)'},
  NORMAL: {label: '정상', color: 'var(--color-success)', bg: 'rgba(0,179,110,0.1)'},
  WARNING: {label: '경고', color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.1)'},
  DELETED: {label: '삭제됨', color: 'var(--color-accent)', bg: 'rgba(255,46,77,0.1)'},
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '정보 없음'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('ko-KR')
}

function PersonInfoCard({
  title,
  memberId,
  nickname,
  email,
}: {
  title: string
  memberId: number | null
  nickname: string | null
  email: string | null
}) {
  return (
    <div
      className="rounded-[12px] p-5"
      style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
    >
      <div className="flex items-center gap-2 mb-4">
        <User size={15} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
        <h3 className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
          {title}
        </h3>
      </div>

      {memberId && nickname ? (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
            style={{background: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
          >
            {nickname.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold" style={{color: 'var(--color-text-main)'}}>
              {nickname}
            </p>
            <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
              {email ?? '이메일 정보 없음'}
            </p>
          </div>
          <Link
            to={`/admin/members/${memberId}`}
            className="text-[13px] font-medium transition-colors hover:text-[var(--color-accent)]"
            style={{color: 'var(--color-text-hint)'}}
          >
            회원 상세
          </Link>
        </div>
      ) : (
        <div
          className="rounded-[10px] px-4 py-4 text-[13px]"
          style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-hint)'}}
        >
          관련 회원 정보가 제공되지 않았습니다.
        </div>
      )}
    </div>
  )
}

export default function AdminReportDetailPage() {
  const {id} = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selectedAction, setSelectedAction] = useState<Exclude<ReportStatus, 'PENDING'> | null>(null)
  const [adminMemo, setAdminMemo] = useState('')
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {data: report, isLoading, isError} = useQuery({
    queryKey: ['adminReport', id],
    queryFn: () => getAdminReport(Number(id)),
    enabled: !!id,
  })

  /**
   * 백엔드가 저장한 관리자 메모를 그대로 다시 보여주고,
   * 미처리 상태에서는 초기값으로 불러와 추가 편집도 가능하게 한다.
   */
  useEffect(() => {
    setAdminMemo(report?.adminMemo ?? '')
  }, [report?.reportId, report?.adminMemo])

  const processMutation = useMutation({
    mutationFn: (request: { action: Exclude<ReportStatus, 'PENDING'>; adminMemo?: string }) =>
      processAdminReport(Number(id), request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['adminReport', id]}),
        queryClient.invalidateQueries({queryKey: ['adminReports']}),
        queryClient.invalidateQueries({queryKey: ['admin-reports']}),
        queryClient.invalidateQueries({queryKey: ['adminDashboard', 'summary']}),
      ])
    },
  })

  async function handleSubmit() {
    if (!selectedAction) return

    setSubmitError('')
    try {
      await processMutation.mutateAsync({
        action: selectedAction,
        adminMemo: adminMemo.trim() || undefined,
      })
      setDone(true)
    } catch (error) {
      console.error('신고 처리 실패', error)
      setSubmitError('신고 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{color: 'var(--color-accent)'}}/>
          <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>신고 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={32} style={{color: 'var(--color-error)'}}/>
          <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>신고 정보를 찾을 수 없습니다</p>
          <Link to="/admin/reports" className="text-sm" style={{color: 'var(--color-accent)'}}>신고 목록으로</Link>
        </div>
      </div>
    )
  }

  const resolvedStatus = done && selectedAction ? selectedAction : report.status
  const statusMeta = STATUS_META[resolvedStatus]
  const isProcessed = resolvedStatus !== 'PENDING'

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin/reports"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[var(--color-surface-raised)] border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]"
        >
          <ChevronLeft size={18} style={{color: 'var(--color-text-sub)'}} strokeWidth={2}/>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Flag size={16} style={{color: 'var(--color-accent)'}} strokeWidth={1.75}/>
            <h1 className="text-[20px] font-bold" style={{color: 'var(--color-text-main)'}}>
              신고 상세
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-[13px] font-medium"
              style={{background: statusMeta.bg, color: statusMeta.color}}
            >
              {statusMeta.label}
            </span>
          </div>
          <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
            신고 #{report.reportId} · 접수 {formatDateTime(report.createdAt)}
          </p>
        </div>
      </div>

      {done && (
        <div
          className="mb-5 px-4 py-3 rounded-[10px] flex items-center gap-2"
          style={{background: 'rgba(0,179,110,0.08)', border: '1px solid rgba(0,179,110,0.3)'}}
        >
          <ShieldCheck size={15} style={{color: 'var(--color-success)'}} strokeWidth={1.75}/>
          <p className="text-[14px] font-medium" style={{color: 'var(--color-success)'}}>
            신고 처리가 완료되었습니다. ({ACTION_OPTIONS.find((option) => option.key === selectedAction)?.label})
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        <div className="flex flex-col gap-5">
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <p className="text-[13px] font-semibold uppercase tracking-wide mb-4" style={{color: 'var(--color-text-hint)'}}>
              신고 내용
            </p>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span
                className="px-3 py-1 rounded-full text-[13px] font-semibold"
                style={{background: 'rgba(255,46,77,0.1)', color: 'var(--color-accent)'}}
              >
                {REASON_LABEL[report.reason]}
              </span>
              <span
                className="px-3 py-1 rounded-full text-[13px] font-medium"
                style={{
                  background: report.targetType === 'POST' ? 'rgba(14,165,233,0.1)' : 'rgba(255,184,0,0.1)',
                  color: report.targetType === 'POST' ? 'var(--color-info)' : 'var(--color-gold)',
                }}
              >
                {report.targetType === 'POST' ? '판매글 신고' : '커뮤니티 게시글 신고'}
              </span>
            </div>

            <div
              className="px-4 py-3 rounded-[8px] text-[14px] leading-relaxed"
              style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-sub)'}}
            >
              {report.detail?.trim() || '신고 상세 사유가 등록되지 않았습니다.'}
            </div>
          </div>

          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <FileText size={15} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
                <span className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                  신고 대상
                </span>
              </div>
              <Link
                to={report.targetType === 'POST' ? `/listing/${report.targetId}` : `/community/${report.targetId}`}
                className="flex items-center gap-1 text-[13px] font-medium transition-colors hover:text-[var(--color-accent)]"
                style={{color: 'var(--color-text-hint)'}}
              >
                원문 보기
                <ExternalLink size={11} strokeWidth={1.75}/>
              </Link>
            </div>

            <p className="text-[14px] font-semibold mb-2" style={{color: 'var(--color-text-main)'}}>
              {report.targetTitle ?? `대상 ID #${report.targetId}`}
            </p>
            <div
              className="px-4 py-3 rounded-[8px] text-[13px] leading-relaxed whitespace-pre-wrap"
              style={{background: 'var(--color-surface-sunken)', color: 'var(--color-text-sub)'}}
            >
              {report.targetSnapshot?.trim() || '신고 대상 스냅샷이 제공되지 않았습니다.'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <PersonInfoCard
              title="신고자 정보"
              memberId={report.reporterMemberId}
              nickname={report.reporterNickname}
              email={report.reporterEmail}
            />
            <PersonInfoCard
              title="대상자 정보"
              memberId={report.targetOwnerMemberId}
              nickname={report.targetOwnerNickname}
              email={report.targetOwnerEmail}
            />
          </div>
        </div>

        <div>
          <div
            className="rounded-[12px] p-5 sticky top-24"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <p className="text-[14px] font-bold mb-4" style={{color: 'var(--color-text-main)'}}>
              신고 처리 결정
            </p>

            {submitError && (
              <div
                className="mb-4 px-3 py-2.5 rounded-[10px] text-[13px] leading-relaxed"
                style={{
                  background: 'rgba(255,46,77,0.08)',
                  border: '1px solid rgba(255,46,77,0.2)',
                  color: 'var(--color-accent)',
                }}
              >
                {submitError}
              </div>
            )}

            <div className="flex flex-col gap-2.5 mb-4">
              {ACTION_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = selectedAction === option.key
                return (
                  <button
                    key={option.key}
                    type="button"
                    disabled={isProcessed || processMutation.isPending}
                    onClick={() => setSelectedAction(option.key)}
                    className="w-full text-left px-4 py-3 rounded-[10px] transition-colors border disabled:cursor-default"
                    style={{
                      background: isSelected ? `${option.color}10` : 'var(--color-surface-raised)',
                      borderColor: isSelected ? option.color : 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        size={14}
                        style={{color: isSelected ? option.color : 'var(--color-text-hint)'}}
                        strokeWidth={1.75}
                      />
                      <span
                        className="text-[14px] font-semibold"
                        style={{color: isSelected ? option.color : 'var(--color-text-main)'}}
                      >
                        {option.label}
                      </span>
                    </div>
                    <p className="text-[13px] pl-5" style={{color: 'var(--color-text-hint)'}}>
                      {option.desc}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-medium mb-1.5" style={{color: 'var(--color-text-sub)'}}>
                처리 메모
              </label>
              <textarea
                rows={4}
                value={adminMemo}
                onChange={(event) => setAdminMemo(event.target.value)}
                disabled={isProcessed || processMutation.isPending}
                placeholder="경고 또는 삭제 판단 근거를 남겨주세요."
                className="w-full rounded-[8px] px-3 py-2.5 text-[13px] resize-none outline-none transition-colors bg-[var(--color-surface-sunken)] border border-[var(--color-border)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)] focus:border-[var(--color-primary)] disabled:opacity-60"
              />
            </div>

            <div
              className="mb-4 rounded-[10px] px-4 py-3"
              style={{background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)'}}
            >
              <p className="text-[13px] font-medium mb-1" style={{color: 'var(--color-text-sub)'}}>
                관리자 메모
              </p>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{color: 'var(--color-text-hint)'}}>
                {report.adminMemo?.trim() || '저장된 관리자 메모가 없습니다.'}
              </p>
              <p className="text-[12px] mt-2" style={{color: 'var(--color-text-hint)'}}>
                처리 시각: {formatDateTime(report.processedAt)}
              </p>
              <p className="text-[12px]" style={{color: 'var(--color-text-hint)'}}>
                처리자: {report.processedBy ?? '정보 없음'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedAction || isProcessed || processMutation.isPending}
              className="w-full h-[48px] rounded-[10px] text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: selectedAction
                  ? ACTION_OPTIONS.find((option) => option.key === selectedAction)?.color ?? 'var(--color-primary)'
                  : 'var(--color-primary)',
              }}
            >
              {done ? (
                <>
                  <ShieldCheck size={16} strokeWidth={2}/>
                  처리 완료
                </>
              ) : processMutation.isPending ? '처리 중...' : '처리 확정'}
            </button>

            {!selectedAction && !isProcessed && (
              <p className="text-[13px] text-center mt-2" style={{color: 'var(--color-text-hint)'}}>
                처리 방법을 선택해 주세요
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
