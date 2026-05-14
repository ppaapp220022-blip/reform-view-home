/**
 * AdminDashboardPage — 관리자 대시보드 (Screen 9)
 *
 * 구성:
 *   StatCard     — 핵심 KPI (총 회원·오늘 거래·미처리 신고·분쟁 건수)
 *   RecentReports  — 최근 신고 목록 (빠른 처리 링크)
 *   RecentMembers  — 최근 가입 회원 목록
 *   RecentTrades   — 최근 거래 현황
 *   QuickActions   — 관리 바로가기
 *
 * 데이터: 목 데이터 (추후 Admin API 연동)
 * 권한: Role.ADMIN 전용 (현재는 목 고정)
 */
import {formatPrice} from '../../utils/format'
import {Link} from 'react-router-dom'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {useState} from 'react'
import {
  Users, ShoppingBag, Flag, AlertOctagon,
  TrendingUp, ChevronRight, CheckCircle2,
  XCircle, Shield, BarChart2, Bell, Banknote, AlertCircle,
} from 'lucide-react'
import {getAdminWithdrawList, processWithdraw} from '../../features/admin/api/adminApi'
import type {AdminWithdrawItem} from '../../features/admin/api/adminApi'

// ── 목 데이터 ─────────────────────────────────────────────────────────────────

const STATS = [
  {label: '총 회원', value: '2,847', sub: '오늘 +12', icon: Users, color: 'var(--color-primary)'},
  {label: '오늘 거래', value: '138', sub: '전일 대비 +23%', icon: ShoppingBag, color: 'var(--color-success)'},
  {label: '미처리 신고', value: '7', sub: '즉시 처리 필요', icon: Flag, color: 'var(--color-accent)'},
  {label: '진행 중 분쟁', value: '3', sub: '48시간 내 처리', icon: AlertOctagon, color: 'var(--color-warning)'},
]

type ReportStatus = 'PENDING' | 'NORMAL' | 'WARNING' | 'DELETED'
type ReportReason = 'FAKE' | 'INAPPROPRIATE' | 'FRAUD' | 'ETC'

interface ReportRow {
  id: number
  reporterNickname: string
  targetType: 'POST' | 'COMMUNITY_POST'
  reason: ReportReason
  detail: string
  status: ReportStatus
  createdAt: string
}

const MOCK_REPORTS: ReportRow[] = [
  {
    id: 1,
    reporterNickname: 'soccer_fan99',
    targetType: 'POST',
    reason: 'FRAUD',
    detail: '결제 후 연락 두절 의심',
    status: 'PENDING',
    createdAt: '2026-05-09 14:32'
  },
  {
    id: 2,
    reporterNickname: 'hoops_king',
    targetType: 'POST',
    reason: 'FAKE',
    detail: '가품으로 의심되는 유니폼',
    status: 'PENDING',
    createdAt: '2026-05-09 11:15'
  },
  {
    id: 3,
    reporterNickname: 'barca_fan99',
    targetType: 'COMMUNITY_POST',
    reason: 'INAPPROPRIATE',
    detail: '욕설 및 인신공격성 댓글 포함',
    status: 'PENDING',
    createdAt: '2026-05-09 09:04'
  },
  {
    id: 4,
    reporterNickname: 'hoops_seoul',
    targetType: 'POST',
    reason: 'FRAUD',
    detail: '가격 부풀리기 의심',
    status: 'WARNING',
    createdAt: '2026-05-08 17:20'
  },
  {
    id: 5,
    reporterNickname: 'volley_pro',
    targetType: 'POST',
    reason: 'FAKE',
    detail: '동일 이미지 반복 게시',
    status: 'DELETED',
    createdAt: '2026-05-08 10:00'
  },
]

type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN'

interface MemberRow {
  id: number
  nickname: string
  email: string
  status: MemberStatus
  warningCount: number
  tradeCount: number
  joinedAt: string
}

