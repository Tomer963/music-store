/**
 * Production environment configuration
 */
export const environment = {
  production: true,
  apiUrl: "https://api.musicstore.com/api/v1",
  appName: "Music Store",
  appVersion: "1.0.0",
  sessionIdKey: "music_store_session",
  tokenKey: "music_store_token",
  cartUpdateInterval: 10000, // 10 seconds
  searchDebounceTime: 500, // 500ms
  infiniteScrollThreshold: 200, // pixels from bottom
  itemsPerPage: 12,
  maxItemsPerPage: 100,
};