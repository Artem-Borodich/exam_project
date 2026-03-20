import bcrypt from "bcrypt";
import { prisma } from "./prisma";
import { signJwt, type JwtPayload } from "./jwt.service";
import { HttpError } from "../utils/httpError";

export async function registerUser(input: {
  email: string;
  name?: string;
  password: string;
}) {
  const { email, name, password } = input;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new HttpError(409, "User already exists");

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: name ?? null,
      password: passwordHash,
      role: null, // pending confirmation by manager
      isApproved: false,
    },
    select: { id: true, email: true, role: true, isApproved: true },
  });

  return {
    id: user.id,
    email: user.email,
    roleName: user.role ?? null,
    isApproved: user.isApproved,
    message:
      "User created. Waiting for manager confirmation (role will be assigned by manager).",
  };
}

export async function login(input: {
  login: string; // exam: treat login as email string
  password: string;
}) {
  const user = await prisma.user.findFirst({
    where: { email: input.login },
    select: { id: true, email: true, password: true, role: true, isApproved: true },
  });

  if (!user || !user.password) {
    throw new HttpError(401, "Invalid credentials");
  }

  const ok = await bcrypt.compare(input.password, user.password);
  if (!ok) {
    throw new HttpError(401, "Invalid credentials");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new HttpError(500, "JWT_SECRET is not configured");
  }

  const tokenPayload: JwtPayload = {
    userId: user.id,
    role: user.role ?? undefined,
  };

  const token = signJwt(tokenPayload, jwtSecret);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      roleName: user.role ?? null,
      isApproved: user.isApproved,
    },
  };
}

