import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Copy,
  Download,
  LogOut,
  Pencil,
  QrCode,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
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
import { Switch } from '#/components/ui/switch';
import { useAuth } from '#/contexts/auth/use-auth';
import {
  keepGroupFlowState,
  useGroupFlowNavigation,
} from '#/lib/group-flow-navigation';
import {
  useDeleteGroupMutation,
  useExportGroupCsvMutation,
  useUnlinkMemberMutation,
  useUpdateGroupSettingsMutation,
} from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';

export const Route = createFileRoute('/_authed/groups/$id/settings/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const t = getGroupDetailMessages();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { navigateToGroupRoot, returnTo } = useGroupFlowNavigation(id);
  const editFlowState = useMemo(
    () => keepGroupFlowState(returnTo, { groupEditReturn: 'history-back' }),
    [returnTo],
  );
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
  const updateSettingsMutation = useUpdateGroupSettingsMutation(id);
  const exportGroupCsvMutation = useExportGroupCsvMutation(
    id,
    groupQuery.data?.name ?? t.participants.createdGroupFallback,
  );

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
      setShareMessage(t.settings.copyFailed);
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
      setShareMessage(t.settings.shareFailed);
    }
  };

  const goBack = () => {
    void navigateToGroupRoot(true);
  };

  const handleConfirmDeleteGroup = async () => {
    try {
      await deleteGroupMutation.mutateAsync();
      void navigate({ to: '/groups', replace: true });
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : t.settings.deleteFailed,
      );
    }
  };

  const handleLeaveGroup = async () => {
    const memberId = groupQuery.data?.myMembership?.id;

    if (!memberId) {
      setShareMessage(t.settings.leaveFailed);
      return;
    }

    try {
      await unlinkMemberMutation.mutateAsync({ memberId });
      void navigate({ to: '/groups', replace: true });
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : t.settings.leaveFailed,
      );
    }
  };

  const handleExportGroup = async () => {
    try {
      await exportGroupCsvMutation.mutateAsync();
      toast.success(t.settings.exportDownloaded);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.settings.exportFailed,
      );
    }
  };

  if (groupQuery.isLoading) {
    return (
      <MobilePageLayout title={t.settings.title} onBack={goBack}>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[#64748b]">{t.settings.loading}</p>
        </div>
      </MobilePageLayout>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <MobilePageLayout title={t.settings.title} onBack={goBack}>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {groupQuery.error instanceof Error
              ? groupQuery.error.message
              : t.settings.loadError}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={goBack}
          >
            {t.common.back}
          </Button>
        </div>
      </MobilePageLayout>
    );
  }

  const group = groupQuery.data;
  const isOwner = group.isOwner;
  const canManageAdvancedExpenseDetails =
    user?.email?.trim().toLowerCase() === 'junior110120@gmail.com';

  return (
    <MobilePageLayout title={t.settings.title} onBack={goBack}>
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
                {group.type === 'meta'
                  ? t.settings.groupTypeGoal
                  : t.settings.groupTypeTrip}
              </p>
            </div>

            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] text-[#475569]"
              onClick={() =>
                navigate({
                  to: '/groups/$id/edit',
                  params: { id },
                  replace: true,
                  state: editFlowState,
                })
              }
              aria-label={t.settings.editGroupAria}
            >
              <Pencil className="size-4" />
            </button>
          </div>
        </section>

        <section className="-mx-4 mt-6">
          <p className="px-3 pb-1 text-sm text-[#64748b]">
            {t.settings.inviteParticipants}
          </p>

          <button
            type="button"
            className="flex w-full items-center gap-3 px-1 py-2 text-left"
            onClick={() => setShowQrDrawer(true)}
          >
            <span className="flex size-9 items-center justify-center text-[#132238]">
              <QrCode className="size-5" />
            </span>
            <span className="flex-1 text-sm text-[#132238]">
              {t.settings.viewQrCode}
            </span>
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
              {t.settings.shareInvitationLink}
            </span>
          </button>
        </section>

        <section className="-mx-4 mt-2 overflow-x-hidden">
          <p className="px-3 pb-1 text-sm text-[#64748b]">
            {t.settings.otherSettings}
          </p>

          <button
            type="button"
            className="flex w-full items-center gap-3 px-1 py-2 pb-4 text-left"
            onClick={() =>
              navigate({
                to: '/groups/$id/settings/categories',
                params: { id },
              })
            }
          >
            <span className="flex size-9 items-center justify-center text-[#132238]">
              <QrCode className="size-5" />
            </span>
            <span className="flex-1 text-sm text-[#132238]">
              {t.settings.manageCategoriesTitle}
            </span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 px-1 py-2 text-left"
            onClick={() => {
              void handleExportGroup();
            }}
            disabled={exportGroupCsvMutation.isPending}
          >
            <span className="flex size-9 items-center justify-center text-[#132238]">
              <Download className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#132238]">
                {t.settings.exportExcel}
              </p>
              <p className="truncate text-xs text-[#94a3b8]">
                {t.settings.exportExcelCopy}
              </p>
            </div>
            <span className="text-xs text-[#94a3b8]">
              {exportGroupCsvMutation.isPending ? t.settings.exporting : ''}
            </span>
          </button>

          {canManageAdvancedExpenseDetails ? (
            <div className="flex w-full min-w-0 items-center gap-3 overflow-hidden px-1 py-2 text-left">
              <span className="flex size-9 items-center justify-center text-[#132238]">
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[#132238]">
                  {t.settings.advancedExpenseDetails}
                </p>
                <p className="truncate text-xs text-[#94a3b8]">
                  {t.settings.advancedExpenseDetailsCopy}
                </p>
              </div>
              <Switch
                checked={group.advancedExpenseDetailsEnabled}
                disabled={updateSettingsMutation.isPending}
                onCheckedChange={(checked) => {
                  updateSettingsMutation.mutate({
                    advancedExpenseDetailsEnabled: checked,
                  });
                }}
                aria-label={t.settings.enableAdvancedExpenseDetailsAria}
              />
            </div>
          ) : null}
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
            {isOwner ? t.settings.deleteGroupTitle : t.settings.leaveGroupTitle}
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
            <DrawerTitle>{t.settings.scanQrTitle}</DrawerTitle>
            <DrawerDescription>{t.settings.scanQrCopy}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 px-5 pb-10">
            {groupQrCode ? (
              <div className="mx-auto w-fit rounded-[24px] border border-[#e5e7eb] bg-white p-3">
                <img
                  src={groupQrCode}
                  alt={t.settings.qrAlt(group.name)}
                  className="size-72 bg-white object-contain"
                />
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#64748b]">
                {t.settings.generatingQr}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={showShareDrawer} onOpenChange={setShowShareDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.settings.inviteTitle}</DrawerTitle>
            <DrawerDescription>{t.settings.inviteCopy}</DrawerDescription>
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
                  await copyText(inviteLink, t.settings.inviteLinkLabel);
                }}
              >
                {isLinkCopied ? (
                  <span className="text-xs font-semibold">{t.common.ok}</span>
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
              {t.settings.shareLink}
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
            <DrawerTitle>{t.settings.deleteGroupTitle}</DrawerTitle>
            <DrawerDescription>{t.settings.deleteGroupCopy}</DrawerDescription>
          </DrawerHeader>

          <DrawerFooter className="flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-full"
              onClick={() => setShowDeleteGroupDrawer(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-full bg-primary text-white hover:bg-primary/90"
              onClick={handleConfirmDeleteGroup}
              disabled={deleteGroupMutation.isPending}
            >
              {deleteGroupMutation.isPending
                ? t.detail.deleting
                : t.settings.yesDelete}
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
            <DrawerTitle>{t.settings.leaveGroupTitle}</DrawerTitle>
            <DrawerDescription>{t.settings.leaveGroupCopy}</DrawerDescription>
          </DrawerHeader>

          <DrawerFooter className="flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-full"
              onClick={() => setShowLeaveGroupDrawer(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-full bg-primary text-white hover:bg-primary/90"
              onClick={handleLeaveGroup}
              disabled={unlinkMemberMutation.isPending}
            >
              {unlinkMemberMutation.isPending
                ? t.settings.leaving
                : t.settings.yesLeave}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </MobilePageLayout>
  );
}
