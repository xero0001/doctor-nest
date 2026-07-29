import { promisify } from "node:util";
import { scrypt as scryptCallback, randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";

const database = new PrismaClient();
const scrypt = promisify(scryptCallback);

function normalizePhone(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0082")) digits = digits.slice(2);
  if (digits.startsWith("82") && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }
  return digits || null;
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${Buffer.from(derivedKey).toString("base64")}`;
}

const channelSeeds = [
  ["KAKAO", "카카오톡 채널"],
  ["LINE", "LINE Official Account"],
  ["NAVER_TALK", "네이버 톡톡"],
  ["WECHAT", "WeChat Service Account"],
  ["WHATSAPP", "WhatsApp Business"],
  ["INSTAGRAM", "Instagram Professional"],
];

const conversationSeeds = [
  {
    channel: "KAKAO",
    externalThreadId: "demo-kakao-park",
    patient: {
      chartNumber: "10201",
      name: "박지호",
      phone: "010-1234-1234",
      gender: "여",
      birthDate: new Date("1995-04-07T00:00:00+09:00"),
      language: "ko",
      notes: "통증에 대한 걱정이 있어 시술 전 충분한 안내를 선호합니다.",
      patientTags: ["VIP", "피코토닝"],
    },
    important: true,
    unreadCount: 3,
    lastMessageAt: new Date("2026-07-28T15:03:00+09:00"),
    messages: [
      [
        "INBOUND",
        "CUSTOMER",
        "피코토닝 이벤트 보고 문의드려요. 가격이 어떻게 되나요?",
        "2026-07-28T13:31:00+09:00",
      ],
      [
        "OUTBOUND",
        "AI",
        "안녕하세요, 박지호님. 피코토닝 이벤트는 현재 1회 8만 9천원이며 피부 상태에 따라 맞춤 상담 후 진행해드리고 있어요.",
        "2026-07-28T13:33:00+09:00",
      ],
      [
        "INBOUND",
        "CUSTOMER",
        "좋아요! 이번 주 금요일 오후로 예약할 수 있을까요?",
        "2026-07-28T13:36:00+09:00",
      ],
      [
        "OUTBOUND",
        "STAFF",
        "금요일은 오후 4시와 5시 30분이 가능합니다. 편한 시간을 알려주세요.",
        "2026-07-28T13:38:00+09:00",
      ],
    ],
    appointments: [
      ["2026-07-31T16:00:00+09:00", "김민준 원장", "피코토닝", "SCHEDULED"],
      ["2026-06-12T15:30:00+09:00", "김민준 원장", "피코토닝", "COMPLETED"],
    ],
  },
  {
    channel: "LINE",
    externalThreadId: "demo-line-lim",
    patient: {
      chartNumber: "10202",
      name: "임정윤",
      phone: "010-5621-8820",
      gender: "여",
      birthDate: new Date("1991-09-18T00:00:00+09:00"),
      language: "ja",
      notes:
        "일본어 상담을 선호하며 서울 방문 일정에 맞춘 예약을 요청했습니다.",
      patientTags: ["해외고객", "보톡스"],
    },
    unreadCount: 1,
    lastMessageAt: new Date("2026-07-28T15:01:00+09:00"),
    messages: [
      [
        "INBOUND",
        "CUSTOMER",
        "来週ソウルに行きます。ボトックスの予約はできますか？",
        "2026-07-28T14:55:00+09:00",
      ],
      [
        "OUTBOUND",
        "AI",
        "はい、ご予約可能です。ご希望の曜日と時間を教えていただけますか？",
        "2026-07-28T14:56:00+09:00",
      ],
      [
        "INBOUND",
        "CUSTOMER",
        "金曜日の午後が希望です。",
        "2026-07-28T15:01:00+09:00",
      ],
    ],
    appointments: [],
  },
  {
    channel: "NAVER_TALK",
    externalThreadId: "demo-naver-hong",
    patient: {
      chartNumber: "10203",
      name: "홍태림",
      phone: "010-7731-2406",
      gender: "남",
      language: "ko",
      notes: "네이버 예약 페이지에서 유입되었습니다.",
      patientTags: ["신규", "여드름"],
    },
    unreadCount: 0,
    lastMessageAt: new Date("2026-07-28T14:47:00+09:00"),
    messages: [
      [
        "INBOUND",
        "CUSTOMER",
        "네이버에서 여드름 치료 보고 문의드립니다.",
        "2026-07-28T14:42:00+09:00",
      ],
      [
        "OUTBOUND",
        "STAFF",
        "안녕하세요. 현재 피부 상태를 확인할 수 있는 사진을 보내주실 수 있을까요?",
        "2026-07-28T14:44:00+09:00",
      ],
      [
        "INBOUND",
        "CUSTOMER",
        "(피부 사진을 보냈습니다.)",
        "2026-07-28T14:47:00+09:00",
      ],
    ],
    appointments: [],
  },
  {
    channel: "WECHAT",
    externalThreadId: "demo-wechat-chen",
    patient: {
      chartNumber: "10204",
      name: "陈美玲",
      phone: "+86 138 4402 1901",
      gender: "여",
      language: "zh",
      notes: "중국어 상담 고객입니다. 통역 없이 상담 진행 중입니다.",
      patientTags: ["해외고객", "리프팅"],
    },
    important: true,
    unreadCount: 2,
    lastMessageAt: new Date("2026-07-28T14:31:00+09:00"),
    messages: [
      [
        "INBOUND",
        "CUSTOMER",
        "你好，我想咨询面部提升项目。",
        "2026-07-28T14:26:00+09:00",
      ],
      [
        "OUTBOUND",
        "AI",
        "您好，可以为您介绍适合的提升项目。请问您最在意的是下颌线还是皮肤弹性？",
        "2026-07-28T14:28:00+09:00",
      ],
      [
        "INBOUND",
        "CUSTOMER",
        "我比较在意下颌线，大概需要多久？",
        "2026-07-28T14:31:00+09:00",
      ],
    ],
    appointments: [],
  },
  {
    channel: "WHATSAPP",
    externalThreadId: "demo-whatsapp-emma",
    patient: {
      chartNumber: "10205",
      name: "Emma Wilson",
      phone: "+1 415 555 0187",
      gender: "여",
      language: "en",
      notes: "영어 상담 고객이며 여행 중 시술 후 회복 시간을 문의했습니다.",
      patientTags: ["해외고객", "필러"],
    },
    unreadCount: 0,
    lastMessageAt: new Date("2026-07-28T14:12:00+09:00"),
    messages: [
      [
        "INBOUND",
        "CUSTOMER",
        "Hi, how much downtime should I expect after a lip filler treatment?",
        "2026-07-28T14:08:00+09:00",
      ],
      [
        "OUTBOUND",
        "AI",
        "Most patients experience mild swelling for 1–3 days. We recommend scheduling at least three days before an important event.",
        "2026-07-28T14:10:00+09:00",
      ],
      [
        "INBOUND",
        "CUSTOMER",
        "Great, can I book a consultation for Thursday?",
        "2026-07-28T14:12:00+09:00",
      ],
    ],
    appointments: [],
  },
  {
    channel: "INSTAGRAM",
    externalThreadId: "demo-instagram-choi",
    patient: {
      chartNumber: "10206",
      name: "최하은",
      phone: "010-9812-3321",
      gender: "여",
      language: "ko",
      notes: "인스타그램 체험단 콘텐츠를 보고 DM으로 문의했습니다.",
      patientTags: ["인스타그램", "인플루언서 유입"],
    },
    unreadCount: 1,
    lastMessageAt: new Date("2026-07-28T13:58:00+09:00"),
    messages: [
      [
        "INBOUND",
        "CUSTOMER",
        "인스타에서 리프팅 후기 보고 왔어요! 같은 시술 예약할 수 있나요?",
        "2026-07-28T13:54:00+09:00",
      ],
      [
        "OUTBOUND",
        "STAFF",
        "네, 가능합니다. 원하시는 날짜와 평소 고민 부위를 함께 알려주시면 예약을 도와드릴게요.",
        "2026-07-28T13:56:00+09:00",
      ],
      [
        "INBOUND",
        "CUSTOMER",
        "이번 주 토요일 가능할까요?",
        "2026-07-28T13:58:00+09:00",
      ],
    ],
    appointments: [],
  },
];

const patientTagDefinitions = {
  VIP: { color: "#D89B18", category: "STATUS" },
  피코토닝: { color: "#3157F6", category: "TREATMENT" },
  해외고객: { color: "#8066EC", category: "STATUS" },
  보톡스: { color: "#3157F6", category: "TREATMENT" },
  신규: { color: "#18A66A", category: "STATUS" },
  여드름: { color: "#3157F6", category: "TREATMENT" },
  리프팅: { color: "#3157F6", category: "TREATMENT" },
  필러: { color: "#3157F6", category: "TREATMENT" },
  인스타그램: { color: "#E35C9A", category: "SOURCE" },
  "인플루언서 유입": { color: "#E35C9A", category: "SOURCE" },
};

const thermageManualMarkdown = `## 시술 설명

써마지 FLX는 고주파를 이용하여 피부 진피층과 피하 지방층까지 깊게 열을 전달하여 콜라겐 생성을 촉진시켜 탄력 증대, 리프팅, 잔주름 개선, 피부결 개선 등의 효과가 있습니다.

피부 탄력이 줄어들고 주름이 생기기 시작한 분들에게 추천드리며, 한국인 얼굴의 권장 샷수는 600샷입니다.

---

## 시술 효과

- 피부 콜라겐 재생, 잔주름 개선, 탄력 개선 및 리프팅 효과
- 한 번의 시술로도 장기 효과를 볼 수 있습니다.

---

## 시술 방법

크림마취(40분) → 마킹 → 레이저(30분) → 플렉스톡스(15분) → 마무리

> 병원 내부 사정에 따라 소요시간은 달라질 수 있습니다.
>
> 시술 전 모든 귀금속 제거 필수

---

## 시술 금기사항

- 심장 제세동기 삽입자
- 임산부

---

## 다빈도 FAQ

### Q. 시술 직후 피부가 붉거나 따갑습니다. 괜찮은 건가요?

A. 네, 시술 후 붉은 기운이 있을 수 있으나 일시적인 현상입니다. 몇 시간에서 하루 안에 증상이 완화되지만 불편감이 지속된다면 병원으로 연락주세요. 시술 후 물집반응이 있을 경우 병원으로 연락주세요.

### Q. 효과는 언제부터 볼 수 있나요?

A. 일정시간 경과 후 피부가 탱탱해지는 느낌을 받을 수 있지만, 콜라겐 재생이 본격적으로 이루어지는 2~3개월 후에 가장 큰 효과를 확인할 수 있습니다. 개인에 따라 다소 차이가 있을 수 있으니 꾸준히 경과를 지켜봐 주세요.

### Q. 시술 시 통증이 심한가요?

A. 개인차가 있으나 시술 중 대부분 열감이나 통증을 느끼는 편입니다. 대부분은 마취크림만으로 진행 가능하나 통증이 걱정된다면 수면 마취로 진행이 가능합니다.

### Q. 시술 효과는 얼마나 유지되나요?

A. 써마지는 한 번의 시술로도 약 1년 정도의 효과를 기대할 수 있습니다.`;

async function main() {
  const hospital = await database.hospital.upsert({
    where: { slug: "test-clinic" },
    update: { name: "닥터네스트 테스트 피부과" },
    create: { name: "닥터네스트 테스트 피부과", slug: "test-clinic" },
  });

  await database.user.upsert({
    where: { username: "test" },
    update: {
      hospitalId: hospital.id,
      passwordHash: await hashPassword("test"),
      name: "테스트 관리자",
      role: "OWNER",
    },
    create: {
      hospitalId: hospital.id,
      username: "test",
      passwordHash: await hashPassword("test"),
      name: "테스트 관리자",
      role: "OWNER",
    },
  });

  for (const [channel, displayName] of channelSeeds) {
    await database.channelConnection.upsert({
      where: {
        hospitalId_channel: {
          hospitalId: hospital.id,
          channel,
        },
      },
      update: {},
      create: {
        hospitalId: hospital.id,
        channel,
        displayName,
        status: "DISCONNECTED",
      },
    });
  }

  for (const seed of conversationSeeds) {
    const phoneNormalized = normalizePhone(seed.patient.phone);
    const oldChartNumber = `C-${seed.patient.chartNumber}`;
    const existingPatient = await database.patient.findFirst({
      where: {
        hospitalId: hospital.id,
        OR: [
          { chartNumber: seed.patient.chartNumber },
          { chartNumber: oldChartNumber },
          ...(phoneNormalized
            ? [
                { phoneNormalized },
                {
                  phone: seed.patient.phone,
                },
              ]
            : []),
        ],
      },
    });

    const patientData = {
      chartNumber: seed.patient.chartNumber,
      name: seed.patient.name,
      phone: seed.patient.phone,
      phoneNormalized,
      gender: seed.patient.gender,
      birthDate: seed.patient.birthDate,
      language: seed.patient.language,
      notes: seed.patient.notes,
      legacyTags: seed.patient.patientTags,
    };

    const patient = existingPatient
      ? await database.patient.update({
          where: { id: existingPatient.id },
          data: patientData,
        })
      : await database.patient.create({
          data: {
            hospitalId: hospital.id,
            ...patientData,
          },
        });

    for (const tagName of seed.patient.patientTags) {
      const definition = patientTagDefinitions[tagName] ?? {
        color: "#3157F6",
        category: "TREATMENT",
      };
      const tag = await database.patientTag.upsert({
        where: {
          hospitalId_name: {
            hospitalId: hospital.id,
            name: tagName,
          },
        },
        update: definition,
        create: {
          hospitalId: hospital.id,
          name: tagName,
          ...definition,
        },
      });

      await database.patientTagAssignment.upsert({
        where: {
          patientId_tagId: {
            patientId: patient.id,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          patientId: patient.id,
          tagId: tag.id,
        },
      });
    }

    const channelSeedsForPatient =
      seed.patient.chartNumber === "10201"
        ? [
            {
              channel: "KAKAO",
              externalCustomerId: "demo-kakao-park",
              displayName: "박지호 · 카카오",
            },
            {
              channel: "LINE",
              externalCustomerId: "demo-line-park",
              displayName: "박지호 · LINE",
            },
          ]
        : [
            {
              channel: seed.channel,
              externalCustomerId: seed.externalThreadId,
              displayName: `${seed.patient.name} · ${seed.channel}`,
            },
          ];

    let conversationPatientChannel = null;
    for (const patientChannelSeed of channelSeedsForPatient) {
      const patientChannel = await database.patientChannel.upsert({
        where: {
          hospitalId_channel_externalCustomerId: {
            hospitalId: hospital.id,
            channel: patientChannelSeed.channel,
            externalCustomerId: patientChannelSeed.externalCustomerId,
          },
        },
        update: {
          patientId: patient.id,
          displayName: patientChannelSeed.displayName,
          phone: patient.phone,
          phoneNormalized,
        },
        create: {
          hospitalId: hospital.id,
          patientId: patient.id,
          channel: patientChannelSeed.channel,
          externalCustomerId: patientChannelSeed.externalCustomerId,
          displayName: patientChannelSeed.displayName,
          phone: patient.phone,
          phoneNormalized,
        },
      });

      if (patientChannel.channel === seed.channel) {
        conversationPatientChannel = patientChannel;
      }
    }

    const conversationKey = {
      hospitalId: hospital.id,
      channel: seed.channel,
      externalThreadId: seed.externalThreadId,
    };
    const existingConversation = await database.conversation.findUnique({
      where: {
        hospitalId_channel_externalThreadId: conversationKey,
      },
    });

    const conversation = existingConversation
      ? await database.conversation.update({
          where: { id: existingConversation.id },
          data: {
            patientId: patient.id,
            patientChannelId: conversationPatientChannel?.id ?? null,
            important: seed.important ?? false,
            unreadCount: seed.unreadCount,
            lastMessageAt: seed.lastMessageAt,
          },
        })
      : await database.conversation.create({
          data: {
            ...conversationKey,
            patientId: patient.id,
            patientChannelId: conversationPatientChannel?.id ?? null,
            important: seed.important ?? false,
            unreadCount: seed.unreadCount,
            lastMessageAt: seed.lastMessageAt,
            messages: {
              create: seed.messages.map(
                ([direction, sender, content, sentAt]) => ({
                  direction,
                  sender,
                  content,
                  sentAt: new Date(sentAt),
                }),
              ),
            },
          },
        });

    const appointmentCount = await database.appointment.count({
      where: { patientId: patient.id },
    });
    if (appointmentCount === 0 && seed.appointments.length > 0) {
      await database.appointment.createMany({
        data: seed.appointments.map(
          ([scheduledAt, doctorName, treatment, status]) => ({
            hospitalId: hospital.id,
            patientId: patient.id,
            scheduledAt: new Date(scheduledAt),
            doctorName,
            treatment,
            status,
          }),
        ),
      });
    }

    console.log(
      `Seeded ${conversation.channel} conversation for patient ${patient.chartNumber} ${patient.name}`,
    );
  }

  const skinFolder = await database.manualFolder.upsert({
    where: {
      hospitalId_name: {
        hospitalId: hospital.id,
        name: "피부",
      },
    },
    update: { sortOrder: 10 },
    create: {
      hospitalId: hospital.id,
      name: "피부",
      sortOrder: 10,
    },
  });

  const thermageTag = await database.manualTag.upsert({
    where: {
      hospitalId_name: {
        hospitalId: hospital.id,
        name: "써마지 FLX(4세대)",
      },
    },
    update: { color: "#8066EC" },
    create: {
      hospitalId: hospital.id,
      name: "써마지 FLX(4세대)",
      color: "#8066EC",
    },
  });

  const thermageManual = await database.manualDocument.upsert({
    where: {
      hospitalId_slug: {
        hospitalId: hospital.id,
        slug: "thermage-flx-4th",
      },
    },
    update: {
      folderId: skinFolder.id,
      title: "써마지 FLX(4세대)",
      contentMarkdown: thermageManualMarkdown,
      sortOrder: 10,
    },
    create: {
      hospitalId: hospital.id,
      folderId: skinFolder.id,
      title: "써마지 FLX(4세대)",
      slug: "thermage-flx-4th",
      contentMarkdown: thermageManualMarkdown,
      sortOrder: 10,
    },
  });

  await database.manualDocumentTag.upsert({
    where: {
      documentId_tagId: {
        documentId: thermageManual.id,
        tagId: thermageTag.id,
      },
    },
    update: {},
    create: {
      documentId: thermageManual.id,
      tagId: thermageTag.id,
    },
  });

  console.log(
    `Test hospital ready: ${hospital.name} (${hospital.slug}), login test / test`,
  );
}

main().finally(async () => {
  await database.$disconnect();
});
