export const DATABASE_URL = process.env.DATABASE_URL || "file:./data/app.db";
export const CLIPS_DIR = process.env.CLIPS_DIR || "./data/clips";
export const SHARE_WINDOW_MINUTES = 120;
export const LOCATION_STALE_SECONDS = 60;
export const MIN_SEND_INTERVAL_SECONDS = 10;
export const WAKE_CALL_MAX_MINUTES = 5;
export const MEETUP_RADII_M = [50, 100, 200] as const;
