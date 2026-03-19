import { google } from "googleapis";
import { getEnv, requireGoogleEnv } from "../config/env";
import { HttpError } from "../utils/httpError";

export async function readSheetsValues(input: {
  userRefreshToken: string;
  spreadsheetId?: string;
  range?: string;
}) {
  const env = getEnv(process.env);
  requireGoogleEnv(env);

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID!,
    env.GOOGLE_CLIENT_SECRET!,
    env.GOOGLE_REDIRECT_URI!
  );
  oauth2Client.setCredentials({ refresh_token: input.userRefreshToken });

  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  const spreadsheetId = input.spreadsheetId ?? env.GOOGLE_SHEETS_ID;
  const range = input.range ?? env.GOOGLE_SHEETS_RANGE;

  if (!spreadsheetId) throw new HttpError(400, "GOOGLE_SHEETS_ID is not configured");

  try {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return resp.data.values ?? [];
  } catch (e) {
    throw new HttpError(400, "Failed to read Google Sheets values", e);
  }
}

