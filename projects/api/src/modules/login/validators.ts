import { allowedLoginDomains } from './types';

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;

  const domain = email.split('@')[1]?.toLowerCase();
  return Boolean(domain && allowedLoginDomains.includes(domain as never));
}
