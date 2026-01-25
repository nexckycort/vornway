import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const groupSchema = {
  title: 'group schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    name: {
      type: 'string',
    },
    currency: {
      type: 'string',
    },
    category: {
      type: 'string',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: ['id', 'name', 'currency', 'category'],
};

const participantSchema = {
  title: 'participant schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    name: {
      type: 'string',
    },
    groupId: {
      type: 'string',
    },
  },
  required: ['id', 'name', 'groupId'],
};

let db: any;

export const getRxDB = async () => {
  if (!db) {
    db = await createRxDatabase({
      name: 'splitway',
      storage: getRxStorageDexie(),
    });
    await db.addCollections({
      groups: {
        schema: groupSchema,
      },
      participants: {
        schema: participantSchema,
      },
    });
  }
  return db;
};
