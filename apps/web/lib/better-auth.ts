import { getDatabase } from "@doctornest/database";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";

export const auth = betterAuth({
  appName: "DoctorNest",
  database: prismaAdapter(getDatabase(), {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.DOCTORNEST_AUTH_SEED !== "true",
    minPasswordLength: 4,
  },
  user: {
    modelName: "AuthUser",
    additionalFields: {
      hospitalId: {
        type: "string",
        required: false,
        input: false,
        index: true,
      },
      role: {
        type: "string",
        required: true,
        input: false,
        defaultValue: "AGENT",
      },
    },
  },
  session: {
    modelName: "AuthSession",
    expiresIn: 60 * 60 * 24 * 14,
  },
  account: {
    modelName: "AuthAccount",
  },
  verification: {
    modelName: "AuthVerification",
  },
  disabledPaths: ["/is-username-available"],
  plugins: [username()],
});
