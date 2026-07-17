import { m } from '#/paraglide/messages.js';

export function getFriendsExpensesMessages() {
  return {
    title: m['friendsExpenses.title'](),
    newExpense: m['friendsExpenses.newExpense'](),
    search: m['friendsExpenses.searchPlaceholder'](),
    filters: {
      all: m['friendsExpenses.filterAll'](),
      settled: m['friendsExpenses.filterSettled'](),
      owed: m['friendsExpenses.filterOwed'](),
      owe: m['friendsExpenses.filterOwe'](),
    },
    friends: m['friendsExpenses.friendsTitle'](),
    add: m['friendsExpenses.addFriend'](),
    expenses: m['friendsExpenses.expensesTitle'](),
    paidBy: m['friendsExpenses.paidBy'](),
    you: m['friendsExpenses.you'](),
    settled: m['friendsExpenses.settled'](),
    owed: m['friendsExpenses.owed'](),
    owe: m['friendsExpenses.owe'](),
    loadError: m['friendsExpenses.loadError'](),
    empty: m['friendsExpenses.empty'](),
    noResults: m['friendsExpenses.noResults'](),
  };
}
