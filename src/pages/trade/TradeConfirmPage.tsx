/**
 * TradeConfirmPage — 구매 확정 (Screen 14)
 *
 * 구성:
 *   OrderCard      — 상품 정보 + 배송 상태 타임라인
 *   ConfirmSection — 구매 확정 안내 + 확정 버튼
 *   DisputeSection — 문제 발생 시 분쟁 신청 링크
 *
 * 에스크로 플로우:
 *   PAID → IN_PROGRESS(배송중) → 구매확정(CONFIRMED) → COMPLETED
 *   구매 확정 전까지 RE:FORM이 결제금 보관
 *
 * 데이터: 목 데이터 (추후 useQuery + /trade/:id 연동)
 */
import {formatPrice} from '../../utils/format'
import {useState} from 'react'
import {useParams, Link, useNavigate} from 'react-router-dom'
import {
  ShieldCheck, Package, Truck, CheckCircle2,
  ChevronLeft, AlertCircle, Loader2, Star,
} from 'lucide-react'

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

interface TradeDetail {
  id: number
  listingId: number
  title: string
  team: string
  grade: 'S' | 'A' | 'B' | 'C'
  size: string
  price: number
  fee: number
  jerseyColor: string
  jerseyNumber: string
  sellerNickname: string
  sellerAvatarColor: string
  sellerMannerScore: number
  status: 'IN_PROGRESS' | 'CONFIRMED'
  paidAt: string
  shippedAt: string
  trackingNum: string
  courierName: string
}

const MOCK_TRADE: TradeDetail = {
  id: 3,
  listingId: 1,
  title: '맨체스터 유나이티드 23/24 홈 어센틱',
  team: '맨체스터 유나이티드',
  grade: 'S',
  size: 'M',
  price: 78000,
  fee: Math.round(78000 * 0.03),
  jerseyColor: '#B5222B',
  jerseyNumber: '7',
  sellerNickname: 'uniform_king',
  sellerAvatarColor: '#1A3051',
  sellerMannerScore: 92,
  status: 'IN_PROGRESS',
  paidAt: '2026.05.01 14:23',
  shippedAt: '2026.05.02 09:10',
  trackingNum: '1234567890',
  courierName: 'CJ대한통운',
}

// ── 배송 타임라인 ─────────────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  {key: 'paid', label: '결제 완료', icon: <CheckCircle2 size={16}/>},
  {key: 'shipped', label: '발송 완료', icon: <Package size={16}/>},
  {key: 'transit', label: '배송 중', icon: <Truck size={16}/>},
  {key: 'confirmed', label: '구매 확정', icon: <ShieldCheck size={16}/>},
] as const

type TimelineKey = typeof TIMELINE_STEPS[number]['key']

const ACTIVE_STEP: TimelineKey = 'transit'  // 현재 단계 (목)

