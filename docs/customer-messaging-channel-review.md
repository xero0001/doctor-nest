# DoctorNest 고객 메시징 채널 검토

- 작성일: 2026-07-24
- 상태: 1차 검토
- 적용 범위: 카카오, 네이버 톡톡, Instagram, WhatsApp, LINE, WeChat
- 관련 문서: [AI 통화·번역·상담 모델 검토](./ai-voice-translation-consultation-review.md)

## 1. 결론

DoctorNest가 채널톡 같은 외부 상담 SaaS에 병원 상담 업무를 맡길 필요는 없다. 각 채널의 공식 API를 DoctorNest 통합 상담함에 직접 연결하면 된다.

다만 카카오는 예외다. 카카오 알림톡과 상담톡은 카카오 공식 딜러를 통해서만 제공되므로, 인포뱅크·다우기술 같은 딜러를 메시지 전송망으로 사용해야 한다. 이는 상담 제품을 외주화하는 것이 아니라, 카카오가 요구하는 공식 전송 경로를 사용하는 것이다. 상담 화면, AI, 고객 데이터, 예약 연결과 운영 로직은 DoctorNest가 소유할 수 있다.

## 2. 한눈에 보기

| 채널 | 현재 상담 비용 | API | 고객 선문의 | 주요 제한 | 직접 구축 판단 |
| --- | --- | --- | --- | --- | --- |
| 카카오 상담톡 | 공식 딜러 견적, 공개 사례 약 80~100원/24시간 상담 세션 | 있음, 공식 딜러 경유 | 필요 | 병원별 채널 및 비즈니스 인증 | 필수 |
| 카카오 알림톡 | 공식 딜러 견적, 통상 약 8~10원/건 | 있음, 공식 딜러 경유 | 불필요 | 정보성 템플릿 사전 승인 | 필수 |
| 네이버 톡톡 | 고객 문의 응답은 무료 | 있음 | 필요 | 챗봇 API 설정 및 계정별 인증 | 권장 |
| Instagram DM | 무료 | 있음 | 필요 | 24시간 자동 응답 창 | 권장 |
| WhatsApp | 현재 24시간 서비스 답변 무료 | 있음 | 자유대화는 필요 | 24시간 이후 템플릿만 가능 | 해외환자용 권장 |
| LINE | Reply API 무료, Push는 요금제 메시지 수 차감 | 있음 | Reply는 필요 | 국가별 요금제, 계정별 토큰 | 일본·대만·태국 대상 권장 |
| WeChat | 고객 문의 응답 무료 | 있음 | 필요 | 48시간, 고객 메시지당 최대 5회 답변 | 중국환자용 권장 |

가격은 채널 운영사가 부과하는 비용이다. 공식 딜러·BSP를 선택하면 별도 플랫폼비, 최소 사용료 또는 구축비가 추가될 수 있다.

## 3. 카카오

카카오 채널의 일반 관리자센터 채팅을 크롤링하거나 브라우저 자동화해서 가져오는 방식은 사용하지 않는다. DoctorNest 같은 외부 상담 시스템은 카카오 상담톡 API를 사용해야 한다.

### 카카오 상담톡

- 가격: 공식 딜러 견적 필요
- 공개된 시장 사례: 24시간 상담 세션당 약 80~100원
- API: 존재
- 연동: 인포뱅크 등 카카오 공식 딜러 경유
- 고객 선문의: 필요

특이사항:

- 병원마다 카카오톡 채널과 비즈니스 인증이 필요하다.
- 고객이 카카오톡 채널에서 먼저 문의하면 DoctorNest가 webhook으로 수신한다.
- DoctorNest에서 AI 또는 상담원이 답변하고 공식 딜러의 상담톡 API로 발송한다.
- 알림톡과 상담톡은 별도 상품이다.
- 병원 관리자센터와 DoctorNest에서 동시에 답변하면 상담 이력과 담당자 배정이 어긋날 수 있으므로 DoctorNest를 주 상담 화면으로 정하는 것이 좋다.

### 카카오 알림톡

- 가격: 공식 딜러 견적 필요
- 일반적인 공개 단가: 약 8~10원/건
- API: 존재
- 고객 선문의: 불필요

특이사항:

