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
import {formatPrice} from '../../utils/format'
import {resolveImageUrl} from '../../utils/image'
import {useRef, useState} from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Link, useNavigate} from 'react-router-dom'
import type {WithdrawItem} from '../../features/payment/api/pointApi'
import {
  cancelWithdraw,
  getMyWithdrawList,
  getPointHistory,
  getPointWallet,
  requestWithdraw
} from '../../features/payment/api/pointApi'
import {
  AlertCircle,
  ArrowDownToLine,
  Award,
  BarChart2,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Coins,
  Edit3,
  Flag,
  Heart,
  HelpCircle,
  LogOut,
  Package,
  Settings,
  Shield,
  Star,
  TrendingUp,
} from 'lucide-react'
import type {Grade, ListingItem, TradeStatus} from '../../types/listing'
import type {ReportItem} from '../../features/report/api/reportApi'
import {getMyReports, REPORT_REASON_LABEL, REPORT_STATUS_LABEL} from '../../features/report/api/reportApi'
import type {SportType} from '../../features/mypage/api/memberApi'
import {
  getInterestSetting,
  getMyProfile,
  saveInterestSetting,
  updateMyProfile,
  uploadProfileImage,
} from '../../features/mypage/api/memberApi'
import useAuthStore from '../../store/authStore'
import {logout as logoutApi} from '../../features/auth/api/authApi'
import type {TradeResponse} from '../../features/trade/api/tradeApi'
import {getMyTrades} from '../../features/trade/api/tradeApi'
import type {PostCard} from '../../features/listing/api/listingApi'
import {getListings} from '../../features/listing/api/listingApi'

// ── 공용 상수 ─────────────────────────────────────────────────────────────────

/** 종목 선택 옵션 */
const SPORT_OPTIONS: { key: SportType; label: string }[] = [
  {key: 'SOCCER', label: '축구'},
  {key: 'BASEBALL', label: '야구'},
  {key: 'BASKETBALL', label: '농구'},
  {key: 'VOLLEYBALL', label: '배구'},
  {key: 'ESPORTS', label: 'e스포츠'},
  {key: 'ETC', label: '기타'},
]

// ── 목 데이터 ─────────────────────────────────────────────────────────────────
const MOCK_LIKED: ListingItem[] = [
  {
    id: 2,
    title: '리버풀 FC 07/08 어웨이 레플리카',
    team: '리버풀 FC',
    price: 55000,
    grade: 'A',
    size: 'L',
    deliveryType: 'BOTH',
    jerseyColor: '#C8102E',
    jerseyNumber: '10',
    likedCount: 18,
    isLiked: true,
    sport: 'SOCCER',
    timeAgo: '5시간 전'
  },
  {
    id: 6,
    title: '바르셀로나 22/23 어웨이 레플리카',
    team: 'FC 바르셀로나',
    price: 48000,
    grade: 'A',
    size: 'M',
    deliveryType: 'DELIVERY',
    jerseyColor: '#A50044',
    jerseyNumber: '10',
    likedCount: 33,
    isLiked: true,
    sport: 'SOCCER',
    timeAgo: '4시간 전'
  },
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
  sports: ['야구', '축구'],
}

const POINT_HISTORY = [
  {id: 1, label: '구매 확정 적립', points: +500, date: '2026.05.01', type: 'earn' as const},
  {id: 2, label: '거래 후기 작성', points: +200, date: '2026.04.28', type: 'earn' as const},
  {id: 3, label: '이벤트 보너스', points: +1000, date: '2026.04.15', type: 'earn' as const},
  {id: 4, label: '포인트 사용 (결제)', points: -300, date: '2026.04.10', type: 'use' as const},
  {id: 5, label: '판매 정산', points: +66000, date: '2026.04.10', type: 'settle' as const},
]

// ── 상수/유틸 ─────────────────────────────────────────────────────────────────

const GRADE_META: Record<Grade, { label: string; bg: string; text: string; border: string }> = {
  S: {label: 'S급', bg: 'rgba(255,184,0,.12)', text: '#B38000', border: 'rgba(255,184,0,.35)'},
  A: {label: 'A급', bg: 'rgba(0,33,71,.08)', text: '#002147', border: 'rgba(0,33,71,.25)'},
  B: {label: 'B급', bg: 'rgba(90,106,122,.10)', text: '#5A6A7A', border: 'rgba(90,106,122,.3)'},
  C: {label: 'C급', bg: 'rgba(255,149,0,.10)', text: '#CC7700', border: 'rgba(255,149,0,.3)'},
}

