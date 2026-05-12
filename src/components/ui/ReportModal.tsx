/**
 * ReportModal — 신고 공통 모달
 *
 * 백엔드 Report 엔티티 기반:
 *   targetType : POST (거래 매물) | COMMUNITY_POST (커뮤니티 게시글)
 *   reason     : FAKE / INAPPROPRIATE / FRAUD / ETC
 *   detail     : 상세 사유 (자유 입력)
 *
 * 사용 예:
 *   <ReportModal
 *     targetType="POST"
 *     targetId={listingId}
 *     onClose={() => setReportOpen(false)}
 *   />
 */
import { useState } from 'react'
import { X, Flag, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { addReport } from '../../features/report/api/reportApi'

// ── 타입 (백엔드 enum 일치) ───────────────────────────────────────────────────

/** 신고 대상 타입 */
export type ReportTargetType = 'POST' | 'COMMUNITY_POST'

/** 신고 사유 */
export type ReportReason = 'FAKE' | 'INAPPROPRIATE' | 'FRAUD' | 'ETC'

interface ReportModalProps {
  targetType: ReportTargetType
  targetId: number
  onClose: () => void
}

// ── 신고 사유 선택지 ──────────────────────────────────────────────────────────
const REASONS: { key: ReportReason; label: string; desc: string }[] = [
  {
    key: 'FAKE',
    label: '허위 매물',
    desc: '실제 상품과 다른 사진/설명, 존재하지 않는 상품',
  },
  {
    key: 'FRAUD',
    label: '사기 의심',
    desc: '입금 유도 후 잠적, 이중 거래, 사기 패턴 의심',
  },
  {
    key: 'INAPPROPRIATE',
    label: '부적절한 게시글',
    desc: '욕설·혐오·음란물·광고·관련 없는 내용',
  },
  {
    key: 'ETC',
    label: '기타',
    desc: '위 항목에 해당하지 않는 기타 신고',
  },
]

const TARGET_LABEL: Record<ReportTargetType, string> = {
  POST: '판매 매물',
  COMMUNITY_POST: '커뮤니티 게시글',
}

type Step = 'select' | 'detail' | 'done'

export default function ReportModal({ targetType, targetId, onClose }: ReportModalProps) {
  const [step, setStep] = useState<Step>('select')
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [isPending, setIsPending] = useState(false)

  // ESC 키 닫기
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  async function handleSubmit() {
    if (!selectedReason) return
    setIsPending(true)

    try {
      await addReport({ targetType, targetId, reason: selectedReason, detail: detail || undefined })
      setStep('done')
    } catch (err) {
      console.error('신고 제출 실패:', err)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full md:max-w-[420px] rounded-t-3xl md:rounded-3xl overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <Flag size={16} style={{ color: 'var(--color-accent)' }} />
            <h2
              className="font-bold text-sm"
              style={{ color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif" }}
            >
              {TARGET_LABEL[targetType]} 신고
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-text-hint)' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Step 1: 신고 사유 선택 ────────────────────────────────────── */}
        {step === 'select' && (
          <div className="p-5">
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-sub)' }}>
              신고 사유를 선택해주세요. 허위 신고 시 이용이 제한될 수 있습니다.
            </p>
            <div className="flex flex-col gap-2">
              {REASONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => setSelectedReason(r.key)}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: selectedReason === r.key ? 'rgba(255,46,77,.08)' : 'var(--color-surface-raised)',
                    border: `1px solid ${selectedReason === r.key ? 'rgba(255,46,77,.3)' : 'var(--color-border)'}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={{
                      borderColor: selectedReason === r.key ? 'var(--color-accent)' : 'var(--color-border)',
                      background: selectedReason === r.key ? 'var(--color-accent)' : 'transparent',
                    }}
                  >
                    {selectedReason === r.key && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold mb-0.5"
                      style={{ color: selectedReason === r.key ? 'var(--color-accent)' : 'var(--color-text-main)' }}
                    >
                      {r.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-hint)' }}>
                      {r.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => selectedReason && setStep('detail')}
              disabled={!selectedReason}
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--color-accent)' }}
            >
              다음
            </button>
          </div>
        )}

        {/* ── Step 2: 상세 내용 입력 ────────────────────────────────────── */}
        {step === 'detail' && (
          <div className="p-5">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4"
              style={{ background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)' }}
            >
              <AlertTriangle size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                {REASONS.find(r => r.key === selectedReason)?.label}
              </span>
            </div>

            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-text-main)' }}>
              상세 내용 <span style={{ color: 'var(--color-text-hint)', fontWeight: 400 }}>(선택)</span>
            </label>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="신고 사유를 구체적으로 작성하면 빠른 처리에 도움이 됩니다."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-main)',
              }}
            />
            <p className="text-xs text-right mt-1" style={{ color: 'var(--color-text-hint)' }}>
              {detail.length}/500
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'var(--color-accent)' }}
              >
                {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                신고 제출
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: 완료 ─────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="p-8 text-center space-y-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(0,179,110,.1)' }}
            >
              <CheckCircle2 size={36} style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <p
                className="font-bold text-base mb-1"
                style={{ color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif" }}
              >
                신고가 접수되었습니다
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>
                RE:FORM 운영팀이 검토 후 처리합니다.
                <br />허위 신고 시 이용이 제한될 수 있습니다.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
