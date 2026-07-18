import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  BarChart3,
  FolderKanban,
  MessageSquareWarning,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { adminClient } from '#/api/admin';

import { Button } from '#/components/ui/button';
import { useAuth } from '#/contexts/auth/use-auth';
import { getProfileMessages } from '#/routes/_authed/profile/-messages';

type AdminStatsResponse = {
  totalUsers: number;
  totalGroups: number;
};

const ALLOWED_EMAIL = 'junior110120@gmail.com';

export const Route = createFileRoute('/_authed/profile/stats/')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const auth = useAuth();
  const t = getProfileMessages();
  const loading = auth.loading;
  const email = auth.user?.email?.trim().toLowerCase() ?? '';
  const isAllowed = email === ALLOWED_EMAIL;

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    enabled: isAllowed,
    queryFn: async () => {
      const response = await adminClient.stats.$get();

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? t.statsPage.loadMetricsFailed);
      }

      return (await response.json()) as AdminStatsResponse;
    },
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafafa] px-4 pt-6 text-foreground">
        <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col justify-center">
          <div className="animate-pulse rounded-[28px] border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="size-12 rounded-2xl bg-[#e2e8f0]" />
            <div className="mt-4 h-8 w-36 rounded-full bg-[#e2e8f0]" />
            <div className="mt-3 h-4 w-56 rounded-full bg-[#e2e8f0]" />
          </div>
        </div>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-[#fafafa] px-4 pt-6 text-foreground">
        <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col justify-center">
          <div className="rounded-[28px] border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BarChart3 className="size-5" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold leading-8 text-[#0f172a]">
              {t.statsPage.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              {t.statsPage.noAccess}
            </p>

            <Button
              type="button"
              className="mt-5 h-12 w-full rounded-full"
              onClick={() => navigate({ to: '/profile' })}
            >
              <ArrowLeft className="mr-2 size-4" />
              {t.statsPage.backToProfile}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] px-4 pt-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#94a3b8]">
              {t.statsPage.admin}
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-9 text-[#0f172a]">
              {t.statsPage.title}
            </h1>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-full bg-white"
            onClick={() => navigate({ to: '/profile' })}
            aria-label={t.statsPage.backAria}
          >
            <ArrowLeft className="size-4" />
          </Button>
        </header>

        <section className="mt-5 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <p className="text-sm leading-6 text-[#64748b]">
            {t.statsPage.summaryCopy}
          </p>

          {statsQuery.isLoading ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatSkeleton />
              <StatSkeleton />
            </div>
          ) : statsQuery.error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {statsQuery.error instanceof Error
                ? statsQuery.error.message
                : t.statsPage.loadMetricsFailed}
            </div>
          ) : statsQuery.data ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard
                icon={<Users className="size-5" />}
                label={t.statsPage.users}
                value={formatNumber(statsQuery.data.totalUsers)}
              />
              <StatCard
                icon={<FolderKanban className="size-5" />}
                label={t.statsPage.groups}
                value={formatNumber(statsQuery.data.totalGroups)}
              />
            </div>
          ) : null}
        </section>

        <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-[#0f172a]">
                {t.statsPage.feedback}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#64748b]">
                {t.statsPage.feedbackCopy}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquareWarning className="size-5" />
            </div>
          </div>

          <Button
            type="button"
            className="mt-4 h-12 w-full rounded-full"
            onClick={() => navigate({ to: '/profile/stats/feedback' })}
          >
            {t.statsPage.openFeedbackInbox}
          </Button>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold leading-9 text-[#0f172a]">
        {value}
      </p>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
      <div className="size-10 rounded-2xl bg-[#e2e8f0]" />
      <div className="mt-4 h-3 w-16 rounded-full bg-[#e2e8f0]" />
      <div className="mt-2 h-8 w-24 rounded-full bg-[#e2e8f0]" />
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-CO').format(value);
}
