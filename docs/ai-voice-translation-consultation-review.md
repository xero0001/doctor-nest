# DoctorNest AI 통화·번역·상담 모델 검토

- 작성일: 2026-07-24
- 상태: 1차 검토
- 적용 범위: 다국어 고객 채팅, 예약 상담, AI 통화
- 관련 문서: [고객 메시징 채널 검토](./customer-messaging-channel-review.md)

## 1. 결론

DoctorNest의 1차 구현은 다음 구성이 가장 현실적이다.

1. **텍스트 채팅 기본 모델:** `gpt-5.6-luna`
2. **복잡하거나 위험한 상담의 상위 모델:** `gpt-5.6-terra`
3. **통화:** Twilio + CLOVA Speech + 텍스트 LLM + TTS의 모듈형 구조
4. **자동 처리 범위:** 가격, 위치, 운영시간, 시술 전후 안내, 예약 조회·변경
5. **사람 승인이 필요한 범위:** 증상 판단, 이상반응, 의료 분쟁, 환불·보상, 응급 가능성

하나의 모델이 번역부터 상담, 예약 변경까지 곧바로 수행하게 하면 번역 오류와 잘못된 예약 실행을 구분하기 어렵다. 원문과 번역문을 모두 보존하고, 모델이 생성한 예약 작업은 애플리케이션이 검증한 뒤 실행해야 한다.

## 2. 애프터닥의 AI 통화 구성

애프터닥 개인정보처리방침에 공개된 수탁사와 업무는 다음과 같다.

| 구성 | 역할 |
| --- | --- |
| Twilio | VoIP 음성통화 클라우드 서비스 |
| Naver CLOVA Speech | 통화 음성 인식 및 STT |
| OpenAI | AI 상담코치, AI 글로벌 코디네이터, AI 콜 매니저 분석 및 데이터 처리 |
| 인포뱅크 | 카카오 브랜드 메시지 및 상담톡 연동 |
| 다우기술 | 국내외 문자 및 알림톡 발송 |

공개된 내용만으로 확정할 수 있는 통화 흐름은 다음과 같다.

```text
환자 음성
  → Twilio VoIP
  → CLOVA Speech STT
  → OpenAI 상담·응답 생성
  → 미공개 TTS
  → Twilio
  → 환자
```

TTS 공급자는 공개되어 있지 않다. CLOVA Voice, OpenAI 음성 모델 또는 Twilio가 지원하는 TTS 중 무엇을 사용하는지는 별도 확인이 필요하다.

### 해석

- Twilio는 전화망과 음성 전달을 담당한다.
- CLOVA Speech는 통화 음성을 텍스트로 변환한다.
- OpenAI는 상담 의도 파악, 답변 생성, 요약 등을 담당한다.
- 공개 자료에는 Twilio ConversationRelay 사용 근거가 없다.
- 따라서 애프터닥은 각 구성요소를 직접 조합한 구조일 가능성이 높다.

## 3. AI 통화 예상 원가

아래 원화 환산은 예산 산정을 위한 `1 USD = 1,470원` 가정이며, VAT·환전 수수료·볼륨 할인은 제외한다.

### Twilio

| 항목 | 공식 단가 | 원화 환산 |
| --- | ---: | ---: |
| 한국 휴대폰 발신 | $0.0524/분 | 약 77원/분 |
| 한국 일반전화 발신 | $0.0552/분 | 약 81원/분 |
| Media Streams | $0.0044/분 | 약 6.5원/분 |
| ConversationRelay | $0.07/분 | 약 103원/분 |

### CLOVA Speech

| 항목 | 공식 단가 |
| --- | ---: |
| 음성 인식 Batch/Stream | 15초당 5원 |
| 분당 환산 | 20원/분 |
| 무료 제공 | 월 20분 |

CLOVA Speech는 사용 시간을 15초 단위로 올림한다.

### 애프터닥과 유사한 모듈형 구성

```text
Twilio 한국 휴대폰 발신  77원/분
Twilio Media Streams      6.5원/분
CLOVA Speech             20원/분
--------------------------------
소계                    약 104원/분
```

여기에 TTS, OpenAI 토큰, 애플리케이션 서버, 저장공간 및 모니터링 비용이 추가된다.

| 사용량 | 통화·스트리밍·STT 소계 |
| --- | ---: |
| 5분 통화 1건 | 약 520원 |
| 5분 통화 1,000건 | 약 52만원 |
| 월 10,000분 | 약 104만원 |

