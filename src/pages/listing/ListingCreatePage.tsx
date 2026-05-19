/**
 * ListingCreatePage — 판매글 작성 (Screen 3)
 *
 * 구성:
 *   ImageUpload      — 이미지 업로드 (최대 8장, 드래그앤드롭 시뮬레이션)
 *   FormSection      — 제목/팀/사이즈/등급/거래방식/가격/설명 입력
 *   AiPanel          — AI 설명 추천 + 위험도 탐지 (오른쪽 사이드패널)
 *   LivePreview      — 작성 중 카드 프리뷰
 *
 * AI 기능: 실제 백엔드 연동
 *   - 설명·제목 추천: 첫 번째 이미지를 /api/listings/ai-suggest에 업로드하면 AI가 title+description 반환
 *   - 위험 탐지: 설명 입력 중 키워드 실시간 감지 (택배비 선불, 계좌이체 등)
 */
import {formatPrice} from '../../utils/format'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  deletePostDraft,
  getPostDraft,
  savePostDraft,
  type DraftModeration,
} from '../../features/listing/api/draftApi'
import {
  createListing,
  suggestListingFromImage,
  uploadListingImages,
} from '../../features/listing/api/listingApi'
import {resolveImageUrl} from '../../utils/image'
import {AlertTriangle, CheckCircle2, ChevronDown, Eye, Info, Loader2, Sparkles, Upload, X,} from 'lucide-react'
import {useNavigate} from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import type {DeliveryType, Grade, RiskLevel, Sport} from '../../types/listing'

// ── 상수 ─────────────────────────────────────────────────────────────────────

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

/** AI 위험 탐지 배너 */
function RiskBanner({level, msg}: { level: RiskLevel; msg: string }) {
  const colors: Record<RiskLevel, { bg: string; text: string; icon: string }> = {
    HIGH: {bg: 'rgba(255,46,77,.08)', text: 'var(--color-accent)', icon: 'var(--color-accent)'},
    MID: {bg: 'rgba(255,149,0,.08)', text: 'var(--color-warning)', icon: 'var(--color-warning)'},
    LOW: {bg: 'rgba(0,179,110,.08)', text: 'var(--color-success)', icon: 'var(--color-success)'},
  }
  const c = colors[level]
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl mt-2"
         style={{background: c.bg, border: `1px solid ${c.text}33`}}>
      <AlertTriangle size={15} color={c.icon} className="flex-shrink-0 mt-0.5"/>
      <p className="text-xs leading-relaxed" style={{color: c.text}}>{msg}</p>
    </div>
  )
}

