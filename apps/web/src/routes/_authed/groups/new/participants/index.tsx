/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */
/** biome-ignore-all lint/a11y/useButtonType: <explanation> */

import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Share2, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { StepLayout } from '~/components/layouts/step-layout';

import { createGroup } from './-actions/create-group';

export const Route = createFileRoute('/_authed/groups/new/participants/')({
  validateSearch: (search: Record<string, string>) => {
    return {
      name: search.name,
      currency: search.currency,
      category: search.category,
    };
  },
  component: AddParticipants,
});

function AddParticipants() {
  const { name, currency, category } = Route.useSearch();

  const router = useRouter();
  const [participantName, setParticipantName] = useState('');
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const handleCreate = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await createGroup({
        data: {
          name,
          currency,
          category,
          participants: participantNames,
        },
      });

      if (result.success && result.groupId) {
        setCreatedGroupId(result.groupId);
        setInviteCode(result.inviteCode ?? null);
        setShowSuccessModal(true);
      } else {
        console.error('Error creating group:', result.error);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addParticipant = () => {
    if (participantName.trim()) {
      setParticipantNames([...participantNames, participantName.trim()]);
      setParticipantName('');
    }
  };

  const removeParticipant = (index: number) => {
    setParticipantNames(participantNames.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addParticipant();
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <StepLayout
      title="Añadir participantes"
      currentStep={2}
      totalSteps={2}
      footer={
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleCreate}
            disabled={isLoading}
            className="flex-1 py-4 text-[#1a1a3e] font-medium disabled:opacity-50"
          >
            Omitir
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isLoading}
            className="flex-1 py-4 bg-[#4040b0] text-white font-medium rounded-2xl disabled:opacity-50"
          >
            {isLoading ? 'Creando...' : 'Crear Grupo'}
          </button>
        </div>
      }
    >
      <div>
        <p className="text-gray-600 mb-6">
          Puedes agregarlos ahora o más adelante.
        </p>

        {/* Input with button */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Nombre del participante"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-[#1a1a3e] placeholder:text-gray-400 focus:outline-none focus:border-[#6060c0]"
          />
          <button
            onClick={addParticipant}
            disabled={!participantName.trim()}
            className="w-14 h-14 bg-[#4040b0] rounded-xl flex items-center justify-center disabled:opacity-50"
          >
            <UserPlus className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Participants list */}
        <div className="space-y-3">
          {participantNames.map((participant, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#e0f7f5] rounded-full flex items-center justify-center">
                  <span className="text-[#22d3c5] font-semibold">
                    {getInitial(participant)}
                  </span>
                </div>
                <span className="font-medium text-[#1a1a3e]">
                  {participant}
                </span>
              </div>
              <button
                onClick={() => removeParticipant(index)}
                className="w-8 h-8 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/30 z-40" />

          {/* Bottom Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8">
              {/* Title */}
              <h2 className="text-2xl font-bold text-[#1a1a3e] text-center mb-6">
                {'¡' + name + ', creado!'}
              </h2>

              {/* Image with decorative shape */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  {/* Decorative purple shape */}
                  <div className="absolute -top-4 -right-4 w-28 h-28 bg-[#a8a0e8] rounded-3xl transform rotate-12" />
                  {/* Image container */}
                  <div className="relative w-40 h-40 rounded-3xl overflow-hidden shadow-lg">
                    <img
                      src="https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=400&h=400&fit=crop"
                      alt="Grupo de viaje"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Share link section */}
              <p className="text-lg font-medium text-[#1a1a3e] mb-3">
                Compartir enlace del grupo
              </p>
              <div className="flex gap-3 mb-6">
                <div className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                  <span className="text-gray-500 text-sm truncate block">
                    {`${window.location.origin}/join/${inviteCode}`}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/join/${inviteCode}`
                    );
                  }}
                  className="w-14 h-14 border-2 border-[#4040b0] rounded-xl flex items-center justify-center"
                >
                  <Share2 className="w-5 h-5 text-[#4040b0]" />
                </button>
              </div>

              {/* Info card */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-6">
                <p className="font-semibold text-[#1a1a3e] mb-3">
                  {'¿Que puedes hacer ahora?'}
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#4040b0] mt-1.5">•</span>
                    <span>
                      <strong className="text-[#1a1a3e]">Invita</strong> a mas
                      personas cuando quieras
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4040b0] mt-1.5">•</span>
                    <span>
                      Comienza a{' '}
                      <strong className="text-[#1a1a3e]">
                        registrar gastos
                      </strong>{' '}
                      compartidos
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4040b0] mt-1.5">•</span>
                    <span>
                      <strong className="text-[#1a1a3e]">
                        Revisa los balances
                      </strong>{' '}
                      en tiempo real
                    </span>
                  </li>
                </ul>
              </div>

              {/* Go to group button */}
              <button
                onClick={() => {
                  if (createdGroupId) {
                    router.navigate({
                      to: '/groups/$id',
                      params: { id: createdGroupId },
                    });
                  }
                }}
                className="w-full py-4 bg-[#4040b0] text-white font-medium rounded-2xl"
              >
                Ir al grupo
              </button>
            </div>
          </div>
        </>
      )}
    </StepLayout>
  );
}