const TRADE_STATUS_META: Partial<Record<TradeStatus, { label: string; color: string }>> = {
  REQUESTED: {label: '요청됨', color: 'var(--color-info)'},
  ACCEPTED: {label: '수락됨', color: 'var(--color-info)'},
  PAID: {label: '결제완료', color: 'var(--color-gold)'},
  IN_PROGRESS: {label: '진행중', color: 'var(--color-warning)'},
  CONFIRMED: {label: '구매확정', color: 'var(--color-success)'},
  COMPLETED: {label: '거래완료', color: 'var(--color-text-hint)'},
  CANCELED: {label: '취소됨', color: 'var(--color-accent)'},
  DISPUTED: {label: '분쟁중', color: 'var(--color-accent)'},
}

function mannerColor(score: number) {
  if (score >= 90) return 'var(--color-success)'
  if (score >= 70) return 'var(--color-gold)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-error)'
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

/** 프로필 헤더 카드 — 실제 API 연동 */
function ProfileHeader() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imgUploading, setImgUploading] = useState(false)
  
  const {data: profile, isLoading} = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    staleTime: 60_000,
  })
  
  /**
   * 프로필 이미지 변경 핸들러
   * 1) uploadProfileImage → S3 URL 획득
   * 2) updateMyProfile({ profileImageUrl }) → 프로필 갱신
   * 3) myProfile 쿼리 무효화 → 화면 자동 갱신
   */
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImgUploading(true)
    try {
      const url = await uploadProfileImage(file)
      await updateMyProfile({profileImageUrl: url})
      await qc.invalidateQueries({queryKey: ['myProfile']})
    } catch (err) {
      console.error('[프로필 이미지] 업로드 실패:', err)
    } finally {
      setImgUploading(false)
    }
  }
  
  // 스켈레톤 로딩
  if (isLoading || !profile) {
    return (
      <div className="rounded-2xl p-6 mb-6 animate-pulse"
           style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex-shrink-0" style={{background: 'var(--color-surface-raised)'}}/>
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-5 rounded w-2/3" style={{background: 'var(--color-surface-raised)'}}/>
            <div className="h-3 rounded w-1/2" style={{background: 'var(--color-surface-raised)'}}/>
          </div>
        </div>
      </div>
    )
  }
  
  const mc = mannerColor(Number(profile.mannerScore) * 20)
  const interests = profile.interest?.sport ? [profile.interest.sport] : []
  
  return (
    <div
      className="rounded-2xl p-6 mb-6"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 12px -2px rgba(0,33,71,.08)'
      }}
    >
      <div className="flex items-center gap-4">
        {/* 아바타 + 이미지 업로드 버튼 */}
        <div className="relative flex-shrink-0">
          {/* 숨겨진 파일 인풋 — 카메라 버튼 클릭 시 트리거 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          {resolveImageUrl(profile.profileImageUrl) ? (
            <img
              src={resolveImageUrl(profile.profileImageUrl)!}
              alt={profile.nickname}
              className="w-16 h-16 rounded-full object-cover"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{
                background: 'var(--color-primary)',
                fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                letterSpacing: '0.06em'
              }}
            >
              {profile.nickname.slice(0, 2).toUpperCase()}
            </div>
          )}
          {/* 카메라 오버레이 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={imgUploading}
            aria-label="프로필 이미지 변경"
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center shadow"
            style={{background: 'var(--color-accent)', color: '#fff'}}
          >
            {imgUploading
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin block"/>
              : <Camera size={12}/>
            }
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="font-bold text-lg truncate" style={{color: 'var(--color-text-main)'}}>{profile.nickname}</h2>
            <button aria-label="프로필 수정">
              <Edit3 size={15} color="var(--color-text-hint)"/>
            </button>
          </div>
          <p className="text-xs truncate" style={{color: 'var(--color-text-hint)'}}>{profile.email}</p>
          <p className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>
            {new Date(profile.createdAt).getFullYear()}년 가입
            {interests.length > 0 && ` · ${interests.join('·')} 관심`}
          </p>
        </div>
        {/* 매너점수 (0~5 스케일) */}
        <div className="flex flex-col items-center flex-shrink-0 pl-4"
             style={{borderLeft: '1px solid var(--color-border)'}}>
          <Star size={14} color={mc} fill={mc}/>
          <span className="text-2xl font-bold mt-1" style={{color: mc, fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
            {Number(profile.mannerScore).toFixed(1)}
          </span>
          <span className="text-[12px] mt-0.5" style={{color: 'var(--color-text-hint)'}}>매너점수</span>
        </div>
      </div>
      
      {/* 통계 줄 */}
      <div
        className="grid grid-cols-3 gap-4 mt-5 pt-5"
        style={{borderTop: '1px solid var(--color-border)'}}
      >
        {[
          {label: '총 구매', value: profile.totalPurchases, unit: '건'},
          {label: '총 판매', value: profile.totalSales, unit: '건'},
          {label: '정산 포인트', value: profile.pointWithdrawable.toLocaleString('ko-KR'), unit: 'P'},
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center">
            <span className="text-xl font-bold"
                  style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>{s.value}</span>
            <span className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 거래 내역 탭 — 실제 API 연동 */
function TradeHistoryTab() {
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')
  
  const {data, isLoading} = useQuery({
    queryKey: ['myTrades', role],
    queryFn: () => getMyTrades({role, page: 0, size: 20}),
    staleTime: 30_000,
  })
  const trades = data?.content ?? []
  
  return (
    <div>
      {/* 탭 필터: 구매/판매 */}
      <div className="flex gap-2 mb-4">
        {([['buyer', '구매 내역'], ['seller', '판매 내역']] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setRole(k)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: role === k ? 'var(--color-primary)' : 'var(--color-surface)',
              color: role === k ? '#fff' : 'var(--color-text-sub)',
              border: `1px solid ${role === k ? 'var(--color-primary)' : 'var(--color-border)'}`,
            }}
          >
            {l}
          </button>
        ))}
      </div>
      
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{background: 'var(--color-surface)'}}/>
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="py-12 text-center">
          <Package size={32} color="var(--color-border)" className="mx-auto mb-3" strokeWidth={1.5}/>
          <p className="text-sm font-display font-bold" style={{color: 'var(--color-text-main)'}}>
            {role === 'buyer' ? '구매 내역이 없습니다' : '판매 내역이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {trades.map((t: TradeResponse) => {
            const sm = TRADE_STATUS_META[t.status] ?? {label: t.status, color: 'var(--color-text-hint)'}
            const counterpart = role === 'buyer' ? t.seller : t.buyer
            return (
              <Link
                key={t.tradeId}
                to={`/trade/${t.tradeId}`}
                className="flex gap-3 p-4 rounded-xl transition-colors"
                style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
              >
                {/* 썸네일 */}
                <div
                  className="w-14 h-14 rounded-xl flex-shrink-0 relative overflow-hidden bg-[var(--color-surface-raised)]"
                  style={{aspectRatio: '1'}}
                >
                  {resolveImageUrl(t.post.thumbnailUrl) ? (
                    <img
                      src={resolveImageUrl(t.post.thumbnailUrl)!}
                      alt={t.post.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package size={20} color="var(--color-border)"/>
                    </div>
                  )}
                </div>
                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[12px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: role === 'buyer' ? 'rgba(14,165,233,.1)' : 'rgba(0,179,110,.1)',
                            color: role === 'buyer' ? 'var(--color-info)' : 'var(--color-success)',
                            fontFamily: "'Giants','Pretendard',sans-serif"
                          }}>
                      {role === 'buyer' ? '구매' : '판매'}
                    </span>
                    <span className="text-[12px] font-semibold"
                          style={{color: sm.color, fontFamily: "'Giants','Pretendard',sans-serif"}}>
                      {sm.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold truncate"
                     style={{color: 'var(--color-text-main)'}}>{t.post.title}</p>
                  <p className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>
                    {counterpart.nickname} · {new Date(t.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                {/* 가격 */}
                <div className="flex flex-col items-end justify-center flex-shrink-0">
                  <span className="font-bold text-sm"
                        style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                    {formatPrice(t.tradePrice)}
                  </span>
                  <ChevronRight size={14} color="var(--color-text-hint)"/>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** 내 판매글 탭 — 실제 API 연동
 * 주: 백엔드에 "내 판매글" 전용 엔드포인트 없음
 * → 판매 거래 목록(getMyTrades seller)의 postId 수집 후 관련 상품 링크 표시
 *   + 실시간 판매 중인 상품은 getListings API에서 seller.memberId 로 필터 (추후 개선)
 */
function MyListingsTab() {
  // 프로필에서 memberId 취득
  const {data: profile} = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    staleTime: 60_000,
  })
  
  // 내 판매글 목록: 전체 listings에서 seller.memberId === 내 memberId
  const {data, isLoading} = useQuery({
    queryKey: ['myListings', profile?.memberId],
    queryFn: () => getListings({size: 20, page: 0}),
    enabled: !!profile?.memberId,
    staleTime: 30_000,
    select: (res) => ({
      ...res,
      content: res.content.filter((item: PostCard) => item.seller.memberId === profile!.memberId),
    }),
  })
  
  const items = data?.content ?? []
  
  return (
    <div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl animate-pulse overflow-hidden"
                 style={{border: '1px solid var(--color-border)'}}>
              <div style={{aspectRatio: '4/5', background: 'var(--color-surface-raised)'}}/>
              <div className="p-3 flex flex-col gap-2">
                <div className="h-3 rounded" style={{background: 'var(--color-surface-raised)'}}/>
                <div className="h-4 rounded w-2/3" style={{background: 'var(--color-surface-raised)'}}/>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item: PostCard) => {
            const m = GRADE_META[item.grade]
            return (
              <Link
                key={item.postId}
                to={`/listing/${item.postId}`}
                className="rounded-xl overflow-hidden block"
                style={{border: '1px solid var(--color-border)', background: 'var(--color-surface)'}}
              >
                <div className="relative" style={{aspectRatio: '4/5', background: 'var(--color-surface-raised)'}}>
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package size={28} color="var(--color-border)" strokeWidth={1.5}/>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: m.bg,
                          color: m.text,
                          border: `1px solid ${m.border}`,
                          fontFamily: "'Giants','Pretendard',sans-serif"
                        }}>
                    {m.label}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold truncate"
                     style={{color: 'var(--color-text-main)'}}>{item.title}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-sm font-bold"
                          style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                      {formatPrice(item.price)}
                    </span>
                    <span className="text-[12px] flex items-center gap-0.5" style={{color: 'var(--color-text-hint)'}}>
                      <Heart size={10}/> {item.wishCount}
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
            style={{
              aspectRatio: '4/5',
              border: '2px dashed var(--color-border)',
              background: 'var(--color-surface-raised)',
              minHeight: 120
            }}
          >
            <span className="text-3xl" style={{color: 'var(--color-border-strong)'}}>+</span>
            <span className="text-xs font-medium" style={{color: 'var(--color-text-hint)'}}>판매 등록</span>
          </Link>
        </div>
      )}
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
        <Heart size={40} color="var(--color-border)"/>
        <div className="text-center">
          <p className="font-display font-bold" style={{color: 'var(--color-text-main)'}}>찜한 상품이 없어요</p>
          <p className="text-sm mt-1" style={{color: 'var(--color-text-sub)'}}>마음에 드는 유니폼을 찜해두세요.</p>
        </div>
        <Link to="/" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{background: 'var(--color-primary)'}}>
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
              style={{border: '1px solid var(--color-border)', background: 'var(--color-surface)'}}
            >
              <div className="relative" style={{aspectRatio: '4/5', background: item.jerseyColor}}>
                <div className="absolute inset-0"
                     style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, transparent 2px 16px)'}}/>
                <span className="absolute inset-0 flex items-center justify-center select-none" style={{
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                  fontSize: 72,
                  color: 'rgba(255,255,255,.14)'
                }}>
                  {item.jerseyNumber}
                </span>
                <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{
                  background: m.bg,
                  color: m.text,
                  border: `1px solid ${m.border}`,
                  fontFamily: "'Giants','Pretendard',sans-serif"
                }}>
                  {m.label}
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold truncate" style={{color: 'var(--color-text-main)'}}>{item.title}</p>
                <p className="text-sm font-bold mt-1"
                   style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                  {formatPrice(item.price)}
                </p>
              </div>
            </Link>
            {/* 찜 해제 버튼 */}
            <button
              onClick={() => unlike(item.id)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{background: 'rgba(255,255,255,.9)'}}
              aria-label="찜 해제"
            >
              <Heart size={15} fill="var(--color-accent)" color="var(--color-accent)"/>
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** 포인트 탭 — 실제 API 연동 버전 */
function PointsTab() {
  const qc = useQueryClient()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawBank, setWithdrawBank] = useState('')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  
  // 포인트 지갑 조회
  const {data: wallet, isLoading: walletLoading} = useQuery({
    queryKey: ['pointWallet'],
    queryFn: getPointWallet,
  })
  
  // 포인트 내역 조회 (추후 UI 연동 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {data: _history} = useQuery({
    queryKey: ['pointHistory'],
    queryFn: getPointHistory,
  })
  
  // 내 출금 요청 목록 조회
  const {data: withdrawList} = useQuery({
    queryKey: ['withdrawList'],
    queryFn: getMyWithdrawList,
  })
  
  // 출금 요청 뮤테이션
  const withdrawMutation = useMutation({
    mutationFn: requestWithdraw,
    onSuccess: () => {
      setWithdrawAmount('')
      setWithdrawBank('')
      setWithdrawAccount('')
      setWithdrawError(null)
      // 지갑 + 출금 목록 갱신
      void qc.invalidateQueries({queryKey: ['pointWallet']})
      void qc.invalidateQueries({queryKey: ['withdrawList']})
    },
    onError: () => setWithdrawError('출금 요청 중 오류가 발생했습니다. 다시 시도해주세요.'),
  })
  
  // 출금 취소 뮤테이션
  const cancelMutation = useMutation({
    mutationFn: cancelWithdraw,
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: ['pointWallet']})
      void qc.invalidateQueries({queryKey: ['withdrawList']})
    },
  })
  
  function handleWithdraw() {
    const amount = Number(withdrawAmount)
    if (amount < 1000) {
      setWithdrawError('최소 1,000원 이상 입력해주세요.');
      return
    }
    if (!wallet || amount > wallet.withdrawable) {
      setWithdrawError('출금 가능 금액을 초과했습니다.');
      return
    }
    if (!withdrawBank.trim()) {
      setWithdrawError('은행명을 입력해주세요.');
      return
    }
    if (!withdrawAccount.trim()) {
      setWithdrawError('계좌번호를 입력해주세요.');
      return
    }
    setWithdrawError(null)
    withdrawMutation.mutate({amount, bankName: withdrawBank, accountNumber: withdrawAccount})
  }
  
  const withdrawable = wallet?.withdrawable ?? 0
  const pending = wallet?.pending ?? 0
  
  return (
    <div className="flex flex-col gap-4">
      {/* 포인트 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 활동 포인트 — 백엔드 미지원, MOCK 유지 */}
        <div className="rounded-2xl p-4" style={{background: 'var(--color-primary)', color: '#fff'}}>
          <div className="flex items-center gap-2 mb-3">
            <Award size={16}/>
            <span className="text-xs font-semibold opacity-80">활동 포인트</span>
          </div>
          <p className="text-2xl font-bold" style={{fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
            {MOCK_USER.activityPoints.toLocaleString('ko-KR')}<span className="text-sm ml-1 opacity-70">P</span>
          </p>
          <p className="text-[12px] mt-2 opacity-60">쇼핑·후기·이벤트 적립</p>
        </div>
        {/* 정산 포인트 (출금 가능) */}
        <div className="rounded-2xl p-4"
             style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} color="var(--color-success)"/>
            <span className="text-xs font-semibold" style={{color: 'var(--color-text-sub)'}}>정산 포인트</span>
          </div>
          {walletLoading ? (
            <div className="h-8 rounded animate-pulse" style={{background: 'var(--color-surface-raised)'}}/>
          ) : (
            <p className="text-2xl font-bold"
               style={{color: 'var(--color-success)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
              {'₩'}{withdrawable.toLocaleString('ko-KR')}
            </p>
          )}
          <p className="text-[12px] mt-2" style={{color: 'var(--color-text-hint)'}}>판매 대금 (출금 가능)</p>
        </div>
        {/* 정산 대기 포인트 */}
        <div
          className="col-span-2 rounded-2xl p-4 flex items-center justify-between"
          style={{background: 'rgba(255,149,0,.07)', border: '1px solid rgba(255,149,0,.25)'}}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{background: 'rgba(255,149,0,.15)'}}
            >
              <Clock size={16} color="var(--color-warning)"/>
            </div>
            <div>
              <p className="text-xs font-semibold" style={{color: 'var(--color-text-sub)'}}>정산 대기</p>
              <p className="text-[12px] mt-0.5" style={{color: 'var(--color-text-hint)'}}>구매 확정 후 출금 가능</p>
            </div>
          </div>
          {walletLoading ? (
            <div className="h-6 w-24 rounded animate-pulse" style={{background: 'rgba(255,149,0,.15)'}}/>
          ) : (
            <p className="text-lg font-bold"
               style={{color: 'var(--color-warning)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
              {'₩'}{pending.toLocaleString('ko-KR')}
            </p>
          )}
        </div>
      </div>
      
      {/* 출금 요청 폼 */}
      <div className="rounded-2xl p-5"
           style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
        <h3 className="font-bold text-sm mb-3" style={{color: 'var(--color-text-main)'}}>정산 포인트 출금</h3>
        <div className="flex flex-col gap-2 mb-3">
          {/* 금액 */}
          <div className="flex gap-2">
            <div
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{border: '1px solid var(--color-border)', background: 'var(--color-surface-raised)'}}
            >
              <span className="text-sm" style={{color: 'var(--color-text-hint)'}}>{'₩'}</span>
              <input
                type="number"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="출금 금액 (최소 1,000원)"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{color: 'var(--color-text-main)'}}
                min={1000}
                max={withdrawable}
              />
            </div>
            <button
              onClick={() => setWithdrawAmount(String(withdrawable))}
              className="px-3 py-2.5 rounded-xl text-xs font-bold flex-shrink-0"
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-sub)'
              }}
            >
              전액
            </button>
          </div>
          {/* 은행명 */}
          <input
            type="text"
            value={withdrawBank}
            onChange={e => setWithdrawBank(e.target.value)}
            placeholder="은행명 (예: 카카오뱅크)"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-main)'
            }}
          />
          {/* 계좌번호 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={withdrawAccount}
              onChange={e => setWithdrawAccount(e.target.value)}
              placeholder="계좌번호 (- 없이)"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-raised)',
                color: 'var(--color-text-main)'
              }}
            />
            <button
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0 disabled:opacity-50"
              style={{background: 'var(--color-success)'}}
            >
              {withdrawMutation.isPending ? '처리 중...' : '출금 신청'}
            </button>
          </div>
        </div>
        {/* 에러 메시지 */}
        {withdrawError && (
          <p className="text-xs mb-2" style={{color: 'var(--color-error)'}}>{withdrawError}</p>
        )}
        <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
          최소 1,000원 · 영업일 1~3일 내 처리 · 수수료 없음
        </p>
      </div>
      
      {/* 출금 요청 내역 */}
      {withdrawList && withdrawList.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3" style={{color: 'var(--color-text-main)'}}>출금 요청 내역</h3>
          <div className="flex flex-col gap-2">
            {withdrawList.map((item: WithdrawItem) => (
              <div
                key={item.withdrawId}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
              >
                <div>
                  <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>
                    {item.bankName} {item.accountNumber}
                  </p>
                  <p className="text-xs mt-0.5" style={{color: 'var(--color-text-hint)'}}>
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold"
                     style={{color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                    {'₩'}{item.amount.toLocaleString('ko-KR')}
                  </p>
                  {item.status === 'PENDING' ? (
                    <button
                      onClick={() => cancelMutation.mutate(item.withdrawId)}
                      disabled={cancelMutation.isPending}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{background: 'rgba(255,46,77,.1)', color: 'var(--color-accent)'}}
                    >
                      취소
                    </button>
                  ) : (
                    <span
                      className="text-xs px-2 py-1 rounded-lg font-semibold"
                      style={{
                        background: item.status === 'APPROVED' ? 'rgba(0,179,110,.1)' : 'rgba(255,149,0,.1)',
                        color: item.status === 'APPROVED' ? 'var(--color-success)' : 'var(--color-warning)',
                      }}
                    >
                      {item.status === 'APPROVED' ? '승인' : '반려'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 포인트 내역 */}
      <div>
        <h3 className="font-bold text-sm mb-3" style={{color: 'var(--color-text-main)'}}>포인트 내역</h3>
        <div className="flex flex-col gap-2">
          {POINT_HISTORY.map(h => (
            <div
              key={h.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{background: h.type === 'earn' ? 'rgba(0,179,110,.12)' : h.type === 'settle' ? 'rgba(255,184,0,.12)' : 'rgba(255,149,0,.12)'}}
                >
                  {h.type === 'settle'
                    ? <ArrowDownToLine size={14} color="var(--color-gold)"/>
                    : h.type === 'earn'
                      ? <TrendingUp size={14} color="var(--color-success)"/>
                      : <Coins size={14} color="var(--color-warning)"/>
                  }
                </div>
                <div>
                  <p className="text-sm" style={{color: 'var(--color-text-main)'}}>{h.label}</p>
                  <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>{h.date}</p>
                </div>
              </div>
              <span
                className="font-bold text-sm"
                style={{
                  color: h.points > 0 ? (h.type === 'settle' ? 'var(--color-success)' : 'var(--color-info)') : 'var(--color-warning)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
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

/** 신고 내역 탭 — 실제 API 연동 */
function MyReportsTab() {
  const {data, isLoading, isError} = useQuery({
    queryKey: ['myReports'],
    queryFn: () => getMyReports({page: 0, size: 20}),
  })
  
  /** 처리 상태별 색상 */
  function statusStyle(status: ReportItem['status']): { bg: string; color: string } {
    switch (status) {
      case 'PENDING':
        return {bg: 'rgba(14,165,233,.1)', color: 'var(--color-info)'}
      case 'NORMAL':
        return {bg: 'rgba(0,179,110,.1)', color: 'var(--color-success)'}
      case 'WARNING':
        return {bg: 'rgba(255,149,0,.1)', color: 'var(--color-warning)'}
      case 'DELETED':
        return {bg: 'rgba(255,46,77,.1)', color: 'var(--color-accent)'}
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{background: 'var(--color-surface)'}}/>
        ))}
      </div>
    )
  }
  
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle size={32} color="var(--color-error)"/>
        <p className="text-sm font-display font-bold" style={{color: 'var(--color-text-main)'}}>
          신고 내역을 불러오지 못했습니다
        </p>
        <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>잠시 후 다시 시도해주세요.</p>
      </div>
    )
  }
  
  const items = data?.content ?? []
  
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Flag size={40} color="var(--color-border)" strokeWidth={1.5}/>
        <p className="text-base font-display font-bold" style={{color: 'var(--color-text-main)'}}>
          신고 내역이 없습니다
        </p>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>접수한 신고가 여기에 표시됩니다.</p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs mb-1" style={{color: 'var(--color-text-hint)'}}>
        총 {data?.totalElements ?? 0}건의 신고 내역
      </p>
      {items.map((item: ReportItem) => {
        const ss = statusStyle(item.status)
        return (
          <div
            key={item.reportId}
            className="rounded-2xl p-4"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* 아이콘 */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{background: 'rgba(255,46,77,.08)'}}
                >
                  <Flag size={16} color="var(--color-accent)"/>
                </div>
                <div className="min-w-0">
                  {/* 신고 사유 */}
                  <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>
                    {REPORT_REASON_LABEL[item.reason]}
                  </p>
                  {/* 대상 타입 + 상세 내용 */}
                  <p className="text-xs mt-0.5 truncate" style={{color: 'var(--color-text-hint)'}}>
                    {item.targetType === 'POST' ? '판매 매물' : '커뮤니티 게시글'} #{item.targetId}
                    {item.detail ? ` · ${item.detail}` : ''}
                  </p>
                  {/* 날짜 */}
                  <p className="text-[13px] mt-1" style={{color: 'var(--color-text-hint)'}}>
                    {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              {/* 처리 상태 배지 */}
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                style={{background: ss.bg, color: ss.color}}
              >
                {REPORT_STATUS_LABEL[item.status]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** 설정 탭 */
function SettingsTab() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const {logout, refreshToken} = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  /** 관심 종목 편집 패널 open 여부 */
  const [interestOpen, setInterestOpen] = useState(false)
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null)
  const [savingInterest, setSavingInterest] = useState(false)
  
  /* 현재 저장된 관심 설정 조회 */
  const {data: interestData} = useQuery({
    queryKey: ['interestSetting'],
    queryFn: getInterestSetting,
    staleTime: 60_000,
    enabled: interestOpen,   // 패널 열릴 때만 fetch
  })
  
  /* 패널이 열릴 때 기존 값으로 초기화 */
  const handleOpenInterest = () => {
    setSelectedSport(interestData?.sport ?? null)
    setInterestOpen(true)
  }
  
  /**
   * 관심 종목 저장
   * POST /api/users/me/interest-setting → myProfile 쿼리 무효화
   */
  async function handleSaveInterest() {
    if (!selectedSport) return
    setSavingInterest(true)
    try {
      await saveInterestSetting({sport: selectedSport})
      await qc.invalidateQueries({queryKey: ['myProfile']})
      await qc.invalidateQueries({queryKey: ['interestSetting']})
      setInterestOpen(false)
    } catch (err) {
      console.error('[관심 설정] 저장 실패:', err)
    } finally {
      setSavingInterest(false)
    }
  }
  
  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      if (refreshToken) {
        await logoutApi(refreshToken).catch(() => null)
      }
    } finally {
      logout()
      navigate('/login')
    }
  }
  
  return (
    <div className="flex flex-col gap-3">
      {/* 프로필 수정 — 관심종목 인라인 편집 */}
      <div
        className="rounded-xl overflow-hidden"
        style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
      >
        <button
          className="flex items-center gap-4 px-4 py-3.5 w-full text-left transition-colors"
          onClick={handleOpenInterest}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{background: 'var(--color-surface-raised)', color: 'var(--color-primary)'}}>
            <Edit3 size={18}/>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>프로필 수정</p>
            <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
              관심종목 변경
              {interestData?.sport && ` · 현재: ${SPORT_OPTIONS.find(s => s.key === interestData.sport)?.label ?? interestData.sport}`}
            </p>
          </div>
          <ChevronRight
            size={16}
            color="var(--color-text-hint)"
            style={{transform: interestOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s'}}
          />
        </button>
        {/* 관심 종목 인라인 편집 폼 */}
        {interestOpen && (
          <div className="px-4 pb-4 border-t" style={{borderColor: 'var(--color-border)'}}>
            <p className="text-xs font-semibold mt-3 mb-2" style={{color: 'var(--color-text-sub)'}}>관심 종목 선택</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {SPORT_OPTIONS.map(opt => {
                const active = selectedSport === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedSport(opt.key)}
                    className="px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors"
                    style={active
                      ? {background: 'var(--color-accent)', color: '#fff'}
                      : {
                        background: 'var(--color-surface-raised)',
                        color: 'var(--color-text-sub)',
                        border: '1px solid var(--color-border)'
                      }
                    }
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveInterest}
                disabled={!selectedSport || savingInterest}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{background: 'var(--color-accent)'}}
              >
                {savingInterest
                  ?
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block"/>
                  : <Check size={14}/>
                }
                저장
              </button>
              <button
                onClick={() => setInterestOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{
                  background: 'var(--color-surface-raised)',
                  color: 'var(--color-text-sub)',
                  border: '1px solid var(--color-border)'
                }}
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* 나머지 설정 항목 */}
      {[
        {icon: <Shield size={18}/>, label: '보안 설정', sub: '비밀번호·2FA'},
        {icon: <Bell size={18}/>, label: '알림 설정', sub: '거래·커뮤니티 알림'},
        {icon: <BarChart2 size={18}/>, label: '내 활동 통계', sub: '거래·후기·포인트 요약'},
        {icon: <HelpCircle size={18}/>, label: '고객 지원', sub: 'FAQ·1:1 문의'},
      ].map(item => (
        <button
          key={item.label}
          className="flex items-center gap-4 px-4 py-3.5 rounded-xl w-full text-left transition-colors"
          style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{background: 'var(--color-surface-raised)', color: 'var(--color-primary)'}}>
            {item.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{color: 'var(--color-text-main)'}}>{item.label}</p>
            <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>{item.sub}</p>
          </div>
          <ChevronRight size={16} color="var(--color-text-hint)"/>
        </button>
      ))}
      
      {/* 로그아웃 */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex items-center gap-4 px-4 py-3.5 rounded-xl w-full text-left mt-2 transition-colors disabled:opacity-60"
        style={{background: 'rgba(255,46,77,.06)', border: '1px solid rgba(255,46,77,.2)'}}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{background: 'rgba(255,46,77,.10)', color: 'var(--color-accent)'}}>
          <LogOut size={18}/>
        </div>
        <span className="text-sm font-semibold" style={{color: 'var(--color-accent)'}}>
          {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
        </span>
      </button>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

const TABS = [
  {key: 'trades', label: '거래 내역', icon: <Package size={16}/>},
  {key: 'listings', label: '판매 중', icon: <BarChart2 size={16}/>},
  {key: 'likes', label: '찜 목록', icon: <Heart size={16}/>},
  {key: 'points', label: '포인트', icon: <Coins size={16}/>},
  {key: 'reports', label: '신고 내역', icon: <Flag size={16}/>},
  {key: 'settings', label: '설정', icon: <Settings size={16}/>},
]

export default function MyPage() {
  const [activeTab, setActiveTab] = useState('trades')
  
  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-7 py-6 md:py-10">
        {/* 페이지 헤더 */}
        <h1
          className="text-2xl font-bold mb-6"
          style={{
            color: 'var(--color-text-main)',
            fontFamily: "'IAMAPLAYER',Giants,sans-serif",
            letterSpacing: '0.04em'
          }}
        >
          MY PAGE
        </h1>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 좌: 프로필 + 탭 메뉴 */}
          <div className="lg:w-72 flex-shrink-0">
            <ProfileHeader/>
            
            {/* 탭 네비 (데스크탑: 세로, 모바일: 가로 스크롤) */}
            <div
              className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0"
              style={{scrollbarWidth: 'none'}}
            >
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl whitespace-nowrap flex-shrink-0 lg:flex-shrink transition-all text-sm font-medium w-full text-left"
                  style={{
                    background: activeTab === t.key ? 'var(--color-accent-subtle)' : 'transparent',
                    color: activeTab === t.key ? 'var(--color-accent)' : 'var(--color-text-sub)',
                  }}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* 우: 탭 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {activeTab === 'trades' && <TradeHistoryTab/>}
            {activeTab === 'listings' && <MyListingsTab/>}
            {activeTab === 'likes' && <LikesTab/>}
            {activeTab === 'points' && <PointsTab/>}
            {activeTab === 'reports' && <MyReportsTab/>}
            {activeTab === 'settings' && <SettingsTab/>}
          </div>
        </div>
      </div>
    </div>
  )
}
