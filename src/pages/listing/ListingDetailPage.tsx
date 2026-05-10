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
 * 데이터: 목 데이터 (추후 useQuery + /listing/:id 연동)
 */
import { formatPrice } from '../../utils/format'
import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Heart, MessageCircle, Share2, ChevronLeft, ChevronRight,
  Shield, Truck, MapPin, Clock, X, ChevronDown, Package,
  Flag, MoreHorizontal,
} from 'lucide-react'
import type { ListingItem, Grade, PostStatus } from '../../types/listing'
import ReportModal from '../../components/ui/ReportModal'
import { createChatRoom } from '../../features/chat/api/chatApi'

// ── 타입 확장 ─────────────────────────────────────────────────────────────────

interface ListingDetail extends ListingItem {
  description: string
  imageColors: string[]     // 이미지 대표 색 (썸네일 플레이스홀더)
  status: PostStatus
  viewCount: number
  tradeArea: string
  seller: {
    id: number
    nickname: string
    mannerScore: number
    tradeCount: number
    joinedAt: string
    avatarColor: string
  }
}

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

const MOCK_DETAIL: ListingDetail = {
  id: 1,
  title: '맨체스터 유나이티드 23/24 홈 어센틱 7번',
  team: '맨체스터 유나이티드',
  league: 'EPL',
  price: 78000,
  grade: 'S',
  size: 'M',
  deliveryType: 'BOTH',
  jerseyColor: '#B5222B',
  jerseyNumber: '7',
  likedCount: 24,
  isLiked: false,
  sport: 'SOCCER',
  timeAgo: '2시간 전',
  description:
    '맨유 23/24 홈 어센틱 유니폼입니다.\n\n구매 후 5회 이내 착용한 제품으로 상태 S급입니다.\n세탁은 손세탁만 진행하였으며 탈색·오염 전혀 없습니다.\n어센틱 태그, 보증 스티커 모두 부착 상태입니다.\n\n박스 없이 발송하며 안전하게 포장해 드립니다.\n직거래는 역삼역 인근 가능합니다.',
  imageColors: ['#B5222B', '#8B0000', '#C8102E', '#a30000'],
  status: 'ON_SALE',
  viewCount: 312,
  tradeArea: '강남구 역삼동',
  seller: {
    id: 42,
    nickname: 'uniform_king',
    mannerScore: 92,
    tradeCount: 47,
    joinedAt: '2023년 3월',
    avatarColor: '#1A3051',
  },
}

const MOCK_RELATED: ListingItem[] = [
  { id:2,  title:'리버풀 FC 07/08 어웨이 레플리카',   team:'리버풀 FC',     league:'EPL',    price:55000,  grade:'A', size:'L', deliveryType:'BOTH',     jerseyColor:'#C8102E', jerseyNumber:'10', likedCount:18, isLiked:true,  sport:'SOCCER', timeAgo:'5시간 전' },
  { id:4,  title:'레알 마드리드 21/22 서드 킷',       team:'레알 마드리드', league:'라리가', price:92000,  grade:'S', size:'S', deliveryType:'DIRECT',   jerseyColor:'#6B0078', jerseyNumber:'9',  likedCount:41, isLiked:false, sport:'SOCCER', timeAgo:'3일 전' },
  { id:6,  title:'바르셀로나 22/23 어웨이 레플리카',  team:'FC 바르셀로나', league:'라리가', price:48000,  grade:'A', size:'M', deliveryType:'DELIVERY', jerseyColor:'#A50044', jerseyNumber:'10', likedCount:33, isLiked:true,  sport:'SOCCER', timeAgo:'4시간 전' },
  { id:10, title:'PSG 23/24 홈 어센틱',              team:'파리 생제르맹', league:'리그앙', price:110000, grade:'S', size:'L', deliveryType:'DELIVERY', jerseyColor:'#004170', jerseyNumber:'7',  likedCount:55, isLiked:false, sport:'SOCCER', timeAgo:'1일 전' },
]

// ── 상수/유틸 ─────────────────────────────────────────────────────────────────

const GRADE_META: Record<Grade, { label: string; bg: string; text: string; border: string }> = {
  S: { label: 'S급', bg: 'rgba(255,184,0,.12)',  text: '#B38000', border: 'rgba(255,184,0,.35)' },
  A: { label: 'A급', bg: 'rgba(0,33,71,.08)',    text: '#002147', border: 'rgba(0,33,71,.25)'  },
  B: { label: 'B급', bg: 'rgba(90,106,122,.10)', text: '#5A6A7A', border: 'rgba(90,106,122,.3)' },
  C: { label: 'C급', bg: 'rgba(255,149,0,.10)',  text: '#CC7700', border: 'rgba(255,149,0,.3)'  },
}

