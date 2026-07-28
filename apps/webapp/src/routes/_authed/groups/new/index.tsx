import {
  ArrowLeftIcon,
  Cancel01Icon,
  ImageAdd01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Button } from '#/components/ui/button';
import {
  compressGroupImageFile,
  createGroupDraftId,
  loadGroupDraft,
  saveGroupDraft,
} from '#/routes/_authed/groups/new/-lib/group-create-draft';
import { getGroupDetailMessages } from '../$id/-messages';
export const Route = createFileRoute('/_authed/groups/new/')({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === 'string' ? search.name : '',
    type: typeof search.type === 'string' ? search.type : '',
    description:
      typeof search.description === 'string' ? search.description : '',
    draftId: typeof search.draftId === 'string' ? search.draftId : '',
    from: search.from === 'home' ? 'home' : 'groups',
    ...(search.step === 'details' ? { step: 'details' as const } : {}),
    ...(search.spaceKind === 'shared' || search.spaceKind === 'personal'
      ? { spaceKind: search.spaceKind }
      : {}),
  }),
  component: RouteComponent,
});

const groupTypes = ['viajes', 'meta', 'personal', 'otros'] as const;

function RouteComponent() {
  const navigate = useNavigate();
  const router = useRouter();
  const t = getGroupDetailMessages();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const {
    name: searchName,
    type: searchType,
    description: searchDescription,
    draftId,
    from,
    step,
    spaceKind,
  } = Route.useSearch();

  const [name, setName] = useState(searchName);
  const [type, setType] = useState<string>(searchType || groupTypes[0]);
  const [description, setDescription] = useState(searchDescription);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [selectedSpaceKind, setSelectedSpaceKind] = useState<
    'shared' | 'personal' | null
  >(
    spaceKind === 'shared'
      ? 'shared'
      : spaceKind === 'personal'
        ? 'personal'
        : step === 'details'
          ? searchType === 'personal'
            ? 'personal'
            : 'shared'
          : null,
  );

  const showSelection =
    step !== 'details' && !searchName && !searchType && !draftId;

  const isValid = name.trim().length > 0 && type.trim().length > 0;
  const isPersonalSpace = selectedSpaceKind === 'personal';

  useEffect(() => {
    if (showSelection) return;
    nameInputRef.current?.focus();
  }, [showSelection]);

  useEffect(() => {
    if (showSelection) return;
    if (!draftId) return;

    const draft = loadGroupDraft(draftId);
    if (!draft) return;

    setName(draft.name);
    setType(draft.type || groupTypes[0]);
    setDescription(draft.description);
    setImageDataUrl(draft.image?.dataUrl ?? null);
    setImageFileName(draft.image?.fileName ?? null);
  }, [draftId, showSelection]);

  useEffect(() => {
    if (showSelection) return;
    if (!isValid) return;

    void router.preloadRoute({
      to: '/groups/new/participants',
      search: {
        draftId: draftId || '',
        name: name.trim(),
        type: type.trim(),
        description: description.trim(),
        from,
        spaceKind: selectedSpaceKind ?? 'shared',
      },
    });
  }, [
    description,
    draftId,
    from,
    isValid,
    name,
    router,
    selectedSpaceKind,
    showSelection,
    type,
  ]);

  const handleImageSelect = async (file: File | null) => {
    if (!file) return;

    setImageError(null);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setImageDataUrl(null);
      setImageFileName(null);
      setImageError(t.form.offlineImageUploadFailed);
      return;
    }

    setIsCompressingImage(true);
    try {
      const dataUrl = await compressGroupImageFile(file);
      setImageDataUrl(dataUrl);
      setImageFileName(file.name);
    } catch (error) {
      setImageDataUrl(null);
      setImageFileName(null);
      setImageError(
        error instanceof Error ? error.message : t.form.imageProcessFailed,
      );
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;

    const nextDraftId = draftId || createGroupDraftId();
    saveGroupDraft(nextDraftId, {
      name: name.trim(),
      type: type.trim(),
      description: description.trim(),
      image: imageDataUrl
        ? {
            dataUrl: imageDataUrl,
            ...(imageFileName ? { fileName: imageFileName } : {}),
          }
        : null,
    });

    await navigate({
      to: '/groups/new/participants',
      search: {
        draftId: nextDraftId,
        name: name.trim(),
        type: type.trim(),
        description: description.trim(),
        from,
        spaceKind: selectedSpaceKind ?? 'shared',
      },
    });
  };

  if (showSelection) {
    return (
      <SpaceTypeSelection
        selected={selectedSpaceKind}
        onSelect={setSelectedSpaceKind}
        onBack={() => navigate({ to: from === 'home' ? '/' : '/groups' })}
        onContinue={() => {
          if (!selectedSpaceKind) return;
          void navigate({
            to: '/groups/new',
            search: {
              step: 'details',
              spaceKind: selectedSpaceKind,
              name: '',
              type: selectedSpaceKind === 'personal' ? 'personal' : 'viajes',
              description: '',
              draftId: '',
              from,
            },
          });
        }}
        t={t}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl flex-col bg-[#fafafa] px-4 pb-0 pt-8">
        <header className="mb-6">
          <button
            type="button"
            onClick={() => navigate({ to: from === 'home' ? '/' : '/groups' })}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <HugeiconsIcon icon={ArrowLeftIcon} className="size-4" />
            {t.form.back}
          </button>
          <h1 className="text-2xl font-semibold leading-8 text-[#0f172a]">
            {t.form.newTitle}
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">{t.form.newCopy}</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#334155]">
              {t.form.name}
            </span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.form.namePlaceholder}
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none transition-colors focus:border-primary"
              maxLength={120}
            />
          </label>

          {isPersonalSpace ? null : (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                {t.form.type}
              </span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none transition-colors focus:border-primary"
              >
                {groupTypes.map((item) => (
                  <option key={item} value={item}>
                    {getGroupTypeLabel(item, t)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#334155]">
              {t.form.descriptionOptional}
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t.form.descriptionPlaceholder}
              className="min-h-24 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
              maxLength={400}
            />
          </label>

          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc]">
                {imageDataUrl ? (
                  <img
                    src={imageDataUrl}
                    alt={t.form.selectedImageAlt}
                    className="size-full object-cover"
                  />
                ) : (
                  <HugeiconsIcon
                    icon={ImageAdd01Icon}
                    className="size-6 text-[#94a3b8]"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#334155]">
                  {t.form.imageTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#64748b]">
                  {t.form.imageCopy}
                </p>
                {imageFileName ? (
                  <p className="mt-1 truncate text-xs text-[#94a3b8]">
                    {imageFileName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  await handleImageSelect(event.target.files?.[0] ?? null);
                  event.currentTarget.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-full"
                onClick={() => imageInputRef.current?.click()}
                disabled={isCompressingImage}
              >
                {isCompressingImage
                  ? t.form.processingImage
                  : t.form.uploadImage}
              </Button>
              {imageDataUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-full px-4 text-[#64748b]"
                  onClick={() => {
                    setImageDataUrl(null);
                    setImageFileName(null);
                    setImageError(null);
                    if (draftId) {
                      const draft = loadGroupDraft(draftId);
                      if (draft) {
                        saveGroupDraft(draftId, { ...draft, image: null });
                      }
                    }
                  }}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </Button>
              ) : null}
            </div>
            {imageError ? (
              <p className="mt-3 text-xs text-red-600">{imageError}</p>
            ) : null}
          </section>

          <div className="-mx-4 mt-auto border-t border-[#e2e8f0] bg-[#fafafa] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full rounded-full"
              disabled={!isValid}
            >
              {t.common.continue}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function SpaceTypeSelection({
  selected,
  onSelect,
  onBack,
  onContinue,
  t,
}: {
  selected: 'shared' | 'personal' | null;
  onSelect: (value: 'shared' | 'personal') => void;
  onBack: () => void;
  onContinue: () => void;
  t: ReturnType<typeof getGroupDetailMessages>;
}) {
  const Card = ({ kind }: { kind: 'shared' | 'personal' }) => {
    const isSelected = selected === kind;
    const isShared = kind === 'shared';
    return (
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={() => onSelect(kind)}
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border-2 p-4 text-left transition-colors ${
          isSelected
            ? 'border-[#ff658a] bg-[#fff0f2]'
            : 'border-[#ebebeb] bg-white'
        }`}
      >
        <span
          className={`absolute right-4 top-4 flex size-6 items-center justify-center rounded-full border text-sm font-semibold ${
            isSelected
              ? 'border-[#de034d] bg-[#de034d] text-white'
              : 'border-[#d1d5db] bg-white text-transparent'
          }`}
          aria-hidden="true"
        >
          ✓
        </span>
        <span className="pr-9 text-base font-semibold text-[#171717]">
          {isShared ? t.form.sharedSpace : t.form.personalSpace}
        </span>
        <span className="mt-1 max-w-[300px] text-sm leading-5 text-[#737373]">
          {isShared ? t.form.sharedSpaceCopy : t.form.personalSpaceCopy}
        </span>
        <span className="mt-3 flex min-h-0 flex-1 items-center justify-center">
          <img
            src={
              isShared
                ? '/images/group-space-shared.png'
                : '/images/group-space-personal.png'
            }
            alt=""
            className="max-h-full w-full object-contain"
          />
        </span>
      </button>
    );
  };

  return (
    <main className="h-dvh max-h-dvh overflow-hidden bg-[#efefef] text-foreground">
      <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-[412px] flex-col overflow-hidden bg-white">
        <header className="relative flex h-16 shrink-0 items-center justify-center border-b border-[#f0f0f0] px-16">
          <button
            type="button"
            onClick={onBack}
            aria-label={t.form.back}
            className="absolute left-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e6e6e6] text-[#555]"
          >
            <HugeiconsIcon icon={ArrowLeftIcon} className="size-4" />
          </button>
          <div className="text-center leading-tight">
            <p className="text-xs text-[#777]">{t.form.selectionStep}</p>
            <h1 className="text-sm font-semibold text-[#171717]">
              {t.form.selectionTitle}
            </h1>
          </div>
        </header>
        <div className="h-2 shrink-0 bg-[#e9e9e9]">
          <div className="h-full w-1/2 rounded-r-full bg-gradient-to-r from-[#ffc8da] via-[#fd407f] to-[#d000bf]" />
        </div>
        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 pt-4">
          <p className="shrink-0 text-center text-base leading-6 text-[#171717]">
            {t.form.selectionCopy}
          </p>
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-4">
            <Card kind="shared" />
            <Card kind="personal" />
          </div>
        </section>
        <footer className="shrink-0 border-t border-[#ededed] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <Button
            type="button"
            onClick={onContinue}
            disabled={!selected}
            className="h-10 w-full rounded-full bg-[#de034d] text-sm font-semibold hover:bg-[#c80346]"
          >
            {t.common.continue}
          </Button>
        </footer>
      </div>
    </main>
  );
}

function getGroupTypeLabel(
  value: (typeof groupTypes)[number],
  t: ReturnType<typeof getGroupDetailMessages>,
) {
  if (value === 'viajes') return t.form.typeTrip;
  if (value === 'meta') return t.form.typeGoal;
  if (value === 'personal') return t.form.typePersonal;
  return t.form.typeOther;
}
