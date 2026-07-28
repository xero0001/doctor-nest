import { promisify } from "node:util";
import { scrypt as scryptCallback, randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";

const database = new PrismaClient();
const scrypt = promisify(scryptCallback);

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
    customer: {
      externalRef: "C-10201",
      name: "박지호",
      phone: "010-1234-1234",
      gender: "여",
      birthDate: new Date("1995-04-07T00:00:00+09:00"),
      language: "ko",
      notes: "통증에 대한 걱정이 있어 시술 전 충분한 안내를 선호합니다.",
      tags: ["VIP", "피코토닝"],
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
    customer: {
      externalRef: "C-10202",
      name: "임정윤",
      phone: "010-5621-8820",
      gender: "여",
      birthDate: new Date("1991-09-18T00:00:00+09:00"),
      language: "ja",
      notes:
        "일본어 상담을 선호하며 서울 방문 일정에 맞춘 예약을 요청했습니다.",
      tags: ["해외고객", "보톡스"],
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
    customer: {
      externalRef: "C-10203",
      name: "홍태림",
      phone: "010-7731-2406",
      gender: "남",
      language: "ko",
      notes: "네이버 예약 페이지에서 유입되었습니다.",
      tags: ["신규", "여드름"],
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
    customer: {
      externalRef: "C-10204",
      name: "陈美玲",
      phone: "+86 138 4402 1901",
      gender: "여",
      language: "zh",
      notes: "중국어 상담 고객입니다. 통역 없이 상담 진행 중입니다.",
      tags: ["해외고객", "리프팅"],
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
    customer: {
      externalRef: "C-10205",
      name: "Emma Wilson",
      phone: "+1 415 555 0187",
      gender: "여",
      language: "en",
      notes: "영어 상담 고객이며 여행 중 시술 후 회복 시간을 문의했습니다.",
      tags: ["해외고객", "필러"],
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
    customer: {
      externalRef: "C-10206",
      name: "최하은",
      phone: "010-9812-3321",
      gender: "여",
      language: "ko",
      notes: "인스타그램 체험단 콘텐츠를 보고 DM으로 문의했습니다.",
      tags: ["인스타그램", "인플루언서 유입"],
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

async function main() {
  const organization = await database.organization.upsert({
    where: { slug: "test-clinic" },
    update: { name: "닥터네스트 테스트 피부과" },
    create: { name: "닥터네스트 테스트 피부과", slug: "test-clinic" },
  });

  await database.user.upsert({
    where: { username: "test" },
    update: {
      organizationId: organization.id,
      passwordHash: await hashPassword("test"),
      name: "테스트 관리자",
      role: "OWNER",
    },
    create: {
      organizationId: organization.id,
      username: "test",
      passwordHash: await hashPassword("test"),
      name: "테스트 관리자",
      role: "OWNER",
    },
  });

  for (const [channel, displayName] of channelSeeds) {
    await database.channelConnection.upsert({
      where: {
        organizationId_channel: {
          organizationId: organization.id,
          channel,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        channel,
        displayName,
        status: "DISCONNECTED",
      },
    });
  }

  const conversationCount = await database.conversation.count({
    where: { organizationId: organization.id },
  });

  if (conversationCount === 0) {
    for (const seed of conversationSeeds) {
      const customer = await database.customer.create({
        data: {
          organizationId: organization.id,
          ...seed.customer,
        },
      });

      const conversation = await database.conversation.create({
        data: {
          organizationId: organization.id,
          customerId: customer.id,
          channel: seed.channel,
          externalThreadId: seed.externalThreadId,
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

      if (seed.appointments.length > 0) {
        await database.appointment.createMany({
          data: seed.appointments.map(
            ([scheduledAt, doctorName, treatment, status]) => ({
              organizationId: organization.id,
              customerId: customer.id,
              scheduledAt: new Date(scheduledAt),
              doctorName,
              treatment,
              status,
            }),
          ),
        });
      }

      console.log(
        `Seeded ${conversation.channel} conversation for ${customer.name}`,
      );
    }
  }

  console.log("Test login ready: test / test");
}

main().finally(async () => {
  await database.$disconnect();
});
