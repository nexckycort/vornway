import * as SecureStore from 'expo-secure-store';

const PREFIX = 'group-create-draft:';

export type GroupCreateDraft = {
  name: string;
  type: 'espacio' | 'personal';
  description: string;
  imageDataUrl?: string | null;
  imageFileName?: string | null;
};

export function createGroupDraftId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveGroupDraft(id: string, draft: GroupCreateDraft) {
  await SecureStore.setItemAsync(`${PREFIX}${id}`, JSON.stringify(draft));
}

export async function loadGroupDraft(id: string) {
  const value = await SecureStore.getItemAsync(`${PREFIX}${id}`);
  if (!value) return null;

  try {
    return JSON.parse(value) as GroupCreateDraft;
  } catch {
    return null;
  }
}

export async function clearGroupDraft(id: string) {
  await SecureStore.deleteItemAsync(`${PREFIX}${id}`);
}