월 50만원 기본 요금제에서 AI 통화를 무제한 제공하면 원가 위험이 크다. 기본 제공 시간을 두고 초과 사용량을 분당 과금하는 방식이 필요하다.

## 4. CLOVA Speech 적용성

### 장점

- 한국어 음성 인식에 유리한 국내 서비스다.
- 스트리밍 API가 있어 통화 중 실시간 STT 구성이 가능하다.
- 15초당 5원으로 비용 예측이 단순하다.
- 키워드 부스팅을 통해 병원명, 시술명, 의료진 이름의 인식률을 높일 수 있다.
- 한국 리전에서 제공된다.

### 제약

| 방식 | 지원 언어 |
| --- | --- |
| 스트리밍 | 한국어, 영어, 일본어 |
| 단문 | 한국어, 영어, 일본어, 중국어 |
| 장문 | 한국어, 영어, 한·영 동시, 일본어, 중국어 번체·간체 |

중국어를 포함한 다른 언어의 실시간 AI 통화를 CLOVA Speech 하나로 처리하기는 어렵다. 중국어·태국어·베트남어·러시아어 통화까지 제공하려면 별도 다국어 STT 또는 실시간 음성 번역 모델이 필요하다.

## 5. 텍스트 번역·상담 모델 후보

가격은 2026-07-24 공개 가격 기준이며 1M 토큰당 USD다.

| 모델 | 입력 | 출력 | 적합한 역할 | 판단 |
| --- | ---: | ---: | --- | --- |
| OpenAI GPT-5.6 Luna | $1.00 | $6.00 | 번역, FAQ, 예약 정보 추출, 일반 상담 | **기본 모델 추천** |
| OpenAI GPT-5.6 Terra | $2.50 | $15.00 | 복잡한 문맥, 민감 상담, 상위 검토 | **위험 상담 추천** |
| OpenAI GPT-5.6 Sol | $5.00 | $30.00 | 최고 난도 분석 | 실시간 일반 상담에는 과함 |
| Gemini 3.5 Flash-Lite | $0.30 | $2.50 | 저비용 번역과 단순 데이터 처리 | 행정 문의용 비교 후보 |
| Claude Sonnet 5 | $2.00 | $10.00 | 긴 문맥 및 상담 품질 비교 | 보조 벤치마크 후보 |

Claude Sonnet 5 가격은 2026-08-31까지의 프로모션 가격이다. 이후 공개 예정 가격은 입력 $3, 출력 $15다. 또한 Claude Sonnet 5는 이전 모델보다 같은 텍스트에서 토큰이 약 30% 더 발생할 수 있다고 Anthropic이 안내하므로, 표의 단가만으로 실제 비용을 비교하면 안 된다.

### 대표 채팅 1회 비용 예시

가정: 입력 2,000토큰, 출력 400토큰, 환율 1,470원/USD.

| 모델 | 예상 비용 |
| --- | ---: |
| GPT-5.6 Luna | 약 6.5원 |
| GPT-5.6 Terra | 약 16원 |
| Gemini 3.5 Flash-Lite | 약 2.4원 |
| Claude Sonnet 5 | 약 12원 |

텍스트 모델 비용은 통신 채널 또는 AI 통화 비용보다 작다. 의료·예약 상담에서는 몇 원을 절약하기 위해 정확도와 제어 가능성을 낮추는 선택을 할 필요가 없다.

## 6. 추천 모델 라우팅

### 기본 경로: GPT-5.6 Luna

다음 업무를 `reasoning.effort: none` 또는 `low`로 처리한다.

- 고객 언어 식별
- 원문을 한국어로 번역
- 병원 FAQ 기반 답변
- 가격, 위치, 운영시간, 준비사항 안내
- 예약 날짜·시간·시술·담당자 정보 추출
- 상담 요약과 태그 생성
- 답변을 고객 언어로 번역

### 상위 경로: GPT-5.6 Terra

다음 조건에서는 Terra로 승격하고 자동 발송 또는 자동 실행을 제한한다.

- 통증, 출혈, 호흡곤란, 고열 등 이상 증상
- 시술 후 부작용 또는 응급 가능성
- 의료진의 판단으로 오해될 수 있는 질문
- 환불, 보상, 분쟁, 악성 민원
- 여러 시술·약물·기저질환이 함께 언급됨
- 번역 확신도가 낮거나 숫자·날짜가 충돌함
- 병원 자료에서 근거를 찾지 못함

