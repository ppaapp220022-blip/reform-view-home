/**
 * ListingDetailPage — 판매글 상세 (Screen 2)
 *
 * 구성:
 *   ImageGallery     — 이미지 갤러리 (색상 플레이스홀더)
 *   ProductInfo      — 제목, 등급, 가격, 사이즈, 거래방식, 찜 버튼
 *   GradeGuide       — 등급 기준 팝업 (S/A/B/C 설명)
 *   TradeStatusBadge — 거래 상태 (ON_SALE / RESERVED / SOLD)
 *   SellerCard       — 판매자 프로필 + 매너점수 + 채팅 버튼
 *   RelatedListings  — 같은 종목 관련 상품 4개
 *
 * 데이터: useQuery + /api/listings/:id 연동
 *   - riskLevel(LOW/MID/HIGH) 배너 표시
 */
import {formatPrice} from '../../utils/format'
import {resolveImageUrl} from '../../utils/image'
import React, {useCallback, useState} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {useMutation, useQuery} from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Package,
  Pencil,
  Share2,
  Shield,
  Truck,
  X,
} from 'lucide-react'
import type {Grade, PostStatus, RiskLevel} from '../../types/listing'
import ReportModal from '../../components/ui/ReportModal'
import {createChatRoom} from '../../features/chat/api/chatApi'
import type {PostCard, SellerBrief} from '../../features/listing/api/listingApi'
import {getListingDetail, getListings, toggleWish} from '../../features/listing/api/listingApi'
import type {TradeDeliveryType} from '../../features/trade/api/tradeApi'
import {createTrade, getMyTrades} from '../../features/trade/api/tradeApi'
import axios from 'axios'
import useAuthStore from '../../store/authStore'

// ── 상수/유틸 (목 데이터 없음 — 실제 API 사용) ────────────────────────────────

// ── 상수/유틸 ─────────────────────────────────────────────────────────────────

const GRADE_META: Record<Grade, { label: string; bg: string; text: string; border: string }> = {
  S: {label: 'S급', bg: 'rgba(255,184,0,.12)', text: '#B38000', border: 'rgba(255,184,0,.35)'},
  A: {label: 'A급', bg: 'rgba(0,33,71,.08)', text: '#002147', border: 'rgba(0,33,71,.25)'},
  B: {label: 'B급', bg: 'rgba(90,106,122,.10)', text: '#5A6A7A', border: 'rgba(90,106,122,.3)'},
  C: {label: 'C급', bg: 'rgba(255,149,0,.10)', text: '#CC7700', border: 'rgba(255,149,0,.3)'},
}

const STATUS_META: Record<PostStatus, { label: string; bg: string; text: string }> = {
  ON_SALE: {label: '판매중', bg: 'rgba(0,179,110,.10)', text: 'var(--color-success)'},
  RESERVED: {label: '예약중', bg: 'rgba(255,149,0,.10)', text: 'var(--color-warning)'},
  SOLD: {label: '판매완료', bg: 'rgba(90,106,122,.10)', text: 'var(--color-text-sub)'},
  HIDDEN: {label: '숨김', bg: 'rgba(90,106,122,.10)', text: 'var(--color-text-sub)'},
  DELETED: {label: '삭제됨', bg: 'rgba(255,46,77,.10)', text: 'var(--color-accent)'},
}


/** AI 사기 탐지 위험도 — MID/HIGH만 배너 표시, LOW는 숨김 */
const RISK_META: Partial<Record<RiskLevel, { label: string; desc: string; bg: string; text: string; icon: string }>> = {
  MID: {
    label: '주의',
    desc: '이 게시글에서 주의가 필요한 내용이 감지되었습니다. 거래 전 꼼꼼히 확인하세요.',
    bg: 'rgba(255,149,0,.08)',
    text: 'var(--color-warning)',
    icon: 'var(--color-warning)',
  },
  HIGH: {
    label: '위험',
    desc: '사기 또는 규정 위반 의심 내용이 감지되었습니다. 플랫폼 외부 결제 요구 시 거래를 중단하세요.',
    bg: 'rgba(255,46,77,.07)',
    text: 'var(--color-accent)',
    icon: 'var(--color-accent)',
  },
}

function mannerColor(score: number) {
  if (score >= 90) return 'var(--color-success)'
  if (score >= 70) return 'var(--color-gold)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-error)'
}

