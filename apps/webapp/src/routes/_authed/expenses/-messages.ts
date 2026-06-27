import { m } from '#/paraglide/messages.js';

export function getQuickSplitMessages() {
  return {
    title: m['quickSplit.title'](),
    step: m['quickSplit.step'](),
    entryStep: m['quickSplit.entryStep'](),
    entryTitle: m['quickSplit.entryTitle'](),
    entryDescription: m['quickSplit.entryDescription'](),
    entrySearchPlaceholder: m['quickSplit.entrySearchPlaceholder'](),
    spacesLabel: m['quickSplit.spacesLabel'](),
    spacesSharedTag: m['quickSplit.spacesSharedTag'](),
    spacesParticipants: (count: number) =>
      m['quickSplit.spacesParticipants']({ count }),
    friendsSectionLabel: m['quickSplit.friendsSectionLabel'](),
    friendsSharedGroups: (count: number) =>
      m['quickSplit.friendsSharedGroups']({ count }),
    entryContinue: m['quickSplit.entryContinue'](),
    spacesEmpty: m['quickSplit.spacesEmpty'](),
    friendsListEmpty: m['quickSplit.friendsListEmpty'](),
    amountLabel: m['quickSplit.amountLabel'](),
    descriptionPlaceholder: m['quickSplit.descriptionPlaceholder'](),
    friendsLabel: m['quickSplit.friendsLabel'](),
    friendsHint: m['quickSplit.friendsHint'](),
    friendsPlaceholder: m['quickSplit.friendsPlaceholder'](),
    friendsEmpty: m['quickSplit.friendsEmpty'](),
    friendsSearchEmpty: m['quickSplit.friendsSearchEmpty'](),
    payerLabel: m['quickSplit.payerLabel'](),
    splitLabel: m['quickSplit.splitLabel'](),
    splitAll: m['quickSplit.splitAll'](),
    splitTotal: (assigned: string, total: string) =>
      m['quickSplit.splitTotal']({ assigned, total }),
    submit: m['quickSplit.submit'](),
    save: m['quickSplit.save'](),
    submitPending: m['quickSplit.submitPending'](),
    savePending: m['quickSplit.savePending'](),
    currencyPickerTitle: m['quickSplit.currencyPickerTitle'](),
    currencyPickerDescription: m['quickSplit.currencyPickerDescription'](),
    loadUsersError: m['quickSplit.loadUsersError'](),
    createSuccess: m['quickSplit.createSuccess'](),
    createError: m['quickSplit.createError'](),
    updateSuccess: m['quickSplit.updateSuccess'](),
    updateError: m['quickSplit.updateError'](),
    validationDescription: m['quickSplit.validationDescription'](),
    validationAmount: m['quickSplit.validationAmount'](),
    validationFriends: m['quickSplit.validationFriends'](),
    validationSplit: m['quickSplit.validationSplit'](),
  };
}
