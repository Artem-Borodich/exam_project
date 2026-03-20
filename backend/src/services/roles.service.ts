import { prisma } from "./prisma";
import { HttpError } from "../utils/httpError";

export async function getPendingUsers() {
  return prisma.user.findMany({
    where: { role: null, isApproved: false },
    select: {
      id: true,
      email: true,
      name: true,
      isApproved: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function confirmAsEmployee(userId: number) {
  const updated = await prisma.user.updateMany({
    where: { id: userId, role: null, isApproved: false },
    data: { role: "EMPLOYEE", isApproved: true },
  });

  if (updated.count === 0) {
    throw new HttpError(404, "User not found or already confirmed");
  }

  return { confirmedUserId: userId };
}

