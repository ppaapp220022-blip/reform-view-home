/**
 * MyPage — 마이페이지 (Screen 7)
 *
 * 탭 구성:
 *   거래 내역   — 구매/판매 목록, 상태별 필터
 *   판매 중     — 내 판매 목록
 *   찜 목록     — 관심 상품
 *   포인트      — 활동 포인트 + 정산 포인트 + 출금 요청
 *   설정        — 회원 정보, 프로필 수정
 *
 * 데이터: 목 데이터 (추후 useQuery + authStore 연동)
 */
import { formatPrice } from '../../utils/format'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Star, Package, Heart, Coins, Settings,
  ChevronRight, TrendingUp, ArrowDownToLine,
  Edit3, Shield, Bell, HelpCircle, LogOut,
  BarChart2, Award, Clock,
} from 'lucide-react'
import type { ListingItem, Grade, TradeStatus } from '../../types/listing'

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

interface TradeRecord {
  id: number
  listingId: number
  title: string
  team: string
  league: string
  price: number
  grade: Grade
  jerseyColor: string
  jerseyNumber: string
  status: TradeStatus
  type: 'buy' | 'sell'
  counterpartNickname: string
  date: string
}

const MOCK_TRADES: TradeRecord[] = [
  { id:1,  listingId:1,  title:'맨체스터 유나이티드 23/24 홈 어센틱', team:'맨유',         league:'EPL',   price:78000,  grade:'S', jerseyColor:'#B5222B', jerseyNumber:'7',  status:'COMPLETED', type:'buy',  counterpartNickname:'jersey_master', date:'2026.04.15' },
  { id:2,  listingId:6,  title:'바르셀로나 22/23 어웨이 레플리카',     team:'바르셀로나',   league:'라리가',price:48000,  grade:'A', jerseyColor:'#A50044', jerseyNumber:'10', status:'CONFIRMED',  type:'buy',  counterpartNickname:'barca_fan99',   date:'2026.04.28' },
  { id:3,  listingId:9,  title:'서울 SK 나이츠 23/24 홈',             team:'SK 나이츠',    league:'KBL',   price:71000,  grade:'A', jerseyColor:'#E3001B', jerseyNumber:'14', status:'IN_PROGRESS',type:'buy',  counterpartNickname:'hoops_seoul',   date:'2026.05.01' },
  { id:4,  listingId:5,  title:'전북 현대 2024 홈 어센틱',            team:'전북 현대',    league:'K리그', price:66000,  grade:'S', jerseyColor:'#1A7A40', jerseyNumber:'27', status:'COMPLETED',  type:'sell', counterpartNickname:'kleague_lover',  date:'2026.04.10' },
  { id:5,  listingId:10, title:'인천 대한항공 점보스 유니폼',          team:'대한항공',     league:'V리그', price:38000,  grade:'C', jerseyColor:'#003087', jerseyNumber:'5',  status:'CANCELED',   type:'sell', counterpartNickname:'volley_pro',     date:'2026.03.20' },
  { id:6,  listingId:12, title:'T1 2024 스프링 유니폼',               team:'T1',          league:'LCK',   price:85000,  grade:'A', jerseyColor:'#C8102E', jerseyNumber:'',   status:'REQUESTED',  type:'sell', counterpartNickname:'faker_fan',      date:'2026.05.07' },
]

const MOCK_MY_LISTINGS: ListingItem[] = [
  { id:7,  title:'두산 베어스 2023 홈 유니폼',   team:'두산 베어스', league:'KBO', price:59000, grade:'S', size:'L', deliveryType:'DELIVERY', jerseyColor:'#002147', jerseyNumber:'36', likedCount:9,  isLiked:false, sport:'BASEBALL', timeAgo:'6시간 전' },
  { id:8,  title:'KT 위즈 2024 어웨이 유니폼',  team:'KT 위즈',    league:'KBO', price:44000, grade:'B', size:'XL', deliveryType:'BOTH',    jerseyColor:'#D50032', jerseyNumber:'22', likedCount:5,  isLiked:false, sport:'BASEBALL', timeAgo:'2일 전' },
  { id:12, title:'T1 2024 스프링 유니폼',        team:'T1',         league:'LCK', price:85000, grade:'A', size:'M',  deliveryType:'BOTH',    jerseyColor:'#C8102E', jerseyNumber:'',   likedCount:72, isLiked:false, sport:'ESPORTS',  timeAgo:'3시간 전' },
]

