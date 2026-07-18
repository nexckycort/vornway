import { db } from '#/infrastructure/database/connection';
import { groupErrors } from './groups.errors';
import {
  buildGroupAccessWhere,
  normalizeAmount,
  readSplitMethod,
} from './helpers';
import type {
  ExportGroupCsvInput,
  ExportGroupCsvResult,
  GroupExpenseAdvancedDetails,
  GroupExpenseSharedSplit,
} from './types';

function escapeCsv(value: unknown) {
  const normalized =
    value === null || value === undefined
      ? ''
      : value instanceof Date
        ? value.toISOString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

  return `"${normalized.replaceAll('"', '""')}"`;
}

function slugifyFileName(value: string) {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 80);
}

function readSharedSplit(metadata: unknown): GroupExpenseSharedSplit | null {
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    !('sharedSplit' in metadata)
  ) {
    return null;
  }

  const sharedSplit = (metadata as { sharedSplit?: unknown }).sharedSplit;
  if (!sharedSplit || typeof sharedSplit !== 'object') return null;

  const candidate = sharedSplit as {
    amount?: unknown;
    splitMethod?: unknown;
    splitValues?: unknown;
    items?: unknown;
  };

  if (
    typeof candidate.amount !== 'number' ||
    (candidate.splitMethod !== 'percentage' &&
      candidate.splitMethod !== 'exact')
  ) {
    return null;
  }

  return {
    amount: normalizeAmount(candidate.amount),
    splitMethod: candidate.splitMethod,
    splitValues:
      candidate.splitValues &&
      typeof candidate.splitValues === 'object' &&
      !Array.isArray(candidate.splitValues)
        ? Object.fromEntries(
            Object.entries(candidate.splitValues).flatMap(([key, value]) =>
              typeof value === 'number' ? [[key, normalizeAmount(value)]] : [],
            ),
          )
        : undefined,
    items: Array.isArray(candidate.items)
      ? candidate.items.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];

          const entry = item as {
            name?: unknown;
            amount?: unknown;
          };

          if (
            typeof entry.name !== 'string' ||
            typeof entry.amount !== 'number' ||
            entry.name.trim().length === 0
          ) {
            return [];
          }

          return [
            {
              name: entry.name.trim(),
              amount: normalizeAmount(entry.amount),
            },
          ];
        })
      : undefined,
  };
}

function readAdvancedDetails(
  metadata: unknown,
): GroupExpenseAdvancedDetails | null {
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    !('advancedDetails' in metadata)
  ) {
    return null;
  }

  const advancedDetails = (metadata as { advancedDetails?: unknown })
    .advancedDetails;
  if (!advancedDetails || typeof advancedDetails !== 'object') return null;

  const candidate = advancedDetails as GroupExpenseAdvancedDetails;
  if (!candidate.type) return null;
  return candidate;
}

