import { m } from '#/paraglide/messages.js';

export function getBottomAppBarMessages() {
  return {
    home: m['bottomBar.home'](),
    friends: m['bottomBar.friends'](),
    groups: m['bottomBar.groups'](),
    finances: m['bottomBar.finances'](),
    goals: m['bottomBar.goals'](),
    debts: m['bottomBar.debts'](),
    profile: m['bottomBar.profile'](),
    ariaLabel: m['bottomBar.ariaLabel'](),
  };
}
