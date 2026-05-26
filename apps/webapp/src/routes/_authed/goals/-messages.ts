import { m } from '#/paraglide/messages.js';

export function getGoalsMessages() {
  return {
    common: {
      createGoal: m['common.createGoal'](),
      viewAll: m['common.viewAll'](),
    },
    title: m['goals.title'](),
    notice: m['goals.notice'](),
    createNew: m['goals.createNew'](),
    searchPlaceholder: m['goals.searchPlaceholder'](),
    loadError: m['goals.loadError'](),
    emptyTitle: m['goals.emptyTitle'](),
    emptyCopy: m['goals.emptyCopy'](),
    loadingMore: m['goals.loadingMore'](),
    noMore: m['goals.noMore'](),
    comingSoon: m['goals.comingSoon'](),
    buildingTitle: m['goals.buildingTitle'](),
    buildingCopy: m['goals.buildingCopy'](),
    goalBadge: m['goals.goalBadge'](),
    closes: m['goals.closes'](),
  };
}
