/**
 * ReviewPage — 매너 평가 (Screen 15)
 *
 * 구성:
 *   SellerCard     — 상대방 프로필 (거래 완료 후 평가)
 *   StarRating     — 별점 (1~5)
 *   TagPicker      — 긍정/부정 키워드 태그 선택
 *   ReviewTextarea — 자유 후기 작성
 *   SubmitButton   — 제출 + 완료 화면
 *
 * 데이터: 목 데이터 (추후 useMutation + POST /trade/:id/review 연동)
 */
import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, CheckCircle2, Loader2, ChevronLeft, Award } from 'lucide-react'

// ── 상수 ─────────────────────────────────────────────────────────────────────

const POSITIVE_TAGS = [
  '응답이 빠르다', '친절하다', '상품 상태가 정확하다',
  '포장이 꼼꼼하다', '빠른 발송', '설명이 자세하다', '또 거래하고 싶다',
]

const NEGATIVE_TAGS = [
  '응답이 느리다', '상품 상태 불일치', '포장이 부실하다',
  '발송이 늦다', '설명 부족', '약속을 지키지 않는다',
]

const STAR_LABELS: Record<number, string> = {
  1: '매우 불만족',
  2: '불만족',
  3: '보통',
  4: '만족',
  5: '매우 만족',
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 별점 입력 */
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const display = hover || value

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            aria-label={`${n}점`}
            className="transition-transform active:scale-90"
          >
            <Star
              size={40}
              fill={n <= display ? 'var(--color-gold)' : 'none'}
              color={n <= display ? 'var(--color-gold)' : 'var(--color-border)'}
              style={{ transition: 'fill .1s, color .1s' }}
            />
          </button>
        ))}
      </div>
      <p
        className="text-base font-display font-bold transition-all"
        style={{ color: value ? 'var(--color-gold)' : 'var(--color-text-hint)' }}
      >
        {value ? STAR_LABELS[value] : '별점을 선택해주세요'}
      </p>
    </div>
  )
}

/** 태그 피커 */
function TagPicker({
  selected, onToggle, star,
}: {
  selected: Set<string>
  onToggle: (tag: string) => void
  star: number
}) {
  const tags = star >= 3 ? POSITIVE_TAGS : NEGATIVE_TAGS
  const isPositive = star >= 3

  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-hint)' }}>
        어떤 점이 {isPositive ? '좋았나요?' : '아쉬웠나요?'} (복수 선택 가능)
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => {
          const on = selected.has(tag)
          return (
            <button
              key={tag}
              onClick={() => onToggle(tag)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: on
                  ? isPositive ? 'rgba(0,179,110,.12)' : 'rgba(255,46,77,.08)'
                  : 'var(--color-surface-raised)',
                color: on
                  ? isPositive ? 'var(--color-success)' : 'var(--color-accent)'
                  : 'var(--color-text-sub)',
                border: `1px solid ${on
                  ? isPositive ? 'rgba(0,179,110,.35)' : 'rgba(255,46,77,.25)'
                  : 'var(--color-border)'}`,
              }}
            >
              {on ? '✓ ' : ''}{tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** 완료 화면 */
function DoneScreen({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      {/* 트로피 */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,184,0,.12)', border: '2px solid rgba(255,184,0,.35)' }}
      >
        <Award size={44} color="var(--color-gold)" />
      </div>

      <div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '0.04em' }}
        >
          REVIEW DONE!
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
          매너 평가가 완료되었습니다.<br />
          활동 포인트 <span style={{ color: 'var(--color-info)', fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}>+200P</span>가 적립되었습니다.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate('/')}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          홈 피드 보기
        </button>
        <button
          onClick={() => navigate('/mypage')}
          className="w-full py-3 rounded-xl font-medium text-sm"
          style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-sub)', border: '1px solid var(--color-border)' }}
        >
          마이페이지
        </button>
      </div>
    </div>
  )
}

// ── 목 거래 데이터 ────────────────────────────────────────────────────────────

