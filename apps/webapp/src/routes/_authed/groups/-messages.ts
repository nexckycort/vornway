import { m } from '#/paraglide/messages.js';

export function getGroupsMessages() {
  return {
    common: {
      createGroup: m['common.createGroup'](),
    },
    home: {
      createdAt: (date: string) => m['home.createdAt']({ date }),
      noPendingBalances: m['home.noPendingBalances'](),
      noExpenses: m['home.noExpenses'](),
      otherBalances: (count: number) => m['home.otherBalances']({ count }),
    },
    title: m['groups.title'](),
    createNew: m['groups.createNew'](),
    searchPlaceholder: m['groups.searchPlaceholder'](),
    all: m['groups.all'](),
    theyOweYou: m['groups.theyOweYou'](),
    youOweThem: m['groups.youOweThem'](),
    noDebt: m['groups.noDebt'](),
    loadingGroups: m['groups.loadingGroups'](),
    totalGroups: (count: number) => m['groups.totalGroups']({ count }),
    visibleGroups: (count: number) => m['groups.visibleGroups']({ count }),
    noGroupsTitle: m['groups.noGroupsTitle'](),
    noGroupsCopy: m['groups.noGroupsCopy'](),
    pendingSync: m['groups.pendingSync'](),
    createdOffline: m['groups.createdOffline'](),
    pendingBadge: m['groups.pendingBadge'](),
    pendingCopy: m['groups.pendingCopy'](),
    loadingMore: m['groups.loadingMore'](),
    noMore: m['groups.noMore'](),
    recent: m['groups.recent'](),
    lastTwoMonths: m['groups.lastTwoMonths'](),
    older: m['groups.older'](),
  };
}
