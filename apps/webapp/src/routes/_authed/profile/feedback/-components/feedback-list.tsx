import { Trash2 } from 'lucide-react';
import { m } from '#/paraglide/messages.js';
import { getProfileMessages } from '#/routes/_authed/profile/-messages';
import type { FeedbackItem, FeedbackStatus } from '../-hooks/use-feedback-page';

type FeedbackListProps = {
  items: FeedbackItem[];
  isLoading: boolean;
  error: unknown;
  emptyCopy: string;
  onRequestDelete: (item: FeedbackItem) => void;
};

export function FeedbackList({
  items,
  isLoading,
  error,
  emptyCopy,
  onRequestDelete,
}: FeedbackListProps) {
  const t = getProfileMessages();

  return (
    <section className="space-y-3">
      <div>
        <p className="text-lg font-semibold text-[#0f172a]">
          {t.feedback.submissions}
        </p>
        <p className="mt-1 text-sm text-[#64748b]">
          {t.feedback.submissionsCopy}
        </p>
      </div>

      {isLoading ? (
        <FeedbackListSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : t.feedback.loadFailed}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#cbd5e1] bg-white px-4 py-5 text-sm text-[#64748b]">
          {emptyCopy}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FeedbackListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[24px] border border-[#e2e8f0] bg-white p-4"
        >
          <div className="h-4 w-32 rounded-full bg-[#e2e8f0]" />
          <div className="mt-3 h-3 w-full rounded-full bg-[#e2e8f0]" />
          <div className="mt-2 h-3 w-2/3 rounded-full bg-[#e2e8f0]" />
        </div>
      ))}
    </div>
  );
}

function FeedbackCard({
  item,
  onRequestDelete,
}: {
  item: FeedbackItem;
  onRequestDelete: (item: FeedbackItem) => void;
}) {
  const t = getProfileMessages();

  return (
    <article className="rounded-[24px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#0f172a]">
            {item.title}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            {item.type === 'BUG'
              ? t.feedback.bugReported
              : t.feedback.featureRequested}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          <button
            type="button"
            onClick={() => onRequestDelete(item)}
            className="flex size-8 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#64748b]"
            aria-label={t.feedback.removeReportAria}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#334155]">
        {item.description}
      </p>

      {item.metadata.attachments?.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {item.metadata.attachments.map((attachment) => (
            <img
              key={attachment.url}
              src={attachment.url}
              alt={item.title}
              className="h-20 w-20 shrink-0 rounded-2xl object-cover"
            />
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-[#94a3b8]">
        {formatDate(item.createdAt)}
      </p>
    </article>
  );
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{
        backgroundColor: meta.background,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  );
}

function getStatusMeta(status: FeedbackStatus) {
  switch (status) {
    case 'IN_REVIEW':
      return {
        label: m['profile.feedback.inReview'](),
        background: '#fef3c7',
        color: '#b45309',
      };
    case 'PLANNED':
      return {
        label: m['profile.feedback.planned'](),
        background: '#dbeafe',
        color: '#1d4ed8',
      };
    case 'DONE':
      return {
        label: m['profile.feedback.done'](),
        background: '#dcfce7',
        color: '#15803d',
      };
    case 'REJECTED':
      return {
        label: 'Descartado',
        background: '#fee2e2',
        color: '#b91c1c',
      };
    default:
      return {
        label: 'Abierto',
        background: '#e2e8f0',
        color: '#475569',
      };
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
