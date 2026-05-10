/**
 * ListingEditPage — 판매글 수정 (Screen 13)
 *
 * ListingCreatePage 의 수정 버전.
 * 차이점:
 *   - 기존 데이터 프리필(mock useParams로 불러옴)
 *   - 거래 진행 중(IN_PROGRESS 이상)이면 가격·배송방식 수정 불가 (잠금 배너 표시)
 *   - 상단에 "판매글 삭제" 버튼 추가 (삭제 시 confirm 모달)
 *   - 이미지 기존 업로드 목록 표시 (플레이스홀더)
 */
import { formatPrice } from '../../utils/format'
import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft, Trash2, Lock, AlertTriangle,
  CheckCircle2, X, Info,
} from 'lucide-react'
import type { Grade, Sport, DeliveryType } from '../../types/listing'

// ── 상수 (ListingCreatePage 와 동일) ─────────────────────────────────────────

const SPORT_OPTIONS: { key: Sport; label: string }[] = [
  { key: 'SOCCER',     label: '축구' },
  { key: 'BASEBALL',   label: '야구' },
  { key: 'BASKETBALL', label: '농구' },
  { key: 'VOLLEYBALL', label: '배구' },
  { key: 'ESPORTS',    label: 'e스포츠' },
  { key: 'ETC',        label: '기타' },
]

const LEAGUE_MAP: Record<Sport, string[]> = {
  SOCCER:     ['EPL', '라리가', '분데스리가', '세리에A', '리그앙', 'K리그', '기타 리그'],
  BASEBALL:   ['KBO', 'MLB', '기타'],
  BASKETBALL: ['KBL', 'NBA', '기타'],
  VOLLEYBALL: ['V리그', '기타'],
  ESPORTS:    ['LCK', 'LPL', 'LCS', 'LEC', '기타'],
  ETC:        ['기타'],
}

