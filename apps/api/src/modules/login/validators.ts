const ALLOWED_DOMAINS = new Set([
  'gmail.com',
  'outlook.com',
  'outlook.es',
  'hotmail.com',
  'hotmail.es',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'live.com',
  'msn.com',
  'protonmail.com',
  'proton.me',
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isAllowedLoginEmail = (email: string) => {
  if (!EMAIL.test(email)) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain !== undefined && ALLOWED_DOMAINS.has(domain);
};