- 예약 확인, 변경, 결제, 방문 전 안내 등 정보성 메시지에 사용한다.
- 발송 템플릿을 카카오에서 사전 승인받아야 한다.
- 고객의 카카오 채널 친구 여부와 무관하게 전화번호를 기준으로 발송할 수 있다.
- 광고, 이벤트, 체험단 재접촉은 알림톡이 아니라 브랜드 메시지 등 별도 광고성 상품과 수신 동의가 필요하다.
- 고객의 상담 답변을 받는 채널이 아니므로 상담톡과 함께 구성해야 한다.

### 애프터닥 방식

애프터닥 개인정보처리방침에는 인포뱅크가 `카카오 브랜드 메시지 발송 및 상담톡 연동` 수탁사로 명시되어 있다. DoctorNest도 동일하게 공식 딜러는 전송망으로만 사용하고, 상담 제품은 자체 구축할 수 있다.

### DoctorNest 연동 구조

```text
환자 카카오톡
  → 병원 카카오 채널
  → 공식 딜러 상담톡 API
  → DoctorNest 통합 상담함
  → AI 또는 상담원
  → 공식 딜러 API
  → 환자
```

## 4. 네이버 톡톡

- 가격: 고객 문의와 챗봇 응답은 무료
- API: 존재
- 고객 선문의: 필요

특이사항:

- 네이버 톡톡 파트너센터의 `개발자도구 → 챗봇 API 설정`에서 Partner ID, Authorization 및 webhook을 설정한다.
- 고객 메시지를 webhook으로 받아 DoctorNest에서 답변할 수 있다.
- 병원별 톡톡 계정 연결과 인증정보 관리가 필요하다.
- 네이버 플레이스, 검색, 블로그에서 상담 진입이 쉬워 국내 신규환자 문의에 중요하다.
- 일반 상담 API와 별도로, 정보·광고 템플릿을 이용한 선제적 발송 상품은 다우기술 비즈뿌리오 등의 계약과 별도 단가가 필요하다.
- 다수 병원을 하나의 SaaS에서 연결하는 상업적 사용 조건은 네이버 톡톡 측에 제휴 여부를 확인하는 것이 안전하다.

### DoctorNest 연동 구조

```text
환자 네이버 톡톡
  → 병원 톡톡 계정
  → 챗봇 API webhook
  → DoctorNest
  → AI 또는 상담원
  → 톡톡 보내기 API
```

## 5. Instagram DM

- 가격: 무료
- API: 존재
- 고객 선문의: 필요
- 기본 응답 가능 시간: 고객의 마지막 메시지 후 24시간

특이사항:

- 개인 계정은 사용할 수 없고 Instagram 프로페셔널 계정이 필요하다.
- Meta 앱 심사와 `instagram_business_manage_messages` 권한 승인이 필요하다.
- 고객이 먼저 DM, 스토리 멘션, 댓글 기반 진입 등을 통해 상호작용해야 대화가 시작된다.
- 24시간이 지나면 자동 메시지를 보낼 수 없다.
- `HUMAN_AGENT` 권한을 승인받으면 고객 메시지 후 7일 안에 사람 상담원이 답할 수 있지만 자동 메시지는 허용되지 않는다.
- 그룹 DM은 지원하지 않으며 한 대화에 고객 한 명만 대응한다.
- 텍스트, 이미지, 오디오, 동영상 등 주요 메시지 유형을 API로 처리할 수 있다.
- 앱이 여러 병원 계정을 연결하려면 Meta Business Login, 토큰 갱신, webhook 라우팅과 App Review가 필요하다.

### DoctorNest 연동 구조

```text
환자 Instagram DM
  → 병원 프로페셔널 계정
  → Meta webhook
  → DoctorNest
  → 24시간 내 AI 또는 상담원 답변
```

## 6. WhatsApp

- 가격: 국가와 메시지 종류에 따라 다름
- API: WhatsApp Business Platform Cloud API 존재
- 고객 선문의: 24시간 자유대화에는 필요

### 2026-07-24 현재

- 고객이 메시지를 보내면 24시간 고객 서비스 창이 열린다.
- 이 시간 안의 자유 형식 서비스 답변은 현재 무료다.
- 고객이 마지막 메시지를 보낼 때마다 24시간 창이 갱신된다.
- 24시간 밖에서는 Meta가 승인한 템플릿 메시지만 보낼 수 있다.
- Marketing, Utility, Authentication 템플릿은 수신자의 국가와 메시지 종류에 따라 건별 과금된다.
- Click-to-WhatsApp 광고나 Facebook Page CTA로 시작된 대화는 조건을 충족하면 72시간 동안 메시지 비용이 면제된다.

