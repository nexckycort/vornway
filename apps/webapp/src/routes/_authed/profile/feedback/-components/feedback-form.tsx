import { ImagePlus, Loader2, X } from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import { Button } from '#/components/ui/button';
import { getProfileMessages } from '#/routes/_authed/profile/-messages';
import type { DraftImage, FeedbackType } from '../-hooks/use-feedback-page';

type FeedbackFormProps = {
  type: FeedbackType;
  title: string;
  description: string;
  draftImages: DraftImage[];
  imageInputRef: RefObject<HTMLInputElement | null>;
  titleError?: string;
  descriptionError?: string;
  isSubmitting: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDraftImagesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveDraftImage: (imageId: string) => void;
  onSubmit: () => void;
};

export function FeedbackForm({
  type,
  title,
  description,
  draftImages,
  imageInputRef,
  titleError,
  descriptionError,
  isSubmitting,
  onTitleChange,
  onDescriptionChange,
  onDraftImagesChange,
  onRemoveDraftImage,
  onSubmit,
}: FeedbackFormProps) {
  const t = getProfileMessages();

  return (
    <section className="space-y-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div>
        <label
          htmlFor="feedback-title"
          className="text-sm font-semibold text-[#0f172a]"
        >
          {t.feedback.titleLabel}
        </label>
        <input
          id="feedback-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={
            type === 'BUG'
              ? t.feedback.bugTitlePlaceholder
              : t.feedback.featureTitlePlaceholder
          }
          className={`mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-sm outline-none transition-colors ${
            titleError
              ? 'border-red-300'
              : 'border-[#e2e8f0] focus:border-primary'
          }`}
        />
        {titleError ? (
          <p className="mt-2 text-xs font-medium text-red-600">{titleError}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="feedback-description"
          className="text-sm font-semibold text-[#0f172a]"
        >
          {t.feedback.descriptionLabel}
        </label>
        <textarea
          id="feedback-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder={
            type === 'BUG'
              ? t.feedback.bugDescriptionPlaceholder
              : t.feedback.featureDescriptionPlaceholder
          }
          rows={6}
          className={`mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition-colors ${
            descriptionError
              ? 'border-red-300'
              : 'border-[#e2e8f0] focus:border-primary'
          }`}
        />
        {descriptionError ? (
          <p className="mt-2 text-xs font-medium text-red-600">
            {descriptionError}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#0f172a]">
            {t.feedback.images}
          </p>
          <p className="text-xs text-[#64748b]">
            {t.feedback.attachmentsCount(draftImages.length)}
          </p>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onDraftImagesChange}
        />

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={draftImages.length >= 5}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-sm font-medium text-[#475569] disabled:opacity-50"
        >
          <ImagePlus className="size-4" />
          {t.feedback.addImages}
        </button>

        {draftImages.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {draftImages.map((image) => (
              <div
                key={image.id}
                className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#f8fafc]"
              >
                <img
                  src={image.previewUrl}
                  alt={image.fileName}
                  className="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemoveDraftImage(image.id)}
                  className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white"
                  aria-label={t.feedback.removeImageAria}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="h-12 w-full rounded-full text-sm font-semibold"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Enviando...
          </>
        ) : type === 'BUG' ? (
          'Enviar error'
        ) : (
          'Enviar funcionalidad'
        )}
      </Button>
    </section>
  );
}