const STATUS_META: Record<PostStatus, { label: string; bg: string; text: string }> = {
  ON_SALE:  { label: '판매중',   bg: 'rgba(0,179,110,.10)',  text: 'var(--color-success)' },
  RESERVED: { label: '예약중',   bg: 'rgba(255,149,0,.10)',  text: 'var(--color-warning)' },
  SOLD:     { label: '판매완료', bg: 'rgba(90,106,122,.10)', text: 'var(--color-text-sub)' },
  HIDDEN:   { label: '숨김',     bg: 'rgba(90,106,122,.10)', text: 'var(--color-text-sub)' },
  DELETED:  { label: '삭제됨',   bg: 'rgba(255,46,77,.10)',  text: 'var(--color-accent)' },
}

function mannerColor(score: number) {
  if (score >= 90) return 'var(--color-success)'
  if (score >= 70) return 'var(--color-gold)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-error)'
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 이미지 갤러리 */
function ImageGallery({ colors, jerseyNumber }: { colors: string[]; jerseyNumber?: string }) {
  const [idx, setIdx] = useState(0)

  function prev() { setIdx(i => (i - 1 + colors.length) % colors.length) }
  function next() { setIdx(i => (i + 1) % colors.length) }

  return (
    <div className="flex flex-col gap-3">
      {/* 메인 이미지 */}
      <div
        className="relative rounded-2xl overflow-hidden select-none"
        style={{ aspectRatio: '4/5', background: colors[idx] ?? '#1A3051' }}
      >
        {/* 속도선 패턴 */}
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 18px)' }}
        />
        {/* 등번호 워터마크 */}
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 160, color: 'rgba(255,255,255,.13)', letterSpacing: '0.04em' }}
        >
          {jerseyNumber ?? '-'}
        </span>

        {/* 이전/다음 */}
        {colors.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,.85)' }}
              aria-label="이전 이미지"
            >
              <ChevronLeft size={18} color="#0D1B2A" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,.85)' }}
              aria-label="다음 이미지"
            >
              <ChevronRight size={18} color="#0D1B2A" />
            </button>
          </>
        )}

        {/* 인덱스 dot */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {colors.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{ width: i === idx ? 20 : 6, height: 6, background: i === idx ? '#fff' : 'rgba(255,255,255,.45)' }}
              aria-label={`이미지 ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* 썸네일 열 */}
      <div className="flex gap-2">
        {colors.map((c, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className="rounded-xl overflow-hidden flex-shrink-0 transition-all"
            style={{
              width: 64, aspectRatio: '4/5', background: c,
              outline: i === idx ? '2px solid var(--color-accent)' : '2px solid transparent',
              outlineOffset: 2,
            }}
            aria-label={`썸네일 ${i + 1}`}
          >
            <div className="w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.08) 0 2px, transparent 2px 12px)' }} />
          </button>
        ))}
      </div>
    </div>
  )
}

/** 등급 가이드 팝업 */
function GradeGuide({ onClose }: { onClose: () => void }) {
  const grades: { key: Grade; desc: string }[] = [
    { key: 'S', desc: '미착용 또는 1~2회 이내 착용. 세탁 없음. 태그 및 스티커 완전 보존.' },
    { key: 'A', desc: '5회 이하 착용 후 세탁. 오염·탈색·손상 없음. 태그 있거나 없음.' },
    { key: 'B', desc: '10회 이하 착용. 미세 보풀·가벼운 세탁 자국 가능. 착용감에 영향 없음.' },
    { key: 'C', desc: '장기 착용 또는 수회 세탁. 보풀·색 바램 일부 있음. 기능 이상 없음.' },
  ]
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,27,42,.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{ background: 'var(--color-surface)', boxShadow: '0 24px 48px -8px rgba(0,33,71,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-surface-raised)' }}
          aria-label="닫기"
        >
          <X size={16} color="var(--color-text-sub)" />
        </button>
        <h3 className="text-base font-bold mb-4" style={{ color: 'var(--color-text-main)' }}>컨디션 등급 기준</h3>
        <div className="flex flex-col gap-3">
          {grades.map(({ key, desc }) => {
            const m = GRADE_META[key]
            return (
              <div key={key} className="flex gap-3 items-start">
                <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: m.bg, color: m.text, border: `1px solid ${m.border}`, fontFamily: "'Giants','Pretendard',sans-serif" }}>
                  {m.label}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>{desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** 판매자 카드 */
function SellerCard({ seller, listingId }: { seller: ListingDetail['seller']; listingId: number }) {
  const mc = mannerColor(seller.mannerScore)
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
      const room = await createChatRoom({ postId: listingId })
      navigate(`/chat/${room.chatId}`)
    } catch (err) {
      console.error('[SellerCard] 채팅방 생성 실패:', err)
      // API 연동 전 fallback — /chat 목록으로 이동
      navigate('/chat')
    } finally {
      setIsChatLoading(false)
    }
  }, [listingId, isChatLoading, navigate])

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px -2px rgba(0,33,71,.08)' }}>
      <h4 className="text-xs font-semibold tracking-widest mb-4" style={{ color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}>SELLER</h4>
      <div className="flex items-center gap-4">
        {/* 아바타 */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
          style={{ background: seller.avatarColor, fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '0.06em' }}
        >
          {seller.nickname.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm mb-0.5 truncate" style={{ color: 'var(--color-text-main)' }}>{seller.nickname}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-hint)' }}>{seller.joinedAt} 가입 · 거래 {seller.tradeCount}건</div>
        </div>
        {/* 매너점수 */}
        <div className="flex flex-col items-center flex-shrink-0">
          <span className="text-xs mb-0.5" style={{ color: 'var(--color-text-hint)' }}>매너점수</span>
          <span className="text-lg font-bold" style={{ color: mc, fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}>{seller.mannerScore}</span>
          <div className="w-12 h-1.5 rounded-full mt-1" style={{ background: 'var(--color-border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${seller.mannerScore}%`, background: mc }} />
          </div>
        </div>
      </div>
      {/* CTA — createChatRoom API 호출 후 해당 채팅방으로 이동 */}
      <button
        onClick={handleChatClick}
        disabled={isChatLoading}
        className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
        style={{ background: 'var(--color-primary)', color: '#fff' }}
      >
        {isChatLoading
          ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          : <MessageCircle size={16} />
        }
        {isChatLoading ? '채팅방 연결 중...' : '채팅으로 문의하기'}
      </button>
      <button className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-sub)' }}>
        판매자 다른 상품 보기
      </button>
    </div>
  )
}

