import { CheckIcon, ChevronRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { useUsernameRequirement } from '#/contexts/username-requirement/use-username-requirement';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import { useCreateGoalMutation } from '../-hooks/use-create-goal';
import {
  type ContributionMode,
  contributionModes,
  type GoalType,
  getGoalTheme,
  goalTypes,
} from '../-lib/goal-experience';
import { getGoalsMessages } from '../-messages';
import {
  DateField,
  InsightCard,
  GoalPreviewCard,
  StepHeader,
} from './-components/goal-form-parts';
import {
  type DraftParticipant,
  GoalParticipantsStep,
} from './-components/goal-participants-step';
export const Route = createFileRoute('/_authed/goals/new/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === 'home' ? ('home' as const) : ('goals' as const),
  }),
  component: RouteComponent,
});

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('es-CO');
}

function RouteComponent() {
  const { ensureUsername } = useUsernameRequirement();
  const navigate = useNavigate();
  const { from } = Route.useSearch();
  const t = getGoalsMessages();
  const createGoalMutation = useCreateGoalMutation();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const participantRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState(0);
  const [goalType, setGoalType] = useState<GoalType>('gift');
  const [name, setName] = useState(String(t.defaultName));
  const [emoji, setEmoji] = useState('🎁');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [targetAmount, setTargetAmount] = useState('2200000');
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() => {
    const next = new Date();
    next.setMonth(11, 20);
    return next.toISOString().slice(0, 10);
  });
  const [contributionMode, setContributionMode] =
    useState<ContributionMode>('monthly');
  const [installmentCount, setInstallmentCount] = useState('12');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [participantInput, setParticipantInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = useUserSearchQuery(debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];
  const theme = getGoalTheme(goalType);
  const selectedType =
    goalTypes.find((item) => item.id === goalType) ?? goalTypes[0];
  const months = Math.max(1, Number(installmentCount) || 1);
  const target = Number(targetAmount) || 0;
  const participantCount = participants.length + 1;
  const monthlyTotal = target / months;
  const perPersonMonthly = monthlyTotal / Math.max(1, participantCount);
  const suggestedContribution = installmentAmount
    ? Number(installmentAmount)
    : perPersonMonthly;
  const canSubmit =
    name.trim().length > 0 &&
    target > 0 &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    months > 0;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => nameRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(participantInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [participantInput]);

  const participantsCountLabel = useMemo(() => {
    if (participants.length === 0) return t.onlyYou;
    if (participants.length === 1) return t.twoPeople;
    return t.peopleCount(participants.length + 1);
  }, [participants.length, t.onlyYou, t.twoPeople, t.peopleCount]);

  const addParticipant = (participant: DraftParticipant) => {
    const trimmedName = participant.name.trim();
    if (!trimmedName) return;

    const alreadyExists = participants.some((current) => {
      if (participant.userId && current.userId) {
        return current.userId === participant.userId;
      }

      return normalizeText(current.name) === normalizeText(trimmedName);
    });

    if (alreadyExists) {
      setParticipantInput('');
      setDebouncedSearch('');
      return;
    }

    setParticipants((previous) => [
      ...previous,
      {
        name: trimmedName,
        ...(participant.userId ? { userId: participant.userId } : {}),
        ...(participant.email ? { email: participant.email } : {}),
        ...(participant.image ? { image: participant.image } : {}),
      },
    ]);
    setParticipantInput('');
    setDebouncedSearch('');
    participantRef.current?.focus();
  };

  const removeParticipant = (index: number) => {
    setParticipants((previous) =>
      previous.filter((_, current) => current !== index),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || createGoalMutation.isPending) return;
    if (!(await ensureUsername())) return;

    setError(null);

    try {
      const result = await createGoalMutation.mutateAsync({
        name,
        description,
        goalType,
        emoji,
        themeColor: theme.accent,
        contributionMode,
        currency,
        targetAmount,
        startDate,
        endDate,
        installmentCount,
        installmentAmount,
        suggestedContributionAmount: String(Math.round(suggestedContribution)),
        participants,
      });

      if (!result?.id) {
        throw new Error(m['system.createGoalFailed']());
      }

      await navigate({
        to: '/goals/$id',
        params: { id: result.id },
        search: { from },
        replace: true,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : m['system.createGoalFailed'](),
      );
    }
  };

  const nextStep = () => setStep((current) => Math.min(5, current + 1));
  const previousStep = () => {
    if (step === 0) {
      void navigate({ to: from === 'home' ? '/' : '/goals', replace: true });
      return;
    }
    setStep((current) => Math.max(0, current - 1));
  };

  return (
    <MobilePageLayout title={t.newTitle} onBack={previousStep}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col pb-6">
        <div className="-mx-4 border-y border-[#e2e8f0] bg-white px-4 py-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((step + 1) / 6) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 pt-5">
          {step === 0 ? (
            <section className="space-y-4">
              <StepHeader
                eyebrow={t.stepOne}
                title={t.whatTitle}
                copy={t.stepOneCopy}
              />
              <div className="grid gap-3">
                {goalTypes.map((type) => {
                  const Icon = type.icon;
                  const active = goalType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setGoalType(type.id);
                        setEmoji(type.emoji);
                      }}
                      className={`flex items-center gap-4 rounded-[26px] border bg-white p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-transform active:scale-[0.99] ${
                        active ? 'border-primary/40' : 'border-[#e2e8f0]'
                      }`}
                    >
                      <span
                        className="flex size-12 items-center justify-center rounded-2xl text-xl"
                        style={{
                          backgroundColor: type.soft,
                          color: type.accent,
                        }}
                      >
                        <HugeiconsIcon icon={Icon} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-[#0f172a]">
                          {type.label()}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-[#64748b]">
                          {type.description()}
                        </span>
                      </span>
                      {active ? (
                        <HugeiconsIcon
                          icon={CheckIcon}
                          className="size-5 text-primary"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-4">
              <StepHeader
                eyebrow={t.stepTwo}
                title={t.identityTitle}
                copy={t.stepTwoCopy}
              />
              <GoalPreviewCard
                name={name}
                emoji={emoji}
                typeLabel={selectedType.label()}
                target={target}
                currency={currency}
                progress={0}
                accent={theme.accent}
              />
              <div className="grid grid-cols-[86px_1fr] gap-3">
                <input
                  value={emoji}
                  onChange={(event) => setEmoji(event.target.value.slice(0, 8))}
                  className="h-14 rounded-[22px] border border-[#e2e8f0] bg-white px-4 text-center text-2xl outline-none"
                  aria-label={t.emojiAria}
                />
                <input
                  ref={nameRef}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t.namePlaceholder}
                  className="h-14 rounded-[22px] border border-[#e2e8f0] bg-white px-4 text-base outline-none"
                />
              </div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t.descriptionPlaceholder}
                rows={3}
                className="w-full rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-3 text-base outline-none"
              />
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              <StepHeader
                eyebrow={t.stepThree}
                title={t.objectiveTitle}
                copy={t.stepThreeCopy}
              />
              <div className="rounded-[30px] bg-[#111111] p-5 text-white">
                <p className="text-sm text-white/60">{t.objective}</p>
                <div className="mt-3 flex items-end gap-3">
                  <input
                    value={targetAmount}
                    onChange={(event) => setTargetAmount(event.target.value)}
                    inputMode="numeric"
                    className="min-w-0 flex-1 bg-transparent text-4xl font-semibold outline-none"
                    placeholder="0"
                  />
                  <input
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value.toUpperCase())
                    }
                    className="w-20 bg-transparent pb-1 text-right text-xl font-semibold outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label={t.start}
                  value={startDate}
                  onChange={setStartDate}
                />
                <DateField
                  label={t.end}
                  value={endDate}
                  onChange={setEndDate}
                />
              </div>
              <InsightCard
                label={t.suggestedPace}
                value={formatCurrency(currency, perPersonMonthly)}
                copy={`por persona al mes con ${participantsCountLabel.toLowerCase()}`}
              />
            </section>
          ) : null}

          {step === 3 ? (
            <section className="space-y-4">
              <StepHeader
                eyebrow={t.stepFour}
                title={t.contributionModeTitle}
                copy={t.stepFourCopy}
              />
              <div className="grid gap-3">
                {contributionModes.map((mode) => {
                  const active = contributionMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setContributionMode(mode.id)}
                      className={`rounded-[24px] border bg-white p-4 text-left transition-transform active:scale-[0.99] ${
                        active ? 'border-primary/40' : 'border-[#e2e8f0]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-[#0f172a]">
                            {mode.label()}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-[#64748b]">
                            {mode.description()}
                          </p>
                        </div>
                        {active ? (
                          <HugeiconsIcon
                            icon={CheckIcon}
                            className="size-5 text-primary"
                          />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={installmentCount}
                  onChange={(event) => setInstallmentCount(event.target.value)}
                  inputMode="numeric"
                  placeholder={t.monthsPlaceholder}
                  className="h-12 rounded-[20px] border border-[#e2e8f0] bg-white px-4 text-base outline-none"
                />
                <input
                  value={installmentAmount}
                  onChange={(event) => setInstallmentAmount(event.target.value)}
                  inputMode="numeric"
                  placeholder={t.optionalQuotaPlaceholder}
                  className="h-12 rounded-[20px] border border-[#e2e8f0] bg-white px-4 text-base outline-none"
                />
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <GoalParticipantsStep
              inputRef={participantRef}
              input={participantInput}
              onInputChange={setParticipantInput}
              isSearching={searchQuery.isFetching && Boolean(debouncedSearch)}
              searchResults={searchResults}
              participants={participants}
              onAdd={addParticipant}
              onRemove={removeParticipant}
            />
          ) : null}

          {step === 5 ? (
            <section className="space-y-4">
              <StepHeader
                eyebrow={t.stepSix}
                title={t.previewTitle}
                copy={t.stepSixCopy}
              />
              <GoalPreviewCard
                name={name}
                emoji={emoji}
                typeLabel={selectedType.label()}
                target={target}
                currency={currency}
                progress={0}
                accent={theme.accent}
              />
              <div className="grid grid-cols-2 gap-3">
                <InsightCard
                  label={t.suggestedQuota}
                  value={formatCurrency(currency, suggestedContribution)}
                  copy={t.perPerson}
                />
                <InsightCard
                  label={t.members}
                  value={participantCount.toString()}
                  copy={participantsCountLabel}
                />
              </div>
              <div className="rounded-[26px] border border-[#e2e8f0] bg-white p-4">
                <p className="text-sm font-semibold text-[#0f172a]">
                  {t.timeline}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  {Array.from({ length: Math.min(6, months) }).map(
                    (_, index) => (
                      <div key={index} className="min-w-0 flex-1">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            backgroundColor:
                              index === 0 ? theme.accent : '#e2e8f0',
                          }}
                        />
                      </div>
                    ),
                  )}
                </div>
                <p className="mt-3 text-xs text-[#64748b]">
                  {months} meses para llegar a{' '}
                  {formatCurrency(currency, target || 0)}.
                </p>
              </div>
            </section>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-[#e2e8f0] bg-[#fafafa]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4 backdrop-blur">
          {step < 5 ? (
            <Button
              type="button"
              onClick={nextStep}
              className="h-14 w-full rounded-full bg-primary text-base font-semibold text-white"
            >
              Continuar
              <HugeiconsIcon icon={ChevronRightIcon} className="ml-1 size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!canSubmit || createGoalMutation.isPending}
              className="h-14 w-full rounded-full bg-primary text-base font-semibold text-white"
            >
              {createGoalMutation.isPending ? 'Creando...' : 'Crear meta'}
            </Button>
          )}
        </div>
      </form>
    </MobilePageLayout>
  );
}
