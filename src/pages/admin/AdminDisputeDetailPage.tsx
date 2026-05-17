/**
 * AdminDisputeDetailPage — 관리자 분쟁 처리 상세 (Screen 17)
 *
 * 분쟁(DISPUTED) 상태의 거래를 처리하는 화면.
 *
 * 구성:
 *   TradeOverview  — 거래 기본 정보 (상품·가격·거래 상태 타임라인)
 *   BuyerPanel     — 구매자 주장 + 프로필
 *   SellerPanel    — 판매자 주장 + 프로필
 *   EvidenceList   — 증거 파일 목록 (이미지 플레이스홀더)
 *   ResolutionPanel — 분쟁 판정 (구매자 승·판매자 승·상호 합의)
 *
 * 데이터: 목 데이터 (추후 GET /admin/disputes/:id 연동)
 */
import {formatPrice} from '../../utils/format'
import {useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {useQuery} from '@tanstack/react-query'
import {AlertOctagon, CheckCircle2, ChevronLeft, Clock, FileText, Gavel, ShieldCheck,} from 'lucide-react'
import {getTrade} from '../../features/trade/api/tradeApi'

// ── 타입 ─────────────────────────────────────────────────────────────────────

type Resolution = 'BUYER_WIN' | 'SELLER_WIN' | 'MUTUAL' | null

interface DisputeDetail {
  id: number
  tradeId: number
  postTitle: string
  price: number
  sport: string
  grade: string
  deliveryType: string
  buyer: { id: number; nickname: string; avatarColor: string; claim: string }
  seller: { id: number; nickname: string; avatarColor: string; claim: string }
  timeline: { date: string; label: string; done: boolean }[]
  evidenceCount: number
  adminNote: string
  resolution: Resolution
  createdAt: string
}

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

const MOCK_DISPUTE: DisputeDetail = {
  id: 1,
  tradeId: 203,
  postTitle: '전북 현대 2024 홈 어센틱',
  price: 66000,
  sport: '축구',
  grade: 'S',
  deliveryType: '택배',
  buyer: {
    id: 202,
    nickname: 'hoops_king',
    avatarColor: '#002147',
    claim:
      '판매자가 S급이라고 했으나 실제 수령 시 B급 이하 수준의 오염이 있었습니다. ' +
      '반품을 요청했으나 판매자가 거부하여 분쟁을 신청합니다. ' +
      '수령 직후 촬영한 사진을 증거로 제출합니다.',
  },
  seller: {
    id: 105,
    nickname: 'kbo_master',
    avatarColor: '#1A3051',
    claim:
      '발송 전 꼼꼼히 촬영하여 상태를 확인했으며 분명히 S급 상태였습니다. ' +
      '배송 중 손상 가능성이 있으나 구매자의 반품 요구는 부당하다고 판단합니다. ' +
      '발송 전 촬영 영상을 증거로 제출합니다.',
  },
  timeline: [
    {date: '05-04', label: '거래 요청', done: true},
    {date: '05-04', label: '거래 수락', done: true},
    {date: '05-05', label: '결제 완료', done: true},
    {date: '05-06', label: '발송 완료', done: true},
    {date: '05-08', label: '수령 확인', done: true},
    {date: '05-08', label: '분쟁 신청', done: true},
    {date: '-', label: '판정 대기', done: false},
  ],
  evidenceCount: 4,
  adminNote: '',
  resolution: null,
  createdAt: '2026-05-08',
}

// ── 분쟁 판정 결과 설정 ───────────────────────────────────────────────────────

const RESOLUTION_OPTIONS: { key: NonNullable<Resolution>; label: string; desc: string; color: string }[] = [
  {
    key: 'BUYER_WIN',
    label: '구매자 승',
    desc: '구매자에게 환불 처리. 판매자 경고 1회 부여.',
    color: 'var(--color-info)',
  },
  {
    key: 'SELLER_WIN',
    label: '판매자 승',
    desc: '판매자에게 대금 지급. 구매자의 분쟁 신청 기각.',
    color: 'var(--color-success)',
  },
  {
    key: 'MUTUAL',
    label: '상호 합의',
    desc: '부분 환불 또는 합의금 지급. 양측 동의 필요.',
    color: 'var(--color-warning)',
  },
]

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AdminDisputeDetailPage() {
  const {id} = useParams<{ id: string }>()
  // 분쟁 처리 전용 admin API 미구현 → tradeApi.getTrade로 기본 정보 조회
  const {data: trade} = useQuery({
    queryKey: ['trade', id],
    queryFn: () => getTrade(Number(id)),
    enabled: !!id,
  })
  const [dispute, setDispute] = useState<DisputeDetail>({...MOCK_DISPUTE, id: Number(id) || MOCK_DISPUTE.id})
  const [selectedResolution, setSelectedResolution] = useState<NonNullable<Resolution> | null>(null)
  const [adminNote, setAdminNote] = useState(dispute.adminNote)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  
  async function handleResolve() {
    if (!selectedResolution) return
    setIsSubmitting(true)
    // 목 딜레이
    await new Promise((r) => setTimeout(r, 900))
    setDispute((prev) => ({...prev, resolution: selectedResolution, adminNote}))
    setIsSubmitting(false)
    setDone(true)
  }
  
  return (
    <div className="max-w-[960px] mx-auto px-4 py-8">
      
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors
            bg-[var(--color-surface-raised)] border border-[var(--color-border)]
            hover:bg-[var(--color-surface-sunken)]"
        >
          <ChevronLeft size={18} style={{color: 'var(--color-text-sub)'}} strokeWidth={2}/>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <AlertOctagon size={18} style={{color: 'var(--color-warning)'}} strokeWidth={1.75}/>
            <h1 className="text-[20px] font-bold" style={{color: 'var(--color-text-main)'}}>
              분쟁 처리
            </h1>
          </div>
          <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
            분쟁 #{dispute.id} · 거래 #{dispute.tradeId} · {dispute.createdAt} 접수
          </p>
        </div>
      </div>
      
      {/* 판정 완료 배너 */}
      {(dispute.resolution || done) && (
        <div
          className="mb-6 px-5 py-4 rounded-[12px] flex items-center gap-3 animate-fadeInUp"
          style={{background: 'rgba(0,179,110,0.08)', border: '1px solid rgba(0,179,110,0.3)'}}
        >
          <ShieldCheck size={20} style={{color: 'var(--color-success)'}} strokeWidth={1.75}/>
          <div>
            <p className="text-[14px] font-semibold" style={{color: 'var(--color-success)'}}>
              분쟁 판정 완료
            </p>
            <p className="text-[13px]" style={{color: 'var(--color-text-sub)'}}>
              판정:&nbsp;
              {RESOLUTION_OPTIONS.find((r) => r.key === (dispute.resolution ?? selectedResolution))?.label}
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        
        {/* ── 왼쪽 ── */}
        <div className="flex flex-col gap-5">
          
          {/* 거래 개요 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <p className="text-[13px] font-semibold uppercase tracking-wide mb-3"
               style={{color: 'var(--color-text-hint)'}}>
              거래 정보
            </p>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-[16px] font-bold mb-1" style={{color: 'var(--color-text-main)'}}>
                  {trade?.post?.title ?? dispute.postTitle}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[13px] font-bold px-2 py-0.5 rounded-[4px] text-white"
                    style={{background: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                  >
                    {dispute.grade}
                  </span>
                  <span className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
                    {dispute.sport} · {dispute.deliveryType}
                  </span>
                </div>
              </div>
              <p
                className="text-[22px] font-bold flex-shrink-0"
                style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
              >
                {formatPrice(trade?.tradePrice ?? dispute.price)}
              </p>
            </div>
            
            {/* 거래 타임라인 */}
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {dispute.timeline.map((t, i) => (
                <div key={i} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: t.done ? 'var(--color-primary)' : 'var(--color-surface-sunken)',
                        border: t.done ? 'none' : '1.5px solid var(--color-border)',
                      }}
                    >
                      {t.done ? (
                        <CheckCircle2 size={12} color="#fff" strokeWidth={2.5}/>
                      ) : (
                        <Clock size={10} style={{color: 'var(--color-text-hint)'}} strokeWidth={1.75}/>
                      )}
                    </div>
                    <span
                      className="text-[12px] whitespace-nowrap"
                      style={{color: t.done ? 'var(--color-text-sub)' : 'var(--color-text-hint)'}}
                    >
                      {t.label}
                    </span>
                    <span
                      className="text-[12px]"
                      style={{color: 'var(--color-text-hint)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                    >
                      {t.date}
                    </span>
                  </div>
                  {i < dispute.timeline.length - 1 && (
                    <div
                      className="w-8 h-[1.5px] flex-shrink-0 mb-[22px]"
                      style={{background: t.done ? 'var(--color-primary)' : 'var(--color-border)'}}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* 구매자 / 판매자 주장 */}
          {[
            {party: '구매자', data: dispute.buyer, role: 'buyer' as const},
            {party: '판매자', data: dispute.seller, role: 'seller' as const},
          ].map(({party, data}) => (
            <div
              key={party}
              className="rounded-[12px] p-5"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white flex-shrink-0"
                  style={{background: data.avatarColor, fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                >
                  {data.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                    {data.nickname}
                  </p>
                  <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
                    {party} 주장
                  </p>
                </div>
                <Link
                  to={`/admin/members/${data.id}`}
                  className="ml-auto text-[13px] font-medium transition-colors
                    text-[var(--color-text-hint)] hover:text-[var(--color-accent)]"
                >
                  회원 상세 &rsaquo;
                </Link>
              </div>
              <div
                className="px-4 py-3 rounded-[8px] text-[14px] leading-relaxed"
                style={{
                  background: 'var(--color-surface-sunken)',
                  color: 'var(--color-text-sub)',
                }}
              >
                {data.claim}
              </div>
            </div>
          ))}
          
          {/* 제출된 증거 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText size={15} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
              <h3 className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                제출 증거 ({dispute.evidenceCount}건)
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({length: dispute.evidenceCount}).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-[8px] flex items-center justify-center cursor-pointer
                    transition-opacity hover:opacity-80"
                  style={{
                    background: ['#B5222B', '#002147', '#1A7A40', '#6B0078'][i % 4],
                    opacity: 0.8,
                  }}
                >
                  <FileText size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.5}/>
                </div>
              ))}
            </div>
            <p className="text-[13px] mt-2" style={{color: 'var(--color-text-hint)'}}>
              이미지를 클릭하면 원본 파일을 확인할 수 있습니다.
            </p>
          </div>
        </div>
        
        {/* ── 오른쪽: 판정 패널 ── */}
        <div>
          <div
            className="rounded-[12px] p-5 sticky top-24"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-4">
              <Gavel size={16} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
              <p className="text-[14px] font-bold" style={{color: 'var(--color-text-main)'}}>
                분쟁 판정
              </p>
            </div>
            
            {/* 판정 선택 */}
            <div className="flex flex-col gap-2.5 mb-4">
              {RESOLUTION_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={!!dispute.resolution || done}
                  onClick={() => setSelectedResolution(opt.key)}
                  className="w-full text-left px-4 py-3 rounded-[10px] transition-colors border
                    disabled:cursor-default"
                  style={{
                    background: selectedResolution === opt.key ? `${opt.color}12` : 'var(--color-surface-raised)',
                    borderColor: selectedResolution === opt.key ? opt.color : 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{borderColor: selectedResolution === opt.key ? opt.color : 'var(--color-border)'}}
                    >
                      {selectedResolution === opt.key && (
                        <div className="w-1.5 h-1.5 rounded-full" style={{background: opt.color}}/>
                      )}
                    </div>
                    <span className="text-[14px] font-semibold" style={{color: opt.color}}>
                      {opt.label}
                    </span>
                  </div>
                  <p className="text-[13px] pl-5" style={{color: 'var(--color-text-hint)'}}>
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
            
            {/* 관리자 메모 */}
            <div className="mb-4">
              <label className="block text-[13px] font-medium mb-1.5" style={{color: 'var(--color-text-sub)'}}>
                관리자 메모 (내부용)
              </label>
              <textarea
                rows={4}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                disabled={!!dispute.resolution || done}
                placeholder="판정 근거, 처리 내용 등을 기록하세요."
                className="w-full rounded-[8px] px-3 py-2.5 text-[13px] resize-none outline-none transition-colors
                  bg-[var(--color-surface-sunken)] border border-[var(--color-border)]
                  text-[var(--color-text-main)] placeholder:text-[var(--color-text-hint)]
                  focus:border-[var(--color-primary)] disabled:opacity-60"
              />
            </div>
            
            {/* 판정 확정 버튼 */}
            <button
              type="button"
              onClick={handleResolve}
              disabled={!selectedResolution || !!dispute.resolution || done || isSubmitting}
              className="w-full h-[48px] rounded-[10px] text-[14px] font-bold text-white
                transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
              style={{background: 'var(--color-primary)'}}
            >
              {done ? (
                <>
                  <ShieldCheck size={16} strokeWidth={2}/>
                  판정 완료
                </>
              ) : isSubmitting ? '처리 중...' : (
                <>
                  <Gavel size={16} strokeWidth={1.75}/>
                  판정 확정
                </>
              )}
            </button>
            
            {!selectedResolution && !dispute.resolution && !done && (
              <p className="text-[13px] text-center mt-2" style={{color: 'var(--color-text-hint)'}}>
                판정 유형을 먼저 선택해 주세요
              </p>
            )}
            
            {/* 유의사항 */}
            <div className="mt-5 pt-4" style={{borderTop: '1px solid var(--color-border)'}}>
              <p className="text-[13px] leading-relaxed" style={{color: 'var(--color-text-hint)'}}>
                판정 확정 후 자동으로 에스크로 환불 또는 정산이 처리됩니다.
                양측에 판정 결과가 이메일로 발송됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
