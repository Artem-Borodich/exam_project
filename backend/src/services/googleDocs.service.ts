import { google } from "googleapis";
import { getEnv, requireGoogleEnv } from "../config/env";
import { HttpError } from "../utils/httpError";

export async function createGoogleDocWithText(input: {
  userRefreshToken: string;
  title: string;
  text: string;
}) {
  const env = getEnv(process.env);
  requireGoogleEnv(env);

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID!,
    env.GOOGLE_CLIENT_SECRET!,
    env.GOOGLE_REDIRECT_URI!
  );
  oauth2Client.setCredentials({ refresh_token: input.userRefreshToken });

  const docs = google.docs({ version: "v1", auth: oauth2Client });

  try {
    const created: any = await (docs.documents.create as any)({
      requestBody: { title: input.title },
    });
    const documentId = created?.data?.documentId;
    if (!documentId) throw new HttpError(500, "Google Docs: missing documentId");

    // Insert text at the beginning of the document
    const batch = await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: input.text,
            },
          },
        ],
      },
    });

    void batch; // silence unused warning

    return {
      googleDocId: documentId,
      googleDocUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  } catch (e) {
    throw new HttpError(400, "Failed to create Google Docs document", e);
  }
}

