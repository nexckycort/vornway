import { CheckIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { m } from '#/paraglide/messages.js';
import { useAddGoalContributionMutation } from '../../-hooks/use-add-goal-contribution';
import type { GoalDetailData } from '../../-hooks/use-goal-detail-query';
import { getGoalsMessages } from '../../-messages';
import { Avatar } from './goal-detail-parts';

export function GoalContributionDrawer({
  goal,
  defaultDate,
  open,
  onOpenChange,
}: {
  goal: GoalDetailData;
  defaultDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = getGoalsMessages();
  const addContributionMutation = useAddGoalContributionMutation(goal.id);
  const defaultMemberId =
    goal.members.find((member) => member.isCurrentUser)?.id ??
    goal.members[0]?.id ??
    '';
  const [wasOpen, setWasOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const memberId = goal.members.some((member) => member.id === selectedMemberId)
    ? selectedMemberId
    : defaultMemberId;

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAmount(
        goal.suggestedContributionAmount
          ? String(Math.round(goal.suggestedContributionAmount))
          : '',
      );
      setDate(defaultDate);
      setNotes('');
      setSelectedMemberId(defaultMemberId);
    }
  }

  const save = async () => {
    if (addContributionMutation.isPending || !memberId) return;

    const parsedAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    try {
      await addContributionMutation.mutateAsync({
        memberId,
        amount: parsedAmount,
        ...(date ? { contributedAt: new Date(date) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onOpenChange(false);
      toast.success(t.detail.contributionAdded);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : m['system.addGoalContributionFailed'](),
      );
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent presentation="fullScreen" className="mt-0">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>{t.detail.registerContributionTitle}</DrawerTitle>
          <DrawerDescription>
            {t.detail.registerContributionCopy(goal.title)}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          <div className="grid gap-2">
            {goal.members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedMemberId(member.id)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                  memberId === member.id
                    ? 'border-primary bg-primary/5'
                    : 'border-[#e2e8f0] bg-white'
                }`}
              >
                <Avatar name={member.name} image={member.image} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#132238]">
                    {member.name}
                  </p>
                  <p className="truncate text-xs text-[#64748b]">
                    {member.email ?? t.detail.unlinked}
                  </p>
                </div>
                {memberId === member.id ? (
                  <HugeiconsIcon
                    icon={CheckIcon}
                    className="size-4 text-primary"
                  />
                ) : null}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                {t.detail.amount}
              </span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                {t.detail.date}
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#334155]">
              {t.detail.optionalNote}
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder={t.detail.contributionNotePlaceholder}
              className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-base outline-none"
            />
          </label>
        </div>

        <DrawerFooter className="shrink-0 border-t border-[#e2e8f0] bg-white">
          <Button
            type="button"
            className="h-12 rounded-full"
            disabled={
              !memberId || !amount.trim() || addContributionMutation.isPending
            }
            onClick={() => void save()}
          >
            {addContributionMutation.isPending
              ? t.detail.savingContribution
              : t.detail.saveContribution}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {t.common.cancel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