const MOCK_MEMBERS: MemberRow[] = [
  {
    id: 101,
    nickname: 'jersey_master',
    email: 'jmaster@gmail.com',
    status: 'ACTIVE',
    warningCount: 0,
    tradeCount: 47,
    joinedAt: '2026-05-09'
  },
  {
    id: 102,
    nickname: 'uniform_king',
    email: 'uking@naver.com',
    status: 'ACTIVE',
    warningCount: 0,
    tradeCount: 32,
    joinedAt: '2026-05-08'
  },
  {
    id: 103,
    nickname: 'fraud_suspect',
    email: 'suspect@hotmail.com',
    status: 'SUSPENDED',
    warningCount: 3,
    tradeCount: 5,
    joinedAt: '2026-05-07'
  },
  {
    id: 104,
    nickname: 'faker_fan',
    email: 'fakerfan@gmail.com',
    status: 'ACTIVE',
    warningCount: 1,
    tradeCount: 12,
    joinedAt: '2026-05-06'
  },
  {
    id: 105,
    nickname: 'barca_fan99',
    email: 'barca99@kakao.com',
    status: 'ACTIVE',
    warningCount: 0,
    tradeCount: 8,
    joinedAt: '2026-05-05'
  },
]

interface TradeRow {
  id: number
  postTitle: string
  buyerNickname: string
  sellerNickname: string
  price: number
  status: string
  createdAt: string
}

const MOCK_TRADES: TradeRow[] = [
  {
    id: 201,
    postTitle: '맨유 23/24 홈 어센틱',
    buyerNickname: 'jersey_master',
    sellerNickname: 'uniform_king',
    price: 78000,
    status: 'COMPLETED',
    createdAt: '2026-05-09'
  },
  {
    id: 202,
    postTitle: '바르셀로나 22/23 어웨이',
    buyerNickname: 'barca_fan99',
    sellerNickname: 'uniform_pro',
    price: 48000,
    status: 'IN_PROGRESS',
    createdAt: '2026-05-09'
  },
  {
    id: 203,
    postTitle: '전북 현대 2024 홈',
    buyerNickname: 'hoops_king',
    sellerNickname: 'kbo_master',
    price: 66000,
    status: 'DISPUTED',
    createdAt: '2026-05-08'
  },
  {
    id: 204,
    postTitle: 'T1 2024 스프링 유니폼',
    buyerNickname: 'faker_fan',
    sellerNickname: 'esports_shop',
    price: 85000,
    status: 'PAID',
    createdAt: '2026-05-08'
  },
  {
    id: 205,
    postTitle: '서울 SK 나이츠 23/24 홈',
    buyerNickname: 'hoops_seoul',
    sellerNickname: 'kbl_shop',
    price: 71000,
    status: 'CONFIRMED',
    createdAt: '2026-05-07'
  },
]

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  PENDING: {label: '미처리', color: 'var(--color-warning)', bg: 'rgba(255,149,0,0.1)'},
  NORMAL: {label: '정상', color: 'var(--color-success)', bg: 'rgba(0,179,110,0.1)'},
  WARNING: {label: '경고', color: 'var(--color-accent)', bg: 'rgba(255,46,77,0.1)'},
  DELETED: {label: '삭제됨', color: 'var(--color-text-hint)', bg: 'var(--color-surface-sunken)'},
}

const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  FAKE: '허위 매물',
  INAPPROPRIATE: '부적절 게시글',
  FRAUD: '사기 의심',
  ETC: '기타',
}

const MEMBER_STATUS_META: Record<MemberStatus, { label: string; color: string }> = {
  ACTIVE: {label: '활성', color: 'var(--color-success)'},
  SUSPENDED: {label: '정지', color: 'var(--color-accent)'},
  WITHDRAWN: {label: '탈퇴', color: 'var(--color-text-hint)'},
}