### 사용하지 않을 구성

- 일반 상담 전체를 GPT-5.6 Sol로 처리
- 번역된 문장만 저장하고 고객 원문을 버리는 방식
- 모델이 생성한 날짜와 시간을 검증 없이 예약 API에 전달
- 모델이 병명 또는 응급 여부를 확정해 고객에게 발송
- 무료 Gemini API에 환자 개인정보나 민감정보를 전송

Google은 유료 Gemini API 입력·출력을 제품 개선에 사용하지 않는다고 안내한다. 반면 무료 서비스는 입력·출력이 제품 개선 및 사람의 검토에 사용될 수 있으므로 환자 상담에는 사용할 수 없다. 또한 Gemini API 약관은 임상 진료 또는 의료 조언 용도를 제한하므로, Gemini는 가격·위치·예약 등 비의료 행정 문의 범위에서만 검토하는 편이 안전하다.

## 7. 권장 상담 처리 구조

```text
채널 원문 수신
  → 언어 감지
  → 원문과 첨부파일 저장
  → 병원별 지식 검색
  → 모델이 구조화된 결과 생성
      - source_language
      - korean_translation
      - intent
      - risk_flags
      - booking_fields
      - reply_target_language
      - evidence_ids
      - requires_human
  → 서버 검증
  → 일반 상담은 자동 발송
  → 위험 상담은 상담원 승인
  → 예약 변경은 고객 재확인 후 실행
```

### 필수 저장 데이터

- 고객 원문
- 내부용 한국어 번역
- 고객에게 실제 발송된 문장
- 사용 모델과 모델 버전
- 검색에 사용한 병원 자료 ID
- 예약 API 요청과 결과
- 위험 플래그와 사람 승인 기록

## 8. 의료 상담 안전 기준

DoctorNest의 AI는 진단 모델이 아니라 병원 상담 및 업무 자동화 모델로 정의한다.

### 자동 발송 가능

- 병원에서 승인한 가격과 이벤트
- 위치, 주차, 운영시간
- 예약 가능 시간 조회
- 예약 확인 및 변경 절차
- 병원이 승인한 시술 전후 주의사항
- 상담원 연결 안내

### 자동 발송 금지 또는 사람 승인

- 질환 진단 및 확정
- 약 복용 중단·변경 지시
- 응급 여부 확정
- 부작용의 원인 단정
- 환불 및 보상 확약
- 병원 자료에 없는 의료 정보 생성

위험 문장에는 답변 생성보다 먼저 `requires_human=true`를 설정하고, 병원이 정한 긴급 연락 안내를 제공해야 한다.

## 9. 실시간 통화 모델 선택

### 1차 추천

```text
Twilio Media Streams
  → CLOVA Speech
  → GPT-5.6 Luna/Terra 라우터
  → TTS
  → Twilio
```

장점은 STT 원문, 모델 판단, 예약 도구 호출을 각각 기록하고 교체할 수 있다는 점이다. 예약 업무와 의료 안전 검토에는 음성-음성 단일 모델보다 감사 가능성이 높다.

### 다국어 실시간 번역 후보

| 모델 | 가격 | 용도 | 비고 |
| --- | ---: | --- | --- |
| OpenAI GPT-Realtime-Translate | $0.034/분 | 실시간 음성-음성 번역 | 번역 음성과 transcript delta 제공 |
| Google Gemini 3.5 Live Translate Preview | 약 $0.0368/분 | 70개 이상 언어 실시간 번역 | Preview 및 의료 용도 약관 검토 필요 |
| OpenAI GPT-Realtime-2.1 mini | 오디오 입력 $10/MTok, 출력 $20/MTok | 음성 상담과 도구 호출 | 별도 PoC 필요 |

중국어 등 CLOVA 스트리밍 미지원 언어는 `GPT-Realtime-Translate`를 우선 PoC 후보로 둔다. 다만 예약 생성까지 필요한 AI 상담은 번역 전용 모델만으로 처리하지 않고, 번역 결과를 텍스트 상담 모델과 예약 워크플로에 연결해야 한다.

## 10. 개인정보 및 운영 요구사항