const MOCK_TRADE = {
  id: 3,
  listingId: 1,
  title: '맨체스터 유나이티드 23/24 홈 어센틱',
  price: 78000,
  jerseyColor: '#B5222B',
  jerseyNumber: '7',
  type: 'buy' as const,   // 내가 구매자 → 판매자를 평가
  opponentNickname: 'uniform_king',
  opponentAvatarColor: '#1A3051',
  opponentMannerScore: 92,
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>()
  void id

  const navigate = useNavigate()
  const [trade] = useState(MOCK_TRADE)

  const [star, setStar] = useState(0)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function toggleTag(tag: string) {
    setSelectedTags(prev => {
      const n = new Set(prev)
      if (n.has(tag)) { n.delete(tag) } else { n.add(tag) }
      return n
    })
  }

  /* 별점 변경 시 태그 초기화 (긍/부정 전환) */
  function handleStarChange(v: number) {
    const wasPositive = star >= 3
    const isNowPositive = v >= 3
    if (wasPositive !== isNowPositive) setSelectedTags(new Set())
    setStar(v)
  }

  async function handleSubmit() {
    if (!star) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1400))
    setSubmitting(false)
    setDone(true)
  }

  const canSubmit = star > 0

  if (done) return <DoneScreen navigate={navigate} />

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-[560px] mx-auto px-4 md:px-7 py-6 md:py-10">

        {/* 뒤로가기 */}
        <Link
          to="/mypage"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-[var(--color-accent)]"
          style={{ color: 'var(--color-text-sub)' }}
        >
          <ChevronLeft size={16} />마이페이지
        </Link>

        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '0.04em' }}
          >
            MANNER REVIEW
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>
            거래 상대방을 평가해주세요. 매너점수에 반영됩니다.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* 상대방 프로필 */}
          <div
            className="flex flex-col items-center gap-3 py-6 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            {/* 아바타 */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ background: trade.opponentAvatarColor, fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
            >
              {trade.opponentNickname.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ color: 'var(--color-text-main)' }}>{trade.opponentNickname}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-hint)' }}>
                현재 매너점수: {trade.opponentMannerScore}
              </p>
            </div>
            {/* 상품 */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'var(--color-surface-raised)' }}
            >
              <div
                className="w-6 h-6 rounded flex-shrink-0"
                style={{ background: trade.jerseyColor }}
              />
              <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--color-text-sub)' }}>
                {trade.title}
              </p>
            </div>
          </div>

          {/* 별점 */}
          <div
            className="py-6 px-4 rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <StarRating value={star} onChange={handleStarChange} />
          </div>

          {/* 태그 피커 (별점 입력 후 노출) */}
          {star > 0 && (
            <div
              className="p-5 rounded-2xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <TagPicker selected={selectedTags} onToggle={toggleTag} star={star} />
            </div>
          )}

          {/* 자유 후기 */}
          {star > 0 && (
            <div
              className="p-5 rounded-2xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold" style={{ color: 'var(--color-text-main)' }}>
                  자유 후기 <span className="font-normal text-xs" style={{ color: 'var(--color-text-hint)' }}>(선택)</span>
                </label>
                <span className="text-xs" style={{ color: 'var(--color-text-hint)' }}>{text.length}/300</span>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="거래 경험을 자유롭게 남겨주세요."
                rows={4}
                maxLength={300}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
                style={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-main)',
                }}
              />
            </div>
          )}

          {/* 포인트 안내 */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(14,165,233,.06)', border: '1px solid rgba(14,165,233,.2)' }}
          >
            <CheckCircle2 size={16} color="var(--color-info)" className="flex-shrink-0" />
            <p className="text-xs" style={{ color: 'var(--color-text-sub)' }}>
              매너 평가 작성 시 활동 포인트 <span style={{ color: 'var(--color-info)', fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}>+200P</span> 적립!
            </p>
          </div>

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: canSubmit ? 'var(--color-accent)' : 'var(--color-text-hint)' }}
          >
            {submitting
              ? <><Loader2 size={18} className="animate-spin" />제출 중...</>
              : <><Star size={18} fill="currentColor" />평가 제출하기</>
            }
          </button>

          {!canSubmit && (
            <p className="text-xs text-center -mt-3" style={{ color: 'var(--color-text-hint)' }}>
              별점을 선택해야 제출할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
