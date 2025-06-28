/**
 * Development environment configuration
 */
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000/api/v1",
  appName: "Music Store",
  appVersion: "1.0.0",
  sessionIdKey: "music_store_session",
  tokenKey: "music_store_token",
  cartUpdateInterval: 5000, // 5 seconds
  searchDebounceTime: 300, // 300ms
  infiniteScrollThreshold: 200, // pixels from bottom
  itemsPerPage: 12,
  maxItemsPerPage: 100,
};
