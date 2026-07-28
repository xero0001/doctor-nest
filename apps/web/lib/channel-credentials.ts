import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export type LineCredentials = {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
};

const credentialVersion = "v1";

function getCredentialKey() {
  const secret =
    process.env.CHANNEL_CREDENTIALS_KEY ?? process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "CHANNEL_CREDENTIALS_KEY 또는 BETTER_AUTH_SECRET이 필요합니다.",
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptChannelCredentials(credentials: LineCredentials) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getCredentialKey(),
    initializationVector,
  );
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  const authenticationTag = cipher.getAuthTag();

  return [
    credentialVersion,
    initializationVector.toString("base64url"),
    authenticationTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptLineCredentials(value: string): LineCredentials {
  const [version, encodedIv, encodedTag, encodedPayload] = value.split(".");

  if (
    version !== credentialVersion ||
    !encodedIv ||
    !encodedTag ||
    !encodedPayload
  ) {
    throw new Error("지원하지 않는 채널 자격증명 형식입니다.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getCredentialKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encodedPayload, "base64url")),
    decipher.final(),
  ]);
  const parsed = JSON.parse(decrypted.toString("utf8")) as Partial<LineCredentials>;

  if (
    !parsed.channelId ||
    !parsed.channelSecret ||
    !parsed.channelAccessToken
  ) {
    throw new Error("LINE 자격증명 값이 완전하지 않습니다.");
  }

  return {
    channelId: parsed.channelId,
    channelSecret: parsed.channelSecret,
    channelAccessToken: parsed.channelAccessToken,
  };
}
