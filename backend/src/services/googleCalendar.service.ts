import { google } from "googleapis";
import { HttpError } from "../utils/httpError";
import { requireGoogleEnv, getEnv } from "../config/env";

export async function createCalendarEvent(input: {
  userRefreshToken: string;
  summary: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  location?: string;
  timezone?: string;
}) {
  const env = getEnv(process.env);
  const googleEnv = requireGoogleEnv(env);

  const oauth2Client = new google.auth.OAuth2(
    googleEnv.clientId,
    googleEnv.clientSecret,
    googleEnv.redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: input.userRefreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const calendarId = env.GOOGLE_CALENDAR_ID ?? "primary";

  try {
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: {
          dateTime: input.startAt.toISOString(),
          timeZone: input.timezone,
        },
        end: {
          dateTime: input.endAt.toISOString(),
          timeZone: input.timezone,
        },
      },
    });

    return {
      googleEventId: event.data.id ?? null,
      googleEventUrl: event.data.htmlLink ?? null,
    };
  } catch (e) {
    throw new HttpError(400, "Failed to create Google Calendar event", e);
  }
}

