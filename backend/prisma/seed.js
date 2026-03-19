/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

async function main() {
  const prisma = new PrismaClient();

  // Ensure roles exist
  const roles = [
    { name: "USER" },
    { name: "EMPLOYEE" },
    { name: "MANAGER" },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name },
    });
  }

  const managerRole = await prisma.role.findUnique({ where: { name: "MANAGER" } });

  // Auto-create manager: login "manager", password "12345"
  const managerPasswordHash = await bcrypt.hash("12345", 10);

  await prisma.user.upsert({
    where: { username: "manager" },
    update: {
      passwordHash: managerPasswordHash,
      roleId: managerRole.id,
      name: "Manager",
      email: "manager@example.com",
    },
    create: {
      username: "manager",
      email: "manager@example.com",
      name: "Manager",
      passwordHash: managerPasswordHash,
      roleId: managerRole.id,
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

