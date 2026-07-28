/* global console, process */

import { randomUUID } from "node:crypto";

import { getDatabase } from "@doctornest/database";
import { hashPassword } from "better-auth/crypto";

const database = getDatabase();

async function main() {
  const organization = await database.organization.findUnique({
    where: { slug: "test-clinic" },
  });

  if (!organization) {
    throw new Error("Run the database seed before creating the auth account.");
  }

  const password = await hashPassword("test");
  const existingUser = await database.authUser.findUnique({
    where: { username: "test" },
  });

  const user = existingUser
    ? await database.authUser.update({
        where: { id: existingUser.id },
        data: {
          name: "테스트 관리자",
          email: "test@doctornest.local",
          emailVerified: true,
          displayUsername: "test",
          organizationId: organization.id,
          role: "OWNER",
        },
      })
    : await database.authUser.create({
        data: {
          id: randomUUID(),
          name: "테스트 관리자",
          email: "test@doctornest.local",
          emailVerified: true,
          username: "test",
          displayUsername: "test",
          organizationId: organization.id,
          role: "OWNER",
        },
      });

  const credentialAccount = await database.authAccount.findFirst({
    where: {
      userId: user.id,
      providerId: "credential",
    },
  });

  if (credentialAccount) {
    await database.authAccount.update({
      where: { id: credentialAccount.id },
      data: {
        accountId: user.id,
        password,
      },
    });
  } else {
    await database.authAccount.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password,
      },
    });
  }

  await database.authSession.deleteMany({
    where: { userId: user.id },
  });
}

main()
  .then(async () => {
    await database.$disconnect();
    console.log("Better Auth test account is ready.");
  })
  .catch(async (error) => {
    console.error(error);
    await database.$disconnect();
    process.exit(1);
  });
