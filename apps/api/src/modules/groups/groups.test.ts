import { describe, expect, it } from 'bun:test';
import { createGroupsService } from './service';

describe('groups service', () => {
  it('returns health', async () => {
    const service = createGroupsService();

    await expect(service.getHealth()).resolves.toEqual({
      module: 'groups',
      status: 'ok',
    });
  });
});
