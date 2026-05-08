/**
 * Footer
 *
 * 디자인 룰:
 * - surface 배경, 상단 border
 * - 로고: re-form_logo_simple.svg (compact → simple variant)
 * - 카피라이트 텍스트: IAMAPLAYER 폰트
 */
import Logo from '../ui/Logo'

const FOOTER_COLS = [
  {
    heading: '서비스',
    links: ['소개', '판매하기', '거래 가이드', '안전 거래'],
  },
  {
    heading: '커뮤니티',
    links: ['공지사항', '이적시장', '리뷰', '구단별 게시판'],
  },
  {
    heading: '정책',
    links: ['이용약관', '개인정보처리방침', '수수료 안내', '분쟁 조정'],
  },
  {
    heading: '고객센터',
    links: ['1:1 문의', '자주 묻는 질문', '신고 센터'],
  },
] as const

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="max-w-[1280px] mx-auto px-7 pt-10 pb-8">

        <div className="grid gap-8" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr' }}>

          {/* 브랜드 소개 — simple variant: 푸터 좁은 공간 */}
          <div>
            <Logo variant="simple" height={24} />

            <p className="mt-3.5 text-[13px] text-[var(--color-text-sub)] leading-relaxed max-w-[280px]">
              스포츠 유니폼을 가장 빠르게 거래하는 곳.<br />
              팬을 위한 신뢰 기반 리셀 마켓.
            </p>

            <div className="mt-3.5 flex gap-1.5 flex-wrap">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-primary)] text-white tracking-[0.08em]"
                style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif" }}
              >
                SAFE TRADE
              </span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--color-gold)] text-[var(--color-primary)] tracking-[0.08em]"
                style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif" }}
              >
                MVP VERIFIED
              </span>
            </div>
          </div>

          {FOOTER_COLS.map(({ heading, links }) => (
            <div key={heading}>
              <div className="text-[13px] font-bold text-[var(--color-text-main)] mb-3">
                {heading}
              </div>
              {links.map((label) => (
                <div
                  key={label}
                  className="text-[13px] text-[var(--color-text-sub)] py-1.5 cursor-pointer hover:text-[var(--color-primary)] transition-colors"
                >
                  {label}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-[18px] border-t border-[var(--color-border)] flex justify-between items-center">
          <span
            className="text-[12px] tracking-[0.08em] text-[var(--color-text-sub)]"
            style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif" }}
          >
            © 2025 RE:FORM. ALL RIGHTS RESERVED.
          </span>
          <span
            className="text-[12px] tracking-[0.08em] text-[var(--color-text-sub)]"
            style={{ fontFamily: "'IAMAPLAYER','Bebas Neue',sans-serif" }}
          >
            RESELL · COMMUNITY · UNIFORMS
          </span>
        </div>
      </div>
    </footer>
  )
}
