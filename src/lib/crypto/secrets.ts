/**
 * Versleuteling voor wat er niet leesbaar in de database mag staan.
 *
 * De tokens van TikTok geven toegang tot het account van de gebruiker. Ze horen
 * dus niet als leesbare tekst in een tabel: iedereen met een databasedump heeft
 * dan het account. Het schema had de kolommen al `accessTokenEnc` genoemd; dit
 * is het stuk dat die naam waarmaakt.
 *
 * AES-256-GCM. Niet omdat het chic klinkt, maar omdat GCM naast geheimhouding
 * ook merkt dát er geknoeid is: bij een gewijzigde ciphertext faalt het ontcijferen
 * in plaats van dat er stilletjes onzin uitkomt.
 *
 * De sleutel komt uit `SESSION_SECRET` via scrypt. Eén geheim beheren is er
 * eentje dat je niet vergeet te roteren. De keerzijde staat hieronder: verandert
 * dat geheim, dan is alles wat hiermee versleuteld is onleesbaar.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Vaste zoutwaarde.
 *
 * Een zout hoort per wachtwoord te verschillen; hier gaat het om één sleutel
 * die uit één geheim komt, en die moet elke keer hetzelfde zijn, anders is wat
 * je gisteren opsloeg vandaag onleesbaar. Het zout doet hier dus domeinscheiding
 * en niet meer dan dat.
 */
const SALT = "voxclip.studio.token.v1";

let cached: Buffer | null = null;

function key(): Buffer {
  if (cached) return cached;

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET ontbreekt of is te kort. Zonder dat geheim kunnen tokens niet versleuteld worden, en dan slaan we ze liever helemaal niet op.",
    );
  }

  cached = scryptSync(secret, SALT, 32);
  return cached;
}

/**
 * Versleutelt een geheim.
 *
 * Uitvoer is `iv.tag.ciphertext`, alle drie in base64url. Het iv hoort niet
 * geheim te zijn maar wel uniek per bericht; dat is wat `randomBytes` hier doet.
 */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, enc].map((b) => b.toString("base64url")).join(".");
}

/**
 * Ontcijfert, of gooit.
 *
 * Bewust geen `null` bij mislukking: een token dat er niet is en een token dat
 * niet klopt zijn twee verschillende problemen, en het tweede wil je zien.
 */
export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Versleutelde waarde heeft niet de verwachte drie delen.");
  }

  const [iv, tag, enc] = parts.map((p) => Buffer.from(p, "base64url"));
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Versleutelde waarde heeft een onverwachte lengte.");
  }

  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** Voor logs en foutmeldingen. Nooit het hele token. */
export function maskToken(token: string): string {
  if (token.length <= 8) return "…";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}