const TRADE_STATUS_KO: Record<string, { label: string; color: string }> = {
  REQUESTED: {label: '거래 요청', color: 'var(--color-info)'},
  ACCEPTED: {label: '수락', color: 'var(--color-info)'},
  PAID: {label: '결제 완료', color: 'var(--color-primary)'},
  IN_PROGRESS: {label: '배송 중', color: 'var(--color-primary)'},
  CONFIRMED: {label: '수령 확인', color: 'var(--color-success)'},
  COMPLETED: {label: '거래 완료', color: 'var(--color-success)'},
  CANCELED: {label: '취소', color: 'var(--color-text-hint)'},
  DISPUTED: {label: '분쟁', color: 'var(--color-accent)'},
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

function SectionHeader({title, linkTo, linkLabel}: { title: string; linkTo?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-bold" style={{color: 'var(--color-text-main)'}}>
        {title}
      </h2>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-1 text-[12px] font-medium transition-colors
            text-[var(--color-text-hint)] hover:text-[var(--color-accent)]"
        >
          {linkLabel ?? '전체 보기'}
          <ChevronRight size={13} strokeWidth={2}/>
        </Link>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
            <h1 className="text-[24px] font-bold" style={{color: 'var(--color-text-main)'}}>
              관리자 대시보드
            </h1>
          </div>
          <p className="text-[13px]" style={{color: 'var(--color-text-hint)'}}>
            2026년 5월 9일 기준 · 실시간 데이터
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 h-9 rounded-[8px] text-[13px] font-medium transition-colors
            bg-[var(--color-surface-raised)] text-[var(--color-text-sub)]
            border border-[var(--color-border)] hover:border-[var(--color-primary)]"
        >
          <Bell size={14} strokeWidth={1.75}/>
          알림 설정
        </button>
      </div>

      {/* ── KPI 카드 4개 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="rounded-[12px] p-5"
              style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-medium" style={{color: 'var(--color-text-hint)'}}>
                  {s.label}
                </p>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{background: `${s.color}18`}}
                >
                  <Icon size={15} style={{color: s.color}} strokeWidth={1.75}/>
                </div>
              </div>
              <p
                className="text-[28px] font-bold leading-none mb-1"
                style={{
                  color: 'var(--color-text-main)',
                  fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                }}
              >
                {s.value}
              </p>
              <p className="text-[11px]" style={{color: 'var(--color-text-hint)'}}>
                {s.sub}
              </p>
            </div>
          )
        })}
      </div>

      {/* ── 메인 그리드 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* 왼쪽 */}
        <div className="flex flex-col gap-6">

          {/* 미처리 신고 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <SectionHeader title="최근 신고 내역"/>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{borderCollapse: 'collapse'}}>
                <thead>
                <tr style={{borderBottom: '1px solid var(--color-border)'}}>
                  {['신고자', '대상', '사유', '접수일', '상태', ''].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-left font-semibold pr-3 last:pr-0"
                      style={{color: 'var(--color-text-hint)', fontSize: 11}}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
                </thead>
                <tbody>
                {MOCK_REPORTS.map((r) => {
                  const meta = REPORT_STATUS_META[r.status]
                  return (
                    <tr
                      key={r.id}
                      style={{borderBottom: '1px solid var(--color-border)'}}
                    >
                      <td className="py-3 pr-3 font-medium" style={{color: 'var(--color-text-main)'}}>
                        {r.reporterNickname}
                      </td>
                      <td className="py-3 pr-3" style={{color: 'var(--color-text-sub)'}}>
                          <span
                            className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium"
                            style={{
                              background: r.targetType === 'POST' ? 'rgba(14,165,233,0.1)' : 'rgba(255,184,0,0.1)',
                              color: r.targetType === 'POST' ? 'var(--color-info)' : 'var(--color-gold)',
                            }}
                          >
                            {r.targetType === 'POST' ? '판매글' : '커뮤니티'}
                          </span>
                      </td>
                      <td className="py-3 pr-3" style={{color: 'var(--color-text-sub)'}}>
                        {REPORT_REASON_LABEL[r.reason]}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap" style={{
                        color: 'var(--color-text-hint)',
                        fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                        fontSize: 12
                      }}>
                        {r.createdAt.slice(5)}
                      </td>
                      <td className="py-3 pr-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{background: meta.bg, color: meta.color}}
                          >
                            {meta.label}
                          </span>
                      </td>
                      <td className="py-3">
                        <Link
                          to={`/admin/reports/${r.id}`}
                          className="text-[11px] font-medium transition-colors
                              text-[var(--color-text-hint)] hover:text-[var(--color-accent)]"
                        >
                          처리 &rsaquo;
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 최근 거래 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <SectionHeader title="최근 거래 현황"/>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{borderCollapse: 'collapse'}}>
                <thead>
                <tr style={{borderBottom: '1px solid var(--color-border)'}}>
                  {['상품명', '구매자', '판매자', '금액', '상태'].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-left font-semibold pr-3 last:pr-0"
                      style={{color: 'var(--color-text-hint)', fontSize: 11}}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
                </thead>
                <tbody>
                {MOCK_TRADES.map((t) => {
                  const statusMeta = TRADE_STATUS_KO[t.status] ?? {label: t.status, color: 'var(--color-text-hint)'}
                  return (
                    <tr
                      key={t.id}
                      style={{borderBottom: '1px solid var(--color-border)'}}
                    >
                      <td className="py-3 pr-3 max-w-[160px] truncate font-medium"
                          style={{color: 'var(--color-text-main)'}}>
                        {t.postTitle}
                      </td>
                      <td className="py-3 pr-3" style={{color: 'var(--color-text-sub)'}}>
                        {t.buyerNickname}
                      </td>
                      <td className="py-3 pr-3" style={{color: 'var(--color-text-sub)'}}>
                        {t.sellerNickname}
                      </td>
                      <td className="py-3 pr-3 font-medium"
                          style={{color: 'var(--color-primary)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                        {formatPrice(t.price)}
                      </td>
                      <td className="py-3">
                          <span
                            className="text-[11px] font-medium"
                            style={{color: statusMeta.color}}
                          >
                            {statusMeta.label}
                          </span>
                      </td>
                    </tr>
                  )
                })}
                </tbody>
              </table>
            </div>
          </div>
          {/* 출금 요청 관리 — 실제 API 연동 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <SectionHeader title="출금 요청 관리"/>
            <WithdrawManagementSection/>
          </div>
        </div>

        {/* 오른쪽 */}
        <div className="flex flex-col gap-6">

          {/* 최근 가입 회원 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <SectionHeader title="최근 가입 회원"/>
            <div className="flex flex-col gap-3">
              {MOCK_MEMBERS.map((m) => {
                const statusMeta = MEMBER_STATUS_META[m.status]
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    {/* 아바타 */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white"
                      style={{
                        background: m.status === 'SUSPENDED' ? 'var(--color-accent)' : 'var(--color-primary)',
                        fontFamily: "'IAMAPLAYER',Giants,sans-serif",
                      }}
                    >
                      {m.nickname.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium truncate" style={{color: 'var(--color-text-main)'}}>
                          {m.nickname}
                        </p>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background: `${statusMeta.color}18`,
                            color: statusMeta.color,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                        {m.warningCount > 0 && (
                          <span className="text-[10px] font-medium flex-shrink-0"
                                style={{color: 'var(--color-warning)'}}>
                            ⚠ {m.warningCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] truncate" style={{color: 'var(--color-text-hint)'}}>
                        {m.email}
                      </p>
                    </div>
                    <Link
                      to={`/admin/members/${m.id}`}
                      className="flex-shrink-0 text-[11px] font-medium transition-colors
                        text-[var(--color-text-hint)] hover:text-[var(--color-accent)]"
                    >
                      상세
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 빠른 관리 바로가기 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <p className="text-[14px] font-bold mb-4" style={{color: 'var(--color-text-main)'}}>
              빠른 관리 메뉴
            </p>
            <div className="flex flex-col gap-2">
              {[
                {to: '/admin/reports/1', icon: Flag, label: '미처리 신고 처리', badge: '7', badgeColor: 'var(--color-accent)'},
                {
                  to: '/admin/disputes/1',
                  icon: AlertOctagon,
                  label: '분쟁 처리',
                  badge: '3',
                  badgeColor: 'var(--color-warning)'
                },
                {to: '/admin/members/103', icon: Users, label: '정지 회원 관리', badge: null, badgeColor: ''},
                {to: '/admin', icon: BarChart2, label: '통계 리포트', badge: null, badgeColor: ''},
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-colors
                      border border-[var(--color-border)] hover:border-[var(--color-primary)]
                      bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface)]"
                  >
                    <Icon size={15} style={{color: 'var(--color-primary)'}} strokeWidth={1.75}/>
                    <span className="flex-1 text-[13px] font-medium" style={{color: 'var(--color-text-main)'}}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                        style={{background: item.badgeColor, fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={14} style={{color: 'var(--color-text-hint)'}} strokeWidth={1.75}/>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* 오늘의 지표 요약 */}
          <div
            className="rounded-[12px] p-5"
            style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}
          >
            <p className="text-[14px] font-bold mb-4" style={{color: 'var(--color-text-main)'}}>
              오늘의 지표
            </p>
            <div className="flex flex-col gap-3">
              {[
                {label: '신규 판매글', value: '84건', icon: ShoppingBag, color: 'var(--color-primary)'},
                {label: '거래 완료', value: '41건', icon: CheckCircle2, color: 'var(--color-success)'},
                {label: '거래 취소', value: '7건', icon: XCircle, color: 'var(--color-accent)'},
                {label: '총 거래액', value: '₩3,240,000', icon: TrendingUp, color: 'var(--color-gold)'},
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={13} style={{color: item.color}} strokeWidth={1.75}/>
                      <span className="text-[12px]" style={{color: 'var(--color-text-sub)'}}>{item.label}</span>
                    </div>
                    <span
                      className="text-[13px] font-bold"
                      style={{color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}
                    >
                      {item.value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 시스템 상태 */}
          <div
            className="rounded-[12px] p-4"
            style={{background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)'}}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{background: 'var(--color-success)'}}/>
              <p className="text-[12px] font-semibold" style={{color: 'var(--color-text-main)'}}>
                시스템 정상 운영 중
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                {label: 'API 서버', ok: true},
                {label: 'DB 연결', ok: true},
                {label: 'AI 탐지 서버', ok: true},
                {label: '결제 게이트웨이', ok: true},
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[11px]" style={{color: 'var(--color-text-hint)'}}>{s.label}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full"
                         style={{background: s.ok ? 'var(--color-success)' : 'var(--color-accent)'}}/>
                    <span className="text-[10px] font-medium"
                          style={{color: s.ok ? 'var(--color-success)' : 'var(--color-accent)'}}>
                      {s.ok ? 'OK' : 'ERR'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 출금 요청 관리 섹션 — 실제 AdminController 연동 */
export function WithdrawManagementSection() {
  const qc = useQueryClient()
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({})
  const [rejectOpen, setRejectOpen] = useState<number | null>(null)

  const {data: list, isLoading, isError} = useQuery({
    queryKey: ['adminWithdraws'],
    queryFn: getAdminWithdrawList,
    staleTime: 15_000,
    refetchInterval: 30_000,  // 30초마다 자동 갱신
  })

  const approveMutation = useMutation({
    mutationFn: (withdrawId: number) =>
      processWithdraw(withdrawId, {action: 'APPROVE'}),
    onSuccess: () => void qc.invalidateQueries({queryKey: ['adminWithdraws']}),
  })

  const rejectMutation = useMutation({
    mutationFn: ({withdrawId, reason}: { withdrawId: number; reason: string }) =>
      processWithdraw(withdrawId, {action: 'REJECT', rejectReason: reason}),
    onSuccess: () => {
      setRejectOpen(null)
      void qc.invalidateQueries({queryKey: ['adminWithdraws']})
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{background: 'var(--color-surface)'}}/>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center py-8 gap-2">
        <AlertCircle size={24} style={{color: 'var(--color-error)'}}/>
        <p className="text-sm" style={{color: 'var(--color-text-hint)'}}>출금 요청 목록을 불러오지 못했습니다.</p>
      </div>
    )
  }

  const pending = (list ?? []).filter((i: AdminWithdrawItem) => i.status === 'PENDING')
  const processed = (list ?? []).filter((i: AdminWithdrawItem) => i.status !== 'PENDING')

  return (
    <div className="flex flex-col gap-5">
      {/* 대기 중 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Banknote size={16} color="var(--color-warning)"/>
          <h3 className="font-bold text-sm" style={{color: 'var(--color-text-main)'}}>
            출금 대기
            {pending.length > 0 && (
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{background: 'rgba(255,149,0,.15)', color: 'var(--color-warning)'}}>
                {pending.length}건
              </span>
            )}
          </h3>
        </div>

        {pending.length === 0 ? (
          <div className="py-8 text-center rounded-xl"
               style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
            <CheckCircle2 size={28} className="mx-auto mb-2" style={{color: 'var(--color-success)'}}/>
            <p className="text-sm font-display font-bold" style={{color: 'var(--color-text-main)'}}>처리 대기 중인 출금 요청이
              없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((item: AdminWithdrawItem) => (
              <div key={item.withdrawId}
                   className="rounded-xl p-4"
                   style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold"
                       style={{color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                      {formatPrice(item.requestAmount)}
                    </p>
                    <p className="text-xs mt-0.5" style={{color: 'var(--color-text-sub)'}}>
                      {item.bankName} {item.accountNumber}
                    </p>
                    <p className="text-[11px] mt-1" style={{color: 'var(--color-text-hint)'}}>
                      {new Date(item.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* 승인 */}
                    <button
                      onClick={() => approveMutation.mutate(item.withdrawId)}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{background: 'var(--color-success)'}}
                    >
                      승인
                    </button>
                    {/* 반려 */}
                    <button
                      onClick={() => setRejectOpen(item.withdrawId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{background: 'rgba(255,46,77,.1)', color: 'var(--color-accent)'}}
                    >
                      반려
                    </button>
                  </div>
                </div>

                {/* 반려 사유 입력 */}
                {rejectOpen === item.withdrawId && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={rejectReason[item.withdrawId] ?? ''}
                      onChange={e => setRejectReason(prev => ({...prev, [item.withdrawId]: e.target.value}))}
                      placeholder="반려 사유 입력 (최대 300자)"
                      maxLength={300}
                      className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                      style={{
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-surface-raised)',
                        color: 'var(--color-text-main)'
                      }}
                    />
                    <button
                      onClick={() => rejectMutation.mutate({
                        withdrawId: item.withdrawId,
                        reason: rejectReason[item.withdrawId] ?? '',
                      })}
                      disabled={rejectMutation.isPending}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{background: 'var(--color-accent)'}}
                    >
                      확인
                    </button>
                    <button
                      onClick={() => setRejectOpen(null)}
                      className="px-3 py-2 rounded-lg text-xs"
                      style={{background: 'var(--color-surface-raised)', color: 'var(--color-text-hint)'}}
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 처리 완료 */}
      {processed.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3" style={{color: 'var(--color-text-main)'}}>처리 완료</h3>
          <div className="flex flex-col gap-2">
            {processed.map((item: AdminWithdrawItem) => (
              <div key={item.withdrawId}
                   className="flex items-center justify-between px-4 py-3 rounded-xl"
                   style={{background: 'var(--color-surface)', border: '1px solid var(--color-border)'}}>
                <div>
                  <p className="text-sm font-semibold"
                     style={{color: 'var(--color-text-main)', fontFamily: "'IAMAPLAYER',Giants,sans-serif"}}>
                    {formatPrice(item.requestAmount)}
                  </p>
                  <p className="text-xs" style={{color: 'var(--color-text-hint)'}}>
                    {item.bankName} {item.accountNumber}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{
                        background: item.status === 'APPROVED' ? 'rgba(0,179,110,.1)' : 'rgba(255,46,77,.1)',
                        color: item.status === 'APPROVED' ? 'var(--color-success)' : 'var(--color-accent)',
                      }}>
                  {item.status === 'APPROVED' ? '승인' : '반려'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
