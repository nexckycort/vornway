const ADMIN_EMAILS = new Set([
  'junior110120@gmail.com',
  'viianysvanessa@gmail.com',
]);

export const isAdminEmail = (email: string | null | undefined) =>
  ADMIN_EMAILS.has(email?.trim().toLowerCase() ?? '');
