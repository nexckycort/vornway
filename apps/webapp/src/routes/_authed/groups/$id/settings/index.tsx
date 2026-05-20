import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import {
  useDeleteGroupMutation,
  useUnlinkMemberMutation,
} from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Copy, LogOut, Pencil, QrCode, Share2, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';

export const Route = createFileRoute('/_authed/groups/$id/settings/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [showQrDrawer, setShowQrDrawer] = useState(false);
  const [showShareDrawer, setShowShareDrawer] = useState(false);
  const [showDeleteGroupDrawer, setShowDeleteGroupDrawer] = useState(false);
  const [showLeaveGroupDrawer, setShowLeaveGroupDrawer] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [groupQrCode, setGroupQrCode] = useState<string | null>(null);
  const copiedResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const groupQuery = useGroupSummaryQuery(id);
  const deleteGroupMutation = useDeleteGroupMutation(id);
  const unlinkMemberMutation = useUnlinkMemberMutation(id);

  const inviteLink = useMemo(() => {
    if (!groupQuery.data?.inviteCode || typeof window === 'undefined')
      return '';
    return `https://join.vornway.com/${groupQuery.data.inviteCode}`;
  }, [groupQuery.data?.inviteCode]);

  useEffect(() => {
    let active = true;

    if (!inviteLink) {
      setGroupQrCode(null);
      return () => {
        active = false;
      };
    }

    void QRCode.toDataURL(inviteLink, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 420,
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
    })
      .then((dataUrl: string) => {
        if (active) setGroupQrCode(dataUrl);
      })
      .catch(() => {
        if (active) setGroupQrCode(null);
      });

    return () => {
      active = false;
    };
  }, [inviteLink]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setShareMessage(`${label} copiado`);
      setIsLinkCopied(true);

      if (copiedResetTimeoutRef.current) {
        clearTimeout(copiedResetTimeoutRef.current);
      }

      copiedResetTimeoutRef.current = setTimeout(() => {
        setIsLinkCopied(false);
      }, 1200);
    } catch {
      setShareMessage('No se pudo copiar');
    }
  };

  useEffect(() => {
    return () => {
      if (copiedResetTimeoutRef.current) {
        clearTimeout(copiedResetTimeoutRef.current);
      }
    };
  }, []);

  const shareInvite = async () => {
    if (!inviteLink) return;

    try {
      if (navigator.share) {
        await navigator.share({ url: inviteLink });
        return;
      }

      await copyText(inviteLink, 'Enlace');
    } catch {
      setShareMessage('No se pudo compartir');
    }
  };

  const goBack = () => {
    void navigate({ to: '/groups/$id', params: { id }, replace: true });
  };

  const handleConfirmDeleteGroup = async () => {
    try {
      await deleteGroupMutation.mutateAsync();
      void navigate({ to: '/groups', replace: true });
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : 'No se pudo eliminar el grupo',
      );
    }
  };

  const handleLeaveGroup = async () => {
    const memberId = groupQuery.data?.myMembership?.id;

    if (!memberId) {
      setShareMessage('No se pudo salir del grupo');
      return;
    }

    try {
      await unlinkMemberMutation.mutateAsync({ memberId });
      void navigate({ to: '/groups', replace: true });
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : 'No se pudo salir del grupo',
      );
    }
  };

  if (groupQuery.isLoading) {
    return (
      <MobilePageLayout title="Ajustes" onBack={goBack}>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[#64748b]">Cargando ajustes...</p>
        </div>
      </MobilePageLayout>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <MobilePageLayout title="Ajustes" onBack={goBack}>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {groupQuery.error instanceof Error
              ? groupQuery.error.message
              : 'No se pudo cargar el grupo'}
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

  const group = groupQuery.data;
  const isOwner = group.isOwner;

  return (
    <MobilePageLayout title="Ajustes" onBack={goBack}>
      <div className="flex flex-1 flex-col pb-4">
        <section className="-mx-4 border-y border-[#e5e7eb] bg-white px-4">
          <div className="flex items-center gap-3 py-4">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#fff1f5]">
              {group.imageUrl ? (
                <img
                  src={group.imageUrl}
                  alt={group.name}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-[#e11d48]">
                  <QrCode className="size-5" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#132238]">
                {group.name}
              </p>
              <p className="truncate text-xs text-[#64748b]">
                {group.type === 'meta' ? 'Meta' : 'Viaje'}
              </p>
            </div>

            {isOwner ? (
              <button
                type="button"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] text-[#475569]"
                onClick={() =>
                  navigate({ to: '/groups/$id/edit', params: { id } })
                }
                aria-label="Editar grupo"
              >
                <Pencil className="size-4" />
              </button>
            ) : null}
          </div>
        </section>

        <section className="-mx-4 mt-6">
          <p className="px-3 pb-1 text-sm text-[#64748b]">
            Invitar participantes
          </p>

          <button
            type="button"
            className="flex w-full items-center gap-3 px-1 py-2 text-left"
            onClick={() => setShowQrDrawer(true)}
          >
            <span className="flex size-9 items-center justify-center text-[#132238]">
              <QrCode className="size-5" />
            </span>
            <span className="flex-1 text-sm text-[#132238]">Ver código QR</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 px-1 py-2 text-left"
            onClick={() => setShowShareDrawer(true)}
          >
            <span className="flex size-9 items-center justify-center text-[#132238]">
              <Share2 className="size-5" />
            </span>
            <span className="flex-1 text-sm text-[#132238]">
              Compartir enlace de invitación
            </span>
          </button>
        </section>

        <section className="-mx-4 mt-2">
          <p className="px-3 pb-1 text-sm text-[#64748b]">
            Otras configuraciones
          </p>

          <button
            type="button"
            className="flex w-full items-center gap-3 px-1 py-2 pb-4 text-left"
            onClick={() => {
              void 0;
            }}
          >
            <span className="flex size-9 items-center justify-center text-[#132238]">
              <QrCode className="size-5" />
            </span>
            <span className="flex-1 text-sm text-[#132238]">
              Crear y editar categorías
            </span>
          </button>
        </section>

        <div className="-mx-4 mt-1 border-t border-[#e5e7eb] px-4 pt-4">
          <button
            type="button"
            className={`flex w-full items-center justify-start gap-3 text-left text-sm font-medium ${
              isOwner ? 'text-[#ef4444]' : 'text-[#ef4444]'
            }`}
            onClick={() => {
              if (isOwner) {
                setShowDeleteGroupDrawer(true);
              } else {
                setShowLeaveGroupDrawer(true);
              }
            }}
          >
            {isOwner ? (
              <Trash2 className="size-5" />
            ) : (
              <LogOut className="size-5" />
            )}
            {isOwner ? 'Eliminar grupo' : 'Salir del grupo'}
          </button>
        </div>

        {shareMessage ? (
          <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
            {shareMessage}
          </div>
        ) : null}
      </div>

      <Drawer open={showQrDrawer} onOpenChange={setShowQrDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Escanea el código QR</DrawerTitle>
            <DrawerDescription>
              Invita a tus compañeros de grupo a escanear el código para unirse
              al grupo.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 px-5 pb-10">
            {groupQrCode ? (
              <div className="mx-auto w-fit rounded-[24px] border border-[#e5e7eb] bg-white p-3">
                <img
                  src={groupQrCode}
                  alt={`Código QR para unirse a ${group.name}`}
                  className="size-72 bg-white object-contain"
                />
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#64748b]">
                Generando QR...
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={showShareDrawer} onOpenChange={setShowShareDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Invita a tus compañeros de Grupo</DrawerTitle>
            <DrawerDescription>
              Comienza a gestionar los gastos compartidos del Grupo
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 px-5 pb-8">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 rounded-[24px] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
                <p className="truncate text-sm text-[#132238]">{inviteLink}</p>
              </div>

              <Button
                type="button"
                variant="outline"
                className={`size-14 shrink-0 rounded-full transition-all duration-200 ${
                  isLinkCopied
                    ? 'scale-105 border-[#fb7185] bg-[#fff1f2] text-[#fb7185]'
                    : ''
                }`}
                onClick={async () => {
                  await copyText(inviteLink, 'Enlace');
                }}
              >
                {isLinkCopied ? (
                  <span className="text-xs font-semibold">OK</span>
                ) : (
                  <Copy className="size-5" />
                )}
              </Button>
            </div>

            <Button
              type="button"
              className="h-11 w-full rounded-full bg-[#ff4d6a] text-white hover:bg-[#ff4d6a]/90"
              onClick={async () => {
                await shareInvite();
              }}
            >
              <Share2 className="mr-2 size-4" />
              Compartir enlace
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showDeleteGroupDrawer}
        onOpenChange={setShowDeleteGroupDrawer}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Eliminar grupo</DrawerTitle>
            <DrawerDescription>
              Esta acción eliminará el grupo, los gastos y toda la información
              del Grupo para todos los participantes. Esta acción no se puede
              deshacer.
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter className="flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-full"
              onClick={() => setShowDeleteGroupDrawer(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-full bg-primary text-white hover:bg-primary/90"
              onClick={handleConfirmDeleteGroup}
              disabled={deleteGroupMutation.isPending}
            >
              {deleteGroupMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showLeaveGroupDrawer}
        onOpenChange={setShowLeaveGroupDrawer}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Salir del grupo</DrawerTitle>
            <DrawerDescription>
              Dejarás de tener acceso a los gastos, balances y actividad de este
              Grupo y el grupo se eliminará de tu cuenta.
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter className="flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-full"
              onClick={() => setShowLeaveGroupDrawer(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-full bg-primary text-white hover:bg-primary/90"
              onClick={handleLeaveGroup}
              disabled={unlinkMemberMutation.isPending}
            >
              {unlinkMemberMutation.isPending ? 'Saliendo...' : 'Sí, salir'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </MobilePageLayout>
  );
}