const MOCK_LIKED: ListingItem[] = [
  { id:2,  title:'리버풀 FC 07/08 어웨이 레플리카',   team:'리버풀 FC',     league:'EPL',    price:55000, grade:'A', size:'L', deliveryType:'BOTH',     jerseyColor:'#C8102E', jerseyNumber:'10', likedCount:18, isLiked:true, sport:'SOCCER', timeAgo:'5시간 전' },
  { id:6,  title:'바르셀로나 22/23 어웨이 레플리카',  team:'FC 바르셀로나', league:'라리가', price:48000, grade:'A', size:'M', deliveryType:'DELIVERY', jerseyColor:'#A50044', jerseyNumber:'10', likedCount:33, isLiked:true, sport:'SOCCER', timeAgo:'4시간 전' },
]

const MOCK_USER = {
  nickname: 'uniform_king',
  email: 'polarprince333@gmail.com',
  mannerScore: 92,
  activityPoints: 3400,
  settlementPoints: 124000,
  pendingPoints: 37000,       // 정산 대기 중인 금액 (출금 불가, 구매 확정 대기)
  tradeCount: 47,
  reviewCount: 39,
  joinedAt: '2023년 3월',
  avatarColor: '#1A3051',
  sports: ['축구', '야구'],
}

const POINT_HISTORY = [
  { id:1, label:'구매 확정 적립',     points:+500,   date:'2026.05.01', type:'earn' as const },
  { id:2, label:'거래 후기 작성',     points:+200,   date:'2026.04.28', type:'earn' as const },
  { id:3, label:'이벤트 보너스',      points:+1000,  date:'2026.04.15', type:'earn' as const },
  { id:4, label:'포인트 사용 (결제)', points:-300,   date:'2026.04.10', type:'use'  as const },
  { id:5, label:'판매 정산',          points:+66000, date:'2026.04.10', type:'settle' as const },
]

// ── 상수/유틸 ─────────────────────────────────────────────────────────────────

const GRADE_META: Record<Grade, { label: string; bg: string; text: string; border: string }> = {
  S: { label:'S급', bg:'rgba(255,184,0,.12)',  text:'#B38000', border:'rgba(255,184,0,.35)' },
  A: { label:'A급', bg:'rgba(0,33,71,.08)',    text:'#002147', border:'rgba(0,33,71,.25)' },
  B: { label:'B급', bg:'rgba(90,106,122,.10)', text:'#5A6A7A', border:'rgba(90,106,122,.3)' },
  C: { label:'C급', bg:'rgba(255,149,0,.10)',  text:'#CC7700', border:'rgba(255,149,0,.3)' },
}

const TRADE_STATUS_META: Record<TradeStatus, { label: string; color: string }> = {
  REQUESTED:   { label:'요청됨',   color:'var(--color-info)' },
  ACCEPTED:    { label:'수락됨',   color:'var(--color-info)' },
  PAID:        { label:'결제완료', color:'var(--color-gold)' },
  IN_PROGRESS: { label:'진행중',   color:'var(--color-warning)' },
  CONFIRMED:   { label:'구매확정', color:'var(--color-success)' },
  COMPLETED:   { label:'거래완료', color:'var(--color-text-hint)' },
  CANCELED:    { label:'취소됨',   color:'var(--color-accent)' },
  DISPUTED:    { label:'분쟁중',   color:'var(--color-accent)' },
}

