import { m } from '#/paraglide/messages.js';

export function getLoginMessages() {
  return {
    continueWithGoogle: m['login.continueWithGoogle'](),
    redirecting: m['login.redirecting'](),
    googleError: m['login.googleError'](),
    slideProgress: (current: number, total: number) =>
      m['login.slideProgress']({ current, total }),
    goToSlide: (slide: number) => m['login.goToSlide']({ slide }),
    onboarding: {
      travelTitle: m['login.onboarding.travelTitle'](),
      travelDescription: m['login.onboarding.travelDescription'](),
      expensesTitle: m['login.onboarding.expensesTitle'](),
      expensesDescription: m['login.onboarding.expensesDescription'](),
      goalsTitle: m['login.onboarding.goalsTitle'](),
      goalsDescription: m['login.onboarding.goalsDescription'](),
    },
  };
}
