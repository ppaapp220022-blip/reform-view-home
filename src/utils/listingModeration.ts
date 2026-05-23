import type {RiskLevel} from '../types/listing'

interface LocalModerationRule {
  pattern: RegExp
  reason: string
  riskLevel: RiskLevel
}

export interface ListingModerationPreview {
  riskLevel: RiskLevel
  reason: string
  matchedTerms: string[]
}

/**
 * 백엔드 ModerationKeyword 규칙을 프론트에 미러링한다.
 *
 * 목적:
 * - 초안 autosave 응답을 기다리지 않고도 현재 입력값 기준으로 즉시 등록 버튼을 잠근다.
 * - 사용자가 어떤 단어/표현이 문제인지 프론트에서 바로 확인할 수 있게 한다.
 *
 * 주의:
 * - 서버 규칙과 최대한 동일하게 유지해야 하므로 패턴/사유 문구를 백엔드와 맞춘다.
 * - 서버가 추가 규칙을 넣으면 이 파일도 함께 갱신해야 한다.
 */
const LOCAL_MODERATION_RULES: LocalModerationRule[] = [
  {pattern: /죽어|뒤져|디져|꺼져/gi, reason: '폭력적이거나 위협적인 표현', riskLevel: 'HIGH'},
  {pattern: /느금마|니애미|니엄마|네애미/gi, reason: '가족을 향한 심한 비하 표현', riskLevel: 'HIGH'},
  {pattern: /선불|계좌이체/gi, reason: '사기 위험이 높은 거래 유도 표현', riskLevel: 'HIGH'},
  {pattern: /가품|도용/gi, reason: '위조품 판매 또는 권리 침해가 의심되는 표현', riskLevel: 'HIGH'},
  {pattern: /해외배송|정품아님/gi, reason: '주의가 필요한 판매 표현', riskLevel: 'MID'},
  {pattern: /씨+발|시+발|씹+팔|ㅆㅂ|ㅅㅂ|시바|씨바|쉬발|끼발/gi, reason: '강한 욕설 또는 공격적 표현', riskLevel: 'MID'},
  {pattern: /병+신|븅+신|빙+신/gi, reason: '개인에 대한 공격적 표현', riskLevel: 'MID'},
  {pattern: /개새끼|개색끼|개쉐이|개쉑|새끼/gi, reason: '개인에 대한 공격적 표현', riskLevel: 'MID'},
  {pattern: /지랄|좆|존나|ㅈㄴ/gi, reason: '비속어 또는 공격적 표현', riskLevel: 'MID'},
]

function riskWeight(level: RiskLevel): number {
  if (level === 'HIGH') return 3
  if (level === 'MID') return 2
  return 1
}

/**
 * 현재 입력된 게시글 텍스트에서 로컬 모더레이션 위반 표현을 추출한다.
 *
 * 반환값:
 * - null: 로컬 규칙 기준 위반 없음
 * - 객체: 가장 높은 위험 등급 + 대표 사유 + 감지된 표현 목록
 */
export function inspectListingModeration(content: string): ListingModerationPreview | null {
  const trimmed = content.trim()
  if (!trimmed) return null

  let highestRule: LocalModerationRule | null = null
  const matchedTerms: string[] = []
  const seenTerms = new Set<string>()

  for (const rule of LOCAL_MODERATION_RULES) {
    const matches = trimmed.match(rule.pattern) ?? []
    if (matches.length === 0) continue

    if (!highestRule || riskWeight(rule.riskLevel) > riskWeight(highestRule.riskLevel)) {
      highestRule = rule
    }

    for (const term of matches) {
      const normalized = term.trim()
      if (!normalized) continue
      const key = normalized.toLowerCase()
      if (seenTerms.has(key)) continue
      seenTerms.add(key)
      matchedTerms.push(normalized)
    }
  }

  if (!highestRule) return null

  return {
    riskLevel: highestRule.riskLevel,
    reason: highestRule.reason,
    matchedTerms,
  }
}
