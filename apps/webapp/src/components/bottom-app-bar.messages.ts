import { m } from '#/paraglide/messages.js';

export function getBottomAppBarMessages() {
  return {
    home: m['bottomBar.home'](),
    friends: m['bottomBar.friends'](),
    groups: m['bottomBar.groups'](),
    goals: m['bottomBar.goals'](),
    profile: m['bottomBar.profile'](),
  };
}
