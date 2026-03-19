import { prisma } from "./prisma";
import { HttpError } from "../utils/httpError";

type RoleName = "USER" | "EMPLOYEE" | "MANAGER";

export async function getPendingUsers() {
  return prisma.user.findMany({
    where: { roleId: null },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function confirmAsEmployee(userId: number) {
  const role = await prisma.role.findUnique({ where: { name: "EMPLOYEE" as RoleName } });
  if (!role) throw new HttpError(500, "EMPLOYEE role not initialized");

  const updated = await prisma.user.updateMany({
    where: { id: userId, roleId: null },
    data: { roleId: role.id },
  });

  if (updated.count === 0) {
    throw new HttpError(404, "User not found or already confirmed");
  }

  return { confirmedUserId: userId };
}

