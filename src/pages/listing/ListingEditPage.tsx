/**
 * ListingEditPage — 판매글 수정 (Screen 13)
 *
 * - getListingDetail(id) 로 기존 데이터 로드 + 폼 자동 프리필
 * - 기존 이미지: existingUrls[] 로 관리, X 버튼으로 개별 제거
 * - 새 이미지: newFiles: File[] 로 관리, 파일 인풋으로 추가
 * - 저장 시: newFiles → uploadListingImages → [...existingUrls, ...newUrls] → updateListing
 * - 삭제 시: deleteListing 호출 → 홈으로 이동
 * - 거래 진행 중(status !== 'AVAILABLE') 이면 가격·배송방식 잠금
 */
import {formatPrice} from '../../utils/format'
import {useState, useRef} from 'react'
import {useParams, useNavigate, Link} from 'react-router-dom'
import {useQuery} from '@tanstack/react-query'
import {
  ChevronLeft, Trash2, Lock,
  CheckCircle2, X, Info, Upload, Loader2,
} from 'lucide-react'
import type {Grade, Sport, DeliveryType} from '../../types/listing'
import {
  getListingDetail,
  updateListing,
  deleteListing,
  uploadListingImages,
} from '../../features/listing/api/listingApi'

// ── 상수 (ListingCreatePage 와 동일) ─────────────────────────────────────────

const SPORT_OPTIONS: { key: Sport; label: string }[] = [
  {key: 'SOCCER', label: '축구'},
  {key: 'BASEBALL', label: '야구'},
  {key: 'BASKETBALL', label: '농구'},
  {key: 'VOLLEYBALL', label: '배구'},
  {key: 'ESPORTS', label: 'e스포츠'},
  {key: 'ETC', label: '기타'},
]


const GRADES: { key: Grade; label: string; desc: string }[] = [
  {key: 'S', label: 'S급', desc: '미착용·1~2회 이내'},
  {key: 'A', label: 'A급', desc: '5회 이하 착용'},
  {key: 'B', label: 'B급', desc: '10회 이하, 미세 보풀'},
  {key: 'C', label: 'C급', desc: '장기 착용·색바램'},
]

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const DELIVERY_OPTIONS: { key: DeliveryType; label: string; desc: string }[] = [
  {key: 'DELIVERY', label: '택배', desc: '전국 배송 가능'},
  {key: 'DIRECT', label: '직거래', desc: '대면 거래만'},
  {key: 'BOTH', label: '모두', desc: '택배 + 직거래'},
]

// ── 폼 타입 ───────────────────────────────────────────────────────────────────

interface EditForm {
  title: string
  sport: Sport
  team: string
  uniformName: string
  grade: Grade
  size: string
  deliveryType: DeliveryType
  price: string
  description: string
}

// ── 삭제 확인 모달 ────────────────────────────────────────────────────────────

