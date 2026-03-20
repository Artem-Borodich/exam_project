import { google } from "googleapis";
import { prisma } from "./prisma";
import { signJwt, type JwtPayload } from "./jwt.service";
import { getEnv, requireGoogleEnv } from "../config/env";
import { HttpError } from "../utils/httpError";

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

function buildOAuthClient() {
  const env = getEnv(process.env);
  const googleEnv = requireGoogleEnv(env);
  return new google.auth.OAuth2(googleEnv.clientId, googleEnv.clientSecret, googleEnv.redirectUri);
}

export async function getAuthorizationUrl() {
  const env = getEnv(process.env);
  // Validate only required oauth env vars
  requireGoogleEnv(env);

  const oauth2Client = buildOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline", // нужна refresh_token
    prompt: "consent", // чтобы получить refresh_token первый раз
    scope: DEFAULT_SCOPES,
    include_granted_scopes: true,
  });
}

export async function handleGoogleCallback(code: string): Promise<{ token: string }> {
  const env = getEnv(process.env);
  const googleEnv = requireGoogleEnv(env);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new HttpError(500, "JWT_SECRET is not configured");
  }

  const oauth2Client = new google.auth.OAuth2(
    googleEnv.clientId,
    googleEnv.clientSecret,
    googleEnv.redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    throw new HttpError(
      400,
      "Missing refresh_token from Google OAuth. Ensure access_type=offline and prompt=consent."
    );
  }

  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  const email = userInfo.data.email;
  const name = userInfo.data.name ?? null;
  if (!email) {
    throw new HttpError(400, "Google did not provide an email");
  }

  const user = await prisma.user.upsert({
    where: { email: email },
    update: {
      googleRefreshToken: refreshToken,
      name: name ?? undefined,
      googleTokenUpdatedAt: new Date(),
    },
    create: {
      email,
      name,
      password: null,
      googleRefreshToken: refreshToken,
      googleTokenUpdatedAt: new Date(),
      role: null, // new user will be approved by manager
      isApproved: false,
    },
    select: { id: true, email: true, role: true, isApproved: true },
  });

  const tokenPayload: JwtPayload = {
    userId: user.id,
    role: user.role ?? undefined,
  };

  const token = signJwt(tokenPayload, jwtSecret);
  return { token };
}

