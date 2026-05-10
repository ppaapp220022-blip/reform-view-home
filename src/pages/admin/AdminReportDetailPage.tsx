/**
 * AdminReportDetailPage — 관리자 신고 처리 상세 (Screen 16-B)
 *
 * 신고 건을 검토하고 처리(정상/경고/삭제)하는 화면.
 *
 * 구성:
 *   ReportHeader    — 신고 기본 정보 (신고자·대상·사유·접수일)
 *   TargetPreview   — 신고 대상 게시글 내용 미리보기
 *   ReporterInfo    — 신고자 프로필
 *   ActionPanel     — 처리 선택 (정상/경고/삭제) + 관리자 메모
 *
 * 데이터: 목 데이터 (추후 GET /admin/reports/:id 연동)
 */
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronLeft, Flag, User, FileText,
  CheckCircle2, AlertTriangle, Trash2, ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import { formatPrice } from '../../utils/format'

// ── 타입 ─────────────────────────────────────────────────────────────────────

type ReportStatus  = 'PENDING' | 'NORMAL' | 'WARNING' | 'DELETED'
type ReportReason  = 'FAKE' | 'INAPPROPRIATE' | 'FRAUD' | 'ETC'
type TargetType    = 'POST' | 'COMMUNITY_POST'

interface ReportDetail {
  id: number
  status: ReportStatus
  reason: ReportReason
  detail: string
  targetType: TargetType
  createdAt: string
  reporter: {
    id: number
    nickname: string
    email: string
    avatarColor: string
    reportCount: number   // 이 신고자가 낸 총 신고 수
  }
  targetPost: {
    id: number
    title: string
    price: number
    grade: string
    sport: string
    description: string
    sellerNickname: string
    sellerId: number
    imageColor: string
  } | null
  targetCommunityPost: {
    id: number
    title: string
    content: string
    authorNickname: string
    authorId: number
  } | null
}

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

const MOCK_REPORT: ReportDetail = {
  id: 1,
  status: 'PENDING',
  reason: 'FRAUD',
  detail: '판매자가 결제 완료 후 연락을 두절하고 배송을 진행하지 않고 있습니다. 채팅 메시지도 확인하지 않아 사기 의심합니다.',
  targetType: 'POST',
  createdAt: '2026-05-09 14:32',
  reporter: {
    id: 201,
    nickname: 'soccer_fan99',
    email: 'soccer99@gmail.com',
    avatarColor: '#002147',
    reportCount: 2,
  },
  targetPost: {
    id: 4,
    title: '레알 마드리드 21/22 서드 킷',
    price: 92000,
    grade: 'S',
    sport: '축구',
    description: '레알 마드리드 21/22 서드 킷 진품 어센틱 유니폼입니다. 상태 완벽하며 태그 부착 상태입니다. 직거래 가능합니다.',
    sellerNickname: 'fraud_suspect',
    sellerId: 103,
    imageColor: '#6B0078',
  },
  targetCommunityPost: null,
}

// ── 처리 옵션 ─────────────────────────────────────────────────────────────────

const ACTION_OPTIONS: {
  key: Exclude<ReportStatus, 'PENDING'>
  label: string
  desc: string
  color: string
  icon: typeof CheckCircle2
}[] = [
  {
    key:   'NORMAL',
    label: '정상 처리',
    desc:  '신고 내용 검토 결과 규정 위반이 없음. 게시글 유지.',
    color: 'var(--color-success)',
    icon:  CheckCircle2,
  },
  {
    key:   'WARNING',
    label: '경고 처리',
    desc:  '규정 위반 확인. 판매자에게 경고 1회 부여 및 게시글 숨김.',
    color: 'var(--color-warning)',
    icon:  AlertTriangle,
  },
  {
    key:   'DELETED',
    label: '게시글 삭제',
    desc:  '중대 위반. 게시글 즉시 삭제 및 판매자 계정 검토.',
    color: 'var(--color-accent)',
    icon:  Trash2,
  },
]

const REASON_LABEL: Record<ReportReason, string> = {
  FAKE:          '허위 매물',
  INAPPROPRIATE: '부적절한 게시글',
  FRAUD:         '사기 의심',
  ETC:           '기타',
}

