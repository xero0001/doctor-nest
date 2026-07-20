import { PrismaClient } from "@prisma/client";

const globalForDatabase = globalThis as unknown as {
  doctorNestDatabase?: PrismaClient;
};

export function getDatabase() {
  if (!globalForDatabase.doctorNestDatabase) {
    globalForDatabase.doctorNestDatabase = new PrismaClient();
  }

  return globalForDatabase.doctorNestDatabase;
}
