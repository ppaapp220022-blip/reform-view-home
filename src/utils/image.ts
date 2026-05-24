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

/**
 * flattenImageToWhite — 투명 배경 이미지를 흰색 배경으로 합성
 *
 * PNG 등 알파 채널이 있는 이미지를 업로드하면
 * 다크모드 배경색이 비쳐 보이는 문제를 방지한다.
 * canvas로 흰색 배경 위에 이미지를 합성한 뒤 JPEG Blob으로 반환.
 *
 * @param file - 원본 이미지 File 객체
 * @returns 흰색 배경으로 합성된 JPEG File (실패 시 원본 반환)
 */
export function flattenImageToWhite(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        // canvas 미지원 환경 fallback — 원본 그대로 사용
        resolve(file)
        return
      }
      
      // 1단계: 흰색 배경 채우기
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 2단계: 원본 이미지 합성 (알파 블렌딩)
      ctx.drawImage(img, 0, 0)
      
      // 3단계: JPEG Blob으로 변환 (품질 92%)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file) // 변환 실패 시 원본 사용
            return
          }
          // 확장자를 .jpg로 통일
          const baseName = file.name.replace(/\.[^.]+$/, '')
          const flatFile = new File([blob], `${baseName}.jpg`, {type: 'image/jpeg'})
          resolve(flatFile)
        },
        'image/jpeg',
        0.92,
      )
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file) // 로드 실패 시 원본 사용
    }
    
    img.src = objectUrl
  })
}
