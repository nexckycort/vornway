import { m } from '#/paraglide/messages.js';

export function getHomeMessages() {
  return {
    common: {
      viewAll: m['common.viewAll'](),
    },
    fallbackUser: m['home.fallbackUser'](),
    welcome: m['home.welcome'](),
    greeting: m['home.greeting'](),
    notificationsAria: m['home.notificationsAria'](),
    quickActionsAria: m['home.quickActionsAria'](),
    recentGroups: m['home.recentGroups'](),
    recentExpenses: m['home.recentExpenses'](),
    savingGoals: m['home.savingGoals'](),
    createGoal: m['home.createGoal'](),
    currencyConverter: m['home.currencyConverter'](),
    createNewGroup: m['home.createNewGroup'](),
    createExpense: m['home.createExpense'](),
    noRecentExpensesTitle: m['home.noRecentExpensesTitle'](),
    noRecentExpensesCopy: m['home.noRecentExpensesCopy'](),
    pendingSync: m['home.pendingSync'](),
    theyOwe: m['home.theyOwe'](),
    youOwe: m['home.youOwe'](),
    noPendingBalances: m['home.noPendingBalances'](),
    noExpenses: m['home.noExpenses'](),
    otherBalances: (count: number) => m['home.otherBalances']({ count }),
    createdAt: (date: string) => m['home.createdAt']({ date }),
    loadError: m['home.loadError'](),
  };
}
