import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup } from 'effect/http-api';
import { literalsWithFallback } from '../../schema.ts';
import { SessionAuth } from '../auth/contract.ts';

const Member = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  image: Schema.NullOr(Schema.String),
});

export const HomeParticipantBalance = Schema.Struct({
  memberId: Schema.String,
  memberName: Schema.String,
  currency: Schema.String,
  amount: Schema.Number,
  direction: literalsWithFallback(['theyOweYou', 'youOweThem'], 'unknown'),
  label: Schema.String,
});

export const HomeGroupSummary = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.String,
  description: Schema.NullOr(Schema.String),
  imageUrl: Schema.NullOr(Schema.String),
  createdAt: Schema.Date,
  members: Schema.Array(Member),
  currentUser: Schema.NullOr(
    Schema.Struct({
      memberId: Schema.String,
      name: Schema.String,
      image: Schema.NullOr(Schema.String),
    }),
  ),
  hasExpenses: Schema.Boolean,
  participantBalances: Schema.Array(HomeParticipantBalance),
  totalsByCurrency: Schema.Record(Schema.String, Schema.Number),
});

export const HomeGoalSummary = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  currency: Schema.String,
  targetAmount: Schema.Number,
  savedAmount: Schema.Number,
  progress: Schema.Number,
  endDate: Schema.Date,
  createdAt: Schema.Date,
  group: Schema.Struct({ id: Schema.String, name: Schema.String }),
});

export const HomeDebtSummary = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  counterpartyName: Schema.String,
  direction: literalsWithFallback(['lent', 'borrowed'], 'unknown'),
  currency: Schema.String,
  expectedTotal: Schema.Number,
  paidAmount: Schema.Number,
  remainingAmount: Schema.Number,
  status: literalsWithFallback(['active', 'paid', 'overdue'], 'unknown'),
  updatedAt: Schema.Date,
});

export const HomeSummary = Schema.Struct({
  groups: Schema.Array(HomeGroupSummary),
  goals: Schema.Array(HomeGoalSummary),
  recentDebts: Schema.Array(HomeDebtSummary),
});

export class HomeApi extends HttpApiGroup.make('home')
  .add(HttpApiEndpoint.get('summary', '/api/home', { success: HomeSummary }))
  .middleware(SessionAuth) {}
