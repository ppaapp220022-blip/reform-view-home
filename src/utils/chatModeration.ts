import type {ChatMessage, RiskAnalysisResult} from '../features/chat/api/chatApi'

interface LocalChatModerationRule {
  pattern: RegExp
  reason: string
  riskLevel: RiskAnalysisResult['riskLevel']
}

/**
 * 백엔드 ModerationKeyword 규칙을 채팅 마스킹 용도로 프론트에 미러링한다.
 *
 * 목적:
 * - WebSocket 낙관적 메시지나 moderation 미도착 메시지도 즉시 가릴 수 있게 한다.
 * - 서버 결과가 늦게 도착해도 HIGH 수준 금칙 표현은 먼저 차단한다.
 *
 * 주의:
 * - 서버 정규화 방식(NFKC + 특수문자 제거)과 최대한 맞춘다.
 * - 규칙이 백엔드에서 바뀌면 이 파일도 함께 갱신해야 한다.
 */
const LOCAL_CHAT_MODERATION_RULES: LocalChatModerationRule[] = [
  {pattern: /죽어|뒤져|디져|꺼져/g, reason: '폭력적이거나 위협적인 표현', riskLevel: 'HIGH'},
  {pattern: /느금마|니애미|니엄마|네애미/g, reason: '가족을 향한 심한 비하 표현', riskLevel: 'HIGH'},
  {pattern: /선불|계좌이체/g, reason: '사기 위험이 높은 거래 유도 표현', riskLevel: 'MID'},
  {pattern: /가품|도용/g, reason: '위조품 판매 또는 권리 침해가 의심되는 표현', riskLevel: 'HIGH'},
  {pattern: /해외배송|정품아님/g, reason: '주의가 필요한 판매 표현', riskLevel: 'MID'},
  {pattern: /씨+발|시+발|씹+팔|ㅆㅂ|ㅅㅂ|시바|씨바|쉬발|끼발|씨발|시발/g, reason: '강한 욕설 또는 공격적 표현', riskLevel: 'HIGH'},
  {pattern: /병+신|븅+신|빙+신|병신/g, reason: '개인에 대한 공격적 표현', riskLevel: 'HIGH'},
  {pattern: /개새끼|개색끼|개쉐이|개쉑|새끼/g, reason: '개인에 대한 공격적 표현', riskLevel: 'HIGH'},
  {pattern: /지랄|좆|존나|ㅈㄴ/g, reason: '비속어 또는 공격적 표현', riskLevel: 'HIGH'},
]

/**
 * 백엔드와 같은 방식으로 텍스트를 정규화한다.
 *
 * - NFKC 정규화
 * - 소문자 변환
 * - 영문/숫자/한글/자모 외 문자 제거
 */
function normalizeChatModerationContent(content: string): string {
  return content
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '')
}

/**
 * 현재 채팅 메시지가 로컬 규칙 기준으로 HIGH 위험도인지 판별한다.
 *
 * 즉시 마스킹 목적이라 HIGH만 true를 반환한다.
 * MID는 배너 보조 용도일 수 있으나 본문 마스킹 조건에는 포함하지 않는다.
 */
function isLocallyHighRiskChatContent(content: string): boolean {
  const normalized = normalizeChatModerationContent(content)
  if (!normalized) return false

  return LOCAL_CHAT_MODERATION_RULES.some((rule) => {
    if (rule.riskLevel !== 'HIGH') return false
    rule.pattern.lastIndex = 0
    return rule.pattern.test(normalized)
  })
}

/**
 * HIGH 위험도 메시지인지 판별한다.
 *
 * 정책:
 * - TEXT 메시지에만 적용한다.
 * - 백엔드 moderation이 HIGH면 즉시 마스킹한다.
 * - 백엔드 결과가 아직 없더라도 로컬 규칙 기준 HIGH면 즉시 마스킹한다.
 * - SYSTEM 메시지는 항상 원문 그대로 둔다.
 */
export function shouldMaskChatMessageContent(message: ChatMessage): boolean {
  if (message.type !== 'TEXT') return false
  if (!message.content.trim()) return false

  if (message.moderation?.riskLevel === 'HIGH') {
    return true
  }

  return isLocallyHighRiskChatContent(message.content)
}

/**
 * 메시지 본문을 '*'로 마스킹한다.
 *
 * UX 메모:
 * - 줄바꿈과 공백은 유지해 원문 길이감과 문단 구조는 보존한다.
 * - 실제 글자/숫자/기호만 '*'로 치환해 민감 문구가 직접 노출되지 않게 한다.
 */
export function maskChatMessageContent(content: string): string {
  return content.replace(/\S/g, '*')
}

/**
 * 채팅 말풍선에 최종적으로 노출할 문자열을 반환한다.
 * HIGH 위험도 텍스트 메시지면 마스킹된 본문을, 아니면 원문을 그대로 사용한다.
 */
export function getDisplayChatMessageContent(message: ChatMessage): string {
  return shouldMaskChatMessageContent(message)
    ? maskChatMessageContent(message.content)
    : message.content
}
