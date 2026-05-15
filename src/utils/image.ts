/**
 * image.ts — 이미지 URL 유효성 검증 유틸리티
 *
 * 백엔드는 이미지를 로컬 디스크(./uploads)에 저장하고
 * Spring MVC resource handler가 /uploads/... 경로로 서빙한다.
 * Vite dev server proxy가 /uploads 를 http://localhost:8080 으로 포워딩.
 *
 * 유효 URL 조건:
 *   - /uploads/...  → 상대경로, Vite 프록시 경유
 *   - http:// or https:// → 절대 URL (프로덕션 CDN 등)
 *
 * 무효 처리 (null 반환):
 *   - null / undefined / 빈 문자열
 *   - bare filename: "6-1.jpg", "photo.png" (슬래시·프로토콜 없음)
 *   - 알 수 없는 형식 (위 조건 미충족)
 *
 * 사용 예:
 *   const src = resolveImageUrl(item.thumbnailUrl)
 *   {src ? <img src={src} onError={...} /> : <Placeholder />}
 */

/**
 * 이미지 URL을 검증하고 유효하면 그대로 반환, 무효면 null 반환.
 *
 * @param url - 백엔드에서 받은 이미지 URL (null·undefined 허용)
 * @returns 유효한 URL 문자열 또는 null
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') return null
  const trimmed = url.trim()
  // 상대경로(/uploads/... 등) 또는 절대 URL(http·https)만 허용
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed
  }
  // bare filename("6-1.jpg") 또는 잘못된 형식 → 무효
  return null
}
