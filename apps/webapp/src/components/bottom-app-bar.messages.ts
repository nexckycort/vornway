import { m } from '#/paraglide/messages.js';

export function getBottomAppBarMessages() {
  return {
    home: m['bottomBar.home'](),
    groups: m['bottomBar.groups'](),
    goals: m['bottomBar.goals'](),
    profile: m['bottomBar.profile'](),
  };
}
