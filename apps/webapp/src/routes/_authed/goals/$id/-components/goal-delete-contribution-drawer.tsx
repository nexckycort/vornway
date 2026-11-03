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
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { useDeleteGoalContributionMutation } from '../../-hooks/use-delete-goal-contribution';
import { getGoalsMessages } from '../../-messages';
import type { ContributionToDelete } from './goal-activity-section';

export function GoalDeleteContributionDrawer({
  goalId,
  contribution,
  open,
  onOpenChange,
  onDeleted,
}: {
  goalId: string;
  contribution: ContributionToDelete | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const t = getGoalsMessages();
  const deleteContributionMutation = useDeleteGoalContributionMutation(goalId);

  const confirmDelete = async () => {
    if (!contribution || deleteContributionMutation.isPending) return;

    try {
      await deleteContributionMutation.mutateAsync(contribution.id);
      onOpenChange(false);
      onDeleted();
      toast.success(t.detail.contributionDeleted);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : m['system.deleteGoalContributionFailed'](),
      );
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t.detail.deleteContributionTitle}</DrawerTitle>
          <DrawerDescription>
            {contribution
              ? `${contribution.memberName} · ${formatCurrency(
                  contribution.currency,
                  contribution.amount,
                )}`
              : t.detail.deleteContributionConfirm}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerFooter>
          <Button
            type="button"
            variant="destructive"
            className="h-12 rounded-full"
            disabled={deleteContributionMutation.isPending}
            onClick={() => void confirmDelete()}
          >
            {deleteContributionMutation.isPending
              ? t.common.deleting
              : t.common.delete}
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