/** 관련 상품 카드 */
function RelatedCard({ item }: { item: ListingItem }) {
  const m = GRADE_META[item.grade]
  return (
    <Link
      to={`/listing/${item.id}`}
      className="block rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <div className="relative" style={{ aspectRatio: '4/5', background: item.jerseyColor ?? '#1A3051' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)' }} />
        <span className="absolute inset-0 flex items-center justify-center select-none" style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif", fontSize: 64, color: 'rgba(255,255,255,.14)' }}>
          {item.jerseyNumber}
        </span>
        <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: m.bg, color: m.text, border: `1px solid ${m.border}`, fontFamily: "'Giants','Pretendard',sans-serif" }}>
          {m.label}
        </span>
      </div>
      <div className="p-2.5" style={{ background: 'var(--color-surface)' }}>
        <p className="text-xs font-semibold leading-snug truncate" style={{ color: 'var(--color-text-main)' }}>{item.title}</p>
        <p className="text-sm font-bold mt-1" style={{ color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}>
          {formatPrice(item.price)}
        </p>
      </div>
    </Link>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  void id // 추후 useQuery 연동 시 사용

  const [listing] = useState<ListingDetail>(MOCK_DETAIL)
  const [liked, setLiked] = useState(listing.isLiked)
  const [likedCount, setLikedCount] = useState(listing.likedCount)
  const [showGradeGuide, setShowGradeGuide] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [reportMenuOpen, setReportMenuOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  function toggleLike() {
    setLiked(prev => {
      setLikedCount(c => c + (prev ? -1 : 1))
      return !prev
    })
  }

  const gradeMeta = GRADE_META[listing.grade]
  const statusMeta = STATUS_META[listing.status]
  const descLines = listing.description.split('\n')
  const isLong = descLines.length > 5
  const visibleDesc = showMore ? listing.description : descLines.slice(0, 5).join('\n')

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {showGradeGuide && <GradeGuide onClose={() => setShowGradeGuide(false)} />}
      {reportMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setReportMenuOpen(false)} />}
      {reportModalOpen && (
        <ReportModal
          targetType="POST"
          targetId={listing.id}
          onClose={() => setReportModalOpen(false)}
        />
      )}

      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6 md:py-10">
        {/* 뒤로가기 */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-[var(--color-accent)]"
          style={{ color: 'var(--color-text-sub)' }}
        >
          <ChevronLeft size={16} />목록으로
        </Link>

        <div className="flex flex-col lg:flex-row gap-8 xl:gap-14">
          {/* 좌: 이미지 갤러리 */}
          <div className="w-full lg:w-[420px] xl:w-[480px] flex-shrink-0">
            <ImageGallery colors={listing.imageColors} jerseyNumber={listing.jerseyNumber} />
          </div>

          {/* 우: 상품 정보 */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">

            {/* 상태 + 신고/공유 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: statusMeta.bg, color: statusMeta.text, fontFamily: "'Giants','Pretendard',sans-serif" }}
                >
                  {statusMeta.label}
                </span>
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-hint)' }}>
                  <Clock size={11} />{listing.timeAgo} · 조회 {listing.viewCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: 'var(--color-text-sub)' }} aria-label="공유">
                  <Share2 size={16} />
                </button>
                <div className="relative">
                  <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: 'var(--color-text-sub)' }} onClick={() => setReportMenuOpen(p => !p)} aria-label="더보기">
                    <MoreHorizontal size={16} />
                  </button>
                  {reportMenuOpen && (
                    <div className="absolute right-0 top-10 z-50 rounded-xl py-1 w-32 shadow-lg" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--color-surface-raised)]" style={{ color: 'var(--color-accent)' }} onClick={() => { setReportMenuOpen(false); setReportModalOpen(true) }}>
                        <Flag size={14} />신고하기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 제목 */}
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-hint)' }}>
                {listing.league} · {listing.team}
              </p>
              <h1 className="text-xl md:text-2xl font-bold leading-snug" style={{ color: 'var(--color-text-main)' }}>
                {listing.title}
              </h1>
            </div>

            {/* 가격 */}
            <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}>
              {formatPrice(listing.price)}
            </div>

            {/* 메타 그리드 */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl" style={{ background: 'var(--color-surface-raised)' }}>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-hint)' }}>컨디션</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-full" style={{ background: gradeMeta.bg, color: gradeMeta.text, border: `1px solid ${gradeMeta.border}`, fontFamily: "'Giants','Pretendard',sans-serif" }}>
                    {gradeMeta.label}
                  </span>
                  <button className="text-xs underline" style={{ color: 'var(--color-text-hint)' }} onClick={() => setShowGradeGuide(true)}>
                    기준 보기
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-hint)' }}>사이즈</p>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}>{listing.size}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-hint)' }}>거래방식</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {listing.deliveryType !== 'DIRECT' && (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-sub)' }}><Truck size={12} />택배</span>
                  )}
                  {listing.deliveryType !== 'DELIVERY' && (
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-sub)' }}><MapPin size={12} />직거래</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-hint)' }}>거래지역</p>
                <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>{listing.tradeArea}</p>
              </div>
            </div>

            {/* 에스크로 배너 */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(0,33,71,.06)', border: '1px solid rgba(0,33,71,.12)' }}>
              <Shield size={18} color="var(--color-primary)" className="flex-shrink-0" />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
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
                <Heart size={18} fill={liked ? 'var(--color-accent)' : 'none'} color={liked ? 'var(--color-accent)' : 'currentColor'} />
                <span style={{ fontFamily: "'IAMAPLAYER',Giants,sans-serif" }}>{likedCount}</span>
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-colors"
                style={{ background: listing.status === 'SOLD' ? 'var(--color-text-hint)' : 'var(--color-accent)' }}
                disabled={listing.status === 'SOLD'}
              >
                <Package size={16} />
                {listing.status === 'SOLD' ? '판매 완료' : '거래 시작하기'}
              </button>
            </div>

            {/* 상품 설명 */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text-main)' }}>상품 설명</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-sub)' }}>
                {visibleDesc}
              </p>
              {isLong && (
                <button
                  className="mt-3 flex items-center gap-1 text-xs font-semibold"
                  style={{ color: 'var(--color-accent)' }}
                  onClick={() => setShowMore(p => !p)}
                >
                  {showMore ? '접기' : '더보기'}
                  <ChevronDown size={14} style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
              )}
            </div>

            {/* 판매자 카드 (데스크탑: 인라인) */}
            <div className="hidden lg:block">
              <SellerCard seller={listing.seller} listingId={listing.id} />
            </div>
          </div>
        </div>

        {/* 판매자 카드 (모바일: 하단) */}
        <div className="mt-6 lg:hidden">
          <SellerCard seller={listing.seller} listingId={listing.id} />
        </div>

        {/* 관련 상품 */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-base font-bold"
              style={{ color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif", letterSpacing: '0.04em' }}
            >
              RELATED ITEMS
            </h2>
            <Link
              to="/search?sport=SOCCER"
              className="text-xs font-semibold flex items-center gap-1 transition-colors hover:text-[var(--color-accent)]"
              style={{ color: 'var(--color-text-hint)' }}
            >
              더보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MOCK_RELATED.map(item => <RelatedCard key={item.id} item={item} />)}
          </div>
        </section>
      </div>

      {/* 모바일 하단 고정 CTA */}
      <div
        className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 md:hidden px-4 py-3"
        style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', boxShadow: '0 -4px 12px -2px rgba(0,33,71,.10)' }}
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
            <Heart size={20} fill={liked ? 'var(--color-accent)' : 'none'} color={liked ? 'var(--color-accent)' : 'var(--color-text-sub)'} />
          </button>
          <button className="flex-1 py-3 rounded-xl font-bold text-sm text-white" style={{ background: 'var(--color-accent)' }}>
            거래 시작하기
          </button>
        </div>
      </div>
    </div>
  )
}