const STATUS_META: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: '미처리', color: 'var(--color-warning)',    bg: 'rgba(255,149,0,0.1)'   },
  NORMAL:  { label: '정상',   color: 'var(--color-success)',    bg: 'rgba(0,179,110,0.1)'   },
  WARNING: { label: '경고',   color: 'var(--color-accent)',     bg: 'rgba(255,46,77,0.1)'   },
  DELETED: { label: '삭제됨', color: 'var(--color-text-hint)',  bg: 'var(--color-surface-sunken)' },
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AdminReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport]   = useState<ReportDetail>({ ...MOCK_REPORT, id: Number(id) || MOCK_REPORT.id })
  const [selected, setSelected]   = useState<Exclude<ReportStatus, 'PENDING'> | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone]               = useState(false)

  const statusMeta = STATUS_META[report.status]
  const isProcessed = report.status !== 'PENDING' || done

  async function handleSubmit() {
    if (!selected) return
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 800))
    setReport((prev) => ({ ...prev, status: selected }))
    setIsSubmitting(false)
    setDone(true)
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 py-8">

      {/* ── 헤더 ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors
            bg-[var(--color-surface-raised)] border border-[var(--color-border)]
            hover:bg-[var(--color-surface-sunken)]"
        >
          <ChevronLeft size={18} style={{ color: 'var(--color-text-sub)' }} strokeWidth={2} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Flag size={16} style={{ color: 'var(--color-accent)' }} strokeWidth={1.75} />
            <h1 className="text-[20px] font-bold" style={{ color: 'var(--color-text-main)' }}>
              신고 처리
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: statusMeta.bg, color: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--color-text-hint)' }}>
            신고 #{report.id} · 접수 {report.createdAt}
          </p>
        </div>
      </div>

      {/* 처리 완료 배너 */}
      {done && (
        <div
          className="mb-5 px-4 py-3 rounded-[10px] flex items-center gap-2 animate-fadeInUp"
          style={{ background: 'rgba(0,179,110,0.08)', border: '1px solid rgba(0,179,110,0.3)' }}
        >
          <ShieldCheck size={15} style={{ color: 'var(--color-success)' }} strokeWidth={1.75} />
          <p className="text-[13px] font-medium" style={{ color: 'var(--color-success)' }}>
            신고 처리가 완료되었습니다. ({ACTION_OPTIONS.find((a) => a.key === selected)?.label})
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">

        {/* ── 왼쪽 ── */}
        <div className="flex flex-col gap-5">

          {/* 신고 내용 */}
          <div
            className="rounded-[12px] p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-[12px] font-semibold uppercase tracking-wide mb-4"
              style={{ color: 'var(--color-text-hint)' }}>
              신고 내용
            </p>

            {/* 사유 + 대상 유형 */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span
                className="px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: 'rgba(255,46,77,0.1)', color: 'var(--color-accent)' }}
              >
                {REASON_LABEL[report.reason]}
              </span>
              <span
                className="px-3 py-1 rounded-full text-[12px] font-medium"
                style={{
                  background: report.targetType === 'POST' ? 'rgba(14,165,233,0.1)' : 'rgba(255,184,0,0.1)',
                  color:      report.targetType === 'POST' ? 'var(--color-info)' : 'var(--color-gold)',
                }}
              >
                {report.targetType === 'POST' ? '판매글 신고' : '커뮤니티 게시글 신고'}
              </span>
            </div>

            {/* 상세 내용 */}
            <div
              className="px-4 py-3 rounded-[8px] text-[13px] leading-relaxed"
              style={{ background: 'var(--color-surface-sunken)', color: 'var(--color-text-sub)' }}
            >
              {report.detail}
            </div>
          </div>

          {/* 신고 대상 미리보기 */}
          {report.targetPost && (
            <div
              className="rounded-[12px] p-5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={15} style={{ color: 'var(--color-primary)' }} strokeWidth={1.75} />
                  <h3 className="text-[14px] font-bold" style={{ color: 'var(--color-text-main)' }}>
                    신고 대상 판매글
                  </h3>
                </div>
                <Link
                  to={`/listing/${report.targetPost.id}`}
                  className="flex items-center gap-1 text-[11px] font-medium transition-colors
                    text-[var(--color-text-hint)] hover:text-[var(--color-accent)]"
                >
                  원문 보기
                  <ExternalLink size={11} strokeWidth={1.75} />
                </Link>
              </div>

              <div className="flex gap-4">
                {/* 이미지 플레이스홀더 */}
                <div
                  className="w-24 h-24 rounded-[10px] flex-shrink-0"
                  style={{ background: report.targetPost.imageColor, opacity: 0.85 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded-[4px] text-white"
                      style={{ background: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
                    >
                      {report.targetPost.grade}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-hint)' }}>
                      {report.targetPost.sport}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--color-text-main)' }}>
                    {report.targetPost.title}
                  </h4>
                  <p
                    className="text-[15px] font-bold mb-2"
                    style={{ color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
                  >
                    {formatPrice(report.targetPost.price)}
                  </p>
                  <div className="flex items-center gap-2">
                    <User size={11} style={{ color: 'var(--color-text-hint)' }} strokeWidth={1.5} />
                    <Link
                      to={`/admin/members/${report.targetPost.sellerId}`}
                      className="text-[12px] font-medium transition-colors
                        text-[var(--color-text-hint)] hover:text-[var(--color-accent)]"
                    >
                      {report.targetPost.sellerNickname}
                    </Link>
                  </div>
                </div>
              </div>

              {/* 판매글 본문 미리보기 */}
              <div
                className="mt-4 px-4 py-3 rounded-[8px] text-[12px] leading-relaxed line-clamp-3"
                style={{ background: 'var(--color-surface-sunken)', color: 'var(--color-text-sub)' }}
              >
                {report.targetPost.description}
              </div>
            </div>
          )}

          {/* 신고자 정보 */}
          <div
            className="rounded-[12px] p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <User size={15} style={{ color: 'var(--color-primary)' }} strokeWidth={1.75} />
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--color-text-main)' }}>
                신고자 정보
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: report.reporter.avatarColor, fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
              >
                {report.reporter.nickname.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-main)' }}>
                  {report.reporter.nickname}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-hint)' }}>
                  {report.reporter.email} · 총 신고 {report.reporter.reportCount}건
                </p>
              </div>
              <Link
                to={`/admin/members/${report.reporter.id}`}
                className="text-[12px] font-medium transition-colors flex-shrink-0
                  text-[var(--color-text-hint)] hover:text-[var(--color-accent)]"
              >
                회원 상세 &rsaquo;
              </Link>
            </div>
          </div>
        </div>

        {/* ── 오른쪽: 처리 패널 ── */}
        <div>
          <div
            className="rounded-[12px] p-5 sticky top-24"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-[14px] font-bold mb-4" style={{ color: 'var(--color-text-main)' }}>
              신고 처리 결정
            </p>

            {/* 처리 선택 */}
            <div className="flex flex-col gap-2.5 mb-4">
              {ACTION_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = selected === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={isProcessed}
                    onClick={() => setSelected(opt.key)}
                    className="w-full text-left px-4 py-3 rounded-[10px] transition-colors border
                      disabled:cursor-default"
                    style={{
                      background:  isSelected ? `${opt.color}10` : 'var(--color-surface-raised)',
                      borderColor: isSelected ? opt.color : 'var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} style={{ color: isSelected ? opt.color : 'var(--color-text-hint)' }} strokeWidth={1.75} />
                      <span className="text-[13px] font-semibold" style={{ color: isSelected ? opt.color : 'var(--color-text-main)' }}>
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-[11px] pl-5" style={{ color: 'var(--color-text-hint)' }}>
                      {opt.desc}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* 관리자 메모 */}
            <div className="mb-4">
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                처리 메모 (내부용)
              </label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                disabled={isProcessed}
                placeholder="처리 근거를 기록해 두세요."
                className="w-full rounded-[8px] px-3 py-2.5 text-[12px] resize-none outline-none transition-colors
                  bg-[var(--color-surface-sunken)] border border-[var(--color-border)]
                  text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)]
                  focus:border-[var(--color-primary)] disabled:opacity-60"
              />
            </div>

            {/* 확정 버튼 */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selected || isProcessed || isSubmitting}
              className="w-full h-[48px] rounded-[10px] text-[14px] font-bold text-white
                transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
              style={{
                background: selected
                  ? ACTION_OPTIONS.find((a) => a.key === selected)?.color ?? 'var(--color-primary)'
                  : 'var(--color-primary)',
              }}
            >
              {done ? (
                <>
                  <ShieldCheck size={16} strokeWidth={2} />
                  처리 완료
                </>
              ) : isSubmitting ? '처리 중...' : '처리 확정'}
            </button>

            {!selected && !isProcessed && (
              <p className="text-[11px] text-center mt-2" style={{ color: 'var(--color-text-hint)' }}>
                처리 방법을 선택해 주세요
              </p>
            )}

            {/* 안내 */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-hint)' }}>
                처리 결과는 신고자에게 자동으로 통보됩니다.
                경고/삭제 처리 시 피신고자에게도 알림이 발송됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
