import { m } from '#/paraglide/messages.js';

export function getExpenseLineItemsMessages() {
  return {
    title: m['expenseLineItems.title'](),
    drawerTitle: (name: string) => m['expenseLineItems.drawerTitle']({ name }),
    drawerDescription: m['expenseLineItems.drawerDescription'](),
    itemCount: (count: number) => m['expenseLineItems.itemCount']({ count }),
    addItem: m['expenseLineItems.addItem'](),
    itemPlaceholder: m['expenseLineItems.itemPlaceholder'](),
    amountPlaceholder: m['expenseLineItems.amountPlaceholder'](),
    removeItem: m['expenseLineItems.removeItem'](),
    sharedItem: m['expenseLineItems.sharedItem'](),
    total: m['expenseLineItems.total'](),
    done: m['expenseLineItems.done'](),
    validation: m['expenseLineItems.validation'](),
  };
}
