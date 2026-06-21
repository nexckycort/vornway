import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import type { FeedbackItem } from '../-hooks/use-feedback-page';

type DeleteFeedbackDialogProps = {
  feedback: FeedbackItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteFeedbackDialog({
  feedback,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteFeedbackDialogProps) {
  return (
    <Dialog
      open={Boolean(feedback)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-[calc(100%-1rem)] rounded-[28px] p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar reporte</DialogTitle>
          <DialogDescription>
            Se eliminará el reporte y sus imágenes adjuntas.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-full"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-12 flex-1 rounded-full bg-destructive text-white hover:bg-destructive/90"
            disabled={isDeleting || !feedback}
            onClick={onConfirm}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