- 환자 이름, 연락처, 예약 및 증상 정보는 개인정보 또는 민감정보로 취급한다.
- 해외 사업자 사용 시 개인정보처리방침, 처리위탁 및 국외 이전 고지를 준비한다.
- OpenAI API 데이터는 기본적으로 모델 학습에 사용되지 않지만, 기본 악용 모니터링 로그는 최대 30일 보관될 수 있다.
- 필요하면 OpenAI의 Modified Abuse Monitoring 또는 Zero Data Retention 승인을 검토한다.
- Responses API 사용 시 환자 상담 데이터는 `store: false`를 기본으로 한다.
- 모델 제공자의 대화 저장 기능에 상담 이력을 의존하지 않고 DoctorNest DB에서 보관 기간과 삭제를 통제한다.
- 운영 로그에는 원문 전체 대신 필요한 식별자와 비식별 메타데이터를 우선 기록한다.

## 11. 도입 순서

### 1단계: 텍스트 상담 MVP

- GPT-5.6 Luna 기본 모델
- GPT-5.6 Terra 위험 상담 라우팅
- 병원별 FAQ/RAG
- 구조화된 예약 정보 추출
- 상담원 승인과 인계
- 원문·번역문·발송문 감사 로그

### 2단계: 모델 평가

다음 언어를 포함한 150~300개의 실제형 테스트 케이스를 구축한다.

- 한국어 ↔ 영어
- 한국어 ↔ 중국어 간체·번체
- 한국어 ↔ 일본어
- 한국어 ↔ 태국어
- 한국어 ↔ 베트남어
- 한국어 ↔ 러시아어

테스트 항목은 가격, 날짜, 예약, 준비사항, 증상, 이상반응, 민원과 환불을 포함한다.

### 3단계: AI 통화

- Twilio 발신 PoC
- CLOVA Speech 스트리밍 연결
- 시술명·병원명 키워드 부스팅
- TTS 비교
- 끼어들기, 무응답, 재질문 처리
- 상담원 전환
- 중국어 등 CLOVA 미지원 실시간 언어 PoC

## 12. 모델 합격 기준

| 항목 | 권장 기준 |
| --- | ---: |
| 날짜·시간·금액·전화번호 보존 | 99.5% 이상 |
| 예약 구조화 결과 유효성 | 99.5% 이상 |
| 병원 자료에 없는 사실 생성 | 0건 |
| 위험 상담 자동 발송 | 0건 |
| 고객 언어 오판 | 0.5% 미만 |
| 텍스트 첫 응답 지연 p95 | 2.5초 이하 |
| 상담원 인계 사유 정확성 | 95% 이상 |

모델은 공개 벤치마크보다 DoctorNest 실제 상담 데이터셋으로 최종 선정한다. 특히 중국어 병원 용어, 일본어 존대, 날짜·금액·시술명 보존을 별도로 채점한다.

## 13. 최종 권고

현시점의 기본안은 다음과 같다.

```text
일반 텍스트 상담       GPT-5.6 Luna
고위험/복잡 상담       GPT-5.6 Terra + 사람 승인
한국어·영어·일본어 통화 Twilio + CLOVA Speech
기타 언어 실시간 통화   GPT-Realtime-Translate PoC
예약 실행              모델 직접 실행 금지, 서버 검증 및 고객 재확인
```

이 구성은 모델 원가를 낮게 유지하면서도 의료 상담의 위험, 예약 오류, 번역 오류를 분리해 추적할 수 있다.

## 참고자료

- [애프터닥 개인정보처리방침](https://afterdoc.ai/privacy)
- [Twilio 한국 Programmable Voice 가격](https://www.twilio.com/en-us/voice/pricing/kr)
- [Twilio Conversational AI 가격](https://www.twilio.com/en-us/products/conversational-ai/pricing)
- [NAVER Cloud 전체 요금표](https://www.ncloud.com/charge/price/ko)
- [CLOVA Speech 사용 사양과 지원 언어](https://guide.ncloud-docs.com/docs/clovaspeech-spec)
- [CLOVA Speech 개요](https://guide.ncloud-docs.com/docs/en/clovaspeech-overview)
- [OpenAI 모델 목록](https://developers.openai.com/api/docs/models)
- [OpenAI GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [OpenAI GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [OpenAI GPT-Realtime-Translate](https://developers.openai.com/api/docs/models/gpt-realtime-translate)
- [OpenAI API 데이터 통제](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)
- [Google Gemini API 가격](https://ai.google.dev/gemini-api/docs/pricing)
- [Google Gemini API 추가 약관](https://ai.google.dev/gemini-api/terms)
- [Anthropic API 가격](https://platform.claude.com/docs/en/about-claude/pricing)
