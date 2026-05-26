import { m } from '#/paraglide/messages.js';

export function getInviteMessages() {
  return {
    common: {
      retry: m['common.retry'](),
    },
    title: m['invite.title'](),
    acceptFailed: m['invite.acceptFailed'](),
    loadFailed: m['invite.loadFailed'](),
    welcome: (group: string) => m['invite.welcome']({ group }),
    existingTitle: m['invite.existingTitle'](),
    existingCopy: m['invite.existingCopy'](),
    unassignedEmail: m['invite.unassignedEmail'](),
    itsMe: m['invite.itsMe'](),
    linkAccount: m['invite.linkAccount'](),
    linking: m['invite.linking'](),
    or: m['invite.or'](),
    continueNew: m['invite.continueNew'](),
    continuing: m['invite.continuing'](),
    newParticipantTitle: m['invite.newParticipantTitle'](),
    newParticipantCopy: m['invite.newParticipantCopy'](),
    alreadyMember: m['invite.alreadyMember'](),
    goToGroup: m['invite.goToGroup'](),
  };
}
