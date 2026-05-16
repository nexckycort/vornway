import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '#/components/ui/button';

export const Route = createFileRoute('/_authed/groups/new/')({
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
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<string>(groupTypes[0].value);
  const [description, setDescription] = useState('');

  const isValid = name.trim().length > 0 && type.trim().length > 0;

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;

    await navigate({
      to: '/groups/new/participants',
      search: {
        name: name.trim(),
        type: type.trim(),
        description: description.trim(),
      },
    });
  };

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-28 pt-8">
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

          <div className="mt-auto pt-4">
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-2xl"
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
