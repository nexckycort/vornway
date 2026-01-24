const LOCAL_USER_KEY = 'splitway_local_user';

export interface LocalUser {
  name: string;
}

export function getLocalUser(): LocalUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(LOCAL_USER_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as LocalUser;
  } catch {
    return null;
  }
}

export function setLocalUser(user: LocalUser): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
}

export function clearLocalUser(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(LOCAL_USER_KEY);
}
