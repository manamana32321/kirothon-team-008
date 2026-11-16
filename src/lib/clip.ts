import { dateKey } from "@/lib/alarm";

const DAY_START_HOUR = 4;
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

export function clipDay(at: Date): string {
  const shifted = new Date(at);
  shifted.setHours(shifted.getHours() - DAY_START_HOUR);
  return dateKey(shifted);
}

export function clipDayRange(day: string): { start: Date; end: Date } {
  const [y, m, d] = day.split("-").map(Number);
  return {
    start: new Date(y, m - 1, d, DAY_START_HOUR),
    end: new Date(y, m - 1, d + 1, DAY_START_HOUR),
  };
}
