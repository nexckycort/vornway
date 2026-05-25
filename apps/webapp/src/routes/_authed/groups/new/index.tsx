import {
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '#/components/ui/button';
import {
  compressGroupImageFile,
  createGroupDraftId,
  loadGroupDraft,
  saveGroupDraft,
} from '#/routes/_authed/groups/new/-lib/group-create-draft';

export const Route = createFileRoute('/_authed/groups/new/')({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === 'string' ? search.name : '',
    type: typeof search.type === 'string' ? search.type : '',
    description:
      typeof search.description === 'string' ? search.description : '',
    draftId: typeof search.draftId === 'string' ? search.draftId : '',
  }),
  component: RouteComponent,
});

const groupTypes = [
  { value: 'viajes', label: 'Viajes' },
  { value: 'meta', label: 'Meta' },
  { value: 'personal', label: 'Personal' },
  { value: 'otros', label: 'Otros' },
] as const;

function RouteComponent() {
  const navigate = useNavigate();
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const {
    name: searchName,
    type: searchType,
    description: searchDescription,
    draftId,
  } = Route.useSearch();

  const [name, setName] = useState(searchName);
  const [type, setType] = useState<string>(searchType || groupTypes[0].value);
  const [description, setDescription] = useState(searchDescription);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const isValid = name.trim().length > 0 && type.trim().length > 0;

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!draftId) return;

    const draft = loadGroupDraft(draftId);
    if (!draft) return;

    setName(draft.name);
    setType(draft.type || groupTypes[0].value);
    setDescription(draft.description);
    setImageDataUrl(draft.image?.dataUrl ?? null);
    setImageFileName(draft.image?.fileName ?? null);
  }, [draftId]);

  useEffect(() => {
    if (!isValid) return;

    void router.preloadRoute({
      to: '/groups/new/participants',
      search: {
        draftId: draftId || '',
        name: name.trim(),
        type: type.trim(),
        description: description.trim(),
      },
    });
  }, [description, draftId, isValid, name, router, type]);

  const handleImageSelect = async (file: File | null) => {
    if (!file) return;

    setImageError(null);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setImageDataUrl(null);
      setImageFileName(null);
      setImageError(
        'Sin conexión no es posible subir la imagen. Puedes subirla después.',
      );
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
        error instanceof Error
          ? error.message
          : 'No se pudo procesar la imagen',
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
      },
    });
  };

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl flex-col bg-[#fafafa] px-4 pb-0 pt-8">
        <header className="mb-6">
          <button
            type="button"
            onClick={() => navigate({ to: '/groups' })}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <ArrowLeft className="size-4" />
            Atrás
          </button>
          <h1 className="text-2xl font-semibold leading-8 text-[#0f172a]">
            Crear nuevo grupo
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Puedes crearlo solo para ti o compartirlo después.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5">
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
              placeholder="Detalle breve del grupo"
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
                    alt="Imagen seleccionada del grupo"
                    className="size-full object-cover"
                  />
                ) : (
                  <ImagePlus className="size-6 text-[#94a3b8]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#334155]">
                  Imagen del grupo
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
                    if (draftId) {
                      const draft = loadGroupDraft(draftId);
                      if (draft) {
                        saveGroupDraft(draftId, { ...draft, image: null });
                      }
                    }
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

          <div className="-mx-4 mt-auto border-t border-[#e2e8f0] bg-[#fafafa] px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full rounded-full"
              disabled={!isValid}
            >
              Continuar
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