function DeleteConfirmModal({onConfirm, onCancel}: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* 오버레이 */}
      <div
        className="absolute inset-0"
        style={{background: 'rgba(0,0,0,0.55)'}}
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
          style={{background: 'var(--color-accent-subtle)'}}
        >
          <Trash2 size={22} style={{color: 'var(--color-accent)'}} strokeWidth={1.75}/>
        </div>

        <h2
          className="text-center text-[17px] font-bold mb-2"
          style={{color: 'var(--color-text-main)'}}
        >
          판매글을 삭제할까요?
        </h2>
        <p
          className="text-center text-[13px] mb-6 leading-relaxed"
          style={{color: 'var(--color-text-sub)'}}
        >
          삭제된 판매글은 복구할 수 없습니다.
          <br/>
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
            style={{background: 'var(--color-accent)'}}
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
  const {id} = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postId = Number(id)

  // ── 기존 판매글 데이터 로드 ───────────────────────────────────────────────
  const {data: detail, isLoading: detailLoading} = useQuery({
    queryKey: ['listing', postId],
    queryFn: () => getListingDetail(postId),
    enabled: !!postId,
    staleTime: 0,   // 수정 페이지이므로 항상 최신 데이터를 사용
  })

  // ── 폼 상태 (빈 초기값 — detail 로드 후 프리필) ───────────────────────────
  const [form, setForm] = useState<EditForm>({
    title: '', sport: 'SOCCER', team: '', uniformName: '',
    grade: 'A', size: 'M', deliveryType: 'BOTH', price: '', description: '',
  })

  /** 기존 이미지 URL 목록 (X 버튼으로 개별 제거 가능) */
  const [existingUrls, setExistingUrls] = useState<string[]>([])

  /** 새로 추가할 파일 목록 */
  const [newFiles, setNewFiles] = useState<File[]>([])

  /** 파일 인풋 ref (클릭 트리거용) */
  const fileRef = useRef<HTMLInputElement>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitDone, setSubmitDone] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof EditForm, string>>>({})

  /**
   * detail 로드 완료 시 폼 프리필
   * useEffect 없이 렌더 중 직접 state를 set하는 패턴:
   * initialized 플래그로 최초 1회만 실행
   */
  const [initialized, setInitialized] = useState(false)
  if (detail && !initialized) {
    setForm({
      title: detail.title,
      sport: detail.sport,
      team: detail.team,
      uniformName: detail.uniformName,
      grade: detail.grade,
      size: detail.size ?? 'M',
      deliveryType: detail.deliveryType,
      price: String(detail.price),
      description: detail.content,
    })
    setExistingUrls(detail.imageUrls)
    setInitialized(true)
  }

  /**
   * 거래 진행 중 여부
   * AVAILABLE 이외의 상태(IN_PROGRESS, COMPLETED 등)면 가격·배송방식 잠금
   */
  const locked = !!detail && detail.status !== 'ON_SALE'

  // ── 이미지 관련 ───────────────────────────────────────────────────────────

  const MAX_IMAGES = 8
  const totalImages = existingUrls.length + newFiles.length

  /** 파일 인풋 change 핸들러 — 최대 MAX_IMAGES 개 제한 */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    const remaining = MAX_IMAGES - totalImages
    const toAdd = selected.slice(0, remaining)
    if (toAdd.length) setNewFiles(p => [...p, ...toAdd])
    e.target.value = ''   // 동일 파일 재선택 허용
  }

  /** 기존 이미지 URL 제거 */
  function removeExistingUrl(idx: number) {
    setExistingUrls(p => p.filter((_, i) => i !== idx))
  }

  /** 새로 추가한 파일 제거 */
  function removeNewFile(idx: number) {
    setNewFiles(p => p.filter((_, i) => i !== idx))
  }

  // ── 유효성 검사 ───────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: Partial<Record<keyof EditForm, string>> = {}
    if (!form.title.trim()) e.title = '제목을 입력해 주세요.'
    if (!form.team.trim()) e.team = '구단명을 입력해 주세요.'
    if (!form.uniformName.trim()) e.uniformName = '유니폼명을 입력해 주세요.'
    if (!form.description.trim()) e.description = '상품 설명을 입력해 주세요.'
    const priceNum = Number(form.price.replace(/,/g, ''))
    if (!form.price || isNaN(priceNum) || priceNum < 1000)
      e.price = '1,000원 이상의 가격을 입력해 주세요.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── 이벤트 핸들러 ─────────────────────────────────────────────────────────

  function set<K extends keyof EditForm>(key: K, val: EditForm[K]) {
    setForm((prev) => ({...prev, [key]: val}))
    setErrors((prev) => ({...prev, [key]: undefined}))
  }

  function handleSportChange(sport: Sport) {
    set('sport', sport)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      /* Step 1: 새로 추가된 파일이 있으면 서버에 업로드 */
      let uploadedUrls: string[] = []
      if (newFiles.length > 0) {
        uploadedUrls = await uploadListingImages(newFiles)
      }

      /* Step 2: 유지된 기존 URL + 새 URL 합산 후 updateListing 호출 */
      const imageUrls = [...existingUrls, ...uploadedUrls]
      await updateListing(postId, {
        title: form.title,
        content: form.description,
        price: Number(form.price),
        grade: form.grade,
        size: form.size || undefined,
        deliveryType: form.deliveryType,
        imageUrls,
      })

      setSubmitDone(true)
      setTimeout(() => navigate(`/listing/${id}`), 1200)
    } catch {
      /* 에러 시 submitting 해제 — 재시도 가능 */
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    setShowDeleteModal(false)
    try {
      await deleteListing(postId)
      navigate('/', {replace: true})
    } catch {
      /* 삭제 실패 무시 — 추후 토스트 연동 가능 */
    }
  }

  // ── 로딩 중 스켈레톤 ─────────────────────────────────────────────────────
  if (detailLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{color: 'var(--color-text-hint)'}}/>
      </div>
    )
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────

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
            <ChevronLeft size={18} style={{color: 'var(--color-text-sub)'}} strokeWidth={2}/>
          </Link>
          <h1 className="text-[22px] font-bold" style={{color: 'var(--color-text-main)'}}>
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
          <Trash2 size={14} strokeWidth={1.75}/>
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
          <Lock size={16} style={{color: 'var(--color-warning)'}} strokeWidth={1.75} className="mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-[13px] font-semibold" style={{color: 'var(--color-warning)'}}>
              거래 진행 중 — 일부 항목 수정 불가
            </p>
            <p className="text-[11px] mt-0.5" style={{color: 'var(--color-text-sub)'}}>
              가격, 배송방식은 거래가 완료되거나 취소된 후 수정할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">

          {/* ── 좌측: 폼 영역 ── */}
          <div className="flex flex-col gap-5">

            {/* 이미지 영역 — 기존 URL + 새 파일 미리보기 */}
            <section
              className="rounded-[12px] p-5"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide"
                   style={{color: 'var(--color-text-hint)'}}>
                  업로드된 이미지
                </p>
                <span className="text-[11px]" style={{color: 'var(--color-text-hint)'}}>
                  {totalImages}/{MAX_IMAGES}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* 기존 이미지 URL 렌더링 */}
                {existingUrls.map((url, i) => (
                  <div key={`existing-${i}`} className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt={`기존 이미지 ${i + 1}`}
                      className="w-[80px] h-[80px] rounded-[8px] object-cover"
                      style={{border: '1px solid var(--color-border)'}}
                    />
                    {/* 대표 이미지 뱃지 (첫 번째 이미지) */}
                    {i === 0 && (
                      <span
                        className="absolute bottom-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded"
                        style={{background: 'rgba(0,0,0,.45)', color: '#fff'}}
                      >
                        대표
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingUrl(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{background: 'var(--color-accent)', color: '#fff'}}
                      aria-label="이미지 삭제"
                    >
                      <X size={10} strokeWidth={2.5}/>
                    </button>
                  </div>
                ))}

                {/* 새로 추가한 파일 미리보기 */}
                {newFiles.map((file, i) => {
                  /* object URL 생성 — onLoad 후 해제로 메모리 누수 방지 */
                  const previewUrl = URL.createObjectURL(file)
                  return (
                    <div key={`new-${i}`} className="relative flex-shrink-0">
                      <img
                        src={previewUrl}
                        alt={`새 이미지 ${i + 1}`}
                        className="w-[80px] h-[80px] rounded-[8px] object-cover"
                        style={{border: '2px dashed var(--color-accent)'}}
                        onLoad={() => URL.revokeObjectURL(previewUrl)}
                      />
                      <button
                        type="button"
                        onClick={() => removeNewFile(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{background: 'var(--color-accent)', color: '#fff'}}
                        aria-label="이미지 제거"
                      >
                        <X size={10} strokeWidth={2.5}/>
                      </button>
                    </div>
                  )
                })}

                {/* 추가 버튼 (최대 미만일 때만 표시) */}
                {totalImages < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-[80px] h-[80px] rounded-[8px] flex flex-col items-center justify-center gap-1 transition-colors
                      border border-dashed border-[var(--color-border-strong)] hover:border-[var(--color-accent)]"
                  >
                    <Upload size={18} style={{color: 'var(--color-text-hint)'}}/>
                    <span className="text-[10px]" style={{color: 'var(--color-text-hint)'}}>추가</span>
                  </button>
                )}
              </div>
              {/* 숨겨진 파일 인풋 */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-[11px] mt-2" style={{color: 'var(--color-text-hint)'}}>
                최대 8장 · 첫 번째 이미지가 대표 이미지로 사용됩니다.
                새로 추가된 이미지는 점선 테두리로 표시됩니다.
              </p>
            </section>

            {/* 기본 정보 */}
            <section
              className="rounded-[12px] p-5 flex flex-col gap-4"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <p className="text-[12px] font-semibold uppercase tracking-wide"
                 style={{color: 'var(--color-text-hint)'}}>
                기본 정보
              </p>

              {/* 제목 */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{color: 'var(--color-text-sub)'}}>
                  제목 <span style={{color: 'var(--color-accent)'}}>*</span>
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
                  <p className="mt-1 text-[11px]" style={{color: 'var(--color-error)'}}>{errors.title}</p>
                )}
              </div>

              {/* 종목 */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{color: 'var(--color-text-sub)'}}>
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
                        color: form.sport === s.key ? '#fff' : 'var(--color-text-sub)',
                        borderColor: form.sport === s.key ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 구단 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium mb-1.5" style={{color: 'var(--color-text-sub)'}}>
                    구단명 <span style={{color: 'var(--color-accent)'}}>*</span>
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
                    <p className="mt-1 text-[11px]" style={{color: 'var(--color-error)'}}>{errors.team}</p>
                  )}
                </div>
              </div>

              {/* 유니폼명 */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{color: 'var(--color-text-sub)'}}>
                  유니폼명 <span style={{color: 'var(--color-accent)'}}>*</span>
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
                  <p className="mt-1 text-[11px]" style={{color: 'var(--color-error)'}}>{errors.uniformName}</p>
                )}
              </div>
            </section>

            {/* 상태 & 사이즈 */}
            <section
              className="rounded-[12px] p-5 flex flex-col gap-4"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <p className="text-[12px] font-semibold uppercase tracking-wide"
                 style={{color: 'var(--color-text-hint)'}}>
                상태 & 사이즈
              </p>

              {/* 등급 */}
              <div>
                <label className="block text-[12px] font-medium mb-2" style={{color: 'var(--color-text-sub)'}}>
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
                        background: form.grade === g.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
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
                            style={{color: form.grade === g.key ? 'rgba(255,255,255,0.75)' : 'var(--color-text-hint)'}}>
                        {g.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 사이즈 */}
              <div>
                <label className="block text-[12px] font-medium mb-2" style={{color: 'var(--color-text-sub)'}}>
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
                        background: form.size === s ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                        color: form.size === s ? '#fff' : 'var(--color-text-sub)',
                        borderColor: form.size === s ? 'var(--color-primary)' : 'var(--color-border)',
                        fontFamily: "'IAMAPLAYER',Giants,sans-serif",
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
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                opacity: locked ? 0.65 : 1,
                pointerEvents: locked ? 'none' : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-wide"
                   style={{color: 'var(--color-text-hint)'}}>
                  거래 조건
                </p>
                {locked && <Lock size={12} style={{color: 'var(--color-warning)'}} strokeWidth={1.75}/>}
              </div>

              {/* 배송방식 */}
              <div>
                <label className="block text-[12px] font-medium mb-2" style={{color: 'var(--color-text-sub)'}}>
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
                        background: form.deliveryType === d.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                        borderColor: form.deliveryType === d.key ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                    >
                      <span className="block text-[13px] font-semibold"
                            style={{color: form.deliveryType === d.key ? '#fff' : 'var(--color-text-main)'}}>
                        {d.label}
                      </span>
                      <span className="block text-[10px] mt-0.5"
                            style={{color: form.deliveryType === d.key ? 'rgba(255,255,255,0.7)' : 'var(--color-text-hint)'}}>
                        {d.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 가격 */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{color: 'var(--color-text-sub)'}}>
                  판매 가격 <span style={{color: 'var(--color-accent)'}}>*</span>
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
                    style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                  />
                </div>
                {form.price && !isNaN(Number(form.price)) && (
                  <p className="mt-1 text-[12px]" style={{color: 'var(--color-text-hint)'}}>
                    {formatPrice(Number(form.price))} (수수료 3.5% 제외 후 정산)
                  </p>
                )}
                {errors.price && (
                  <p className="mt-1 text-[11px]" style={{color: 'var(--color-error)'}}>{errors.price}</p>
                )}
              </div>
            </section>

            {/* 상품 설명 */}
            <section
              className="rounded-[12px] p-5"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <label className="block text-[12px] font-semibold uppercase tracking-wide mb-3"
                     style={{color: 'var(--color-text-hint)'}}>
                상품 설명 <span style={{color: 'var(--color-accent)'}}>*</span>
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
                <p className="mt-1 text-[11px]" style={{color: 'var(--color-error)'}}>{errors.description}</p>
              )}
            </section>
          </div>

          {/* ── 우측: 안내 패널 ── */}
          <aside className="hidden md:flex flex-col gap-4">
            {/* 수정 안내 */}
            <div
              className="rounded-[12px] p-4"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
                <p className="text-[12px] font-semibold" style={{color: 'var(--color-text-main)'}}>
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
                          style={{background: 'var(--color-text-hint)'}}/>
                    <span className="text-[12px]" style={{color: 'var(--color-text-sub)'}}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 등급 가이드 */}
            <div
              className="rounded-[12px] p-4"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <p className="text-[12px] font-semibold mb-3" style={{color: 'var(--color-text-main)'}}>
                컨디션 등급 기준
              </p>
              {GRADES.map((g) => (
                <div key={g.key} className="flex items-center gap-2 py-1.5 border-b last:border-0"
                     style={{borderColor: 'var(--color-border)'}}>
                  <span
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                    style={{
                      background: {
                        S: 'var(--color-primary)',
                        A: 'var(--color-accent)',
                        B: 'var(--color-text-sub)',
                        C: 'var(--color-text-hint)'
                      }[g.key],
                      fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                    }}
                  >
                    {g.key}
                  </span>
                  <span className="text-[12px]" style={{color: 'var(--color-text-sub)'}}>{g.desc}</span>
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
              border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-main)]"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || submitDone}
            className="px-8 h-[48px] rounded-[10px] text-[15px] font-semibold text-white transition-opacity
              hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
            style={{background: 'var(--color-primary)'}}
          >
            {submitDone ? (
              <>
                <CheckCircle2 size={16} strokeWidth={2}/>
                수정 완료
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin"/>
                저장 중...
              </>
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
