/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

async function main() {
  const prisma = new PrismaClient();

  // Default manager must exist:
  // login: manager
  // password: 12345
  //
  // Exam requirement: role in DB is nullable (null | employee | manager) and manager is approved by default.
  const managerPasswordHash = await bcrypt.hash("12345", 10);

  await prisma.user.upsert({
    where: { email: "manager" },
    update: {
      password: managerPasswordHash,
      role: "MANAGER",
      isApproved: true,
      name: "Manager",
    },
    create: {
      email: "manager",
      password: managerPasswordHash,
      role: "MANAGER",
      isApproved: true,
      name: "Manager",
    },
  });

  await prisma.$disconnect();
}

main()
  .then(() => console.log("Prisma seed completed"))
  .catch(async (e) => {
    console.error("Prisma seed error:", e);
    process.exitCode = 1;
  });

