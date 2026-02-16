import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '~/components/page-header';
import { getGroup } from '../-actions/get-group';
import { updateGroupName } from '../-actions/update-group-name';

export const Route = createFileRoute('/_authed/groups/$id/edit/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [nameDraft, setNameDraft] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroup({ data: { groupId: id } }),
  });

  useEffect(() => {
    if (data?.name) {
      setNameDraft(data.name);
    }
  }, [data?.name]);

  const updateGroupNameMutation = useMutation({
    mutationFn: updateGroupName,
    onSuccess: async (result) => {
      if (!result.success) return;
      await queryClient.invalidateQueries({ queryKey: ['group', id] });
      await queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      router.navigate({ to: '/groups/$id', params: { id }, replace: true });
    },
  });

  const trimmedName = nameDraft.trim();
  const isUnchanged = useMemo(
    () => trimmedName === (data?.name ?? '').trim(),
    [data?.name, trimmedName],
  );
  const canSave =
    Boolean(trimmedName) &&
    !isUnchanged &&
    Boolean(data?.isOwner) &&
    !updateGroupNameMutation.isPending;

  const goToGroup = () =>
    router.navigate({ to: '/groups/$id', params: { id }, replace: true });

  if (isLoading) {
    return (
      <div className="native-app-shell min-h-dvh bg-[#f3f4fa]">
        <div className="native-screen native-enter mx-auto flex min-h-dvh w-full max-w-md items-center justify-center pb-8">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <PageHeader
        title="Editar grupo"
        subtitle="No se pudo cargar"
        goBack
        onBack={goToGroup}
      >
        <div className="px-4 py-6 lg:px-6">
          <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
            <p className="mb-6 text-gray-500">
              {error instanceof Error ? error.message : 'No se pudo cargar'}
            </p>
            <button
              type="button"
              onClick={goToGroup}
              className="rounded-xl bg-[#4040b0] px-6 py-3 text-white"
            >
              Volver al grupo
            </button>
          </div>
        </div>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      title={data.name}
      subtitle={`${data.participantCount} Participantes`}
      goBack
      onBack={goToGroup}
    >
      <div className="px-4 py-2 lg:px-6 lg:pt-3">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide">
            Editar grupo
          </p>
          <label htmlFor="group-name" className="mb-2 block text-[#1a1a3e]">
            Nombre del grupo
          </label>
          <input
            id="group-name"
            type="text"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            placeholder="Ej. Viaje Cartagena"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[#1a1a3e] placeholder:text-gray-400 focus:border-[#6060c0] focus:outline-none"
            maxLength={80}
          />
          {!data.isOwner ? (
            <p className="mt-3 text-sm text-red-500">
              Solo el creador del grupo puede editar el nombre.
            </p>
          ) : null}
          {updateGroupNameMutation.data?.error ? (
            <p className="mt-3 text-sm text-red-500">
              {updateGroupNameMutation.data.error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-black/5 bg-white/85 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:mx-auto lg:max-w-4xl lg:px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goToGroup}
            className="flex-1 py-4 font-medium text-[#1a1a3e]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() =>
              updateGroupNameMutation.mutate({
                data: {
                  groupId: id,
                  name: trimmedName,
                },
              })
            }
            className="flex-1 rounded-2xl bg-[#4040b0] py-4 font-medium text-white disabled:opacity-60"
          >
            {updateGroupNameMutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </PageHeader>
  );
}
