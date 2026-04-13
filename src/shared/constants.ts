export const STORAGE_KEYS = {
  CHANNELS_CACHE: 'channels_cache',
  TAGS: 'tags',
  SETTINGS: 'settings',
  SUBSCRIPTION_ETAG: 'subscription_etag',
} as const;

export const YOUTUBE_API = {
  BASE_URL: 'https://www.googleapis.com/youtube/v3',
  SCOPES: ['https://www.googleapis.com/auth/youtube'],
  MAX_RESULTS_PER_PAGE: 50,
  QUOTA_DAILY_LIMIT: 10_000,
} as const;

export const DEFAULTS = {
  INACTIVITY_THRESHOLD_MONTHS: 3,
  CACHE_TTL_MS: 30 * 60 * 1000, // 30분
  MAX_TAG_NAME_LENGTH: 30,
  MAX_TAGS_PER_CHANNEL: 10,
  DATE_FORMAT: 'MM/dd/YY' as const,
} as const;

export const COLORS = {
  TAG_PRESETS: [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ],
} as const;
