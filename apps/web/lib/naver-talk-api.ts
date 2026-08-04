const NAVER_TALK_EVENT_URL =
  "https://gw.talk.naver.com/chatbot/v1/event";

type NaverTalkApiResponse = {
  success?: boolean;
  resultCode?: string;
  resultMessage?: string;
};

export class NaverTalkApiError extends Error {
  constructor(
    message: string,
    readonly resultCode?: string,
  ) {
    super(message);
    this.name = "NaverTalkApiError";
  }
}

export async function sendNaverTalkTextMessage({
  authorization,
  userId,
  text,
}: {
  authorization: string;
  userId: string;
  text: string;
}) {
  const response = await fetch(NAVER_TALK_EVENT_URL, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({
      event: "send",
      user: userId,
      textContent: { text },
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    throw new NaverTalkApiError(
      "네이버 톡톡 보내기 API에 연결하지 못했습니다.",
    );
  }

  const result = (await response.json().catch(() => null)) as
    | NaverTalkApiResponse
    | null;

  if (
    !response.ok ||
    result?.success !== true ||
    result.resultCode !== "00"
  ) {
    throw new NaverTalkApiError(
      result?.resultMessage || "네이버 톡톡 메시지를 발송하지 못했습니다.",
      result?.resultCode,
    );
  }

  return result;
}

export async function sendNaverTalkImageMessage({
  authorization,
  userId,
  imageUrl,
}: {
  authorization: string;
  userId: string;
  imageUrl: string;
}) {
  const response = await fetch(NAVER_TALK_EVENT_URL, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({
      event: "send",
      user: userId,
      imageContent: { imageUrl },
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    throw new NaverTalkApiError(
      "네이버 톡톡 보내기 API에 연결하지 못했습니다.",
    );
  }

  const result = (await response.json().catch(() => null)) as
    | NaverTalkApiResponse
    | null;

  if (
    !response.ok ||
    result?.success !== true ||
    result.resultCode !== "00"
  ) {
    throw new NaverTalkApiError(
      result?.resultMessage || "네이버 톡톡 이미지를 발송하지 못했습니다.",
      result?.resultCode,
    );
  }

  return result;
}
