/**
 * De TikTok Display API.
 *
 * Alleen lezen. Dit haalt de cijfers op van video's die je zelf hebt geplaatst;
 * het plaatst niets. Dat is een bewuste grens en ook een praktische: voor posten
 * eist TikTok een audit waarbij je account op privé moet staan, en dan is
 * "automatisch" meer werk dan met de hand.
 *
 * Wat we gebruiken:
 *  - scope `user.info.basic,video.list`
 *  - `POST /v2/video/list/` geeft per video id, share_url, create_time en de
 *    tellers voor views, likes, reacties en shares
 *
 * Zie https://developers.tiktok.com/doc/tiktok-api-v2-video-object
 *
 * De netwerkkant staat hier; alles wat te beslissen valt staat in `sync.ts`,
 * zodat dat te testen is zonder TikTok.
 */

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const LIST_URL = "https://open.tiktokapis.com/v2/video/list/";

export const SCOPES = "user.info.basic,video.list";

/** De velden die we opvragen. Niet meer dan nodig. */
export const FIELDS = [
  "id",
  "share_url",
  "create_time",
  "title",
  "video_description",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
] as const;

export interface TikTokVideo {
  id: string;
  share_url?: string;
  create_time?: number;
  title?: string;
  video_description?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Wanneer het toegangstoken verloopt. */
  expiresAt: Date;
  openId: string;
  scopes: string[];
}

export class TikTokError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "TikTokError";
  }
}

function clientKey(): string {
  const key = process.env.TIKTOK_CLIENT_KEY;
  if (!key) {
    throw new TikTokError(
      "TIKTOK_CLIENT_KEY ontbreekt. Maak een app aan op developers.tiktok.com en zet de sleutel in je omgevingsvariabelen.",
    );
  }
  return key;
}

function clientSecret(): string {
  const secret = process.env.TIKTOK_CLIENT_SECRET;
  if (!secret) {
    throw new TikTokError("TIKTOK_CLIENT_SECRET ontbreekt.");
  }
  return secret;
}

/** Of de koppeling überhaupt ingesteld is. Voor de knop in de app. */
export function isConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

/**
 * Waar we de gebruiker heen sturen om toestemming te geven.
 *
 * `state` gaat mee terug en wordt bij de callback vergeleken met wat in de
 * cookie staat. Zonder die controle kan iemand anders jouw account aan zijn
 * koppeling hangen.
 */
export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_key: clientKey(),
    scope: SCOPES,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function postForm(url: string, body: URLSearchParams): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok || typeof json.access_token !== "string") {
    const description =
      typeof json.error_description === "string" ? json.error_description : "";
    throw new TikTokError(
      `TikTok gaf geen token terug. ${description}`.trim(),
      typeof json.error === "string" ? json.error : undefined,
    );
  }
  return json;
}

function toTokens(json: Record<string, unknown>): Tokens {
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  return {
    accessToken: String(json.access_token),
    refreshToken: String(json.refresh_token ?? ""),
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    openId: String(json.open_id ?? ""),
    scopes: String(json.scope ?? SCOPES).split(","),
  };
}

/** Wisselt de code van de callback in voor tokens. */
export async function exchangeCode(code: string, redirectUri: string): Promise<Tokens> {
  return toTokens(
    await postForm(
      TOKEN_URL,
      new URLSearchParams({
        client_key: clientKey(),
        client_secret: clientSecret(),
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    ),
  );
}

/** Haalt een nieuw toegangstoken met het verversingstoken. */
export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  return toTokens(
    await postForm(
      TOKEN_URL,
      new URLSearchParams({
        client_key: clientKey(),
        client_secret: clientSecret(),
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    ),
  );
}

/**
 * Haalt een pagina video's op.
 *
 * TikTok geeft er hoogstens twintig per keer. `cursor` is een tijdstempel in
 * milliseconden; geef die terug om verder te bladeren.
 */
export async function listVideos(
  accessToken: string,
  cursor?: number,
): Promise<{ videos: TikTokVideo[]; cursor?: number; hasMore: boolean }> {
  const response = await fetch(`${LIST_URL}?fields=${FIELDS.join(",")}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cursor ? { max_count: 20, cursor } : { max_count: 20 }),
    cache: "no-store",
  });

  const json = (await response.json()) as {
    data?: { videos?: TikTokVideo[]; cursor?: number; has_more?: boolean };
    error?: { code?: string; message?: string };
  };

  if (!response.ok || (json.error?.code && json.error.code !== "ok")) {
    throw new TikTokError(
      json.error?.message ?? "TikTok gaf een fout bij het ophalen van je video's.",
      json.error?.code,
    );
  }

  return {
    videos: json.data?.videos ?? [],
    cursor: json.data?.cursor,
    hasMore: Boolean(json.data?.has_more),
  };
}
