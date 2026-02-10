/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { createGoalSpace } from './-actions/create-goal-space';
import { getKnownUsers } from './-actions/get-known-users';

export const Route = createFileRoute('/_authed/goals/new/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [installmentCount, setInstallmentCount] = useState('12');
  const [installmentAmount, setInstallmentAmount] = useState('');

  const [participantName, setParticipantName] = useState('');
  const [participants, setParticipants] = useState<
    Array<{ name: string; userId?: string | null }>
  >([]);

  const { data: knownUsersData } = useQuery({
    queryKey: ['known-users-goals'],
    queryFn: () => getKnownUsers(),
  });

  const createMutation = useMutation({
    mutationFn: createGoalSpace,
    onSuccess: (result) => {
      if (result.success && result.goalGroupId) {
        navigate({
          to: '/goals/$id',
          params: { id: result.goalGroupId },
        });
      }
    },
  });

  const addParticipant = () => {
    const trimmed = participantName.trim();
    if (!trimmed) return;
    const exists = participants.some(
      (participant) =>
        participant.name.toLocaleLowerCase('es-CO') ===
        trimmed.toLocaleLowerCase('es-CO'),
    );
    if (exists) {
      setParticipantName('');
      return;
    }
    setParticipants((prev) => [...prev, { name: trimmed }]);
    setParticipantName('');
  };

  const addKnownUserParticipant = (user: { id: string; name: string }) => {
    const exists = participants.some(
      (participant) =>
        participant.userId === user.id ||
        participant.name.toLocaleLowerCase('es-CO') ===
          user.name.toLocaleLowerCase('es-CO'),
    );
    if (exists) return;
    setParticipants((prev) => [...prev, { name: user.name, userId: user.id }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const knownUsers = knownUsersData?.users ?? [];
  const filteredKnownUsers = knownUsers.filter((user) => {
    const exists = participants.some(
      (participant) =>
        participant.userId === user.id ||
        participant.name.toLocaleLowerCase('es-CO') ===
          user.name.toLocaleLowerCase('es-CO'),
    );
    if (exists) return false;
    if (!participantName.trim()) return true;
    return user.name
      .toLocaleLowerCase('es-CO')
      .includes(participantName.trim().toLocaleLowerCase('es-CO'));
  });

  const canCreate =
    name.trim() &&
    Number(targetAmount) > 0 &&
    currency.trim() &&
    Number(installmentCount) > 0 &&
    startDate &&
    endDate;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 py-4 flex items-center gap-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="w-10 h-10 flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-[#1a1a3e]" />
        </button>
        <h1 className="text-xl font-semibold text-[#1a1a3e]">Crear meta</h1>
      </div>

      <div className="flex-1 px-4 py-4 space-y-6">
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la meta"
            className="w-full px-4 py-3.5 border border-gray-200 rounded-xl"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              placeholder="Monto objetivo"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl"
            />
            <input
              type="text"
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              placeholder="Moneda"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Fecha inicio</p>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Fecha fin</p>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl"
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Cuotas mensuales</p>
            <input
              type="number"
              value={installmentCount}
              onChange={(event) => setInstallmentCount(event.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">
              Monto cuota mensual (opcional)
            </p>
            <input
              type="number"
              value={installmentAmount}
              onChange={(event) => setInstallmentAmount(event.target.value)}
              placeholder="Si no lo defines, se calcula automático"
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl"
            />
          </div>
        </div>

        <div>
          <p className="font-semibold text-[#1a1a3e] mb-3">Participantes</p>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Nombre del participante"
              value={participantName}
              onChange={(event) => setParticipantName(event.target.value)}
              className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl"
            />
            <button
              onClick={addParticipant}
              className="w-14 h-14 bg-[#4040b0] rounded-xl flex items-center justify-center"
            >
              <UserPlus className="w-5 h-5 text-white" />
            </button>
          </div>

          {filteredKnownUsers.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {filteredKnownUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addKnownUserParticipant(user)}
                  className="px-3 py-2 bg-[#eef0ff] text-[#4040b0] rounded-xl text-sm font-medium"
                >
                  {user.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div
                key={`${participant.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <p className="text-[#1a1a3e]">{participant.name}</p>
                <button type="button" onClick={() => removeParticipant(index)}>
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 border-t border-gray-100">
        <button
          type="button"
          disabled={!canCreate || createMutation.isPending}
          onClick={() =>
            createMutation.mutate({
              data: {
                name,
                currency,
                targetAmount: Number(targetAmount),
                startDate,
                endDate,
                installmentCount: Number(installmentCount),
                installmentAmount:
                  installmentAmount.trim() === ''
                    ? undefined
                    : Number(installmentAmount),
                participants,
              },
            })
          }
          className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creando...' : 'Crear meta'}
        </button>
        {createMutation.data?.error ? (
          <p className="text-red-500 text-sm mt-3">{createMutation.data.error}</p>
        ) : null}
      </div>
    </div>
  );
}
