import jwt from "jsonwebtoken";

export type JwtPayload = {
  userId: number;
  // Optional shortcut for client-side; backend authorization still uses DB.
  role?: "EMPLOYEE" | "MANAGER";
};

export function signJwt(payload: JwtPayload, secret: string) {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyJwt(token: string, secret: string) {
  return jwt.verify(token, secret) as JwtPayload;
}

