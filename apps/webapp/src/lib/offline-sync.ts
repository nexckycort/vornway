import { initOfflineExpenseQueueSync } from './offline-expense-query-collection';
import { initOfflineGroupQueueSync } from './offline-group-query-collection';

export function initOfflineSync() {
  initOfflineExpenseQueueSync();
  initOfflineGroupQueueSync();
}
