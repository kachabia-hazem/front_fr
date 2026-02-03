// ==========================================
// WorkLink Frontend - Environment Configuration
// ==========================================
//
// INSTRUCTIONS:
// 1. Copy this file to environment.ts
// 2. Fill in your own values below
// 3. Never commit environment.ts to version control!
//
// ==========================================

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',

  // Google OAuth - Get from: https://console.cloud.google.com/
  googleClientId: 'your-google-client-id.apps.googleusercontent.com',

  // LinkedIn OAuth - Get from: https://www.linkedin.com/developers/
  linkedInClientId: 'your-linkedin-client-id',
  linkedInRedirectUri: 'http://localhost:4200/auth/linkedin/callback',
};