// ── 거래 시작 모달 ────────────────────────────────────────────────────────────

/**
 * TradeStartModal — 거래 방식 선택 후 거래 생성
 * - deliveryType이 BOTH이면 직거래/택배 선택 UI 표시
 * - DIRECT 또는 DELIVERY이면 선택 없이 바로 확인
 * - createTrade API 호출 → 성공 시 onSuccess(tradeId) 콜백
 */
function TradeStartModal({
                           postId,
                           listingDeliveryType,
                           title,
                           price,
                           onClose,
                           onSuccess,
                         }: {
  postId: number
  listingDeliveryType: string
  title: string
  price: number
  onClose: () => void
  onSuccess: (tradeId: number) => void
}) {
  // BOTH이면 구매자가 선택, DIRECT/DELIVERY는 고정
  const defaultType: TradeDeliveryType =
    listingDeliveryType === 'DELIVERY' ? 'DELIVERY' : 'DIRECT'
  const [deliveryType, setDeliveryType] = React.useState<TradeDeliveryType>(defaultType)
  const [error, setError] = React.useState<string | null>(null)
  
  const {mutate: startTrade, isPending} = useMutation({
    mutationFn: () => createTrade({postId, deliveryType}),
    onSuccess(data) {
      onSuccess(data.tradeId)
    },
    onError(err) {
      // 백엔드 ApiResponse.message 또는 data.message 추출
      let msg = '거래 시작 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as { message?: string; data?: { message?: string } } | undefined
        msg = body?.message ?? body?.data?.message ?? msg
      }
      setError(msg)
    },
  })
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background: 'rgba(13,27,42,.5)', backdropFilter: 'blur(4px)'}}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{background: 'var(--color-surface)', boxShadow: '0 24px 48px -8px rgba(0,33,71,.28)'}}
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{background: 'var(--color-surface-raised)'}}
          aria-label="닫기"
        >
          <X size={16} color="var(--color-text-sub)"/>
        </button>
        
        <h3
          className="text-base font-bold mb-1"
          style={{color: 'var(--color-text-main)', fontFamily: "'Giants','Pretendard',sans-serif"}}
        >
          거래 시작하기
        </h3>
        <p className="text-xs mb-5" style={{color: 'var(--color-text-hint)'}}>
          거래 방식을 선택하면 판매자에게 구매 요청이 전달됩니다.
        </p>
        
        {/* 상품 요약 */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl mb-5"
          style={{background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)'}}
        >
          <Package size={18} style={{color: 'var(--color-text-hint)', flexShrink: 0}}/>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{color: 'var(--color-text-main)'}}>{title}</p>
            <p
              className="text-sm font-bold mt-0.5"
              style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
            >
              {formatPrice(price)}
            </p>
          </div>
        </div>
        
        {/* 거래 방식 선택 (BOTH일 때만) */}
        {listingDeliveryType === 'BOTH' && (
          <div className="mb-5">
            <p className="text-xs font-semibold mb-2" style={{color: 'var(--color-text-hint)'}}>거래 방식 선택</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                {type: 'DIRECT' as TradeDeliveryType, label: '직거래', icon: <MapPin size={16}/>},
                {type: 'DELIVERY' as TradeDeliveryType, label: '택배', icon: <Truck size={16}/>},
              ] as const).map(({type, label, icon}) => (
                <button
                  key={type}
                  onClick={() => setDeliveryType(type)}
                  className="flex flex-col items-center gap-1.5 py-4 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    background: deliveryType === type ? 'rgba(0,33,71,.08)' : 'var(--color-surface-raised)',
                    color: deliveryType === type ? 'var(--color-primary)' : 'var(--color-text-sub)',
                    border: deliveryType === type ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* 선택된 방식 표시 (DIRECT/DELIVERY 단일 방식) */}
        {listingDeliveryType !== 'BOTH' && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-5"
            style={{background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)'}}
          >
            {listingDeliveryType === 'DELIVERY'
              ? <Truck size={15} style={{color: 'var(--color-text-sub)'}}/>
              : <MapPin size={15} style={{color: 'var(--color-text-sub)'}}/>}
            <p className="text-sm font-semibold" style={{color: 'var(--color-text-sub)'}}>
              {listingDeliveryType === 'DELIVERY' ? '택배 거래' : '직거래'}
            </p>
          </div>
        )}
        
        {/* 에스크로 안내 */}
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-5"
          style={{background: 'rgba(0,33,71,.05)', border: '1px solid rgba(0,33,71,.12)'}}
        >
          <Shield size={13} style={{color: 'var(--color-primary)', flexShrink: 0, marginTop: 2}}/>
          <p className="text-xs leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
            RE:FORM 에스크로 — 판매자 수락 후 결제가 진행됩니다.
          </p>
        </div>
        
        {/* 에러 메시지 */}
        {error && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-4"
            style={{background: 'rgba(255,46,77,.08)', border: '1px solid rgba(255,46,77,.2)'}}
          >
            <AlertCircle size={13} style={{color: 'var(--color-accent)', flexShrink: 0, marginTop: 2}}/>
            <p className="text-xs" style={{color: 'var(--color-accent)'}}>{error}</p>
          </div>
        )}
        
        {/* 거래 시작 버튼 */}
        <button
          onClick={() => startTrade()}
          disabled={isPending}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{background: 'var(--color-accent)'}}
        >
          {isPending
            ? <><Loader2 size={16} className="animate-spin"/>요청 중...</>
            : <><Package size={16}/>구매 요청 보내기</>}
        </button>
        
        <button
          onClick={onClose}
          className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{background: 'var(--color-surface-raised)', color: 'var(--color-text-sub)'}}
        >
          취소
        </button>
      </div>
    </div>
  )
}


// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 이미지 갤러리 */
/** 팀별 색상 폴백 (실제 이미지 없을 때 사용) */
const FALLBACK_COLORS = ['#B5222B', '#1A3051', '#034694', '#1A7A40', '#A50044', '#6B0078']

function ImageGallery({urls, fallbackColor = '#1A3051'}: { urls: string[]; fallbackColor?: string }) {
  const [idx, setIdx] = useState(0)
  const total = urls.length || 1
  
  function prev() {
    setIdx(i => (i - 1 + total) % total)
  }
  
  function next() {
    setIdx(i => (i + 1) % total)
  }
  
  return (
    <div className="flex flex-col gap-3">
      {/* 메인 이미지 */}
      <div
        className="relative rounded-2xl overflow-hidden select-none"
        style={{aspectRatio: '4/5', background: fallbackColor}}
      >
        {urls.length > 0 && resolveImageUrl(urls[idx]) ? (
          <img
            src={resolveImageUrl(urls[idx])!}
            alt={`상품 이미지 ${idx + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              // 이미지 로드 실패(ERR_NAME_NOT_RESOLVED 등) 시 숨김 처리
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 18px)'}}
            />
            <span
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-20 text-9xl"
              style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>?</span>
          </>
        )}
        
        {/* 이전/다음 */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{background: 'rgba(255,255,255,.85)'}}
              aria-label="이전 이미지"
            >
              <ChevronLeft size={18} color="#0D1B2A"/>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{background: 'rgba(255,255,255,.85)'}}
              aria-label="다음 이미지"
            >
              <ChevronRight size={18} color="#0D1B2A"/>
            </button>
          </>
        )}
        
        {/* 인덱스 dot — urls 길이 기반으로 렌더링 */}
        {total > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {Array.from({length: total}, (_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="rounded-full transition-all"
                style={{width: i === idx ? 20 : 6, height: 6, background: i === idx ? '#fff' : 'rgba(255,255,255,.45)'}}
                aria-label={`이미지 ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* 썸네일 열 — 실제 이미지가 있을 때만 표시 */}
      {urls.length > 1 && (
        <div className="flex gap-2">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-xl overflow-hidden flex-shrink-0 transition-all"
              style={{
                width: 64, aspectRatio: '4/5', background: fallbackColor,
                outline: i === idx ? '2px solid var(--color-accent)' : '2px solid transparent',
                outlineOffset: 2,
              }}
              aria-label={`썸네일 ${i + 1}`}
            >
              {resolveImageUrl(url) && (
                <img
                  src={resolveImageUrl(url)!}
                  alt={`썸네일 ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** 등급 가이드 팝업 */
function GradeGuide({onClose}: { onClose: () => void }) {
  const grades: { key: Grade; desc: string }[] = [
    {key: 'S', desc: '미착용 또는 1~2회 이내 착용. 세탁 없음. 태그 및 스티커 완전 보존.'},
    {key: 'A', desc: '5회 이하 착용 후 세탁. 오염·탈색·손상 없음. 태그 있거나 없음.'},
    {key: 'B', desc: '10회 이하 착용. 미세 보풀·가벼운 세탁 자국 가능. 착용감에 영향 없음.'},
    {key: 'C', desc: '장기 착용 또는 수회 세탁. 보풀·색 바램 일부 있음. 기능 이상 없음.'},
  ]
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background: 'rgba(13,27,42,.45)', backdropFilter: 'blur(4px)'}}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{background: 'var(--color-surface)', boxShadow: '0 24px 48px -8px rgba(0,33,71,.25)'}}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{background: 'var(--color-surface-raised)'}}
          aria-label="닫기"
        >
          <X size={16} color="var(--color-text-sub)"/>
        </button>
        <h3 className="text-base font-bold mb-4" style={{color: 'var(--color-text-main)'}}>컨디션 등급 기준</h3>
        <div className="flex flex-col gap-3">
          {grades.map(({key, desc}) => {
            const m = GRADE_META[key]
            return (
              <div key={key} className="flex gap-3 items-start">
                <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full" style={{
                  background: m.bg,
                  color: m.text,
                  border: `1px solid ${m.border}`,
                  fontFamily: "'Giants','Pretendard',sans-serif"
                }}>
                  {m.label}
                </span>
                <p className="text-sm leading-relaxed" style={{color: 'var(--color-text-sub)'}}>{desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** 판매자 카드 */
function SellerCard({seller, listingId}: { seller: SellerBrief; listingId: number }) {
  const mc = mannerColor(Number(seller.mannerScore) * 20)
  const navigate = useNavigate()
  const [isChatLoading, setIsChatLoading] = useState(false)
  
  /**
   * 채팅하기 클릭 핸들러
   * 1. createChatRoom({ postId: listingId }) 호출 → 채팅방 생성 or 기존 채팅방 반환
   * 2. 반환된 chatId로 /chat/{chatId} 이동
   * 백엔드: POST /api/chats, 이미 채팅방 있으면 기존 방 반환 (idempotent)
   */
  const handleChatClick = useCallback(async () => {
    if (isChatLoading) return
    setIsChatLoading(true)
    try {
      const room = await createChatRoom({postId: listingId})
      navigate(`/chat?roomId=${room.chatId}`)
    } catch (err) {
      console.error('[SellerCard] 채팅방 생성 실패:', err)
      // API 연동 전 fallback — /chat 목록으로 이동
      navigate('/chat')
    } finally {
      setIsChatLoading(false)
    }
  }, [listingId, isChatLoading, navigate])
  
  return (
    <div className="rounded-2xl p-5" style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      boxShadow: '0 4px 12px -2px rgba(0,33,71,.08)'
    }}>
      <h4 className="text-xs font-semibold tracking-widest mb-4"
          style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>SELLER</h4>
      <div className="flex items-center gap-4">
        {/* 아바타 */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
          style={{
            background: 'var(--color-primary)',
            fontFamily: "'IAMAPLAYER',Giants,sans-serif",
            letterSpacing: '0.06em'
          }}
        >
          {seller.nickname.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm mb-0.5 truncate"
               style={{color: 'var(--color-text-main)'}}>{seller.nickname}</div>
          <div className="text-xs" style={{color: 'var(--color-text-hint)'}}>판매자</div>
        </div>
        {/* 매너점수 */}
        <div className="flex flex-col items-center flex-shrink-0">
          <span className="text-xs mb-0.5" style={{color: 'var(--color-text-hint)'}}>매너점수</span>
          <span className="text-lg font-bold" style={{
            color: mc,
            fontFamily: "'IAMAPLAYER',Giants,sans-serif"
          }}>{Number(seller.mannerScore).toFixed(1)}</span>
          <div className="w-12 h-1.5 rounded-full mt-1" style={{background: 'var(--color-border)'}}>
            <div className="h-full rounded-full transition-all"
                 style={{width: `${Math.min(100, Number(seller.mannerScore) * 20)}%`, background: mc}}/>
          </div>
        </div>
      </div>
      {/* CTA — createChatRoom API 호출 후 해당 채팅방으로 이동 */}
      <button
        onClick={handleChatClick}
        disabled={isChatLoading}
        className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
        style={{background: 'var(--color-primary)', color: '#fff'}}
      >
        {isChatLoading
          ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>
          : <MessageCircle size={16}/>
        }
        {isChatLoading ? '채팅방 연결 중...' : '채팅으로 문의하기'}
      </button>
      <button className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{background: 'var(--color-surface-raised)', color: 'var(--color-text-sub)'}}>
        판매자 다른 상품 보기
      </button>
    </div>
  )
}

/** 관련 상품 카드 */
function RelatedCard({item}: { item: PostCard }) {
  const m = GRADE_META[item.grade]
  return (
    <Link
      to={`/listing/${item.postId}`}
      className="block rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{border: '1px solid var(--color-border)'}}
    >
      <div className="relative" style={{aspectRatio: '4/5', background: '#1A3051'}}>
        {resolveImageUrl(item.thumbnailUrl) ? (
          <img
            src={resolveImageUrl(item.thumbnailUrl)!}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="absolute inset-0"
               style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)'}}/>
        )}
        <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{
          background: m.bg,
          color: m.text,
          border: `1px solid ${m.border}`,
          fontFamily: "'Giants','Pretendard',sans-serif"
        }}>
          {m.label}
        </span>
      </div>
      <div className="p-2.5" style={{background: 'var(--color-surface)'}}>
        <p className="text-xs font-semibold leading-snug truncate"
           style={{color: 'var(--color-text-main)'}}>{item.title}</p>
        <p className="text-sm font-bold mt-1"
           style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
          {formatPrice(item.price)}
        </p>
      </div>
    </Link>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ListingDetailPage() {
  const {id} = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postId = Number(id)
  
  // 로그인 유저 정보 — 본인 판매글 여부 판단에 사용
  const {user: authUser} = useAuthStore()
  
  // null = 서버값 미도착 (listing 로드 후 파생값 사용)
  const [localLiked, setLiked] = useState<boolean | null>(null)
  const [localLikedCount, setLikedCount] = useState<number | null>(null)
  
  const [showGradeGuide, setShowGradeGuide] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [reportMenuOpen, setReportMenuOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  
  /* 판매글 상세 조회 */
  const {data: listing, isLoading, isError} = useQuery({
    queryKey: ['listingDetail', postId],
    queryFn: () => getListingDetail(postId),
    enabled: !isNaN(postId),
    staleTime: 30_000,
  })
  
  // 파생값: 낙관적 업데이트 우선, 서버값 폴백 (listing 로드 후 계산해야 TDZ 에러 없음)
  const liked = localLiked ?? listing?.isWished ?? false
  const likedCount = localLikedCount ?? listing?.wishCount ?? 0
  
  /* 관련 상품 조회 (같은 종목, 최대 4개) */
  const {data: relatedData} = useQuery({
    queryKey: ['relatedListings', listing?.sport],
    queryFn: () => getListings({sport: listing?.sport, size: 5, page: 0}),
    enabled: !!listing?.sport,
    staleTime: 60_000,
  })
  const related = (relatedData?.content ?? []).filter(i => i.postId !== postId).slice(0, 4)
  
  // 본인 판매글이면 구매 버튼 대신 수정/거래관리 버튼 표시
  const isOwnListing = authUser !== null && listing?.seller.memberId === authUser.id
  
  // 본인 글일 때 → 해당 게시글에 진행 중인 거래가 있으면 "거래 관리하기" 버튼 표시
  // 백엔드에 /api/trades/by-post 엔드포인트 없으므로 판매자 거래 목록에서 필터
  const {data: sellerTrades} = useQuery({
    queryKey: ['myTrades', 'seller'],
    queryFn: () => getMyTrades({role: 'seller', size: 50, page: 0}),
    enabled: isOwnListing,
    staleTime: 30_000,
  })
  // 이 게시글에 연결된 활성 거래 (있으면 거래 관리 버튼, 없으면 수정 버튼)
  const activeTradeForPost = sellerTrades?.content.find(t => t.post.postId === postId)
  
  /**
   * 찜 토글 핸들러
   * 1. 낙관적 UI 업데이트 (즉시 반영)
   * 2. toggleWish API 호출 → 서버 응답값으로 최종 동기화
   * 3. API 실패 시 이전 상태로 롤백
   */
  async function toggleLike() {
    const prevLiked = liked
    const prevCount = likedCount
    /* 낙관적 업데이트 */
    setLiked(!prevLiked)
    setLikedCount(c => c + (prevLiked ? -1 : 1))
    try {
      const res = await toggleWish(postId)
      setLiked(res.isLiked)
      setLikedCount(res.likeCount)
    } catch {
      /* 실패 시 롤백 */
      setLiked(prevLiked)
      setLikedCount(prevCount)
    }
  }
  
  /* 로딩 */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--color-bg)'}}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{color: 'var(--color-accent)'}}/>
          <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>상품 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  /* 에러 / 404 */
  if (isError || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--color-bg)'}}>
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={32} style={{color: 'var(--color-error)'}}/>
          <p className="text-base font-display font-bold" style={{color: 'var(--color-text-main)'}}>상품을 찾을 수 없습니다</p>
          <Link to="/" className="text-sm font-semibold" style={{color: 'var(--color-accent)'}}>홈으로 돌아가기</Link>
        </div>
      </div>
    )
  }
  
  const gradeMeta = GRADE_META[listing.grade]
  const statusMeta = STATUS_META[listing.status]
  const descLines = (listing.content ?? '').split('\n')
  const isLong = descLines.length > 5
  const visibleDesc = showMore ? listing.content : descLines.slice(0, 5).join('\n')
  
  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      {showGradeGuide && <GradeGuide onClose={() => setShowGradeGuide(false)}/>}
      {tradeModalOpen && listing && (
        <TradeStartModal
          postId={listing.postId}
          listingDeliveryType={listing.deliveryType}
          title={listing.title}
          price={listing.price}
          onClose={() => setTradeModalOpen(false)}
          onSuccess={(tradeId) => navigate(`/trade/${tradeId}`)}
        />
      )}
      {reportMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setReportMenuOpen(false)}/>}
      {reportModalOpen && (
        <ReportModal
          targetType="POST"
          targetId={listing.postId}
          onClose={() => setReportModalOpen(false)}
        />
      )}
      
      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6 md:py-10">
        {/* 뒤로가기 */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-[var(--color-accent)]"
          style={{color: 'var(--color-text-sub)'}}
        >
          <ChevronLeft size={16}/>목록으로
        </Link>
        
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-14">
          {/* 좌: 이미지 갤러리 */}
          <div className="w-full lg:w-[420px] xl:w-[480px] flex-shrink-0">
            <ImageGallery urls={listing.imageUrls ?? []}
                          fallbackColor={FALLBACK_COLORS[listing.postId % FALLBACK_COLORS.length]}/>
          </div>
          
          {/* 우: 상품 정보 */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            
            {/* 상태 + 신고/공유 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: statusMeta.bg,
                    color: statusMeta.text,
                    fontFamily: "'Giants','Pretendard',sans-serif"
                  }}
                >
                  {statusMeta.label}
                </span>
                <span className="text-xs flex items-center gap-1" style={{color: 'var(--color-text-hint)'}}>
                  <Clock size={11}/>{listing.timeAgo} · 조회 {listing.viewCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{color: 'var(--color-text-sub)'}} aria-label="공유">
                  <Share2 size={16}/>
                </button>
                <div className="relative">
                  <button className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{color: 'var(--color-text-sub)'}} onClick={() => setReportMenuOpen(p => !p)}
                          aria-label="더보기">
                    <MoreHorizontal size={16}/>
                  </button>
                  {reportMenuOpen && (
                    <div className="absolute right-0 top-10 z-50 rounded-xl py-1 w-32 shadow-lg"
                         style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--color-surface-raised)]"
                        style={{color: 'var(--color-accent)'}} onClick={() => {
                        setReportMenuOpen(false);
                        setReportModalOpen(true)
                      }}>
                        <Flag size={14}/>신고하기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 제목 */}
            <div>
              <p className="text-xs font-semibold mb-1" style={{color: 'var(--color-text-hint)'}}>
                {listing.sport} · {listing.team}
              </p>
              <h1 className="text-xl md:text-2xl font-bold leading-snug" style={{color: 'var(--color-text-main)'}}>
                {listing.title}
              </h1>
            </div>
            
            {/* AI 사기 탐지 위험도 배너 — MID/HIGH만 노출 */}
            {listing.riskLevel && listing.riskLevel !== 'LOW' && (() => {
              const rm = RISK_META[listing.riskLevel]
              if (!rm) return null
              return (
                <div
                  className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{background: rm.bg, border: `1px solid ${rm.text}33`}}
                >
                  <AlertTriangle size={16} style={{color: rm.icon, flexShrink: 0, marginTop: 2}}/>
                  <div>
                    <span
                      className="text-xs font-bold mr-1.5"
                      style={{color: rm.text}}
                    >
                      [{rm.label}]
                    </span>
                    <span className="text-xs leading-relaxed" style={{color: rm.text}}>
                      {rm.desc}
                    </span>
                  </div>
                </div>
              )
            })()}
            
            {/* 가격 */}
            <div className="text-3xl font-bold"
                 style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
              {formatPrice(listing.price)}
            </div>
            
            {/* 메타 그리드 */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl" style={{background: 'var(--color-surface-raised)'}}>
              <div>
                <p className="text-xs mb-1" style={{color: 'var(--color-text-hint)'}}>컨디션</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-full" style={{
                    background: gradeMeta.bg,
                    color: gradeMeta.text,
                    border: `1px solid ${gradeMeta.border}`,
                    fontFamily: "'Giants','Pretendard',sans-serif"
                  }}>
                    {gradeMeta.label}
                  </span>
                  <button className="text-xs underline" style={{color: 'var(--color-text-hint)'}}
                          onClick={() => setShowGradeGuide(true)}>
                    기준 보기
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs mb-1" style={{color: 'var(--color-text-hint)'}}>사이즈</p>
                <p className="text-sm font-bold" style={{
                  color: 'var(--color-text-main)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif"
                }}>{listing.size}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{color: 'var(--color-text-hint)'}}>거래방식</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {listing.deliveryType !== 'DIRECT' && (
                    <span className="inline-flex items-center gap-1 text-xs"
                          style={{color: 'var(--color-text-sub)'}}><Truck size={12}/>택배</span>
                  )}
                  {listing.deliveryType !== 'DELIVERY' && (
                    <span className="inline-flex items-center gap-1 text-xs"
                          style={{color: 'var(--color-text-sub)'}}><MapPin size={12}/>직거래</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs mb-1" style={{color: 'var(--color-text-hint)'}}>거래지역</p>
                <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>-</p>
              </div>
            </div>
            
            {/* 에스크로 배너 */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                 style={{background: 'rgba(0,33,71,.06)', border: '1px solid rgba(0,33,71,.12)'}}>
              <Shield size={18} color="var(--color-primary)" className="flex-shrink-0"/>
              <p className="text-xs leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
                RE:FORM 에스크로 안전결제로 보호됩니다. 결제금은 구매 확정 전까지 RE:FORM이 보관합니다.
              </p>
            </div>
            
            {/* 거래 CTA */}
            <div className="flex gap-3">
              <button
                onClick={toggleLike}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all flex-shrink-0"
                style={{
                  background: liked ? 'rgba(255,46,77,.08)' : 'var(--color-surface-raised)',
                  color: liked ? 'var(--color-accent)' : 'var(--color-text-sub)',
                  border: liked ? '1px solid rgba(255,46,77,.3)' : '1px solid var(--color-border)',
                }}
                aria-label="찜하기"
              >
                <Heart size={18} fill={liked ? 'var(--color-accent)' : 'none'}
                       color={liked ? 'var(--color-accent)' : 'currentColor'}/>
                <span style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>{likedCount}</span>
              </button>
              {isOwnListing ? (
                /* 본인 판매글 — 진행 중 거래 있으면 거래 관리, 없으면 수정 */
                activeTradeForPost ? (
                  <Link
                    to={`/trade/${activeTradeForPost.tradeId}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-colors hover:text-white"
                    style={{background: 'var(--color-accent)'}}
                  >
                    <Package size={16}/>
                    거래 관리하기
                  </Link>
                ) : (
                  <Link
                    to={`/listing/${listing.postId}/edit`}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-colors hover:text-white"
                    style={{background: 'var(--color-primary)'}}
                  >
                    <Pencil size={16}/>
                    내 판매글 수정하기
                  </Link>
                )
              ) : (
                /* 타인 판매글 — 거래 시작 버튼 */
                <button
                  onClick={() => listing.status === 'ON_SALE' && setTradeModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-colors"
                  style={{background: listing.status === 'ON_SALE' ? 'var(--color-accent)' : 'var(--color-text-hint)'}}
                  disabled={listing.status !== 'ON_SALE'}
                >
                  <Package size={16}/>
                  {listing.status === 'SOLD' ? '판매 완료' : listing.status === 'RESERVED' ? '예약중' : '거래 시작하기'}
                </button>
              )}
            </div>
            
            {/* 상품 설명 */}
            <div className="rounded-2xl p-5"
                 style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
              <h3 className="font-bold text-sm mb-3" style={{color: 'var(--color-text-main)'}}>상품 설명</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{color: 'var(--color-text-sub)'}}>
                {visibleDesc}
              </p>
              {isLong && (
                <button
                  className="mt-3 flex items-center gap-1 text-xs font-semibold"
                  style={{color: 'var(--color-accent)'}}
                  onClick={() => setShowMore(p => !p)}
                >
                  {showMore ? '접기' : '더보기'}
                  <ChevronDown size={14}
                               style={{transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform .2s'}}/>
                </button>
              )}
            </div>
            
            {/* 판매자 카드 (데스크탑: 인라인) */}
            <div className="hidden lg:block">
              <SellerCard seller={listing.seller} listingId={listing.postId}/>
            </div>
          </div>
        </div>
        
        {/* 판매자 카드 (모바일: 하단) */}
        <div className="mt-6 lg:hidden">
          <SellerCard seller={listing.seller} listingId={listing.postId}/>
        </div>
        
        {/* 관련 상품 */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-base font-bold"
              style={{
                color: 'var(--color-text-main)',
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                letterSpacing: '0.04em'
              }}
            >
              RELATED ITEMS
            </h2>
            <Link
              to={`/search?sport=${listing.sport}`}
              className="text-xs font-semibold flex items-center gap-1 transition-colors hover:text-[var(--color-accent)]"
              style={{color: 'var(--color-text-hint)'}}
            >
              더보기 <ChevronRight size={14}/>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {related.map(item => <RelatedCard key={item.postId} item={item}/>)}
          </div>
        </section>
      </div>
      
      {/* 모바일 하단 고정 CTA */}
      <div
        className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 md:hidden px-4 py-3"
        style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          boxShadow: '0 -4px 12px -2px rgba(0,33,71,.10)'
        }}
      >
        <div className="flex gap-3 max-w-screen-sm mx-auto">
          <button
            onClick={toggleLike}
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: liked ? 'rgba(255,46,77,.08)' : 'var(--color-surface-raised)',
              border: liked ? '1px solid rgba(255,46,77,.3)' : '1px solid var(--color-border)',
            }}
            aria-label="찜하기"
          >
            <Heart size={20} fill={liked ? 'var(--color-accent)' : 'none'}
                   color={liked ? 'var(--color-accent)' : 'var(--color-text-sub)'}/>
          </button>
          {isOwnListing ? (
            /* 본인 판매글 — 진행 중 거래 있으면 거래 관리, 없으면 수정 */
            activeTradeForPost ? (
              <Link
                to={`/trade/${activeTradeForPost.tradeId}`}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:text-white"
                style={{background: 'var(--color-accent)'}}
              >
                <Package size={16}/>
                거래 관리하기
              </Link>
            ) : (
              <Link
                to={`/listing/${listing.postId}/edit`}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:text-white"
                style={{background: 'var(--color-primary)'}}
              >
                <Pencil size={16}/>
                내 판매글 수정하기
              </Link>
            )
          ) : (
            /* 타인 판매글 — 거래 시작 버튼 */
            <button
              onClick={() => listing.status === 'ON_SALE' && setTradeModalOpen(true)}
              disabled={listing.status !== 'ON_SALE'}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60"
              style={{background: listing.status === 'ON_SALE' ? 'var(--color-accent)' : 'var(--color-text-hint)'}}
            >
              {listing.status === 'SOLD' ? '판매 완료' : listing.status === 'RESERVED' ? '예약중' : '거래 시작하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
