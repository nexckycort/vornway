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
import type { GoalDetailData } from '../../-hooks/use-goal-detail-query';
import { useUpdateGoalMutation } from '../../-hooks/use-update-goal';
import { toDateInputValue } from '../../-lib/goal-detail';
import {
  type ContributionMode,
  contributionModes,
} from '../../-lib/goal-experience';
import { getGoalsMessages } from '../../-messages';

export function GoalEditDrawer({
  goal,
  open,
  onOpenChange,
}: {
  goal: GoalDetailData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = getGoalsMessages();
  const updateGoalMutation = useUpdateGoalMutation(goal.id);
  const [wasOpen, setWasOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contributionMode, setContributionMode] =
    useState<ContributionMode>('manual');

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(goal.title);
      setDescription(goal.description ?? '');
      setTargetAmount(String(goal.targetAmount));
      setEndDate(toDateInputValue(goal.endDate));
      setContributionMode(goal.contributionMode as ContributionMode);
    }
  }

  const save = async () => {
    if (updateGoalMutation.isPending) return;
    const parsedTarget = Number(targetAmount.replace(',', '.'));
    if (!title.trim() || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return;
    }

    try {
      await updateGoalMutation.mutateAsync({
        name: title,
        description,
        targetAmount: parsedTarget,
        endDate: new Date(endDate),
        contributionMode,
      });
      onOpenChange(false);
      toast.success(m['system.goalUpdated']());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : m['system.updateGoalFailed'](),
      );
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent presentation="fullScreen" className="mt-0">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>{t.detail.editGoalTitle}</DrawerTitle>
          <DrawerDescription>{t.detail.editGoalCopy}</DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#334155]">
              {t.detail.name}
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#334155]">
              {t.detail.description}
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-base outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                Objetivo
              </span>
              <input
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
                inputMode="decimal"
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                Fecha fin
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
              />
            </label>
          </div>
          <div className="grid gap-2">
            {contributionModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setContributionMode(mode.id)}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  contributionMode === mode.id
                    ? 'border-primary bg-primary/5'
                    : 'border-[#e2e8f0] bg-white'
                }`}
              >
                <p className="text-sm font-semibold text-[#0f172a]">
                  {mode.label()}
                </p>
                <p className="mt-1 text-xs text-[#64748b]">
                  {mode.description()}
                </p>
              </button>
            ))}
          </div>
        </div>

        <DrawerFooter className="shrink-0 border-t border-[#e2e8f0] bg-white">
          <Button
            type="button"
            className="h-12 rounded-full"
            disabled={
              !title.trim() ||
              !targetAmount.trim() ||
              updateGoalMutation.isPending
            }
            onClick={() => void save()}
          >
            {updateGoalMutation.isPending
              ? t.common.saving
              : t.common.saveChanges}
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
