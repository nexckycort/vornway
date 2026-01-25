import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';
import { getRxDB } from './rxdb-config';

const rxdb = await getRxDB();

export const groups = createCollection(
  rxdbCollectionOptions({
    rxCollection: rxdb.groups,
  }),
);

export const participants = createCollection(
  rxdbCollectionOptions({
    rxCollection: rxdb.participants,
  }),
);