function TradeTimeline() {
  const activeIdx = TIMELINE_STEPS.findIndex(s => s.key === ACTIVE_STEP)
  return (
    <div className="flex items-center gap-0">
      {TIMELINE_STEPS.map((step, i) => {
        const isDone = i < activeIdx
        const isCurrent = i === activeIdx

        return (
          <div key={step.key} className="flex items-center flex-1">
            {/* 스텝 노드 */}
            <div className="flex flex-col items-center flex-shrink-0" style={{width: 56}}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background:
                    isDone ? 'var(--color-success)' :
                      isCurrent ? 'var(--color-primary)' :
                        'var(--color-surface-raised)',
                  color:
                    isDone || isCurrent ? '#fff' : 'var(--color-text-hint)',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(0,33,71,.15)' : 'none',
                }}
              >
                {isDone ? <CheckCircle2 size={18}/> : step.icon}
              </div>
              <span
                className="text-[10px] mt-1.5 text-center leading-tight"
                style={{
                  color: isCurrent ? 'var(--color-primary)' : isDone ? 'var(--color-success)' : 'var(--color-text-hint)',
                  fontWeight: isCurrent ? 700 : 400
                }}
              >
                {step.label}
              </span>
            </div>
            {/* 연결선 */}
            {i < TIMELINE_STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1 transition-colors"
                style={{background: i < activeIdx ? 'var(--color-success)' : 'var(--color-border)'}}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function TradeConfirmPage() {
  const {id} = useParams<{ id: string }>()
  void id

  const navigate = useNavigate()
  const [trade] = useState<TradeDetail>(MOCK_TRADE)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(trade.status === 'CONFIRMED')
  const [showWarning, setShowWarning] = useState(false)

  async function handleConfirm() {
    setShowWarning(false)
    setConfirming(true)
    await new Promise(r => setTimeout(r, 1500))
    setConfirming(false)
    setConfirmed(true)
    // 실제 구현: queryClient.invalidateQueries + navigate
    setTimeout(() => navigate(`/trade/${trade.id}/review`), 1200)
  }

  const total = trade.price + trade.fee + 3500

  return (
    <div className="min-h-screen" style={{background: 'var(--color-bg)'}}>
      <div className="max-w-[640px] mx-auto px-4 md:px-7 py-6 md:py-10">

        {/* 뒤로가기 */}
        <Link
          to="/mypage"
          className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-[var(--color-accent)]"
          style={{color: 'var(--color-text-sub)'}}
        >
          <ChevronLeft size={16}/>마이페이지
        </Link>

        {/* 헤더 */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold mb-1"
            style={{
              color: 'var(--color-text-main)',
              fontFamily: "'IAMAPLAYER',Giants,sans-serif",
              letterSpacing: '0.04em'
            }}
          >
            TRADE CONFIRM
          </h1>
          <p className="text-sm" style={{color: 'var(--color-text-sub)'}}>
            상품을 받으셨나요? 구매 확정 후 판매자에게 대금이 지급됩니다.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {/* 상품 카드 */}
          <div className="rounded-2xl p-5"
               style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
            <div className="flex gap-4 mb-5">
              {/* 썸네일 */}
              <div
                className="relative rounded-xl overflow-hidden flex-shrink-0"
                style={{width: 72, height: 72, background: trade.jerseyColor}}
              >
                <div className="absolute inset-0"
                     style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,.08) 0 2px, transparent 2px 12px)'}}/>
                <span className="absolute inset-0 flex items-center justify-center" style={{
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                  fontSize: 28,
                  color: 'rgba(255,255,255,.2)'
                }}>
                  {trade.jerseyNumber}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-1" style={{color: 'var(--color-text-hint)'}}>{trade.team}</p>
                <p className="text-sm font-semibold leading-snug mb-1"
                   style={{color: 'var(--color-text-main)'}}>{trade.title}</p>
                <p className="text-lg font-bold"
                   style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                  {formatPrice(total)}
                </p>
              </div>
            </div>

            {/* 배송 타임라인 */}
            <div className="mb-5">
              <TradeTimeline/>
            </div>

            {/* 배송 정보 */}
            <div
              className="flex flex-col gap-2 p-3 rounded-xl"
              style={{background: 'var(--color-surface-raised)'}}
            >
              <div className="flex justify-between text-xs">
                <span style={{color: 'var(--color-text-hint)'}}>결제일</span>
                <span style={{color: 'var(--color-text-sub)'}}>{trade.paidAt}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{color: 'var(--color-text-hint)'}}>발송일</span>
                <span style={{color: 'var(--color-text-sub)'}}>{trade.shippedAt}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{color: 'var(--color-text-hint)'}}>택배사</span>
                <span style={{color: 'var(--color-text-sub)'}}>{trade.courierName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{color: 'var(--color-text-hint)'}}>운송장</span>
                <span style={{
                  color: 'var(--color-primary)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif"
                }}>{trade.trackingNum}</span>
              </div>
            </div>
          </div>

          {/* 판매자 정보 */}
          <div className="rounded-2xl p-5 flex items-center gap-4"
               style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{background: trade.sellerAvatarColor, fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
            >
              {trade.sellerNickname.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{color: 'var(--color-text-main)'}}>{trade.sellerNickname}</p>
              <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>매너점수 {trade.sellerMannerScore}</p>
            </div>
            <Link
              to="/chat"
              className="text-xs font-semibold px-3 py-2 rounded-xl hover:text-white transition-colors"
              style={{background: 'var(--color-primary)', color: '#fff'}}
            >
              채팅하기
            </Link>
          </div>

          {/* 에스크로 안내 */}
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{background: 'rgba(0,33,71,.05)', border: '1px solid rgba(0,33,71,.12)'}}
          >
            <ShieldCheck size={18} color="var(--color-primary)" className="flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-semibold mb-1" style={{color: 'var(--color-text-main)'}}>에스크로 보호 중</p>
              <p className="text-xs leading-relaxed" style={{color: 'var(--color-text-sub)'}}>
                {formatPrice(total)}이 현재 RE:FORM에 보관되어 있습니다.
                구매 확정 시 판매자에게 즉시 지급됩니다.
              </p>
            </div>
          </div>

          {/* 구매 확정 완료 */}
          {confirmed && (
            <div
              className="flex flex-col items-center gap-3 py-8 rounded-2xl"
              style={{background: 'rgba(0,179,110,.06)', border: '1px solid rgba(0,179,110,.2)'}}
            >
              <CheckCircle2 size={40} color="var(--color-success)"/>
              <div className="text-center">
                <p className="font-display font-bold text-base" style={{color: 'var(--color-success)'}}>구매 확정 완료!</p>
                <p className="text-sm mt-1" style={{color: 'var(--color-text-sub)'}}>
                  매너 평가 페이지로 이동합니다...
                </p>
              </div>
            </div>
          )}

          {/* 구매 확정 버튼 */}
          {!confirmed && (
            <div className="flex flex-col gap-3">
              {/* 경고 메시지 */}
              {showWarning && (
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-xl"
                  style={{background: 'rgba(255,149,0,.08)', border: '1px solid rgba(255,149,0,.25)'}}
                >
                  <AlertCircle size={15} color="var(--color-warning)" className="flex-shrink-0 mt-0.5"/>
                  <p className="text-xs leading-relaxed" style={{color: 'var(--color-warning)'}}>
                    구매 확정 후에는 취소가 불가합니다. 상품을 꼭 확인 후 진행해주세요.
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  if (!showWarning) {
                    setShowWarning(true)
                  } else {
                    handleConfirm()
                  }
                }}
                disabled={confirming}
                className="w-full py-4 rounded-xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all"
                style={{background: 'var(--color-accent)'}}
              >
                {confirming
                  ? <><Loader2 size={18} className="animate-spin"/>확정 처리 중...</>
                  : showWarning
                    ? <><CheckCircle2 size={18}/>네, 구매 확정합니다</>
                    : <><Star size={18}/>구매 확정하기</>
                }
              </button>

              {showWarning && (
                <button
                  onClick={() => setShowWarning(false)}
                  className="w-full py-3 rounded-xl font-medium text-sm transition-colors"
                  style={{background: 'var(--color-surface-raised)', color: 'var(--color-text-sub)'}}
                >
                  취소
                </button>
              )}
            </div>
          )}

          {/* 문제 발생 시 */}
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{background: 'rgba(255,46,77,.04)', border: '1px solid rgba(255,46,77,.15)'}}
          >
            <AlertCircle size={16} color="var(--color-accent)" className="flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-semibold mb-1" style={{color: 'var(--color-accent)'}}>상품에 문제가 있나요?</p>
              <p className="text-xs leading-relaxed mb-2" style={{color: 'var(--color-text-sub)'}}>
                상품 미수령, 허위 매물 등 문제가 발생했다면 분쟁을 신청해주세요. RE:FORM이 중재합니다.
              </p>
              <Link
                to="/chat"
                className="text-xs font-semibold underline"
                style={{color: 'var(--color-accent)'}}
              >
                분쟁 신청하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
