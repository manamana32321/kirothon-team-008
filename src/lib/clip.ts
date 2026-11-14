const VIDEO_CANDIDATES = ["video/webm", "video/mp4"];
const AUDIO_CANDIDATES = ["audio/webm", "audio/mp4"];

export function pickMimeType(
  isTypeSupported: (type: string) => boolean,
  cameraOn: boolean,
): string | null {
  const candidates = cameraOn
    ? [...VIDEO_CANDIDATES, ...AUDIO_CANDIDATES]
    : AUDIO_CANDIDATES;
  return candidates.find((t) => isTypeSupported(t)) ?? null;
}

export function hasVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}