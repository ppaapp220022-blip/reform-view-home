/**
 * ConditionBadge — 컨디션 등급 뱃지 컴포넌트
 *
 * 메달 시스템:
 *   S급 = 금메달 (Gold)    — 미착용·1~2회 이내
 *   A급 = 은메달 (Silver)  — 5회 이하 착용
 *   B급 = 동메달 (Bronze)  — 10회 이하, 미세 보풀
 *   C급 = Accent (Red)    — 장기 착용·색바램
 *
 * CSS: index.css → .badge-grade / .badge-grade-{s|a|b|c}
 * 폰트: IAMAPLAYER (영문·숫자 전용) — 등급 레이블이 영문 단독이므로 Tier 1
 *
 * 사용 예)
 *   <ConditionBadge grade="S" />           → 'S급' 라벨
 *   <ConditionBadge grade="A" size="sm" /> → 소형
 *   <ConditionBadge grade="B" showLabel /> → 'B급 · 동메달' 전체 레이블
 */

import type {Grade} from '../../types/listing'

interface ConditionBadgeProps {
  /** 컨디션 등급 */
  grade: Grade
  /**
   * 뱃지 크기
   * - 'sm'  : 카드 썸네일 등 소형 컨텍스트 (text-2xs)
   * - 'md'  : 기본값 — 리스트·상세 페이지 (text-xs)
   * - 'lg'  : 상세 페이지 헤더 등 대형 (text-sm)
   */
  size?: 'sm' | 'md' | 'lg'
  /** 등급 레이블만('S급') 표시할지, 설명 포함('S급 · 금메달')도 표시할지 */
  showLabel?: boolean
  /** 추가 className */
  className?: string
}

/** 등급별 메타 정보 */
const GRADE_META: Record<Grade, { label: string; medal: string }> = {
  S: {label: 'S급', medal: '금메달'},
  A: {label: 'A급', medal: '은메달'},
  B: {label: 'B급', medal: '동메달'},
  C: {label: 'C급', medal: ''},
}

/** 크기별 폰트·패딩 Tailwind 클래스 */
const SIZE_CLASS: Record<NonNullable<ConditionBadgeProps['size']>, string> = {
  sm: 'text-2xs px-1.5 py-0.5',
  md: 'text-xs  px-2   py-0.5',
  lg: 'text-sm  px-2.5 py-1',
}

export default function ConditionBadge({
                                         grade,
                                         size = 'md',
                                         showLabel = false,
                                         className = '',
                                       }: ConditionBadgeProps) {
  const meta = GRADE_META[grade]
  const gradeKey = grade.toLowerCase() as 's' | 'a' | 'b' | 'c'
  
  return (
    <span
      /* badge-grade: 공통 메달 기반 스타일 (IAMAPLAYER 폰트·border·shadow)
         badge-grade-{s|a|b|c}: 등급별 금/은/동/Accent 그라디언트 */
      className={[
        'badge-grade',
        `badge-grade-${gradeKey}`,
        SIZE_CLASS[size],
        className,
      ].join(' ')}
      aria-label={showLabel && meta.medal ? `${meta.label} · ${meta.medal}` : meta.label}
    >
      {showLabel && meta.medal ? `${meta.label} · ${meta.medal}` : meta.label}
    </span>
  )
}
