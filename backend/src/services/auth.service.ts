import bcrypt from "bcrypt";
import { prisma } from "./prisma";
import { signJwt, type JwtPayload } from "./jwt.service";
import { HttpError } from "../utils/httpError";

type RoleName = "USER" | "EMPLOYEE" | "MANAGER";

export async function registerUser(input: {
  username: string;
  email?: string;
  name?: string;
  password: string;
}) {
  const { username, email, name, password } = input;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, ...(email ? [{ email }] : [])],
    },
    select: { id: true, username: true, email: true },
  });

  if (existing) {
    throw new HttpError(409, "User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      name: name ?? null,
      passwordHash,
      roleId: null, // pending confirmation by manager
    },
    select: { id: true, username: true, role: { select: { name: true } } },
  });

  return {
    id: user.id,
    username: user.username,
    roleName: (user.role?.name ?? null) as RoleName | null,
    message:
      "User created. Waiting for manager confirmation (role will be assigned by manager).",
  };
}

export async function login(input: {
  login: string;
  password: string;
}) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: input.login }, { email: input.login }],
    },
    include: { role: true },
  });

  if (!user || !user.passwordHash) {
    throw new HttpError(401, "Invalid credentials");
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, "Invalid credentials");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new HttpError(500, "JWT_SECRET is not configured");
  }

  const tokenPayload: JwtPayload = {
    userId: user.id,
    roleName: user.role?.name ?? undefined,
  };

  const token = signJwt(tokenPayload, jwtSecret);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      roleName: (user.role?.name ?? null) as RoleName | null,
    },
  };
}

