export const MAX_USERNAME_LENGTH = 20;

// Password Input Normalizer - removes whitespace so hidden keyboard spaces cannot change auth credentials.
export function normalizePasswordInput(password: string) {
  return password.replace(/\s+/g, '');
}

// Username Draft Sanitizer - blocks leading-only whitespace, collapses repeated spaces, and caps the draft length.
export function sanitizeUsernameDraft(username: string) {
  return username
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, MAX_USERNAME_LENGTH);
}

// Username Normalizer - trims the sanitized draft before validation or submission.
export function normalizeUsernameInput(username: string) {
  return username
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
