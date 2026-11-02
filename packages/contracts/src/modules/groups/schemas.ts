import { Schema } from 'effect';
import { Page, PageQuery, TrimmedString } from '../../schema.ts';

export const NonEmpty = Schema.String.check(Schema.isMinLength(1));
export const Amount = Schema.Number.check(Schema.isGreaterThan(0));
export const MoneyByCurrency = Schema.Record(Schema.String, Schema.Number);

export const GroupParams = { id: NonEmpty };
export const GroupMemberParams = { id: NonEmpty, memberId: NonEmpty };
export const ExpenseParams = { id: NonEmpty, expenseId: NonEmpty };

export const ImageUpload = Schema.Struct({
  dataUrl: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(15_000_000),
  ),
  fileName: Schema.optionalKey(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200)),
  ),
});

export const GroupFilter = Schema.Literals([
  'all',
  'theyOweYou',
  'youOweThem',
  'noDebt',
]);
export const ListGroupsQuery = Schema.Struct({
  ...PageQuery.fields,
  search: Schema.optionalKey(
    TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
  ),
  filter: Schema.optionalKey(GroupFilter),
});

const GroupType = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(60),
);
const GroupName = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(120),
);
const GroupDescription = Schema.String.check(Schema.isMaxLength(400));

export const CreateGroupPayload = Schema.Struct({
  id: Schema.optionalKey(Schema.String.check(Schema.isUUID())),
  name: GroupName,
  type: GroupType,
  description: Schema.optionalKey(GroupDescription),
  image: Schema.optionalKey(ImageUpload),
  participants: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        name: GroupName,
        userId: Schema.optionalKey(NonEmpty),
      }),
    ).check(Schema.isMaxLength(200)),
  ),
});
export const UpdateGroupPayload = Schema.Struct({
  name: GroupName,
  type: GroupType,
  description: Schema.optionalKey(GroupDescription),
  image: Schema.optionalKey(ImageUpload),
});
export const UpdateGroupSettingsPayload = Schema.Struct({
  advancedExpenseDetailsEnabled: Schema.optionalKey(Schema.Boolean),
});
export const TransferOwnerPayload = Schema.Struct({ memberId: NonEmpty });

export const CreatedGroup = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.String,
  description: Schema.NullOr(Schema.String),
  imageUrl: Schema.NullOr(Schema.String),
  inviteCode: Schema.String,
  createdAt: Schema.String,
});
export const UpdatedGroup = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.String,
  description: Schema.NullOr(Schema.String),
  imageUrl: Schema.NullOr(Schema.String),
  updatedAt: Schema.String,
});
export const UpdatedGroupSettings = Schema.Struct({
  id: Schema.String,
  advancedExpenseDetailsEnabled: Schema.Boolean,
  updatedAt: Schema.String,
});
export const GroupImage = Schema.Struct({
  imageUrl: Schema.NullOr(Schema.String),
});
export const DeletedGroup = Schema.Struct({ id: Schema.String });
export const TransferredOwner = Schema.Struct({
  id: Schema.String,
  ownerId: Schema.String,
  ownerMemberId: Schema.String,
  ownerName: Schema.String,
  updatedAt: Schema.String,
});

const MembershipRef = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.String,
});

export const GroupListItem = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.String,
  description: Schema.NullOr(Schema.String),
  imageUrl: Schema.NullOr(Schema.String),
  inviteCode: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  participantCount: Schema.Int,
  totals: MoneyByCurrency,
  members: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      userId: Schema.NullOr(Schema.String),
      name: Schema.String,
      image: Schema.NullOr(Schema.String),
    }),
  ),
  currentUser: Schema.NullOr(
    Schema.Struct({
      memberId: Schema.String,
      name: Schema.String,
      image: Schema.NullOr(Schema.String),
    }),
  ),
  hasExpenses: Schema.Boolean,
  participantBalances: Schema.Array(
    Schema.Struct({
      memberId: Schema.String,
      memberName: Schema.String,
      currency: Schema.String,
      amount: Schema.Number,
      direction: Schema.Literals(['theyOweYou', 'youOweThem']),
      label: Schema.String,
    }),
  ),
  myMembership: Schema.NullOr(MembershipRef),
});