const GRADES: { key: Grade; label: string; desc: string }[] = [
  { key: 'S', label: 'S급', desc: '미착용·1~2회 이내' },
  { key: 'A', label: 'A급', desc: '5회 이하 착용' },
  { key: 'B', label: 'B급', desc: '10회 이하, 미세 보풀' },
  { key: 'C', label: 'C급', desc: '장기 착용·색바램' },
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const DELIVERY_OPTIONS: { key: DeliveryType; label: string; desc: string }[] = [
  { key: 'DELIVERY', label: '택배',   desc: '전국 배송 가능' },
  { key: 'DIRECT',   label: '직거래', desc: '대면 거래만' },
  { key: 'BOTH',     label: '모두',   desc: '택배 + 직거래' },
]

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

/** 거래 중이면 일부 필드 수정 불가 */
const MOCK_IS_IN_TRADE = false

interface EditForm {
  title: string
  sport: Sport
  league: string
  team: string
  uniformName: string
  grade: Grade
  size: string
  deliveryType: DeliveryType
  price: string
  description: string
}

const MOCK_INITIAL: EditForm = {
  title:        '맨체스터 유나이티드 23/24 홈 어센틱 7번',
  sport:        'SOCCER',
  league:       'EPL',
  team:         '맨체스터 유나이티드',
  uniformName:  '23/24 홈 어센틱',
  grade:        'S',
  size:         'M',
  deliveryType: 'BOTH',
  price:        '78000',
  description:  '맨유 23/24 홈 어센틱 유니폼입니다.\n\n구매 후 5회 이내 착용한 제품으로 상태 S급입니다.\n세탁은 손세탁만 진행하였으며 탈색·오염 전혀 없습니다.',
}

/** 기존 이미지 플레이스홀더 (색상으로 대체) */
const MOCK_EXISTING_IMAGES = ['#B5222B', '#C8102E', '#002147']

// ── 삭제 확인 모달 ────────────────────────────────────────────────────────────

function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 오버레이 */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-[360px] rounded-2xl p-6 shadow-card animate-scaleIn"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* 아이콘 */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--color-accent-subtle)' }}
        >
          <Trash2 size={22} style={{ color: 'var(--color-accent)' }} strokeWidth={1.75} />
        </div>

        <h2
          className="text-center text-[17px] font-bold mb-2"
          style={{ color: 'var(--color-text-main)' }}
        >
          판매글을 삭제할까요?
        </h2>
        <p
          className="text-center text-[13px] mb-6 leading-relaxed"
          style={{ color: 'var(--color-text-sub)' }}
        >
          삭제된 판매글은 복구할 수 없습니다.
          <br />
          진행 중인 거래가 있다면 취소될 수 있습니다.
        </p>

        <div className="flex gap-2">
          {/* 취소 */}
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-[44px] rounded-[10px] text-[14px] font-semibold transition-colors
              bg-[var(--color-surface-raised)] text-[var(--color-text-main)]
              border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]"
          >
            취소
          </button>
          {/* 삭제 확인 */}
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-[44px] rounded-[10px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            삭제하기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function ListingEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<EditForm>(MOCK_INITIAL)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSubmitting, setIsSubmitting]       = useState(false)
  const [submitDone, setSubmitDone]           = useState(false)
  const [errors, setErrors]                   = useState<Partial<Record<keyof EditForm, string>>>({})

  /** 거래 진행 중이면 잠금 처리할 필드 */
  const locked = MOCK_IS_IN_TRADE

  /** 리그 선택 옵션 */
  const leagueOptions = useMemo(() => LEAGUE_MAP[form.sport] ?? [], [form.sport])

  // ── 유효성 검사 ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: Partial<Record<keyof EditForm, string>> = {}
    if (!form.title.trim())       e.title       = '제목을 입력해 주세요.'
    if (!form.team.trim())        e.team        = '구단명을 입력해 주세요.'
    if (!form.uniformName.trim()) e.uniformName = '유니폼명을 입력해 주세요.'
    if (!form.description.trim()) e.description = '상품 설명을 입력해 주세요.'
    const priceNum = Number(form.price.replace(/,/g, ''))
    if (!form.price || isNaN(priceNum) || priceNum < 1000)
      e.price = '1,000원 이상의 가격을 입력해 주세요.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── 이벤트 핸들러 ────────────────────────────────────────────────────────────

  function set<K extends keyof EditForm>(key: K, val: EditForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleSportChange(sport: Sport) {
    const leagues = LEAGUE_MAP[sport]
    set('sport', sport)
    set('league', leagues[0] ?? '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    // 목 딜레이
    await new Promise((r) => setTimeout(r, 900))
    setIsSubmitting(false)
    setSubmitDone(true)
    setTimeout(() => navigate(`/listing/${id}`), 1200)
  }

  function handleDelete() {
    setShowDeleteModal(false)
    // 실제: DELETE /listing/:id 호출 후 홈으로 이동
    navigate('/', { replace: true })
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[860px] mx-auto px-4 py-8">

      {/* ── 상단 헤더 ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to={`/listing/${id}`}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors
              bg-[var(--color-surface-raised)] border border-[var(--color-border)]
              hover:bg-[var(--color-surface-sunken)]"
          >
            <ChevronLeft size={18} style={{ color: 'var(--color-text-sub)' }} strokeWidth={2} />
          </Link>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--color-text-main)' }}>
            판매글 수정
          </h1>
        </div>

        {/* 삭제 버튼 */}
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-[8px] text-[13px] font-medium transition-colors
            border border-[var(--color-border)] hover:border-[var(--color-accent)]
            hover:text-[var(--color-accent)] text-[var(--color-text-hint)]"
        >
          <Trash2 size={14} strokeWidth={1.75} />
          삭제
        </button>
      </div>

      {/* ── 거래 진행 중 잠금 배너 ── */}
      {locked && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-[10px] mb-6"
          style={{
            background: 'rgba(255,149,0,0.08)',
            border: '1px solid rgba(255,149,0,0.35)',
          }}
        >
          <Lock size={16} style={{ color: 'var(--color-warning)' }} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--color-warning)' }}>
              거래 진행 중 — 일부 항목 수정 불가
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
              가격, 배송방식은 거래가 완료되거나 취소된 후 수정할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">

          {/* ── 좌측: 폼 영역 ── */}
          <div className="flex flex-col gap-5">

            {/* 기존 이미지 */}
            <section
              className="rounded-[12px] p-5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-[12px] font-semibold uppercase tracking-wide mb-3"
                style={{ color: 'var(--color-text-hint)' }}>
                업로드된 이미지
              </p>
              <div className="flex gap-2 flex-wrap">
                {MOCK_EXISTING_IMAGES.map((color, i) => (
                  <div key={i} className="relative">
                    <div
                      className="w-[80px] h-[80px] rounded-[8px]"
                      style={{ background: color, opacity: 0.85 }}
                    />
                    <button
                      type="button"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--color-accent)', color: '#fff' }}
                      aria-label="이미지 삭제"
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
                {/* 추가 버튼 */}
                <button
                  type="button"
                  className="w-[80px] h-[80px] rounded-[8px] flex flex-col items-center justify-center gap-1 transition-colors
                    border border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-accent)]"
                >
                  <span className="text-[20px] leading-none" style={{ color: 'var(--color-text-hint)' }}>+</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-hint)' }}>추가</span>
                </button>
              </div>
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-hint)' }}>
                최대 8장 · 첫 번째 이미지가 대표 이미지로 사용됩니다.
              </p>
            </section>

            {/* 기본 정보 */}
            <section
              className="rounded-[12px] p-5 flex flex-col gap-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-[12px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-hint)' }}>
                기본 정보
              </p>

              {/* 제목 */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                  제목 <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={100}
                  placeholder="예) 맨체스터 유나이티드 23/24 홈 어센틱"
                  className="w-full h-[44px] rounded-[8px] px-3.5 text-[14px] outline-none transition-colors
                    bg-[var(--color-surface-raised)] border border-[var(--color-border)]
                    text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)]
                    focus:border-[var(--color-primary)]"
                />
                {errors.title && (
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--color-error)' }}>{errors.title}</p>
                )}
              </div>

              {/* 종목 */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                  종목
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SPORT_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => handleSportChange(s.key)}
                      className="px-3 h-8 rounded-full text-[12px] font-medium transition-colors border"
                      style={{
                        background: form.sport === s.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                        color:      form.sport === s.key ? '#fff' : 'var(--color-text-sub)',
                        borderColor: form.sport === s.key ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 리그 & 구단 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                    리그
                  </label>
                  <select
                    value={form.league}
                    onChange={(e) => set('league', e.target.value)}
                    className="w-full h-[44px] rounded-[8px] px-3 text-[14px] outline-none transition-colors
                      bg-[var(--color-surface-raised)] border border-[var(--color-border)]
                      text-[var(--color-text-main)]"
                  >
                    {leagueOptions.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                    구단명 <span style={{ color: 'var(--color-accent)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.team}
                    onChange={(e) => set('team', e.target.value)}
                    placeholder="예) 맨체스터 유나이티드"
                    className="w-full h-[44px] rounded-[8px] px-3.5 text-[14px] outline-none transition-colors
                      bg-[var(--color-surface-raised)] border border-[var(--color-border)]
                      text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)]
                      focus:border-[var(--color-primary)]"
                  />
                  {errors.team && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--color-error)' }}>{errors.team}</p>
                  )}
                </div>
              </div>

              {/* 유니폼명 */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                  유니폼명 <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.uniformName}
                  onChange={(e) => set('uniformName', e.target.value)}
                  placeholder="예) 23/24 홈 어센틱"
                  className="w-full h-[44px] rounded-[8px] px-3.5 text-[14px] outline-none transition-colors
                    bg-[var(--color-surface-raised)] border border-[var(--color-border)]
                    text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)]
                    focus:border-[var(--color-primary)]"
                />
                {errors.uniformName && (
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--color-error)' }}>{errors.uniformName}</p>
                )}
              </div>
            </section>

            {/* 상태 & 사이즈 */}
            <section
              className="rounded-[12px] p-5 flex flex-col gap-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-[12px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-hint)' }}>
                상태 & 사이즈
              </p>

              {/* 등급 */}
              <div>
                <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--color-text-sub)' }}>
                  컨디션 등급
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => set('grade', g.key)}
                      className="py-2 rounded-[8px] text-center transition-colors border"
                      style={{
                        background:  form.grade === g.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                        borderColor: form.grade === g.key ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                    >
                      <span
                        className="block text-[15px] font-bold"
                        style={{
                          color: form.grade === g.key ? '#fff' : 'var(--color-text-main)',
                          fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                        }}
                      >
                        {g.key}
                      </span>
                      <span className="block text-[10px] mt-0.5"
                        style={{ color: form.grade === g.key ? 'rgba(255,255,255,0.75)' : 'var(--color-text-hint)' }}>
                        {g.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 사이즈 */}
              <div>
                <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--color-text-sub)' }}>
                  사이즈
                </label>
                <div className="flex gap-2 flex-wrap">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('size', s)}
                      className="w-12 h-9 rounded-[6px] text-[13px] font-medium transition-colors border"
                      style={{
                        background:  form.size === s ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                        color:       form.size === s ? '#fff' : 'var(--color-text-sub)',
                        borderColor: form.size === s ? 'var(--color-primary)' : 'var(--color-border)',
                        fontFamily:  "'IAMAPLAYER',Giants,sans-serif",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 거래 조건 (거래 중이면 잠금) */}
            <section
              className="rounded-[12px] p-5 flex flex-col gap-4"
              style={{
                background:  'var(--color-surface)',
                border:      '1px solid var(--color-border)',
                opacity:     locked ? 0.65 : 1,
                pointerEvents: locked ? 'none' : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--color-text-hint)' }}>
                  거래 조건
                </p>
                {locked && <Lock size={12} style={{ color: 'var(--color-warning)' }} strokeWidth={1.75} />}
              </div>

              {/* 배송방식 */}
              <div>
                <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--color-text-sub)' }}>
                  배송방식
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DELIVERY_OPTIONS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => set('deliveryType', d.key)}
                      className="py-2.5 rounded-[8px] text-center transition-colors border"
                      style={{
                        background:  form.deliveryType === d.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                        borderColor: form.deliveryType === d.key ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                    >
                      <span className="block text-[13px] font-semibold"
                        style={{ color: form.deliveryType === d.key ? '#fff' : 'var(--color-text-main)' }}>
                        {d.label}
                      </span>
                      <span className="block text-[10px] mt-0.5"
                        style={{ color: form.deliveryType === d.key ? 'rgba(255,255,255,0.7)' : 'var(--color-text-hint)' }}>
                        {d.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 가격 */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--color-text-sub)' }}>
                  판매 가격 <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-medium select-none"
                    style={{
                      color: 'var(--color-text-sub)',
                      fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                    }}
                  >
                    ₩
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="최소 1,000원"
                    className="w-full h-[44px] rounded-[8px] pl-8 pr-3.5 text-[14px] outline-none transition-colors
                      bg-[var(--color-surface-raised)] border border-[var(--color-border)]
                      text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)]
                      focus:border-[var(--color-primary)]"
                    style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}
                  />
                </div>
                {form.price && !isNaN(Number(form.price)) && (
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--color-text-hint)' }}>
                    {formatPrice(Number(form.price))} (수수료 3.5% 제외 후 정산)
                  </p>
                )}
                {errors.price && (
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--color-error)' }}>{errors.price}</p>
                )}
              </div>
            </section>

            {/* 상품 설명 */}
            <section
              className="rounded-[12px] p-5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <label className="block text-[12px] font-semibold uppercase tracking-wide mb-3"
                style={{ color: 'var(--color-text-hint)' }}>
                상품 설명 <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <textarea
                rows={7}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="상품 상태, 구매 시기, 특이사항 등을 상세히 적어주세요."
                className="w-full rounded-[8px] px-3.5 py-3 text-[14px] resize-none outline-none transition-colors
                  bg-[var(--color-surface-raised)] border border-[var(--color-border)]
                  text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)]
                  focus:border-[var(--color-primary)]"
              />
              {errors.description && (
                <p className="mt-1 text-[11px]" style={{ color: 'var(--color-error)' }}>{errors.description}</p>
              )}
            </section>
          </div>

          {/* ── 우측: 안내 패널 ── */}
          <aside className="hidden md:flex flex-col gap-4">
            {/* 수정 안내 */}
            <div
              className="rounded-[12px] p-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} style={{ color: 'var(--color-primary)' }} strokeWidth={1.75} />
                <p className="text-[12px] font-semibold" style={{ color: 'var(--color-text-main)' }}>
                  수정 안내
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {[
                  '수정 후에도 상품 등록일은 변경되지 않습니다.',
                  '거래 진행 중이면 가격·배송방식을 수정할 수 없습니다.',
                  '이미지는 최대 8장까지 등록할 수 있습니다.',
                  '허위 정보 작성 시 계정이 제한될 수 있습니다.',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: 'var(--color-text-hint)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--color-text-sub)' }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 등급 가이드 */}
            <div
              className="rounded-[12px] p-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-[12px] font-semibold mb-3" style={{ color: 'var(--color-text-main)' }}>
                컨디션 등급 기준
              </p>
              {GRADES.map((g) => (
                <div key={g.key} className="flex items-center gap-2 py-1.5 border-b last:border-0"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <span
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                    style={{
                      background: { S:'var(--color-primary)', A:'var(--color-accent)', B:'var(--color-text-sub)', C:'var(--color-text-hint)' }[g.key],
                      fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                    }}
                  >
                    {g.key}
                  </span>
                  <span className="text-[12px]" style={{ color: 'var(--color-text-sub)' }}>{g.desc}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* ── 하단 저장 버튼 ── */}
        <div className="mt-6 flex gap-3 justify-end">
          <Link
            to={`/listing/${id}`}
            className="px-6 h-[48px] rounded-[10px] text-[15px] font-semibold flex items-center transition-colors
              bg-[var(--color-surface-raised)] text-[var(--color-text-main)]
              border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)]"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || submitDone}
            className="px-8 h-[48px] rounded-[10px] text-[15px] font-semibold text-white transition-opacity
              hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
            style={{ background: 'var(--color-primary)' }}
          >
            {submitDone ? (
              <>
                <CheckCircle2 size={16} strokeWidth={2} />
                수정 완료
              </>
            ) : isSubmitting ? (
              '저장 중...'
            ) : (
              '수정 저장'
            )}
          </button>
        </div>
      </form>

      {/* ── 삭제 확인 모달 ── */}
      {showDeleteModal && (
        <DeleteConfirmModal
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
