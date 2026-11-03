import {
  CalendarClockIcon,
  Call02Icon,
  CameraIcon,
  Delete02Icon,
  LinkIcon,
  MapPinIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import type { ExpenseForm } from '../-hooks/use-expense-form';
import {
  advancedDetailsTypeOptions,
  emptyAdvancedDetails,
} from '../-lib/expense-form.types';
import { AdvancedDetailsInput } from './advanced-details-input';

type ExpenseAdvancedDetailsDrawerProps = { form: ExpenseForm };

export function ExpenseAdvancedDetailsDrawer({
  form,
}: ExpenseAdvancedDetailsDrawerProps) {
  const {
    advancedDetails,
    attachmentDataUrl,
    attachmentError,
    attachmentInputRef,
    attachmentPreviewUrl,
    clearAttachmentSelection,
    groupMessages,
    handleAttachmentSelect,
    setAdvancedDetails,
    setShowAdvancedDetailsDrawer,
    showAdvancedDetailsDrawer,
  } = form;

  return (
    <Drawer
      open={showAdvancedDetailsDrawer}
      onOpenChange={setShowAdvancedDetailsDrawer}
    >
      <DrawerContent presentation="fullScreen">
        <DrawerHeader>
          <DrawerTitle>{groupMessages.expense.placeDetailsTitle}</DrawerTitle>
          <DrawerDescription>
            {groupMessages.expense.advancedDetailsDescription}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
          <section>
            <p className="mb-3 text-sm font-medium text-gray-900">
              {groupMessages.expense.advancedDetailsTypeTitle}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {advancedDetailsTypeOptions.map((option) => {
                const active = advancedDetails.type === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setAdvancedDetails((current) => ({
                        ...current,
                        type: option.value,
                      }))
                    }
                    className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                      active
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {option.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <AdvancedDetailsInput
            label={groupMessages.expense.placeName}
            value={advancedDetails.placeName ?? ''}
            onChange={(value) =>
              setAdvancedDetails((current) => ({
                ...current,
                placeName: value,
              }))
            }
            placeholder={
              advancedDetails.type === 'food'
                ? 'Restaurante'
                : advancedDetails.type === 'stay'
                  ? 'Hotel o Airbnb'
                  : 'Lugar o proveedor'
            }
          />

          <AdvancedDetailsInput
            label={groupMessages.expense.address}
            value={advancedDetails.address ?? ''}
            onChange={(value) =>
              setAdvancedDetails((current) => ({
                ...current,
                address: value,
              }))
            }
            placeholder={groupMessages.expense.addressPlaceholder}
            icon={<HugeiconsIcon icon={MapPinIcon} className="size-4" />}
          />

          <AdvancedDetailsInput
            label={groupMessages.expense.mapLocation}
            value={advancedDetails.mapUrl ?? ''}
            onChange={(value) =>
              setAdvancedDetails((current) => ({
                ...current,
                mapUrl: value,
              }))
            }
            placeholder={groupMessages.expense.mapUrlPlaceholder}
            inputMode="url"
            icon={<HugeiconsIcon icon={MapPinIcon} className="size-4" />}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdvancedDetailsInput
              label={groupMessages.expense.contact}
              value={advancedDetails.contactName ?? ''}
              onChange={(value) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  contactName: value,
                }))
              }
              placeholder={groupMessages.expense.contactPlaceholder}
            />

            <AdvancedDetailsInput
              label={groupMessages.expense.phone}
              value={advancedDetails.phone ?? ''}
              onChange={(value) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  phone: value,
                }))
              }
              placeholder="+57..."
              inputMode="tel"
              icon={<HugeiconsIcon icon={Call02Icon} className="size-4" />}
            />
          </div>

          <AdvancedDetailsInput
            label={groupMessages.expense.email}
            value={advancedDetails.email ?? ''}
            onChange={(value) =>
              setAdvancedDetails((current) => ({
                ...current,
                email: value,
              }))
            }
            placeholder={groupMessages.expense.emailPlaceholder}
            inputMode="email"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdvancedDetailsInput
              label={groupMessages.expense.reservationCode}
              value={advancedDetails.bookingCode ?? ''}
              onChange={(value) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  bookingCode: value,
                }))
              }
              placeholder={groupMessages.expense.reservationCodePlaceholder}
            />

            <AdvancedDetailsInput
              label={groupMessages.expense.dateOrTime}
              value={advancedDetails.reservationTime ?? ''}
              onChange={(value) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  reservationTime: value,
                }))
              }
              placeholder={groupMessages.expense.dateOrTimePlaceholder}
              icon={
                <HugeiconsIcon icon={CalendarClockIcon} className="size-4" />
              }
            />
          </div>

          <AdvancedDetailsInput
            label={groupMessages.expense.externalLink}
            value={advancedDetails.websiteUrl ?? ''}
            onChange={(value) =>
              setAdvancedDetails((current) => ({
                ...current,
                websiteUrl: value,
              }))
            }
            placeholder={groupMessages.expense.externalLinkPlaceholder}
            inputMode="url"
            icon={<HugeiconsIcon icon={LinkIcon} className="size-4" />}
          />

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-900">
                {groupMessages.expense.image}
              </p>
              {attachmentDataUrl ? (
                <button
                  type="button"
                  onClick={clearAttachmentSelection}
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-500"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                  Quitar nueva imagen
                </button>
              ) : null}
            </div>

            <input
              ref={attachmentInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) =>
                void handleAttachmentSelect(event.target.files?.[0] ?? null)
              }
            />

            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-gray-300 bg-white p-3 text-left"
            >
              {attachmentPreviewUrl ? (
                <img
                  src={attachmentPreviewUrl}
                  alt={groupMessages.expense.imageAlt}
                  className="size-20 shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                  <HugeiconsIcon icon={CameraIcon} className="size-6" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">
                  {attachmentPreviewUrl
                    ? groupMessages.expense.changeImage
                    : groupMessages.expense.addImage}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Recibo, reserva, ticket o referencia del lugar
                </span>
              </span>
            </button>

            {attachmentError ? (
              <p className="mt-2 text-xs text-rose-600">{attachmentError}</p>
            ) : null}
          </section>

          <label className="block">
            <span className="text-sm font-medium text-gray-900">
              {groupMessages.expense.notes}
            </span>
            <textarea
              value={advancedDetails.notes ?? ''}
              onChange={(event) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder={groupMessages.expense.notesPlaceholder}
              className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-rose-500"
            />
          </label>
        </div>

        <div className="border-t border-gray-200 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => setAdvancedDetails(emptyAdvancedDetails)}
            >
              {groupMessages.expense.clearAdvancedDetails}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full bg-primary text-white hover:bg-primary/90"
              onClick={() => setShowAdvancedDetailsDrawer(false)}
            >
              {groupMessages.expense.saveAdvancedDetails}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
