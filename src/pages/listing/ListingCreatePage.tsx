/**
 * ListingCreatePage — 판매글 작성 (Screen 3)
 *
 * 구성:
 *   ImageUpload      — 이미지 업로드 (최대 8장, 드래그앤드롭 시뮬레이션)
 *   FormSection      — 제목/팀/사이즈/등급/거래방식/가격/설명 입력
 *   AiPanel          — AI 설명 추천 + 카드 프리뷰 (오른쪽 사이드패널)
 *   LivePreview      — 작성 중 카드 프리뷰
 *
 * AI 기능: 실제 백엔드 연동
 *   - 설명·제목 추천: 첫 번째 이미지를 /api/listings/ai-suggest에 업로드하면 AI가 title+description 반환
 *   - 정책 안내: 상단 AI 안내 배너 + 입력 미충족/유해성 상태 박스 분리 표시
 */
import {formatPrice} from '../../utils/format'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {deletePostDraft, type DraftModeration, getPostDraft, savePostDraft,} from '../../features/listing/api/draftApi'
import {createListing, suggestListingFromImage, uploadListingImages,} from '../../features/listing/api/listingApi'
import {flattenImageToWhite, resolveImageUrl} from '../../utils/image'
import {inspectListingModeration} from '../../utils/listingModeration'
import ConditionBadge from '../../components/ui/ConditionBadge'
import {AlertTriangle, CheckCircle2, ChevronDown, Eye, Info, Loader2, Sparkles, Upload, X,} from 'lucide-react'
import {useNavigate} from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import type {DeliveryType, Grade, Sport} from '../../types/listing'

// ── 상수 ─────────────────────────────────────────────────────────────────────