export const GroupListPage = Page(GroupListItem);

export const GroupCategorySummary = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.NullOr(Schema.String),
  color: Schema.NullOr(Schema.String),
  expenseCount: Schema.Int,
});
const MemberBalance = Schema.Struct({
  memberId: Schema.String,
  name: Schema.String,
  isCurrentUser: Schema.Boolean,
  balances: MoneyByCurrency,
});
export const GroupSummary = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.String,
  description: Schema.NullOr(Schema.String),
  imageUrl: Schema.NullOr(Schema.String),
  inviteCode: Schema.String,
  ownerId: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  advancedExpenseDetailsEnabled: Schema.Boolean,
  totals: MoneyByCurrency,
  participantCount: Schema.Int,
  categories: Schema.Array(GroupCategorySummary),
  members: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      email: Schema.NullOr(Schema.String),
      image: Schema.NullOr(Schema.String),
      role: Schema.String,
      userId: Schema.NullOr(Schema.String),
      isCurrentUser: Schema.Boolean,
      expenseCount: Schema.Int,
    }),
  ),
  memberBalances: Schema.Array(MemberBalance),
  directDebts: Schema.Array(
    Schema.Struct({
      toMemberId: Schema.String,
      toName: Schema.String,
      currency: Schema.String,
      amount: Schema.Number,
    }),
  ),
  directCredits: Schema.Array(
    Schema.Struct({
      fromMemberId: Schema.String,
      fromName: Schema.String,
      currency: Schema.String,
      amount: Schema.Number,
    }),
  ),
  settlementDebts: Schema.Array(
    Schema.Struct({
      fromMemberId: Schema.String,
      fromName: Schema.String,
      toMemberId: Schema.String,
      toName: Schema.String,
      currency: Schema.String,
      amount: Schema.Number,
    }),
  ),
  myMembership: Schema.NullOr(MembershipRef),
  isOwner: Schema.Boolean,
});

const CategoryColor = Schema.String.check(
  Schema.isPattern(/^#[0-9a-fA-F]{6}$/),
);
const CategoryName = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(120),
);
const CategoryIcon = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(32),
);

export const CategoryParams = { id: NonEmpty, categoryId: NonEmpty };
export const CreateCategoryPayload = Schema.Struct({
  name: CategoryName,
  icon: Schema.optionalKey(CategoryIcon),
  color: Schema.optionalKey(CategoryColor),
});
export const UpdateCategoryPayload = Schema.Struct({
  name: Schema.optionalKey(CategoryName),
  icon: Schema.optionalKey(Schema.NullOr(CategoryIcon)),
  color: Schema.optionalKey(Schema.NullOr(CategoryColor)),
}).check(
  Schema.makeFilter((data) =>
    data.name !== undefined ||
    data.icon !== undefined ||
    data.color !== undefined
      ? undefined
      : 'Debes enviar al menos un campo',
  ),
);
export const MoveCategoryExpensesPayload = Schema.Struct({
  targetCategoryId: Schema.optionalKey(Schema.NullOr(NonEmpty)),
});
export const GroupCategory = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.NullOr(Schema.String),
  color: Schema.NullOr(Schema.String),
});
export const DeletedCategory = Schema.Struct({ id: Schema.String });
export const MovedCategoryExpenses = Schema.Struct({
  categoryId: Schema.String,
  targetCategoryId: Schema.NullOr(Schema.String),
  movedExpenseCount: Schema.Int,
});

export const AddMemberPayload = Schema.Struct({
  name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
  linkedUserId: Schema.optionalKey(NonEmpty),
});
export const SearchMembersQuery = Schema.Struct({
  query: TrimmedString.check(Schema.isMinLength(1), Schema.isMaxLength(120)),
});
export const GroupMemberRef = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});
export const MemberSearchResults = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      username: Schema.NullOr(Schema.String),
      email: Schema.String,
      isCurrentUser: Schema.Boolean,
      isAlreadyMember: Schema.Boolean,
    }),
  ),
});
