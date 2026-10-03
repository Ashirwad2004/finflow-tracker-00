export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const DISPOSABLE_DOMAINS = [
  "mailinator.com", "yopmail.com", "tempmail.com", "guerrillamail.com",
  "dispostable.com", "getairmail.com", "sharklasers.com", "trashmail.com",
  "10minutemail.com", "maildrop.cc", "temp-mail.org", "fakeinbox.com"
];

export const COMMON_TYPOS: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gamil.co": "gmail.com",
  "gmail.co": "gmail.com",
  "yaho.com": "yahoo.com",
  "hotmal.com": "hotmail.com",
};

export const passwordChecks = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One number", test: (value: string) => /\d/.test(value) },
];

export const passwordIsStrong = (password: string) => passwordChecks.every((check) => check.test(password));