한국 번호 수신자는 `Rest of Asia Pacific` 요금군으로 분류된다. 2026년 공개 참고 단가는 다음 수준이지만 Meta의 최신 rate card를 계약 시 다시 확인해야 한다.

| 종류 | 참고 단가 |
| --- | ---: |
| Marketing | 약 $0.0604/건 |
| Utility | 약 $0.0077/건 |
| Authentication | 약 $0.0077/건 |
| Service | 현재 무료 |

### 예정 변경

2026년 10월 1일부터 API로 보내는 Service 메시지와 24시간 창 안의 Utility 메시지도 건별 과금될 예정이다. 2026-07-24 현재 향후 Service 세부 단가는 아직 공개되지 않았으므로 무료 전제로 장기 원가를 설계하면 안 된다.

특이사항:

- 병원별 WhatsApp Business Account와 전화번호가 필요하다.
- DoctorNest에서 여러 병원을 온보딩하려면 Meta Embedded Signup과 앱 권한 심사가 필요하다.
- Cloud API를 직접 사용하면 별도 상담 SaaS 없이 구축할 수 있다.
- BSP를 사용하면 Meta 메시지비 외에 BSP 플랫폼비가 추가될 수 있다.
- 24시간 이후 예약 리마인더는 승인된 Utility 템플릿으로 발송해야 한다.
- 광고는 사용자 opt-in과 Marketing 템플릿 승인이 필요하다.

### DoctorNest 연동 구조

```text
환자 WhatsApp
  → 병원 WABA/전화번호
  → Meta Cloud API webhook
  → DoctorNest
  → AI 또는 상담원
  → Cloud API
```

## 7. LINE

- 가격: Reply 메시지는 무료
- API: Messaging API 존재
- 고객 선문의: Reply에는 필요

한국 등 `Other regions` 기준 요금:

| 요금제 | 월 요금 | 포함 메시지 | 초과 발송 |
| --- | ---: | ---: | ---: |
| Communication | 무료 | 500건 | 불가 |
| Light | $50 | 10,000건 | 불가 |
| Standard | $150 | 40,000건 | $0.05/건 |

메시지 수에 포함되는 방식:

- 과금 메시지: Push, Multicast, Broadcast, Narrowcast
- 무료 메시지: 고객 메시지에 대한 Reply API

특이사항:

- LINE Official Account와 Messaging API 채널이 필요하다.
- 고객이 메시지를 보내면 webhook으로 수신한다.
- Reply Token을 이용한 답변은 메시지 한도에 포함되지 않는다.
- 고객에게 먼저 보내는 Push 메시지는 월 포함 메시지 수를 차감한다.
- 한 API 요청에 여러 message object를 담아도 수신자 한 명 기준 1건으로 계산한다.
- 병원별 Channel Access Token과 webhook 연결이 필요하다.
- 일본, 대만, 태국 등 핵심 시장의 요금제는 서로 다르므로 병원 타깃 국가별로 확인해야 한다.

### 프리미엄 ID

- 기본 ID: 무료, 임의 문자열로 발급
- Premium ID: 연 $12, 병원이 원하는 식별 문자열 사용 가능
- 메시징 기능이나 API 권한을 높여주는 상품이 아니라 검색·홍보에 쓰기 쉬운 계정 ID를 구매하는 상품이다.

### DoctorNest 연동 구조

```text
환자 LINE
  → 병원 LINE Official Account
  → Messaging API webhook
  → DoctorNest
  → Reply 또는 Push API
```

## 8. WeChat

- 가격: 고객 문의 응답 무료
- API: 존재
- 고객 선문의: 필요
- 해외 사업자 계정 인증비: 연 $99

특이사항:

- 고객이 먼저 메시지를 보내야 한다.
- 고객 메시지 후 48시간 안에 답변해야 한다.
- 한 번의 고객 메시지로 최대 5개의 고객상담 메시지를 보낼 수 있다.
- 고객이 새 메시지를 보내면 새로운 답변 기회가 생긴다.
- 해외 법인은 WeChat Official Service Account와 연례 인증이 필요하다.
- AppID, AppSecret, access token, 메시지 암호화와 webhook 검증을 구현해야 한다.
- 중국 내 운영과 해외 법인 계정의 기능 범위 및 심사 요건이 다를 수 있다.
- 예약 알림처럼 먼저 보내는 메시지는 일반 고객상담 메시지가 아니라 허용된 서비스 알림·템플릿 구조를 별도 검토해야 한다.

