/**
 * format.ts — 표시값 포맷 유틸
 *
 * 금액 포맷 규칙:
 *   ₩ 기호   → IAMAPLAYER unicode 범위 밖(U+20A9)이므로 Giants fallback 렌더링
 *   숫자(X,XXX) → IAMAPLAYER 렌더링 (fontFamily: "'IAMAPLAYER',Giants,sans-serif" 필요)
 *
 * 사용 예:
 *   <span style={{ fontFamily:"'IAMAPLAYER',Giants,sans-serif" }}>
 *     {formatPrice(78000)}  → ₩78,000
 *   </span>
 */

/**
 * 금액을 ₩X,XXX 형식으로 포맷
 * (천 단위 콤마, ₩ 기호 앞, '원' 없음)
 */
export function formatPrice(n: number): string {
  return '₩' + n.toLocaleString('ko-KR')
}

/**
 * 숫자를 천 단위 콤마로만 포맷 (단위 기호 없음)
 * 예: 1200 → '1,200'
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

/**
 * 포인트를 P 단위로 포맷
 * 예: 200 → '+200P', -50 → '-50P'
 */
export function formatPoints(n: number): string {
  return (n > 0 ? '+' : '') + n + 'P'
}
