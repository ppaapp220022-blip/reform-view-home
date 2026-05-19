/**
 * Pagination — 공통 페이지네이션 컴포넌트
 *
 * props:
 *   page        — 현재 페이지 (0-based)
 *   totalPages  — 전체 페이지 수
 *   onChange    — 페이지 변경 콜백 (0-based 인덱스 전달)
 *
 * 레이아웃:
 *   < 이전  |  1 2 … 5 6 7 … 19 20  |  다음 >
 *   현재 페이지 주변 최대 5개 버튼 표시, 양 끝 1페이지 고정
 */
import {ChevronLeft, ChevronRight} from 'lucide-react'

interface PaginationProps {
  /** 현재 페이지 (0-based) */
  page: number
  /** 전체 페이지 수 */
  totalPages: number
  /** 페이지 변경 시 호출 (0-based 인덱스 전달) */
  onChange: (page: number) => void
  className?: string
}

/**
 * 현재 페이지 주변 표시할 페이지 번호 배열을 계산한다.
 * 총 페이지가 적으면 전체, 많으면 앞/뒤 1페이지 + 중앙 슬라이딩 윈도우 방식.
 * null은 '…' 구분자를 의미한다.
 */
function buildPageNumbers(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    // 7페이지 이하: 전부 표시
    return Array.from({length: totalPages}, (_, i) => i)
  }

  const pages: (number | null)[] = []
  // 앞쪽 첫 페이지
  pages.push(0)

  const left = Math.max(1, page - 2)
  const right = Math.min(totalPages - 2, page + 2)

  // 왼쪽 … 구분자 (첫 페이지와 윈도우 사이에 gap이 있을 때)
  if (left > 1) pages.push(null)

  // 중앙 슬라이딩 윈도우
  for (let i = left; i <= right; i++) {
    pages.push(i)
  }

  // 오른쪽 … 구분자
  if (right < totalPages - 2) pages.push(null)

  // 뒤쪽 마지막 페이지
  pages.push(totalPages - 1)

  return pages
}

export default function Pagination({page, totalPages, onChange, className}: PaginationProps) {
  // 1페이지 이하면 렌더링 불필요
  if (totalPages <= 1) return null

  const pageNumbers = buildPageNumbers(page, totalPages)

  // 공통 버튼 스타일 클래스
  const baseBtn = 'flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all select-none'

  return (
    <div className={`flex items-center justify-center gap-1 mt-8 ${className ?? ''}`}>
      {/* 이전 버튼 */}
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className={`${baseBtn} border`}
        style={{
          borderColor: 'var(--color-border)',
          color: page === 0 ? 'var(--color-text-hint)' : 'var(--color-text-sub)',
          background: 'var(--color-surface)',
          opacity: page === 0 ? 0.4 : 1,
          cursor: page === 0 ? 'not-allowed' : 'pointer',
        }}
        aria-label="이전 페이지"
      >
        <ChevronLeft size={16} strokeWidth={2}/>
      </button>

      {/* 페이지 번호 목록 */}
      {pageNumbers.map((num, idx) =>
        num === null ? (
          // … 구분자
          <span
            key={`ellipsis-${idx}`}
            className="flex items-center justify-center w-9 h-9 text-sm select-none"
            style={{color: 'var(--color-text-hint)'}}
          >
            …
          </span>
        ) : (
          // 페이지 번호 버튼
          <button
            key={num}
            onClick={() => onChange(num)}
            className={baseBtn}
            style={
              num === page
                ? {
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  border: '1px solid var(--color-primary)',
                }
                : {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-sub)',
                  border: '1px solid var(--color-border)',
                }
            }
            aria-label={`${num + 1}페이지`}
            aria-current={num === page ? 'page' : undefined}
          >
            {num + 1}
          </button>
        ),
      )}

      {/* 다음 버튼 */}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages - 1}
        className={`${baseBtn} border`}
        style={{
          borderColor: 'var(--color-border)',
          color: page === totalPages - 1 ? 'var(--color-text-hint)' : 'var(--color-text-sub)',
          background: 'var(--color-surface)',
          opacity: page === totalPages - 1 ? 0.4 : 1,
          cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
        }}
        aria-label="다음 페이지"
      >
        <ChevronRight size={16} strokeWidth={2}/>
      </button>
    </div>
  )
}
