const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export const normalizeTags = (tags: readonly string[] | undefined) => {
  if (!tags) return [];

  const normalized = tags
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replace(/^#+/, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    )
    .filter((tag) => TAG_PATTERN.test(tag));

  return Array.from(new Set(normalized)).slice(0, 10);
};

export const readExpenseTags = (metadata: unknown) => {
  if (!metadata || typeof metadata !== 'object') return [];
  const tags = (metadata as { tags?: unknown }).tags;
  if (!Array.isArray(tags)) return [];
  return normalizeTags(
    tags.filter((tag): tag is string => typeof tag === 'string'),
  );
};

export const tagCreates = (ownerId: string, tags: readonly string[]) =>
  tags.map((name) => ({
    tag: {
      connectOrCreate: {
        where: { ownerId_name: { ownerId, name } },
        create: { ownerId, name },
      },
    },
  }));
