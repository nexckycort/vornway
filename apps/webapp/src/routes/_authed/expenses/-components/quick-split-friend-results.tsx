import type { QuickSplitForm } from '../-hooks/use-quick-split-form';

export function QuickSplitFriendResults({ form }: { form: QuickSplitForm }) {
  const {
    t,
    isEditMode,
    debouncedFriendInput,
    searchQuery,
    availableSearchResults,
    handleAddFriend,
  } = form;

  return (
    <>
      {!isEditMode ? (
        <div className="px-2">
          {debouncedFriendInput &&
          !searchQuery.isFetching &&
          availableSearchResults.length === 0 ? (
            <p className="mt-1 text-sm text-[#64748b]">
              {t.friendsSearchEmpty}
            </p>
          ) : null}

          {availableSearchResults.length > 0 ? (
            <section className="mt-2 flex flex-col gap-2">
              {availableSearchResults.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() =>
                    handleAddFriend({
                      id: candidate.id,
                      name: candidate.name,
                      username: candidate.username,
                      email: candidate.email,
                      userId: candidate.id,
                    })
                  }
                  className="rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                >
                  <p className="truncate text-sm font-semibold text-[#111827]">
                    {candidate.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#64748b]">
                    {candidate.username
                      ? `@${candidate.username}`
                      : candidate.email}
                  </p>
                </button>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