/** AI 패널 — /api/listings/ai-suggest 실연동 */
function AiPanel({
                   form, onApply, images, moderation,
                 }: {
  form: ListingForm
  /** AI 추천 결과 적용 콜백 — title + description 동시 반영 */
  onApply: (result: { title: string; description: string }) => void
  /** 업로드된 이미지 목록 (이번 세션에 추가한 파일이 있을 때만 AI 분석 가능) */
  images: DraftImageItem[]
  moderation: DraftModeration | null
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
      
      {/* 위험 탐지 */}
      <div className="rounded-2xl overflow-hidden" style={{border: '1px solid var(--color-border)'}}>
        <div className="flex items-center gap-2 px-4 py-3" style={{
          background: moderation ? 'rgba(255,46,77,.06)' : 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          {moderation
            ? <AlertTriangle size={15} color="var(--color-accent)"/>
            : <CheckCircle2 size={15} color="var(--color-success)"/>
          }
          <span className="text-sm font-bold"
                style={{color: moderation ? 'var(--color-accent)' : 'var(--color-success)'}}>
            {moderation ? '주의가 필요한 내용 감지' : '위험 요소 없음'}
          </span>
        </div>
        <div className="p-4" style={{background: 'var(--color-surface)'}}>
          {!moderation ? (
            <p className="text-xs" style={{color: 'var(--color-text-sub)'}}>
              초안을 저장할 때 백엔드 AI가 제목과 설명을 함께 검사합니다.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <RiskBanner
                level={moderation.riskLevel}
                msg={moderation.reason ?? '주의가 필요한 내용이 감지되었습니다.'}
              />
              {moderation.suggestion && (
                <div
                  className="px-3 py-2.5 rounded-xl text-xs leading-relaxed"
                  style={{
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-sub)',
                  }}
                >
                  {moderation.suggestion}
                </div>
              )}
            </div>
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
          {/* 미니 카드 */}
          <div className="rounded-xl overflow-hidden"
               style={{border: '1px solid var(--color-border)', maxWidth: 200, margin: '0 auto'}}>
            <div
              className="relative"
              style={{aspectRatio: '4/5', background: form.team ? '#1A3051' : 'var(--color-surface-raised)'}}
            >
              <div className="absolute inset-0"
                   style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)'}}/>
              <span
                className="absolute inset-0 flex items-center justify-center select-none"
                style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 56, color: 'rgba(255,255,255,.18)'}}
              >
                {form.jerseyNumber || '?'}
              </span>
              {form.grade && (
                <span
                  className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: form.grade === 'S' ? 'rgba(255,184,0,.2)' : 'rgba(255,255,255,.2)',
                    color: '#fff',
                  }}
                >
                  {form.grade}급
                </span>
              )}
            </div>
            <div className="p-2.5" style={{background: 'var(--color-surface)'}}>
              <p className="text-xs font-semibold truncate" style={{color: 'var(--color-text-main)'}}>
                {form.title || '상품명을 입력해주세요'}
              </p>
              <p className="text-sm font-bold mt-1"
                 style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                {form.price ? formatPrice(Number(form.price)) : '₩0'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ListingCreatePage() {
  const navigate = useNavigate()
  
  const [form, setForm] = useState<ListingForm>({
    title: '', sport: 'SOCCER', team: '', jerseyNumber: '',
    size: 'M', grade: 'A', deliveryType: 'BOTH', price: '', description: '', tradeArea: '',
  })
  const [images, setImages] = useState<DraftImageItem[]>([])
  const [draftModeration, setDraftModeration] = useState<DraftModeration | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)   // 등록 실패 메시지
  // 초안 관련 상태
  const [draftLoaded, setDraftLoaded] = useState(false)   // 초안 복원 알림 표시 여부
  const [draftSaving, setDraftSaving] = useState(false)   // 저장 중 표시
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 인증 상태 (draft API 호출 여부 결정)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  
  const update = useCallback(<K extends keyof ListingForm>(key: K, val: ListingForm[K]) => {
    setForm(prev => ({...prev, [key]: val}))
  }, [])
  
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

    const nextItems: DraftImageItem[] = files.map((file, index) => ({
      id: `local-${Date.now()}-${index}`,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: null,
      file,
    }))

    setImages((prev) => [...prev, ...nextItems])

    try {
      const uploadedUrls = await uploadListingImages(files)
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
  
  const canSubmit = !!form.title && !!form.price && images.some((image) => !!image.uploadedUrl)
  
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
          {/* 초안 복원 알림 */}
          {draftLoaded && (
            <div
              className="mt-3 flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
              style={{background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)'}}
            >
              <span style={{color: 'var(--color-text-sub)'}}>이전에 작성하던 초안이 복원되었습니다.</span>
              <button
                onClick={() => setDraftLoaded(false)}
                className="ml-3 flex-shrink-0"
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
                  placeholder="예: 맨체스터 유나이티드 23/24 홈 어센틱"
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
                    placeholder="예: 맨체스터 유나이티드"
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
            
            {/* AI 패널 (모바일: 인라인) */}
            <div className="xl:hidden">
              <AiPanel form={form} onApply={applyAiDescription} images={images} moderation={draftModeration}/>
            </div>
            
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
            
            {!canSubmit && !submitError && (
              <p className="text-xs text-center" style={{color: 'var(--color-text-hint)'}}>
                상품명, 가격, 사진을 입력해야 등록할 수 있습니다.
              </p>
            )}
          </div>
          
          {/* ── 우: AI 패널 (데스크탑) ───────────────────────────────── */}
          <div className="hidden xl:block w-72 flex-shrink-0">
            <div className="sticky top-20 flex flex-col gap-4">
              <AiPanel form={form} onApply={applyAiDescription} images={images} moderation={draftModeration}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