export function createGroupExportOperations() {
  return {
    exportGroupCsv: async ({
      userId,
      groupId,
    }: ExportGroupCsvInput): Promise<ExportGroupCsvResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          inviteCode: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              name: true,
              email: true,
            },
          },
          GroupMember: {
            select: {
              id: true,
              name: true,
              role: true,
              joinedAt: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
            orderBy: [{ joinedAt: 'asc' }, { name: 'asc' }],
          },
          Expense: {
            select: {
              id: true,
              description: true,
              amount: true,
              currency: true,
              date: true,
              expenseType: true,
              status: true,
              settlementMethod: true,
              deletedAt: true,
              notes: true,
              attachment: true,
              metadata: true,
              category: {
                select: {
                  name: true,
                },
              },
              paidBy: {
                select: {
                  name: true,
                },
              },
              payers: {
                select: {
                  amount: true,
                  member: {
                    select: {
                      name: true,
                    },
                  },
                },
                orderBy: [{ id: 'asc' }],
              },
              participants: {
                select: {
                  share: true,
                  member: {
                    select: {
                      name: true,
                    },
                  },
                },
                orderBy: [{ id: 'asc' }],
              },
            },
            orderBy: [{ date: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!group) {
        throw groupErrors.notFound();
      }

      const headers = [
        'group_id',
        'group_name',
        'group_type',
        'group_description',
        'invite_code',
        'group_created_at',
        'group_updated_at',
        'group_owner',
        'group_owner_email',
        'member_count',
        'members',
        'expense_id',
        'expense_date',
        'expense_description',
        'expense_status',
        'expense_type',
        'settlement_method',
        'category',
        'currency',
        'amount',
        'paid_by',
        'payer_breakdown',
        'participant_count',
        'participants',
        'participant_breakdown',
        'split_method',
        'shared_split_amount',
        'shared_split_method',
        'attachment_url',
        'notes',
        'deleted_at',
        'advanced_type',
        'place_name',
        'address',
        'contact_name',
        'phone',
        'email',
        'booking_code',
        'reservation_time',
        'website_url',
        'advanced_notes',
        'metadata_json',
      ];

      const membersLabel = group.GroupMember.map((member) => {
        const email = member.user?.email ? ` <${member.user.email}>` : '';
        return `${member.name} (${member.role})${email}`;
      }).join(' | ');

      const rows =
        group.Expense.length === 0
          ? [headers]
          : [
              headers,
              ...group.Expense.map((expense) => {
                const payerBreakdown = expense.payers
                  .map(
                    (payer) =>
                      `${payer.member.name}: ${normalizeAmount(payer.amount)}`,
                  )
                  .join(' | ');
                const participantBreakdown = expense.participants
                  .map(
                    (participant) =>
                      `${participant.member.name}: ${normalizeAmount(participant.share)}`,
                  )
                  .join(' | ');
                const participants = expense.participants
                  .map((participant) => participant.member.name)
                  .join(' | ');
                const splitMethod = readSplitMethod(
                  expense.metadata,
                  expense.participants.map((participant) => ({
                    memberId: participant.member.name,
                    share: participant.share,
                  })),
                );
                const sharedSplit = readSharedSplit(expense.metadata);
                const advancedDetails = readAdvancedDetails(expense.metadata);

                return [
                  group.id,
                  group.name,
                  group.type,
                  group.description ?? '',
                  group.inviteCode,
                  group.createdAt,
                  group.updatedAt,
                  group.owner.name ?? '',
                  group.owner.email ?? '',
                  group.GroupMember.length,
                  membersLabel,
                  expense.id,
                  expense.date,
                  expense.description,
                  expense.status,
                  expense.expenseType,
                  expense.settlementMethod ?? '',
                  expense.category?.name ?? '',
                  expense.currency,
                  normalizeAmount(expense.amount),
                  expense.paidBy.name,
                  payerBreakdown,
                  expense.participants.length,
                  participants,
                  participantBreakdown,
                  splitMethod,
                  sharedSplit?.amount ?? '',
                  sharedSplit?.splitMethod ?? '',
                  expense.attachment ?? '',
                  expense.notes ?? '',
                  expense.deletedAt,
                  advancedDetails?.type ?? '',
                  advancedDetails?.placeName ?? '',
                  advancedDetails?.address ?? '',
                  advancedDetails?.contactName ?? '',
                  advancedDetails?.phone ?? '',
                  advancedDetails?.email ?? '',
                  advancedDetails?.bookingCode ?? '',
                  advancedDetails?.reservationTime ?? '',
                  advancedDetails?.websiteUrl ?? '',
                  advancedDetails?.notes ?? '',
                  expense.metadata ?? '',
                ];
              }),
            ];

      const content = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\n')}`;
      const baseName = slugifyFileName(group.name) || 'grupo';

      return {
        content,
        contentType: 'text/csv; charset=utf-8',
        fileName: `${baseName}-export.csv`,
      };
    },
  };
}
