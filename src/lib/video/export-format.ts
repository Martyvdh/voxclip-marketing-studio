/**
 * Welk bestandsformaat de export krijgt.
 *
 * Dit stond hardgecodeerd op webm, omdat MediaRecorder in Chrome dat jarenlang
 * als enige kon. Dat klopt niet meer: recente Chrome en Safari nemen ook mp4 met
 * H.264 op. En webm is voor dit doel het verkeerde bestand — je zet die video op
 * TikTok en in een mail, en daar is mp4 de taal die iedereen spreekt.
 *
 * Dus: mp4 als het kan, webm als het moet, en de extensie volgt altijd wat er
 * echt in het bestand zit. Een webm die `.mp4` heet is stuk op een manier die je
 * pas merkt als je hem probeert te uploaden.
 */

/** Op volgorde van voorkeur. De eerste die de browser kan, wint. */
export const CANDIDATES = [
  "video/mp4;codecs=avc1.4d002a",
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

export interface ExportFormat {
  mimeType: string;
  /** "mp4" of "webm". */
  extension: string;
  /** Wat er onder de knop komt te staan als het klaar is. */
  note: string;
}

export function extensionFor(mimeType: string): string {
  return mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}

/**
 * Kiest het beste formaat dat deze browser aankan.
 *
 * `supported` is `MediaRecorder.isTypeSupported`. Als parameter meegegeven zodat
 * dit te testen is zonder browser.
 */
export function pickFormat(
  supported: (type: string) => boolean,
): ExportFormat | null {
  const mimeType = CANDIDATES.find((type) => supported(type));
  if (!mimeType) return null;

  const extension = extensionFor(mimeType);
  return {
    mimeType,
    extension,
    note:
      extension === "mp4"
        ? "Klaar. Gedownload als mp4."
        : "Klaar. Deze browser kan alleen webm opnemen — Safari of een recente Chrome geeft je mp4.",
  };
}

/** De bestandsnaam. Vorm en lengte erin, zodat je ze uit elkaar houdt. */
export function fileName(
  ratio: string,
  seconds: number,
  extension: string,
): string {
  return `voxclip-${ratio.replace(":", "x")}-${Math.round(seconds)}s.${extension}`;
}
