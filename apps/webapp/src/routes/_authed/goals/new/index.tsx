import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Mail,
  UserPlus,
  X,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
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

export const Route = createFileRoute('/_authed/goals/new/')({
  component: RouteComponent,
});

type DraftParticipant = {
  name: string;
  userId?: string;
  email?: string | null;
  image?: string | null;
};

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('es-CO');
}

function RouteComponent() {
  const navigate = useNavigate();
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

  useEffect(() => {
    const nextType = goalTypes.find((item) => item.id === goalType);
    if (!nextType) return;
    setEmoji((current) => current || nextType.emoji);
  }, [goalType]);

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
      void navigate({ to: '/goals', replace: true });
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
                        <Icon className="size-5" />
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
                        <Check className="size-5 text-primary" />
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
                          <Check className="size-5 text-primary" />
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
            <section className="space-y-4">
              <StepHeader
                eyebrow={t.stepFive}
                title={t.addPeopleTitle}
                copy={t.stepFiveCopy}
              />
              <div className="flex gap-2">
                <input
                  ref={participantRef}
                  value={participantInput}
                  onChange={(event) => setParticipantInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addParticipant({ name: participantInput });
                    }
                  }}
                  placeholder={t.peoplePlaceholder}
                  className="h-12 min-w-0 flex-1 rounded-[20px] border border-[#e2e8f0] bg-white px-4 text-base outline-none"
                />
                <Button
                  type="button"
                  size="icon"
                  className="size-12 rounded-[20px]"
                  onClick={() => addParticipant({ name: participantInput })}
                  disabled={!participantInput.trim()}
                  aria-label={t.addParticipantAria}
                >
                  <UserPlus className="size-5" />
                </Button>
              </div>

              {searchQuery.isFetching && debouncedSearch ? (
                <p className="text-sm text-[#64748b]">
                  Buscando coincidencias...
                </p>
              ) : null}

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      disabled={candidate.isCurrentUser}
                      onClick={() => {
                        if (candidate.isCurrentUser) return;
                        addParticipant({
                          name: candidate.name,
                          userId: candidate.id,
                          email: candidate.email,
                        });
                      }}
                      className="flex w-full items-center gap-3 rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-3 text-left disabled:opacity-60"
                    >
                      <MemberAvatar name={candidate.name} image={null} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#0f172a]">
                          {candidate.name}
                        </span>
                        <span className="block truncate text-xs text-[#64748b]">
                          {candidate.email}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2">
                {participants.map((participant, index) => (
                  <div
                    key={`${participant.userId ?? participant.name}-${index}`}
                    className="flex items-center gap-3 rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-3"
                  >
                    <MemberAvatar
                      name={participant.name}
                      image={participant.image ?? null}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#0f172a]">
                        {participant.name}
                      </span>
                      <span className="block truncate text-xs text-[#64748b]">
                        {participant.email ?? 'Participante manual'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="flex size-9 items-center justify-center rounded-full text-[#94a3b8]"
                      aria-label={`Eliminar ${participant.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
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
              <ChevronRight className="ml-1 size-4" />
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

function StepHeader({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-3xl font-semibold leading-9 text-[#0f172a]">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#64748b]">{copy}</p>
    </div>
  );
}

function GoalPreviewCard({
  name,
  emoji,
  typeLabel,
  target,
  currency,
  progress,
  accent,
}: {
  name: string;
  emoji: string;
  typeLabel: string;
  target: number;
  currency: string;
  progress: number;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-[#111111] p-5 text-white shadow-[0_20px_45px_rgba(15,23,42,0.22)]">
      <div
        className="absolute -right-10 -top-10 size-36 rounded-full opacity-25 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex size-14 items-center justify-center rounded-3xl bg-white/10 text-3xl">
          {emoji || '✨'}
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          {typeLabel}
        </span>
      </div>
      <h2 className="relative mt-6 text-2xl font-semibold leading-8">
        {name || 'Nueva meta'}
      </h2>
      <p className="relative mt-2 text-sm text-white/60">
        Objetivo {formatCurrency(currency, target || 0)}
      </p>
      <div className="relative mt-5 h-2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(3, progress)}%`,
            backgroundColor: accent,
          }}
        />
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-3">
      <span className="flex items-center gap-2 text-xs text-[#64748b]">
        <CalendarDays className="size-3.5" />
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-sm font-semibold text-[#0f172a] outline-none"
      />
    </label>
  );
}

function InsightCard({
  label,
  value,
  copy,
}: {
  label: string;
  value: string;
  copy: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#e2e8f0] bg-white p-4">
      <p className="text-xs text-[#64748b]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#0f172a]">{value}</p>
      <p className="mt-1 text-xs text-[#94a3b8]">{copy}</p>
    </div>
  );
}

function MemberAvatar({
  name,
  image,
}: {
  name: string;
  image?: string | null;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="size-10 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="flex size-10 items-center justify-center rounded-full bg-[#f1f5f9] text-sm font-semibold text-[#0f172a]">
      {name.trim().charAt(0).toUpperCase() || <Mail className="size-4" />}
    </span>
  );
}
