import {
  CopyIcon,
  Share02Icon,
  UserAdd01Icon,
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
import { copyText, shareOrCopy } from '#/lib/native-share';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';

type CreatedGroup = { id: string; name: string; inviteCode: string };

export function GroupCreatedDrawer({
  open,
  onOpenChange,
  group,
  imageDataUrl,
  inviteLink,
  isLinkCopied,
  onLinkCopied,
  onGoToGroup,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: CreatedGroup | null;
  imageDataUrl: string | undefined;
  inviteLink: string;
  isLinkCopied: boolean;
  onLinkCopied: () => void;
  onGoToGroup: (groupId: string) => void;
}) {
  const t = getGroupDetailMessages();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-[calc(var(--safe-bottom)+0.75rem)]">
        <DrawerHeader className="px-4 pt-3">
          <DrawerTitle className="text-[1.75rem] leading-[1.05] tracking-tight">
            {t.participants.createdTitle(
              group?.name ?? t.participants.createdGroupFallback,
            )}
          </DrawerTitle>
          <DrawerDescription className="text-sm leading-6">
            {t.participants.createdCopy}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 pb-4">
          <div className="flex justify-center pt-1">
            <div className="relative h-20 w-28">
              <div className="absolute right-1 top-1 size-[3.75rem] rounded-[24px] bg-primary" />
              <div className="absolute left-2 top-2 size-[4rem] overflow-hidden rounded-[22px] border-[3px] border-white bg-[#f8fafc] shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
                {imageDataUrl ? (
                  <img
                    src={imageDataUrl}
                    alt={group?.name ?? t.participants.createdGroupAlt}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#fff4f7] text-primary">
                    <HugeiconsIcon icon={UserAdd01Icon} className="size-6" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[1rem] font-semibold text-[#0f172a]">
              {t.participants.shareCreatedTitle}
            </p>

            <div className="mt-2 flex items-center gap-3">
              <input
                readOnly
                value={inviteLink}
                className="h-11 min-w-0 flex-1 rounded-full border border-[#e2e8f0] bg-[#fafafa] px-4 text-sm text-[#334155] outline-none"
              />

              <Button
                type="button"
                variant="outline"
                className={`h-11 shrink-0 rounded-full px-4 transition-all ${
                  isLinkCopied
                    ? 'scale-105 border-primary bg-primary/10 text-primary'
                    : ''
                }`}
                onClick={async () => {
                  await copyText(inviteLink);
                  onLinkCopied();
                }}
              >
                <HugeiconsIcon
                  icon={CopyIcon}
                  className={`size-4 transition-transform ${
                    isLinkCopied ? 'scale-110' : ''
                  }`}
                />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="mt-2 h-11 w-full rounded-full border border-[#e2e8f0] text-[#334155]"
              onClick={async () => {
                await shareOrCopy({
                  title: group?.name ?? t.participants.createdGroupFallback,
                  text: t.participants.shareCreatedText(
                    group?.name ?? t.participants.shareFallbackName,
                  ),
                  url: inviteLink,
                });
              }}
            >
              <HugeiconsIcon icon={Share02Icon} className="mr-2 size-4" />
              {t.participants.shareLink}
            </Button>
          </div>

          <div className="rounded-[24px] bg-white p-4">
            <p className="text-base font-semibold text-[#0f172a]">
              {t.participants.nextStepsTitle}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#334155]">
              <li>
                <span className="font-semibold text-[#0f172a]">
                  {t.participants.inviteStrong}
                </span>{' '}
                {t.participants.inviteMore}
              </li>
              <li>
                {t.participants.startRegister}{' '}
                <span className="font-semibold text-[#0f172a]">
                  {t.participants.registerExpensesStrong}
                </span>{' '}
                {t.participants.sharedExpensesSuffix}
              </li>
              <li>
                <span className="font-semibold text-[#0f172a]">
                  {t.participants.reviewBalancesStrong}
                </span>{' '}
                {t.participants.realTimeSuffix}
              </li>
            </ul>
          </div>

          <Button
            type="button"
            className="h-12 w-full rounded-full bg-primary text-base font-medium text-white"
            onClick={() => {
              if (!group) return;
              onGoToGroup(group.id);
            }}
            disabled={!group}
          >
            {t.participants.goToGroup}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
