import type { Prisma } from '#/generated/prisma/client';
import { readAdvancedDetails, readSharedSplit } from './expense-metadata';
import { normalizeAmount, readSplitMethod } from './helpers';

export const groupExportSelect = {
  id: true,
  name: true,
  type: true,
  description: true,
  inviteCode: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { name: true, email: true } },
  GroupMember: {
    select: {
      name: true,
      role: true,
      user: { select: { email: true } },
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
      category: { select: { name: true } },
      paidBy: { select: { name: true } },
      payers: {
        select: { amount: true, member: { select: { name: true } } },
        orderBy: [{ id: 'asc' }],
      },
      participants: {
        select: { share: true, member: { select: { name: true } } },
        orderBy: [{ id: 'asc' }],
      },
    },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.GroupSelect;

export type GroupExportRow = Prisma.GroupGetPayload<{
  select: typeof groupExportSelect;
}>;

const HEADERS = [
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

export const buildGroupCsv = (group: GroupExportRow) => {
  const membersLabel = group.GroupMember.map(
    (member) =>
      `${member.name} (${member.role})${member.user?.email ? ` <${member.user.email}>` : ''}`,
  ).join(' | ');

  const rows = group.Expense.map((expense) => {
    const sharedSplit = readSharedSplit(expense.metadata);
    const advanced = readAdvancedDetails(expense.metadata);
    return [
      group.id,
      group.name,
      group.type,
      group.description ?? '',
      group.inviteCode,
      group.createdAt,
      group.updatedAt,
      group.owner.name,
      group.owner.email,
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
      expense.payers
        .map(
          (payer) => `${payer.member.name}: ${normalizeAmount(payer.amount)}`,
        )
        .join(' | '),
      expense.participants.length,
      expense.participants
        .map((participant) => participant.member.name)
        .join(' | '),
      expense.participants
        .map(
          (participant) =>
            `${participant.member.name}: ${normalizeAmount(participant.share)}`,
        )
        .join(' | '),
      readSplitMethod(expense.metadata, expense.participants),
      sharedSplit?.amount ?? '',
      sharedSplit?.splitMethod ?? '',
      expense.attachment ?? '',
      expense.notes ?? '',
      expense.deletedAt,
      advanced?.type ?? '',
      advanced?.placeName ?? '',
      advanced?.address ?? '',
      advanced?.contactName ?? '',
      advanced?.phone ?? '',
      advanced?.email ?? '',
      advanced?.bookingCode ?? '',
      advanced?.reservationTime ?? '',
      advanced?.websiteUrl ?? '',
      advanced?.notes ?? '',
      expense.metadata ?? '',
    ];
  });

  return {
    content: `﻿${[HEADERS, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')}`,
    fileName: `${slugify(group.name) || 'grupo'}-export.csv`,
  };
};

const escapeCsv = (value: unknown) => {
  const text =
    value === null || value === undefined
      ? ''
      : value instanceof Date
        ? value.toISOString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 80);