const SPORT_OPTIONS: { key: Sport; label: string }[] = [
  {key: 'BASEBALL', label: '야구'},
  {key: 'SOCCER', label: '축구'},
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

const SPORT_LABEL: Record<Sport, string> = {
  SOCCER: '축구',
  BASEBALL: '야구',
  BASKETBALL: '농구',
  VOLLEYBALL: '배구',
  ESPORTS: 'e스포츠',
  ETC: '기타',
}

const DELIVERY_LABEL: Record<DeliveryType, string> = {
  DELIVERY: '택배',
  DIRECT: '직거래',
  BOTH: '택배·직거래',
}

// ── 폼 타입 ──────────────────────────────────────────────────────────────────

interface ListingForm {
  title: string
  sport: Sport
  team: string
  jerseyNumber: string
  size: string
  grade: Grade
  deliveryType: DeliveryType
  price: string
  description: string
  tradeArea: string
}

interface DraftImageItem {
  id: string
  previewUrl: string
  uploadedUrl: string | null
  file: File | null
}

interface DraftRestoreSnapshot {
  form: ListingForm
  images: DraftImageItem[]
  moderation: DraftModeration | null
}

interface DraftRestoreState {
  beforeRestore: DraftRestoreSnapshot
  restored: DraftRestoreSnapshot
  isApplied: boolean
}

/**
 * 작성 화면의 현재 입력값을 실제 목록 카드에 가까운 형태로 보여준다.
 * - 대표 이미지는 첫 번째 previewUrl을 사용한다.
 * - 아직 이미지가 없으면 목록 카드와 동일한 톤의 플레이스홀더를 렌더링한다.
 * - 저장 전 단계라 시간 표시는 고정 문구로 두고, 나머지는 현재 폼 상태를 그대로 반영한다.
 */
function ListingPreviewCard({
                              form,
                              images,
                            }: {
  form: ListingForm
  images: DraftImageItem[]
}) {
  const previewImage = images[0]?.previewUrl ?? null
  const sportLabel = SPORT_LABEL[form.sport]
  const deliveryLabel = DELIVERY_LABEL[form.deliveryType]
  const previewTitle = form.title.trim() || '상품명을 입력해주세요'
  const previewTeam = form.team.trim() || `${sportLabel} · 팀 미정`
  const previewPrice = form.price ? formatPrice(Number(form.price)) : '₩0'
  const previewMeta = [deliveryLabel, form.size || null].filter(Boolean).join(' · ')
  
  return (
    <div
      className="rounded-xl overflow-hidden relative mx-auto w-full max-w-[220px] transition-shadow"
      style={{border: '1px solid var(--color-border)', background: 'var(--color-surface)'}}
    >
      <div className="relative" style={{aspectRatio: '4/5', background: 'var(--color-primary-hover)'}}>
        {previewImage ? (
          <img
            src={previewImage}
            alt={previewTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            {/* 실제 카드와 동일한 계열의 플레이스홀더를 사용해 업로드 전에도 분위기를 유지한다. */}
            <div
              className="absolute inset-0"
              style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)'}}
            />
            <span
              className="absolute inset-0 flex items-center justify-center select-none"
              style={{
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                fontSize: 80,
                color: 'rgba(255,255,255,.13)',
              }}
            >
              {form.jerseyNumber.trim() || '?'}
            </span>
          </>
        )}
        
        <ConditionBadge grade={form.grade} size="sm" className="absolute top-2 left-2"/>
        
        <span
          className="absolute bottom-2 left-2 rounded-full px-2 py-1 text-[11px] font-semibold"
          style={{
            background: 'rgba(255,255,255,.9)',
            color: 'var(--color-text-main)',
          }}
        >
          {deliveryLabel}
        </span>
      </div>
      
      <div className="p-3">
        <p className="text-[13px] mb-0.5 truncate" style={{color: 'var(--color-text-hint)'}}>
          {previewTeam}
        </p>
        <p className="text-sm font-semibold leading-snug line-clamp-2" style={{color: 'var(--color-text-main)'}}>
          {previewTitle}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span
              className="block font-bold text-sm truncate"
              style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
            >
              {previewPrice}
            </span>
            <span className="block text-[11px] truncate" style={{color: 'var(--color-text-hint)'}}>
              {previewMeta || '옵션 입력 대기'}
            </span>
          </div>
          <span className="text-xs flex-shrink-0" style={{color: 'var(--color-text-hint)'}}>
            미리보기
          </span>
        </div>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 이미지 업로드 영역 — 실제 파일 선택 + 미리보기 */
function ImageUploader({
                         images, onAdd, onRemove,
                       }: {
  images: DraftImageItem[]                // 선택/복원된 이미지 목록
  onAdd: (files: File[]) => void | Promise<void> // 파일 추가 콜백
  onRemove: (idx: number) => void         // 파일 제거 콜백
}) {
  const MAX = 8
  
  /* 숨겨진 file input ref */
  const fileRef = useRef<HTMLInputElement>(null)
  
  /**
   * 파일 인풋 change 핸들러
   * — 선택된 파일을 최대 MAX개까지 추가하고 input value를 초기화해
   *   같은 파일을 다시 선택할 수 있게 한다
   */
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    const remaining = MAX - images.length
    const toAdd = selected.slice(0, remaining)
    if (toAdd.length) onAdd(toAdd)
    e.target.value = ''   // 동일 파일 재선택 허용
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>
          사진 <span style={{color: 'var(--color-accent)'}}>*</span>
        </label>
        <span className="text-xs" style={{color: 'var(--color-text-hint)'}}>{images.length}/{MAX}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {images.map((file, i) => {
          /* File 객체를 object URL로 변환해 img src로 사용
             onLoad 이후 revokeObjectURL로 메모리 해제 */
          return (
            <div key={i} className="relative rounded-xl overflow-hidden flex-shrink-0"
                 style={{width: 80, height: 80, background: 'var(--color-surface-raised)'}}>
              <img
                src={file.previewUrl}
                alt={`이미지 ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[12px] font-bold px-1 py-0.5 rounded"
                      style={{background: 'rgba(0,0,0,.45)', color: '#fff'}}>대표</span>
              )}
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{background: 'rgba(0,0,0,.5)'}}
                aria-label="이미지 제거"
              >
                <X size={11} color="#fff"/>
              </button>
            </div>
          )
        })}
        {images.length < MAX && (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
            style={{
              width: 80, height: 80,
              border: '2px dashed var(--color-border)',
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-hint)',
            }}
            aria-label="이미지 추가"
          >
            <Upload size={18}/>
            <span className="text-[12px]">추가</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile}/>
      <p className="text-xs mt-2" style={{color: 'var(--color-text-hint)'}}>
        첫 번째 사진이 대표 이미지로 표시됩니다. 최대 {MAX}장.
      </p>
    </div>
  )
}

/** 셀렉트 박스 래퍼 */
function FormSelect({
                      label, required, value, onChange, options, placeholder,
                    }: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{color: 'var(--color-text-main)'}}>
        {label}{required && <span className="ml-0.5" style={{color: 'var(--color-accent)'}}>*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none outline-none"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: value ? 'var(--color-text-main)' : 'var(--color-text-hint)',
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                     color="var(--color-text-hint)"/>
      </div>
    </div>
  )
}

/** 텍스트 입력 래퍼 */
function FormInput({
                     label, required, value, onChange, placeholder, type = 'text', suffix,
                   }: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  suffix?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{color: 'var(--color-text-main)'}}>
        {label}{required && <span className="ml-0.5" style={{color: 'var(--color-accent)'}}>*</span>}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-main)',
            paddingRight: suffix ? '3rem' : undefined,
          }}
        />
        {suffix && (
          <span className="absolute right-3 text-sm pointer-events-none"
                style={{color: 'var(--color-text-hint)'}}>{suffix}</span>
        )}
      </div>
    </div>
  )
}

/** 유해성 검사에서 감지된 표현 목록 */
function ModerationHitList({hits}: { hits: string[] }) {
  if (hits.length === 0) return null
  
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold" style={{color: 'var(--color-text-hint)'}}>
        수정이 필요한 표현
      </p>
      <div className="flex flex-wrap gap-1.5">
        {hits.map((hit) => (
          <span
            key={hit}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              background: 'rgba(255,46,77,.08)',
              border: '1px solid rgba(255,46,77,.18)',
              color: 'var(--color-accent)',
            }}
          >
            {hit}
          </span>
        ))}
      </div>
    </div>
  )
}

/** AI 패널 — /api/listings/ai-suggest 실연동 */
function AiPanel({
                   form, onApply, images,
                 }: {
  form: ListingForm
  /** AI 추천 결과 적용 콜백 — title + description 동시 반영 */
  onApply: (result: { title: string; description: string }) => void
  /** 업로드된 이미지 목록 (이번 세션에 추가한 파일이 있을 때만 AI 분석 가능) */
  images: DraftImageItem[]
}) {
  const [aiLoading, setAiLoading] = useState(false)
  /** AI 추천 결과 — null이면 미생성 또는 오류 */
  const [aiResult, setAiResult] = useState<{ title: string; description: string } | null>(null)
  const firstLocalImage = useMemo(
    () => images.find((image) => image.file)?.file ?? null,
    [images],
  )
  
  async function requestAiDescription() {
    if (images.length === 0) return
    if (!firstLocalImage) return
    setAiLoading(true)
    setAiResult(null)
    try {
      /* 이번 세션에 올린 첫 번째 이미지를 multipart/form-data로 전송한다. */
      const result = await suggestListingFromImage(firstLocalImage)
      setAiResult(result)
    } catch (err) {
      console.error('[AI 추천] 오류:', err)
      setAiResult(null)
    } finally {
      setAiLoading(false)
    }
  }
  
  /** 이미지가 1장 이상 업로드되어 있어야 AI 추천 가능 */
  const canGenerate = firstLocalImage != null
  
  return (
    <div className="flex flex-col gap-4">
      {/* AI 설명 추천 */}
      <div className="rounded-2xl overflow-hidden" style={{border: '1px solid var(--color-border)'}}>
        {/* 헤더 */}
        <div className="flex items-center gap-2 px-4 py-3" style={{background: 'var(--color-primary)'}}>
          <Sparkles size={16} color="#FFB800"/>
          <span className="text-sm font-display font-bold text-white">AI 설명 추천</span>
        </div>
        <div className="p-4" style={{background: 'var(--color-surface)'}}>
          <p className="text-xs mb-3 leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
            첫 번째 사진을 분석해 AI가 제목과 설명을 자동으로 작성해드립니다.
          </p>
          <button
            onClick={requestAiDescription}
            disabled={!canGenerate || aiLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
            style={{background: canGenerate ? 'var(--color-accent)' : 'var(--color-text-hint)'}}
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
            {aiLoading ? 'AI 생성 중...' : '설명 자동 생성'}
          </button>
          
          {/* AI 추천 결과 카드 */}
          {aiResult && (
            <div className="mt-3">
              {/* 추천 제목 미리보기 */}
              <div className="mb-2">
                <span className="text-[11px] font-semibold" style={{color: 'var(--color-text-hint)'}}>추천 제목</span>
                <div
                  className="text-xs leading-relaxed px-3 py-2 rounded-lg mt-1"
                  style={{
                    background: 'var(--color-surface-raised)',
                    color: 'var(--color-text-main)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  {aiResult.title}
                </div>
              </div>
              {/* 추천 설명 미리보기 */}
              <div className="mb-3">
                <span className="text-[11px] font-semibold" style={{color: 'var(--color-text-hint)'}}>추천 설명</span>
                <div
                  className="text-xs leading-relaxed p-3 rounded-xl mt-1 whitespace-pre-line"
                  style={{
                    background: 'var(--color-surface-raised)',
                    color: 'var(--color-text-sub)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  {aiResult.description}
                </div>
              </div>
              <button
                onClick={() => onApply(aiResult)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white"
                style={{background: 'var(--color-success)'}}
              >
                <CheckCircle2 size={13}/>제목·설명 모두 적용하기
              </button>
            </div>
          )}
          
          {!canGenerate && (
            <p className="text-[13px] mt-2 flex items-center gap-1" style={{color: 'var(--color-text-hint)'}}>
              <Info size={11}/>사진을 먼저 추가해주세요.
            </p>
          )}
        </div>
      </div>
      
      {/* 라이브 프리뷰 */}
      <div className="rounded-2xl overflow-hidden" style={{border: '1px solid var(--color-border)'}}>
        <div className="flex items-center gap-2 px-4 py-3"
             style={{background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)'}}>
          <Eye size={15} color="var(--color-text-sub)"/>
          <span className="text-sm font-display font-bold" style={{color: 'var(--color-text-sub)'}}>카드 프리뷰</span>
        </div>
        <div className="p-4" style={{background: 'var(--color-surface)'}}>
          <ListingPreviewCard form={form} images={images}/>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ListingCreatePage() {
  const navigate = useNavigate()
  
  const [form, setForm] = useState<ListingForm>({
    title: '', sport: 'BASEBALL', team: '', jerseyNumber: '',
    size: 'M', grade: 'A', deliveryType: 'BOTH', price: '', description: '', tradeArea: '',
  })
  const [images, setImages] = useState<DraftImageItem[]>([])
  const [draftModeration, setDraftModeration] = useState<DraftModeration | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)   // 등록 실패 메시지
  // 초안 관련 상태
  const [draftLoaded, setDraftLoaded] = useState(false)   // 초안 복원 알림 표시 여부
  const [draftRestoreState, setDraftRestoreState] = useState<DraftRestoreState | null>(null)
  const [draftSaving, setDraftSaving] = useState(false)   // 저장 중 표시
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftRestoreBaseRef = useRef<DraftRestoreSnapshot | null>(null)
  // 인증 상태 (draft API 호출 여부 결정)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const moderationInput = useMemo(
    () => `${form.title} ${form.description}`.trim(),
    [form.title, form.description],
  )
  const localModerationPreview = useMemo(
    () => inspectListingModeration(moderationInput),
    [moderationInput],
  )
  
  const update = useCallback(<K extends keyof ListingForm>(key: K, val: ListingForm[K]) => {
    setForm(prev => ({...prev, [key]: val}))
  }, [])
  
  /**
   * 초안 자동 복원 전 기준이 되는 현재 로컬 입력 상태를 ref로 유지한다.
   *
   * getPostDraft effect는 마운트 시 한 번만 돌기 때문에,
   * 최신 값 캡처는 의존성 확장 대신 ref 동기화로 처리한다.
   */
  useEffect(() => {
    draftRestoreBaseRef.current = {
      form: {...form},
      images: images.map((image) => ({...image})),
      moderation: draftModeration,
    }
  }, [draftModeration, form, images])
  
  /* 마운트 시 초안 불러오기 — 로그인 상태에서만 호출 (비로그인 시 403) */
  useEffect(() => {
    if (!isAuthenticated) return
    getPostDraft()
      .then(({draft, moderation}) => {
        const hasDraft =
          !!draft &&
          (
            !!draft.title ||
            !!draft.content ||
            !!draft.team ||
            !!draft.uniformNumber ||
            !!draft.directTradeLocation ||
            !!draft.imageUrls?.length
          )
        if (hasDraft) {
          /**
           * 초안 복원 스위치를 위해 복원 전/복원 후 상태를 함께 보관한다.
           *
           * 현재 페이지는 마운트 직후 서버 초안을 자동 적용하므로,
           * 사용자가 "실행 취소"와 "복원하기"를 반복해서 눌러도
           * 같은 두 상태 사이를 안정적으로 왕복할 수 있어야 한다.
           */
          const restoredImages: DraftImageItem[] = (draft.imageUrls ?? [])
            .reduce<DraftImageItem[]>((acc, url, index) => {
              const resolved = resolveImageUrl(url)
              if (!resolved) {
                return acc
              }
              acc.push({
                id: `draft-${index}-${url}`,
                previewUrl: resolved,
                uploadedUrl: url,
                file: null,
              })
              return acc
            }, [])
          const restoredSnapshot: DraftRestoreSnapshot = {
            form: {
              ...form,
              title: draft.title ?? form.title,
              sport: draft.sport ?? form.sport,
              team: draft.team ?? form.team,
              jerseyNumber: draft.uniformNumber ?? form.jerseyNumber,
              grade: draft.condition ?? form.grade,
              size: draft.size ?? form.size,
              deliveryType: draft.tradeType ?? form.deliveryType,
              price: draft.price != null ? String(draft.price) : form.price,
              description: draft.content ?? form.description,
              tradeArea: draft.directTradeLocation ?? form.tradeArea,
            },
            images: restoredImages.map((image) => ({...image})),
            moderation: moderation ?? null,
          }
          setDraftRestoreState({
            beforeRestore: draftRestoreBaseRef.current ?? {
              form: {...form},
              images: images.map((image) => ({...image})),
              moderation: draftModeration,
            },
            restored: restoredSnapshot,
            isApplied: true,
          })
          setForm(prev => ({
            ...prev,
            title: draft.title ?? prev.title,
            sport: draft.sport ?? prev.sport,
            team: draft.team ?? prev.team,
            jerseyNumber: draft.uniformNumber ?? prev.jerseyNumber,
            grade: draft.condition ?? prev.grade,
            size: draft.size ?? prev.size,
            deliveryType: draft.tradeType ?? prev.deliveryType,
            price: draft.price != null ? String(draft.price) : prev.price,
            description: draft.content ?? prev.description,
            tradeArea: draft.directTradeLocation ?? prev.tradeArea,
          }))
          setImages(restoredImages)
          setDraftModeration(moderation ?? null)
          setDraftLoaded(true)
        }
      })
      .catch(() => { /* 초안 없으면 무시 */
      })
  }, [isAuthenticated])
  
  /**
   * 초안 자동 복원 상태를 토글한다.
   *
   * 동작:
   * - 현재 복원 적용 상태면 복원 직전 로컬 입력 상태로 되돌린다.
   * - 현재 복원 취소 상태면 서버 초안 복원 상태를 다시 적용한다.
   * - 알림 박스는 유지하고, 메시지/버튼 라벨만 현재 상태에 맞게 전환한다.
   *
   * 참고:
   * - 서버에 저장된 초안 자체는 유지한다.
   * - 사용자가 새로고침하거나 다시 진입하면 서버 초안 기준으로 다시 복원될 수 있다.
   */
  function handleToggleDraftRestore() {
    if (!draftRestoreState) {
      return
    }
    
    const nextSnapshot = draftRestoreState.isApplied
      ? draftRestoreState.beforeRestore
      : draftRestoreState.restored
    
    setForm({...nextSnapshot.form})
    setImages(nextSnapshot.images.map((image) => ({...image})))
    setDraftModeration(nextSnapshot.moderation)
    setDraftRestoreState((prev) => prev ? {...prev, isApplied: !prev.isApplied} : prev)
  }
  
  /* 제목/설명 변경 시 디바운스 자동저장 (1.5초 후) — 로그인 상태에서만 */
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    if (!isAuthenticated) return
    
    draftTimerRef.current = setTimeout(() => {
      setDraftSaving(true)
      savePostDraft({
        title: form.title || null,
        content: form.description || null,
        sport: form.sport,
        team: form.team || null,
        uniformNumber: form.jerseyNumber || null,
        condition: form.grade,
        size: form.size || null,
        tradeType: form.deliveryType,
        price: form.price ? Number(form.price) : null,
        directTradeLocation: form.tradeArea || null,
        imageUrls: images
          .map((image) => image.uploadedUrl)
          .filter((url): url is string => !!url),
      })
        .then((state) => setDraftModeration(state.moderation ?? null))
        .catch(() => { /* 자동저장 실패는 무시 */
        })
        .finally(() => setDraftSaving(false))
    }, 1500)
    
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [isAuthenticated, form, images])
  
  /* 종목 변경 시 초기화 */
  function handleSportChange(sport: Sport) {
    update('sport', sport)
  }
  
  /* AI 추천 적용 — 제목과 설명을 동시에 업데이트 */
  function applyAiDescription({title, description}: { title: string; description: string }) {
    update('title', title)
    update('description', description)
  }
  
  async function handleAddImages(files: File[]) {
    if (!files.length) return
    
    // 투명 배경(PNG 등)을 흰색 배경 JPEG로 변환해 다크모드 투명도 문제 방지
    const flattenedFiles = await Promise.all(files.map(flattenImageToWhite))
    
    const nextItems: DraftImageItem[] = flattenedFiles.map((file, index) => ({
      id: `local-${Date.now()}-${index}`,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: null,
      file,
    }))
    
    setImages((prev) => [...prev, ...nextItems])
    
    try {
      const uploadedUrls = await uploadListingImages(flattenedFiles)
      setImages((prev) => {
        let cursor = 0
        return prev.map((image) => {
          if (!nextItems.some((item) => item.id === image.id)) {
            return image
          }
          const uploadedUrl = uploadedUrls[cursor] ?? null
          cursor += 1
          return {...image, uploadedUrl}
        })
      })
    } catch {
      nextItems.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      setImages((prev) => prev.filter((image) => !nextItems.some((item) => item.id === image.id)))
      setSubmitError('이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }
  
  function removeImage(idx: number) {
    setImages((prev) => {
      const target = prev[idx]
      if (target?.file) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((_, index) => index !== idx)
    })
  }
  
  /* 제출 — createListing API 연동 */
  async function handleSubmit() {
    if (!form.title || !form.price || images.length === 0) return
    if (effectiveModeration) {
      setSubmitError('이 게시글에는 운영 정책에 맞지 않는 표현이 포함되어 있어요. 문제 표현을 수정한 뒤 다시 등록해 주세요.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)   // 이전 에러 초기화
    try {
      /* Step 1: 선택된 File[] 을 서버에 업로드하여 imageUrls[] 확보 */
      const imageUrls = images
        .map((image) => image.uploadedUrl)
        .filter((url): url is string => !!url)
      if (imageUrls.length === 0) {
        setSubmitError('이미지 업로드가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.')
        setSubmitting(false)
        return
      }
      
      /* Step 2: imageUrls 포함하여 판매글 등록 요청
       * 백엔드 필드명: description / condition / tradeType
       * (uniformName은 백엔드에서 title로 자동 채움 → 전송 불필요) */
      const postId = await createListing({
        title: form.title,
        description: form.description,
        sport: form.sport,
        team: form.team,
        condition: form.grade,
        size: form.size || undefined,
        price: Number(form.price),
        tradeType: form.deliveryType,
        imageUrls,
      })
      // 등록 성공 → 초안 삭제 후 상세 페이지 이동
      await deletePostDraft().catch(() => {
      })
      navigate(`/listing/${postId}`)
    } catch {
      // 판매글 등록 실패 (400/401/500 등)
      setSubmitError('게시글 등록에 실패했습니다. 입력 내용을 확인하고 다시 시도해주세요.')
      setSubmitting(false)
    }
  }
  
  /**
   * 등록 차단 기준:
   * - 백엔드 초안 검사 결과가 유해로 판정되었거나
   * - 프론트 로컬 규칙이 현재 입력값에서 유해 표현을 감지하면
   *   등록 버튼을 잠근다.
   *
   * 백엔드 응답은 AI/정책 전반을, 로컬 규칙은 즉시성 있는 키워드 차단을 담당한다.
   */
  const effectiveModeration = draftModeration ?? (
    localModerationPreview
      ? {
        riskLevel: localModerationPreview.riskLevel,
        reason: localModerationPreview.reason,
        suggestion: null,
      }
      : null
  )
  const moderationHits = localModerationPreview?.matchedTerms ?? []
  const isModerationBlocked = effectiveModeration !== null
  const canSubmit = !!form.title && !!form.price && images.some((image) => !!image.uploadedUrl) && !isModerationBlocked
  const moderationWarningMessage = effectiveModeration?.riskLevel === 'HIGH'
    ? '운영 정책에 어긋날 수 있는 표현이 감지되었습니다. 문제 표현을 수정해야 등록할 수 있어요.'
    : '주의가 필요한 표현이 감지되었습니다. 내용을 검토하고 수정한 뒤 다시 등록해 주세요.'
  const draftRestoreMessage = draftRestoreState?.isApplied
    ? '이전에 작성하던 초안이 복원되었습니다.'
    : '초안 복원이 취소되었습니다.'
  const draftRestoreActionLabel = draftRestoreState?.isApplied ? '실행 취소' : '복원하기'
  const missingSubmitRequirements = useMemo(() => {
    const requirements: string[] = []
    
    if (!form.title.trim()) {
      requirements.push('상품명을 입력해주세요.')
    }
    
    if (!form.price.trim()) {
      requirements.push('가격을 입력해주세요.')
    }
    
    if (!images.some((image) => !!image.uploadedUrl)) {
      requirements.push('사진을 1장 이상 업로드해주세요.')
    }
    
    return requirements
  }, [form.price, form.title, images])
  
  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6 md:py-10">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <h1
              className="text-2xl font-bold"
              style={{
                color: 'var(--color-text-main)',
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                letterSpacing: '0.04em'
              }}
            >
              SELL ITEM
            </h1>
            {/* 자동저장 표시 */}
            {draftSaving && (
              <span className="text-xs flex items-center gap-1" style={{color: 'var(--color-text-hint)'}}>
                <Loader2 size={12} className="animate-spin"/> 초안 저장 중...
              </span>
            )}
          </div>
          <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>유니폼 정보를 입력하면 AI가 도와드립니다.</p>
          <div
            className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl"
            style={{background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)'}}
          >
            <Info size={16} color="var(--color-primary)" className="flex-shrink-0 mt-0.5"/>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>
                AI 검사 안내
              </p>
              <p className="text-sm leading-relaxed mt-1" style={{color: 'var(--color-text-sub)'}}>
                등록 전 AI가 이미지와 게시글 내용을 함께 확인해 정책 위반 가능성이 있는 표현을 안내합니다.
              </p>
            </div>
          </div>
          {/* 초안 복원 알림 */}
          {draftLoaded && (
            <div
              className="mt-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm"
              style={{background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)'}}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span style={{color: 'var(--color-text-sub)'}}>{draftRestoreMessage}</span>
                <button
                  onClick={handleToggleDraftRestore}
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {draftRestoreActionLabel}
                </button>
              </div>
              <button
                onClick={() => setDraftLoaded(false)}
                className="flex-shrink-0"
                style={{color: 'var(--color-text-hint)'}}
                aria-label="알림 닫기"
              >
                <X size={14}/>
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col xl:flex-row gap-6">
          {/* ── 좌: 메인 폼 ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            
            {/* 이미지 업로드 */}
            <div className="rounded-2xl p-5"
                 style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
              <ImageUploader
                images={images}
                onAdd={handleAddImages}
                onRemove={removeImage}
              />
            </div>
            
            {/* 기본 정보 */}
            <div className="rounded-2xl p-5"
                 style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
              <h2 className="text-sm font-bold mb-4" style={{color: 'var(--color-text-main)'}}>기본 정보</h2>
              <div className="flex flex-col gap-4">
                <FormInput
                  label="상품명" required
                  value={form.title} onChange={v => update('title', v)}
                  placeholder="예: KIA 타이거즈 2024 홈 유니폼"
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect
                    label="종목" required
                    value={form.sport} onChange={v => handleSportChange(v as Sport)}
                    options={SPORT_OPTIONS.map(o => ({value: o.key, label: o.label}))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="팀명" value={form.team} onChange={v => update('team', v)}
                    placeholder="예: KIA 타이거즈"
                  />
                  <FormInput
                    label="등번호" value={form.jerseyNumber} onChange={v => update('jerseyNumber', v)}
                    placeholder="예: 7"
                  />
                </div>
              </div>
            </div>
            
            {/* 상품 상태 */}
            <div className="rounded-2xl p-5"
                 style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
              <h2 className="text-sm font-bold mb-4" style={{color: 'var(--color-text-main)'}}>상품 상태</h2>
              <div className="flex flex-col gap-4">
                {/* 컨디션 등급 */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{color: 'var(--color-text-main)'}}>
                    컨디션 <span style={{color: 'var(--color-accent)'}}>*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {GRADES.map(g => (
                      <button
                        key={g.key}
                        onClick={() => update('grade', g.key)}
                        className="flex flex-col items-center py-3 px-2 rounded-xl transition-all text-center"
                        style={{
                          background: form.grade === g.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                          border: `1px solid ${form.grade === g.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          color: form.grade === g.key ? '#fff' : 'var(--color-text-sub)',
                        }}
                      >
                        <span className="font-bold text-base">{g.label}</span>
                        <span className="text-[12px] mt-1 opacity-70">{g.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* 사이즈 */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{color: 'var(--color-text-main)'}}>
                    사이즈 <span style={{color: 'var(--color-accent)'}}>*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map(s => (
                      <button
                        key={s}
                        onClick={() => update('size', s)}
                        className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: form.size === s ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                          color: form.size === s ? '#fff' : 'var(--color-text-sub)',
                          border: `1px solid ${form.size === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 거래 정보 */}
            <div className="rounded-2xl p-5"
                 style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
              <h2 className="text-sm font-bold mb-4" style={{color: 'var(--color-text-main)'}}>거래 정보</h2>
              <div className="flex flex-col gap-4">
                {/* 거래방식 */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{color: 'var(--color-text-main)'}}>
                    거래방식 <span style={{color: 'var(--color-accent)'}}>*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DELIVERY_OPTIONS.map(d => (
                      <button
                        key={d.key}
                        onClick={() => update('deliveryType', d.key)}
                        className="flex flex-col items-center py-3 px-2 rounded-xl transition-all text-center"
                        style={{
                          background: form.deliveryType === d.key ? 'var(--color-primary)' : 'var(--color-surface-raised)',
                          border: `1px solid ${form.deliveryType === d.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          color: form.deliveryType === d.key ? '#fff' : 'var(--color-text-sub)',
                        }}
                      >
                        <span className="font-bold text-sm">{d.label}</span>
                        <span className="text-[12px] mt-1 opacity-70">{d.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <FormInput
                  label="가격" required
                  value={form.price} onChange={v => update('price', v)}
                  placeholder="0" type="number" suffix="원"
                />
                {form.deliveryType !== 'DELIVERY' && (
                  <FormInput
                    label="직거래 지역"
                    value={form.tradeArea} onChange={v => update('tradeArea', v)}
                    placeholder="예: 강남구 역삼동"
                  />
                )}
              </div>
            </div>
            
            {/* AI 패널 (모바일: 인라인) */}
            <div className="xl:hidden">
              <AiPanel
                form={form}
                onApply={applyAiDescription}
                images={images}
              />
            </div>
            
            {/* 상품 설명 */}
            <div className="rounded-2xl p-5"
                 style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>
                  상품 설명 <span style={{color: 'var(--color-accent)'}}>*</span>
                </label>
                <span className="text-xs"
                      style={{color: 'var(--color-text-hint)'}}>{form.description.length}/1000</span>
              </div>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="상품에 대해 자세히 설명해주세요. AI 자동 생성 기능을 사용하면 편리합니다."
                rows={7}
                maxLength={1000}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
                style={{
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-main)',
                }}
              />
            </div>
            
            {isModerationBlocked ? (
              <div
                className="flex flex-col gap-3 px-4 py-3.5 rounded-xl"
                style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.24)'}}
                role="alert"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} color="var(--color-accent)" className="flex-shrink-0 mt-0.5"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{color: 'var(--color-accent)'}}>
                      게시글 등록이 일시적으로 제한되었습니다
                    </p>
                    <p className="text-sm leading-relaxed mt-1" style={{color: 'var(--color-accent)'}}>
                      {moderationWarningMessage}
                    </p>
                  </div>
                </div>
                <ModerationHitList hits={moderationHits}/>
                {effectiveModeration?.suggestion && (
                  <div
                    className="px-3 py-2.5 rounded-xl text-xs leading-relaxed"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid rgba(255,46,77,.14)',
                      color: 'var(--color-text-sub)',
                    }}
                  >
                    {effectiveModeration.suggestion}
                  </div>
                )}
              </div>
            ) : !canSubmit ? (
              <div
                className="flex flex-col gap-3 px-4 py-3.5 rounded-xl"
                style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
                role="status"
              >
                <div className="flex items-start gap-2.5">
                  <Info size={16} color="var(--color-primary)" className="flex-shrink-0 mt-0.5"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>
                      판매 등록 준비 중입니다
                    </p>
                    <p className="text-sm leading-relaxed mt-1" style={{color: 'var(--color-text-sub)'}}>
                      아래 항목을 채우면 판매 등록 버튼이 활성화됩니다.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {missingSubmitRequirements.map((requirement) => (
                    <div
                      key={requirement}
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)'}}
                    >
                      <AlertTriangle size={14} color="var(--color-warning)" className="flex-shrink-0"/>
                      <span className="text-sm" style={{color: 'var(--color-text-sub)'}}>
                        {requirement}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            
            {/* 등록 실패 에러 메시지 */}
            {submitError && (
              <div
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.3)'}}
              >
                <AlertTriangle size={15} color="var(--color-accent)" className="flex-shrink-0 mt-0.5"/>
                <p className="text-sm leading-relaxed" style={{color: 'var(--color-accent)'}}>{submitError}</p>
              </div>
            )}
            
            {/* 제출 버튼 */}
            <div className="flex gap-3">
              <button
                className="flex-1 py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{background: canSubmit ? 'var(--color-accent)' : 'var(--color-text-hint)'}}
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting && <Loader2 size={16} className="animate-spin"/>}
                {submitting ? '등록 중...' : '판매 등록하기'}
              </button>
            </div>
            
            {!submitError && isModerationBlocked && (
              <p className="text-xs text-center" style={{color: 'var(--color-text-hint)'}}>
                유해성 검사를 통과해야 게시글을 등록할 수 있습니다.
              </p>
            )}
          </div>
          
          {/* ── 우: AI 패널 (데스크탑) ───────────────────────────────── */}
          <div className="hidden xl:block w-72 flex-shrink-0">
            <div className="sticky top-20 flex flex-col gap-4">
              <AiPanel
                form={form}
                onApply={applyAiDescription}
                images={images}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