function mannerColor(score: number) {
  if (score >= 90) return 'var(--color-success)'
  if (score >= 70) return 'var(--color-gold)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-error)'
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 프로필 헤더 카드 */
function ProfileHeader() {
  const mc = mannerColor(MOCK_USER.mannerScore)
  return (
    <div
      className="rounded-2xl p-6 mb-6"
      style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', boxShadow:'0 4px 12px -2px rgba(0,33,71,.08)' }}
    >
      <div className="flex items-center gap-4">
        {/* 아바타 */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ background: MOCK_USER.avatarColor, fontFamily:"'IAMAPLAYER',Giants,sans-serif", letterSpacing:'0.06em' }}
        >
          {MOCK_USER.nickname.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="font-bold text-lg truncate" style={{ color:'var(--color-text-main)' }}>{MOCK_USER.nickname}</h2>
            <button aria-label="프로필 수정">
              <Edit3 size={15} color="var(--color-text-hint)" />
            </button>
          </div>
          <p className="text-xs truncate" style={{ color:'var(--color-text-hint)' }}>{MOCK_USER.email}</p>
          <p className="text-xs mt-0.5" style={{ color:'var(--color-text-hint)' }}>{MOCK_USER.joinedAt} 가입 · {MOCK_USER.sports.join('·')} 관심</p>
        </div>
        {/* 매너점수 */}
        <div className="flex flex-col items-center flex-shrink-0 pl-4" style={{ borderLeft:'1px solid var(--color-border)' }}>
          <Star size={14} color={mc} fill={mc} />
          <span className="text-2xl font-bold mt-1" style={{ color: mc, fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>{MOCK_USER.mannerScore}</span>
          <span className="text-[10px] mt-0.5" style={{ color:'var(--color-text-hint)' }}>매너점수</span>
        </div>
      </div>

      {/* 통계 줄 */}
      <div
        className="grid grid-cols-3 gap-4 mt-5 pt-5"
        style={{ borderTop:'1px solid var(--color-border)' }}
      >
        {[
          { label:'총 거래', value: MOCK_USER.tradeCount, unit:'건' },
          { label:'후기 수', value: MOCK_USER.reviewCount, unit:'개' },
          { label:'활동 포인트', value: MOCK_USER.activityPoints.toLocaleString('ko-KR'), unit:'P' },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center">
            <span className="text-xl font-bold" style={{ color:'var(--color-primary)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>{s.value}</span>
            <span className="text-xs mt-0.5" style={{ color:'var(--color-text-hint)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 거래 내역 탭 */
function TradeHistoryTab() {
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all')

  const filtered = MOCK_TRADES.filter(t => filter === 'all' || t.type === filter)

  return (
    <div>
      {/* 탭 필터 */}
      <div className="flex gap-2 mb-4">
        {[['all','전체'],['buy','구매'],['sell','판매']] .map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k as 'all'|'buy'|'sell')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: filter===k ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filter===k ? '#fff' : 'var(--color-text-sub)',
              border: `1px solid ${filter===k ? 'var(--color-primary)' : 'var(--color-border)'}`,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map(t => {
          const sm = TRADE_STATUS_META[t.status]
          const gm = GRADE_META[t.grade]
          return (
            <Link
              key={t.id}
              to={`/listing/${t.listingId}`}
              className="flex gap-3 p-4 rounded-xl transition-colors"
              style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}
            >
              {/* 썸네일 */}
              <div
                className="w-14 h-14 rounded-xl flex-shrink-0 relative overflow-hidden"
                style={{ background: t.jerseyColor, aspectRatio:'1' }}
              >
                <div className="absolute inset-0" style={{ backgroundImage:'repeating-linear-gradient(115deg, rgba(255,255,255,.08) 0 2px, transparent 2px 12px)' }} />
                <span className="absolute inset-0 flex items-center justify-center" style={{ fontFamily:"'IAMAPLAYER',Giants,sans-serif", fontSize:28, color:'rgba(255,255,255,.2)' }}>
                  {t.jerseyNumber || t.team.slice(0,1)}
                </span>
              </div>
              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: t.type==='buy' ? 'rgba(14,165,233,.1)' : 'rgba(0,179,110,.1)', color: t.type==='buy' ? 'var(--color-info)' : 'var(--color-success)', fontFamily: "'Giants','Pretendard',sans-serif" }}>
                    {t.type === 'buy' ? '구매' : '판매'}
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: sm.color, fontFamily: "'Giants','Pretendard',sans-serif" }}>{sm.label}</span>
                  <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ background: gm.bg, color: gm.text, fontFamily: "'Giants','Pretendard',sans-serif" }}>{gm.label}</span>
                </div>
                <p className="text-sm font-semibold truncate" style={{ color:'var(--color-text-main)' }}>{t.title}</p>
                <p className="text-xs mt-0.5" style={{ color:'var(--color-text-hint)' }}>{t.counterpartNickname} · {t.date}</p>
              </div>
              {/* 가격 */}
              <div className="flex flex-col items-end justify-center flex-shrink-0">
                <span className="font-bold text-sm" style={{ color:'var(--color-primary)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
                  {formatPrice(t.price)}
                </span>
                <ChevronRight size={14} color="var(--color-text-hint)" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/** 내 판매글 탭 */
function MyListingsTab() {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {MOCK_MY_LISTINGS.map(item => {
          const m = GRADE_META[item.grade]
          return (
            <Link
              key={item.id}
              to={`/listing/${item.id}`}
              className="rounded-xl overflow-hidden block"
              style={{ border:'1px solid var(--color-border)', background:'var(--color-surface)' }}
            >
              <div className="relative" style={{ aspectRatio:'4/5', background: item.jerseyColor }}>
                <div className="absolute inset-0" style={{ backgroundImage:'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)' }} />
                <span className="absolute inset-0 flex items-center justify-center select-none" style={{ fontFamily:"'IAMAPLAYER',Giants,sans-serif", fontSize:72, color:'rgba(255,255,255,.14)' }}>
                  {item.jerseyNumber || item.team.slice(0,1)}
                </span>
                <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background:m.bg, color:m.text, border:`1px solid ${m.border}`, fontFamily: "'Giants','Pretendard',sans-serif" }}>
                  {m.label}
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold truncate" style={{ color:'var(--color-text-main)' }}>{item.title}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-bold" style={{ color:'var(--color-primary)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
                    {formatPrice(item.price)}
                  </span>
                  <span className="text-[10px] flex items-center gap-0.5" style={{ color:'var(--color-text-hint)' }}>
                    <Heart size={10} /> {item.likedCount}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}

        {/* 새 글 쓰기 */}
        <Link
          to="/listing/new"
          className="rounded-xl flex flex-col items-center justify-center gap-2 transition-colors"
          style={{ aspectRatio:'4/5', border:'2px dashed var(--color-border)', background:'var(--color-surface-raised)', minHeight:120 }}
        >
          <span className="text-3xl" style={{ color:'var(--color-border-strong)' }}>+</span>
          <span className="text-xs font-medium" style={{ color:'var(--color-text-hint)' }}>판매 등록</span>
        </Link>
      </div>
    </div>
  )
}

/** 찜 목록 탭 */
function LikesTab() {
  const [likes, setLikes] = useState(MOCK_LIKED)

  function unlike(id: number) {
    setLikes(prev => prev.filter(l => l.id !== id))
  }

  if (likes.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <Heart size={40} color="var(--color-border)" />
        <div className="text-center">
          <p className="font-display font-bold" style={{ color:'var(--color-text-main)' }}>찜한 상품이 없어요</p>
          <p className="text-sm mt-1" style={{ color:'var(--color-text-sub)' }}>마음에 드는 유니폼을 찜해두세요.</p>
        </div>
        <Link to="/" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background:'var(--color-primary)' }}>
          홈 피드 보기
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {likes.map(item => {
        const m = GRADE_META[item.grade]
        return (
          <div key={item.id} className="relative">
            <Link
              to={`/listing/${item.id}`}
              className="rounded-xl overflow-hidden block"
              style={{ border:'1px solid var(--color-border)', background:'var(--color-surface)' }}
            >
              <div className="relative" style={{ aspectRatio:'4/5', background: item.jerseyColor }}>
                <div className="absolute inset-0" style={{ backgroundImage:'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)' }} />
                <span className="absolute inset-0 flex items-center justify-center select-none" style={{ fontFamily:"'IAMAPLAYER',Giants,sans-serif", fontSize:72, color:'rgba(255,255,255,.14)' }}>
                  {item.jerseyNumber}
                </span>
                <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background:m.bg, color:m.text, border:`1px solid ${m.border}`, fontFamily: "'Giants','Pretendard',sans-serif" }}>
                  {m.label}
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold truncate" style={{ color:'var(--color-text-main)' }}>{item.title}</p>
                <p className="text-sm font-bold mt-1" style={{ color:'var(--color-primary)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
                  {formatPrice(item.price)}
                </p>
              </div>
            </Link>
            {/* 찜 해제 버튼 */}
            <button
              onClick={() => unlike(item.id)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background:'rgba(255,255,255,.9)' }}
              aria-label="찜 해제"
            >
              <Heart size={15} fill="var(--color-accent)" color="var(--color-accent)" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** 포인트 탭 */
function PointsTab() {
  const [withdrawInput, setWithdrawInput] = useState('')

  return (
    <div className="flex flex-col gap-4">
      {/* 포인트 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 활동 포인트 */}
        <div className="rounded-2xl p-4" style={{ background:'var(--color-primary)', color:'#fff' }}>
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} />
            <span className="text-xs font-semibold opacity-80">활동 포인트</span>
          </div>
          <p className="text-2xl font-bold" style={{ fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
            {MOCK_USER.activityPoints.toLocaleString('ko-KR')}<span className="text-sm ml-1 opacity-70">P</span>
          </p>
          <p className="text-[10px] mt-2 opacity-60">쇼핑·후기·이벤트 적립</p>
        </div>
        {/* 정산 포인트 */}
        <div className="rounded-2xl p-4" style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} color="var(--color-success)" />
            <span className="text-xs font-semibold" style={{ color:'var(--color-text-sub)' }}>정산 포인트</span>
          </div>
          <p className="text-2xl font-bold" style={{ color:'var(--color-success)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
            {'₩'}{MOCK_USER.settlementPoints.toLocaleString('ko-KR')}
          </p>
          <p className="text-[10px] mt-2" style={{ color:'var(--color-text-hint)' }}>판매 대금 (출금 가능)</p>
        </div>
        {/* 정산 대기 포인트 — 백엔드 PointWallet.pending 필드: 구매 확정 전 에스크로 보류 금액 */}
        <div
          className="col-span-2 rounded-2xl p-4 flex items-center justify-between"
          style={{ background:'rgba(255,149,0,.07)', border:'1px solid rgba(255,149,0,.25)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(255,149,0,.15)' }}
            >
              <Clock size={16} color="var(--color-warning)" />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color:'var(--color-text-sub)' }}>정산 대기</p>
              <p className="text-[10px] mt-0.5" style={{ color:'var(--color-text-hint)' }}>구매 확정 후 출금 가능</p>
            </div>
          </div>
          <p className="text-lg font-bold" style={{ color:'var(--color-warning)', fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
            {'₩'}{MOCK_USER.pendingPoints.toLocaleString('ko-KR')}
          </p>
        </div>
      </div>

      {/* 출금 요청 */}
      <div className="rounded-2xl p-5" style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}>
        <h3 className="font-bold text-sm mb-3" style={{ color:'var(--color-text-main)' }}>정산 포인트 출금</h3>
        <div className="flex gap-2 mb-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ border:'1px solid var(--color-border)', background:'var(--color-surface-raised)' }}
          >
            <span className="text-sm" style={{ color:'var(--color-text-hint)' }}>{'₩'}</span>
            <input
              type="number"
              value={withdrawInput}
              onChange={e => setWithdrawInput(e.target.value)}
              placeholder="출금 금액 입력"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color:'var(--color-text-main)' }}
              min={1000}
              max={MOCK_USER.settlementPoints}
            />
          </div>
          <button
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{ background:'var(--color-success)' }}
          >
            출금
          </button>
        </div>
        <p className="text-xs" style={{ color:'var(--color-text-hint)' }}>
          최소 1,000원 · 영업일 1~3일 내 처리 · 수수료 없음
        </p>
      </div>

      {/* 포인트 내역 */}
      <div>
        <h3 className="font-bold text-sm mb-3" style={{ color:'var(--color-text-main)' }}>포인트 내역</h3>
        <div className="flex flex-col gap-2">
          {POINT_HISTORY.map(h => (
            <div
              key={h.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: h.type==='earn' ? 'rgba(0,179,110,.12)' : h.type==='settle' ? 'rgba(255,184,0,.12)' : 'rgba(255,149,0,.12)' }}
                >
                  {h.type === 'settle'
                    ? <ArrowDownToLine size={14} color="var(--color-gold)" />
                    : h.type === 'earn'
                    ? <TrendingUp size={14} color="var(--color-success)" />
                    : <Coins size={14} color="var(--color-warning)" />
                  }
                </div>
                <div>
                  <p className="text-sm" style={{ color:'var(--color-text-main)' }}>{h.label}</p>
                  <p className="text-xs" style={{ color:'var(--color-text-hint)' }}>{h.date}</p>
                </div>
              </div>
              <span
                className="font-bold text-sm"
                style={{
                  color: h.points > 0 ? (h.type === 'settle' ? 'var(--color-success)' : 'var(--color-info)') : 'var(--color-warning)',
                  fontFamily:"'IAMAPLAYER',Giants,sans-serif",
                }}
              >
                {h.points > 0 ? '+' : ''}{h.points > 1000 ? `₩${h.points.toLocaleString('ko-KR')}` : `${h.points}P`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 설정 탭 */
function SettingsTab() {
  const settingItems = [
    { icon: <Edit3 size={18} />,   label:'프로필 수정',       sub:'닉네임·관심종목 변경' },
    { icon: <Shield size={18} />,  label:'보안 설정',         sub:'비밀번호·2FA' },
    { icon: <Bell size={18} />,    label:'알림 설정',         sub:'거래·커뮤니티 알림' },
    { icon: <BarChart2 size={18}/>, label:'내 활동 통계',     sub:'거래·후기·포인트 요약' },
    { icon: <HelpCircle size={18}/>, label:'고객 지원',       sub:'FAQ·1:1 문의' },
  ]

  return (
    <div className="flex flex-col gap-3">
      {settingItems.map(item => (
        <button
          key={item.label}
          className="flex items-center gap-4 px-4 py-3.5 rounded-xl w-full text-left transition-colors"
          style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'var(--color-surface-raised)', color:'var(--color-primary)' }}>
            {item.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color:'var(--color-text-main)' }}>{item.label}</p>
            <p className="text-xs" style={{ color:'var(--color-text-hint)' }}>{item.sub}</p>
          </div>
          <ChevronRight size={16} color="var(--color-text-hint)" />
        </button>
      ))}

      {/* 로그아웃 */}
      <button
        className="flex items-center gap-4 px-4 py-3.5 rounded-xl w-full text-left mt-2 transition-colors"
        style={{ background:'rgba(255,46,77,.06)', border:'1px solid rgba(255,46,77,.2)' }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(255,46,77,.10)', color:'var(--color-accent)' }}>
          <LogOut size={18} />
        </div>
        <span className="text-sm font-semibold" style={{ color:'var(--color-accent)' }}>로그아웃</span>
      </button>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

const TABS = [
  { key:'trades',   label:'거래 내역', icon: <Package size={16} /> },
  { key:'listings', label:'판매 중',   icon: <BarChart2 size={16} /> },
  { key:'likes',    label:'찜 목록',   icon: <Heart size={16} /> },
  { key:'points',   label:'포인트',    icon: <Coins size={16} /> },
  { key:'settings', label:'설정',      icon: <Settings size={16} /> },
]

export default function MyPage() {
  const [activeTab, setActiveTab] = useState('trades')

  return (
    <div className="min-h-screen" style={{ background:'var(--color-bg)' }}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6 md:py-10">
        {/* 페이지 헤더 */}
        <h1
          className="text-2xl font-bold mb-6"
          style={{ color:'var(--color-text-main)', fontFamily:"'IAMAPLAYER',Giants,sans-serif", letterSpacing:'0.04em' }}
        >
          MY PAGE
        </h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 좌: 프로필 + 탭 메뉴 */}
          <div className="lg:w-72 flex-shrink-0">
            <ProfileHeader />

            {/* 탭 네비 (데스크탑: 세로, 모바일: 가로 스크롤) */}
            <div
              className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0"
              style={{ scrollbarWidth:'none' }}
            >
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl whitespace-nowrap flex-shrink-0 lg:flex-shrink transition-all text-sm font-medium w-full text-left"
                  style={{
                    background: activeTab===t.key ? 'var(--color-accent-subtle)' : 'transparent',
                    color: activeTab===t.key ? 'var(--color-accent)' : 'var(--color-text-sub)',
                  }}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 우: 탭 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {activeTab === 'trades'   && <TradeHistoryTab />}
            {activeTab === 'listings' && <MyListingsTab />}
            {activeTab === 'likes'    && <LikesTab />}
            {activeTab === 'points'   && <PointsTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </div>
    </div>
  )
}
