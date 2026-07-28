import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

function scrypt(password: string, salt: Buffer, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);

  return `scrypt$${salt.toString("base64")}$${Buffer.from(derivedKey).toString("base64")}`;
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, saltValue, hashValue] = encodedHash.split("$");

  if (algorithm !== "scrypt" || !saltValue || !hashValue) {
    return false;
  }

  const expectedHash = Buffer.from(hashValue, "base64");
  const derivedKey = Buffer.from(
    await scrypt(
      password,
      Buffer.from(saltValue, "base64"),
      expectedHash.length,
    ),
  );

  return (
    derivedKey.length === expectedHash.length &&
    timingSafeEqual(derivedKey, expectedHash)
  );
}
