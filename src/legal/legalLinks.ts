/**
 * Public HTTPS URLs for App Store review.
 * Keep GitHub Pages paths until www.insiteworks.co returns 200 (DNS cutover).
 * GitHub then 301s these URLs to the custom domain — do not 404 App Review.
 */
export const PRIVACY_POLICY_URL =
  "https://insitetechltd.github.io/buildtrack/privacy-policy.html";
export const TERMS_OF_SERVICE_URL =
  "https://insitetechltd.github.io/buildtrack/terms-of-service.html";
export const SUPPORT_URL =
  "https://insitetechltd.github.io/buildtrack/support.html";
export const SUPPORT_EMAIL = "support@insiteworks.co";
export const SUPPORT_MAILTO_URL = `mailto:${SUPPORT_EMAIL}`;