### DoctorNest 연동 구조

```text
환자 WeChat
  → 병원 Official Service Account
  → WeChat webhook
  → DoctorNest
  → 48시간/5개 제한 안에서 AI 또는 상담원 답변
```

## 9. 공통 멀티테넌트 설계

병원별로 다음 연결정보를 분리해 저장한다.

- `tenant_id`
- `channel`
- 채널 계정 ID
- access token 또는 딜러 sender key
- token 만료시각
- webhook 검증 secret
- 연결 상태
- 발송 가능 시간
- 메시지 한도와 현재 사용량
- 템플릿 ID

공통 메시지 모델은 채널 원문을 훼손하지 않고 다음 구조로 정규화한다.

```text
ChannelAccount
  → Conversation
  → Participant
  → Message
      - external_message_id
      - direction
      - original_text
      - translated_text
      - message_type
      - sent_at
      - reply_deadline
      - billable_category
      - delivery_status
```

### 필수 운영 기능

- webhook 서명 검증과 중복 이벤트 제거
- 채널별 전송 실패 재시도
- 24시간·48시간 응답 마감 표시
- AI 자동 답변과 상담원 인계
- 템플릿 승인·버전 관리
- 채널별 비용 집계
- 메시지 원문·번역문·실제 발송문 감사 로그
- 병원 해지 시 토큰 폐기와 webhook 연결 해제

## 10. 구현 우선순위

### 1차

1. 카카오 상담톡
2. 카카오 알림톡
3. 네이버 톡톡
4. Instagram DM

국내 병원의 실제 신규환자 유입과 예약 안내에 가장 직접적이다.

### 2차

1. WhatsApp
2. LINE
3. WeChat

병원의 외국인 환자 타깃 국가에 따라 순서를 바꾼다.

- 영어권·동남아·중동: WhatsApp
- 일본·대만·태국: LINE
- 중국: WeChat

## 11. 다음 확인 항목

- 인포뱅크 상담톡 세션 단가, 초기 구축비, 최소 사용료
- 카카오 병원별 서브계정 또는 발신프로필 온보딩 절차
- 네이버 톡톡 다수 고객사 SaaS 연동의 제휴 필요 여부
- WhatsApp 2026-10-01 Service 메시지 한국 적용 단가
- Meta Tech Provider 등록 및 Embedded Signup 심사 조건
- WeChat 해외 Official Account의 병원 업종 심사 및 중국 내 노출 범위
- 각 채널의 의료광고·민감정보 처리 정책

## 참고자료

- [카카오 알림톡·상담톡 공식 안내](https://business.kakao.com/info/bizmessage/)
- [애프터닥 개인정보처리방침](https://afterdoc.ai/privacy)
- [네이버 톡톡 운영정책](https://partner.talk.naver.com/pstatic/html/terms/policy.html)
- [네이버 톡톡 챗봇 API 연동 예시](https://docs.channel.io/help/ko/articles/3d8c6ce9-%ED%86%A1%ED%86%A1-%EC%97%B0%EB%8F%99%ED%95%98%EA%B8%B0)
- [Meta Instagram API 공식 Postman 문서](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [Instagram HUMAN_AGENT 규칙](https://www.postman.com/meta/instagram/request/23987686-3f06ebc8-c5ad-4b8a-be9f-81acdc79245c)
- [WhatsApp Business Platform 공식 가격](https://whatsappbusiness.com/products/platform-pricing/)
- [Twilio의 WhatsApp 2026-10 가격 변경 안내](https://help.twilio.com/articles/53100480177819)
- [LINE Messaging API 가격](https://developers.line.biz/en/docs/messaging-api/pricing/)
- [LINE Other Regions 요금제와 Premium ID](https://www.lycbiz.jp/en/other/)
- [LINE Messaging API 레퍼런스](https://developers.line.biz/en/reference/messaging-api/)
- [WeChat Official Account 고객상담 메시지 API](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Service_Center_messages.html)
- [Tencent의 WeChat Official Account AI Agent 연동 안내](https://intl.cloud.tencent.com/ind/document/product/1254/72573)
