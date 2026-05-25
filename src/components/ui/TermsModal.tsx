/**
 * TermsModal — 이용약관 / 개인정보처리방침 / 마케팅 동의 전문 표시 모달
 *
 * 사용:
 *   <TermsModal type="service"   onClose={() => setOpen(false)} />
 *   <TermsModal type="privacy"   onClose={() => setOpen(false)} />
 *   <TermsModal type="marketing" onClose={() => setOpen(false)} />
 */
import {useEffect} from 'react'
import {X} from 'lucide-react'

export type TermsType = 'service' | 'privacy' | 'marketing'

interface TermsModalProps {
  type: TermsType
  onClose: () => void
}

// ── 약관 콘텐츠 ─────────────────────────────────────────────────────────────

const SERVICE_TERMS = `제1조 (목적)
이 약관은 RE:FORM(이하 "회사")이 제공하는 스포츠 용품 리셀 마켓플레이스 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.

제2조 (정의)
① "서비스"란 회사가 제공하는 중고 스포츠 용품 거래 플랫폼 및 이와 관련된 제반 서비스를 의미합니다.
② "이용자"란 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.
③ "회원"이란 회사와 이용계약을 체결하고 이용자 아이디(ID)를 부여받은 자로서, 회사의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 말합니다.

제3조 (약관의 게시와 개정)
① 회사는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
② 회사는 콘텐츠산업진흥법, 전자상거래 등에서의 소비자보호에 관한 법률, 약관의 규제에 관한 법률 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.

제4조 (서비스의 제공 및 변경)
① 회사는 다음과 같은 서비스를 제공합니다.
   - 스포츠 용품 중고 거래 중개 서비스
   - 안전결제 서비스
   - 커뮤니티 게시판 서비스
   - 기타 회사가 추가 개발하거나 다른 회사와의 제휴계약 등을 통해 이용자에게 제공하는 일체의 서비스
② 회사는 서비스의 내용을 변경할 수 있으며, 이 경우 변경된 서비스의 내용 및 제공일자를 명시하여 현재의 서비스 내용을 게시한 곳에 즉시 공지합니다.

제5조 (거래의 안전)
① 회사는 안전결제 시스템을 통해 이용자 간 거래의 안전을 도모합니다.
② 이용자는 타인의 명의를 도용하거나 허위 정보를 이용하여 거래를 진행할 수 없습니다.
③ 이용자는 거래 과정에서 타인에게 피해를 줄 수 있는 행위를 하여서는 안 됩니다.

제6조 (이용자의 의무)
이용자는 다음 행위를 하여서는 안 됩니다.
① 신청 또는 변경 시 허위 내용의 등록
② 타인의 정보 도용
③ 회사가 게시한 정보의 변경
④ 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시
⑤ 회사와 기타 제3자의 저작권 등 지식재산권에 대한 침해
⑥ 회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위
⑦ 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위

제7조 (서비스 이용의 제한)
회사는 이용자가 이 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.

제8조 (분쟁 해결)
회사와 이용자 간 발생한 분쟁은 회사의 분쟁 처리 절차에 따라 처리됩니다. 분쟁이 해결되지 않을 경우 관련 법령에 따라 처리됩니다.

부칙
이 약관은 2026년 1월 1일부터 시행됩니다.`

const PRIVACY_TERMS = `RE:FORM 개인정보처리방침

RE:FORM(이하 "회사")은 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고 개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.

1. 개인정보의 처리 목적
회사는 다음의 목적을 위하여 개인정보를 처리합니다.
① 회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지 목적으로 개인정보를 처리합니다.
② 서비스 제공: 중고 스포츠 용품 거래 중개, 안전결제, 콘텐츠 제공, 맞춤서비스 제공 목적으로 개인정보를 처리합니다.
③ 민원처리: 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보 목적으로 개인정보를 처리합니다.

2. 수집하는 개인정보의 항목
회사는 다음의 개인정보 항목을 처리하고 있습니다.
① 필수항목: 이메일 주소, 닉네임, 비밀번호(암호화 저장)
② 선택항목: 프로필 이미지, 관심 종목·구단 정보
③ 자동수집 항목: 서비스 이용기록, 접속 로그, IP정보

3. 개인정보의 처리 및 보유 기간
① 회원 정보: 회원 탈퇴 시까지 (단, 관련 법령에 따라 일정 기간 보관)
② 거래 기록: 전자상거래 등에서의 소비자보호에 관한 법률에 따라 5년
③ 접속 로그: 통신비밀보호법에 따라 3개월

4. 개인정보의 제3자 제공
회사는 정보주체의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
① 정보주체가 사전에 동의한 경우
② 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

5. 정보주체의 권리·의무 및 행사방법
이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.
① 개인정보 열람요구
② 오류 등이 있을 경우 정정 요구
③ 삭제요구
④ 처리정지 요구

6. 개인정보의 파기
회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.

7. 개인정보 보호책임자
성명: RE:FORM 개인정보 보호팀
이메일: privacy@reform.co.kr

이 방침은 2026년 1월 1일부터 시행됩니다.`

const TERMS_CONTENT: Record<TermsType, { title: string; content: string }> = {
  service: {
    title: '이용약관',
    content: SERVICE_TERMS,
  },
  privacy: {
    title: '개인정보처리방침',
    content: PRIVACY_TERMS,
  },
  marketing: {
    title: '마케팅 정보 수신 동의',
    content: `마케팅 정보 수신 동의 (선택)

RE:FORM은 아래와 같이 마케팅 정보를 발송합니다. 동의하지 않으셔도 서비스 이용에 제한이 없습니다.

1. 수신 목적
   - 신규 서비스 및 상품 안내
   - 이벤트 및 프로모션 안내
   - 맞춤형 상품 추천 및 혜택 안내
   - RE:FORM 커뮤니티 인기 게시글 알림

2. 수신 채널
   - 이메일
   - 앱 푸시 알림 (앱 설치 시)

3. 보유 및 이용 기간
   수신 동의 철회 시 또는 회원 탈퇴 시까지.
   동의 철회는 마이페이지 > 알림 설정에서 언제든지 가능합니다.

4. 동의 거부 권리
   마케팅 수신 동의는 선택 사항입니다. 동의하지 않으셔도 RE:FORM의 기본 서비스 이용에 불이익이 없습니다.

본 동의는 2025년 1월 1일부터 적용됩니다.`,
  },
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function TermsModal({type, onClose}: TermsModalProps) {
  const {title, content} = TERMS_CONTENT[type]
  
  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    
    window.addEventListener('keydown', handleKeyDown)
    // 모달 열린 동안 body 스크롤 잠금
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])
  
  return (
    /* 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background: 'rgba(0,0,0,0.5)'}}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* 모달 패널 — 클릭 버블 차단 */}
      <div
        className="w-full max-w-[560px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-modal bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b border-border"
        >
          <h2 className="text-[15px] font-semibold text-[var(--color-text-main)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-hint)] hover:text-[var(--color-text-sub)] hover:bg-[var(--color-surface-raised)] transition-colors"
            aria-label="닫기"
          >
            <X size={18} strokeWidth={1.75}/>
          </button>
        </div>
        
        {/* 본문 — 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <pre
            className="text-[14px] leading-relaxed whitespace-pre-wrap font-sans text-text-sub"
          >
            {content}
          </pre>
        </div>
        
        {/* 푸터 */}
        <div
          className="px-6 py-4 flex-shrink-0 border-t border-border"
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-[8px] text-[14px] font-medium text-white transition-colors hover:opacity-90 bg-primary"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
