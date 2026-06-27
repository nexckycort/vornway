import {
  createFileRoute,
  useLocation,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { ImagePlus, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  type GroupFlowState,
  useGroupFlowNavigation,
} from '#/lib/group-flow-navigation';
import { useUpdateGroupMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';

import { compressGroupImageFile } from '#/routes/_authed/groups/new/-lib/group-create-draft';

export const Route = createFileRoute('/_authed/groups/$id/edit/')({
  component: RouteComponent,
});

const groupTypes = [
  { value: 'viajes', label: 'Viajes' },
  { value: 'meta', label: 'Meta' },
  { value: 'personal', label: 'Personal' },
  { value: 'otros', label: 'Otros' },
] as const;

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const location = useLocation();
  const { flowState, navigateToGroupRoot } = useGroupFlowNavigation(id);
  const groupFlowState = location.state as GroupFlowState;
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const groupQuery = useGroupSummaryQuery(id);
  const updateGroupMutation = useUpdateGroupMutation(id);

  const [name, setName] = useState('');
  const [type, setType] = useState<string>(groupTypes[0].value);
  const [description, setDescription] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!groupQuery.data || hydratedRef.current) return;

    hydratedRef.current = true;
    setName(groupQuery.data.name);
    setType(groupQuery.data.type || groupTypes[0].value);
    setDescription(groupQuery.data.description ?? '');
    setImageDataUrl(null);
    setImageFileName(null);
  }, [groupQuery.data]);

  const isValid = name.trim().length > 0 && type.trim().length > 0;
  const previewImageUrl = imageDataUrl ?? groupQuery.data?.imageUrl ?? null;

  const goBack = () => {
    void navigate({
      to: '/groups/$id/settings',
      params: { id },
      replace: true,
      state: flowState,
    });
  };

  const handleImageSelect = async (file: File | null) => {
    if (!file) return;

    setImageError(null);
    setIsCompressingImage(true);

    try {
      const dataUrl = await compressGroupImageFile(file);
      setImageDataUrl(dataUrl);
      setImageFileName(file.name);
    } catch (error) {
      setImageDataUrl(null);
      setImageFileName(null);
      setImageError(
        error instanceof Error
          ? error.message
          : 'No se pudo procesar la imagen',
      );
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;

    setFormError(null);

    try {
      await updateGroupMutation.mutateAsync({
        name: name.trim(),
        type: type.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(imageDataUrl
          ? {
              image: {
                dataUrl: imageDataUrl,
                ...(imageFileName ? { fileName: imageFileName } : {}),
              },
            }
          : {}),
      });

      if (groupFlowState.groupEditReturn === 'history-back') {
        router.history.back();
        return;
      }

      void navigateToGroupRoot(true);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el espacio',
      );
    }
  };

  if (groupQuery.isLoading) {
    return (
      <MobilePageLayout title="Editar espacio" onBack={goBack}>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[#64748b]">Cargando espacio...</p>
        </div>
      </MobilePageLayout>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <MobilePageLayout title="Editar espacio" onBack={goBack}>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {groupQuery.error instanceof Error
              ? groupQuery.error.message
              : 'No se pudo cargar el espacio'}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={goBack}
          >
            Volver
          </Button>
        </div>
      </MobilePageLayout>
    );
  }

  return (
    <MobilePageLayout title="Editar espacio" onBack={goBack}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 pb-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#334155]">Nombre</span>
          <input
            ref={nameInputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Semana santa"
            className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none transition-colors focus:border-primary"
            maxLength={120}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#334155]">Tipo</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none transition-colors focus:border-primary"
          >
            {groupTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#334155]">
            Descripción (opcional)
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Detalle breve del espacio"
            className="min-h-24 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
            maxLength={400}
          />
        </label>

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc]">
              {previewImageUrl ? (
                <img
                  src={previewImageUrl}
                  alt="Imagen seleccionada del espacio"
                  className="size-full object-cover"
                />
              ) : (
                <ImagePlus className="size-6 text-[#94a3b8]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#334155]">
                Imagen del espacio
              </p>
              <p className="mt-1 text-xs leading-5 text-[#64748b]">
                Se comprimirá automáticamente antes de guardarse.
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
              {isCompressingImage ? 'Procesando...' : 'Subir imagen'}
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
                }}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          {imageError ? (
            <p className="mt-3 text-xs text-red-600">{imageError}</p>
          ) : null}
        </section>

        {formError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        ) : null}

        <div className="-mx-4 mt-auto border-t border-[#e2e8f0] bg-[#fafafa] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-full"
            disabled={!isValid || updateGroupMutation.isPending}
          >
            {updateGroupMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </MobilePageLayout>
  );
}
