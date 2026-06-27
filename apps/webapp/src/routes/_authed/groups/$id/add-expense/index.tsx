import { createFileRoute } from '@tanstack/react-router';
import {
  CalendarClock,
  Camera,
  Check,
  ChevronDown,
  Link as LinkIcon,
  MapPin,
  Minus,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { Skeleton } from '#/components/ui/skeleton';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import { client } from '#/lib/hc';
import { compressImageFileToDataUrl } from '#/lib/image-compression';
import { enqueueExpenseOffline } from '#/lib/offline-expense-query-collection';
import {
  useCreateCategoryMutation,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from '#/routes/_authed/groups/-hooks/use-group-actions';
import {
  useGroupExpenseQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import {
  CategoryIcon,
  categoryIconOptions,
} from '../-components/category-icon';
import { formatMoney, getInitials } from '../-components/group-detail.utils';
import type { ExpenseAdvancedDetails } from '../-types/group-detail.types';

type SplitMethod = 'equal' | 'percentage' | 'exact';
type AdvancedDetailsType = ExpenseAdvancedDetails['type'];
type ExpenseSharedSplit = {
  amount: number;
  splitMethod: Exclude<SplitMethod, 'equal'>;
  splitValues?: Record<string, number>;
  items?: Array<{
    name: string;
    amount: number;
  }>;
};

type SharedExpenseItem = {
  id: string;
  name: string;
  amount: string;
};

const splitMethods: Array<{ value: SplitMethod; label: string }> = [
  { value: 'equal', label: 'Partes iguales' },
  { value: 'percentage', label: 'Porcentaje' },
  { value: 'exact', label: 'Partes desiguales' },
];

const currencyMeta: Record<
  string,
  { label: string; flag: string; name: string }
> = {
  COP: { label: 'COP', flag: '🇨🇴', name: 'Pesos Colombianos' },
  USD: { label: 'USD', flag: '🇺🇸', name: 'Dólares Estadounidenses' },
  EUR: { label: 'EUR', flag: '🇪🇺', name: 'Euros' },
  GBP: { label: 'GBP', flag: '🇬🇧', name: 'Libra esterlina' },
  MXN: { label: 'MXN', flag: '🇲🇽', name: 'Peso mexicano' },
  BRL: { label: 'BRL', flag: '🇧🇷', name: 'Real brasileño' },
};

const currencyOptions = ['COP', 'EUR', 'USD', 'GBP', 'MXN', 'BRL'] as const;
const advancedDetailsTypeOptions: Array<{
  value: AdvancedDetailsType;
  label: string;
  description: string;
}> = [
  {
    value: 'stay',
    label: 'Estadía',
    description: 'Hotel, Airbnb o alojamiento',
  },
  { value: 'food', label: 'Comida', description: 'Restaurante o reserva' },
  {
    value: 'transport',
    label: 'Transporte',
    description: 'Trayecto, reserva o contacto',
  },
  {
    value: 'activity',
    label: 'Actividad',
    description: 'Tour, evento o entrada',
  },
  { value: 'purchase', label: 'Compra', description: 'Tienda o proveedor' },
  { value: 'other', label: 'Otro', description: 'Información adicional' },
];

const emptyAdvancedDetails: ExpenseAdvancedDetails = {
  type: 'other',
  placeName: '',
  address: '',
  mapUrl: '',
  contactName: '',
  phone: '',
  email: '',
  bookingCode: '',
  reservationTime: '',
  websiteUrl: '',
  notes: '',
};

const resolveMapEndpoint = client.api.maps.resolve.$post;

const customCategoryIconId = 'custom';

const categoryColorOptions = [
  '#ff7fa3',
  '#5bd9cc',
  '#d978f4',
  '#ffa0a0',
  '#ffd741',
  '#62d9aa',
  '#9daef9',
  '#ffc06d',
] as const;

function getCurrencySymbol(currency: string) {
  switch (currency) {
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'BRL':
      return 'R$';
    default:
      return '$';
  }
}

function normalizeCategoryIconInput(value: string) {
  return Array.from(value.trim()).slice(0, 4).join('');
}

function normalizeAdvancedDetails(
  details: ExpenseAdvancedDetails,
): ExpenseAdvancedDetails | null {
  const next: ExpenseAdvancedDetails = {
    type: details.type,
    placeName: details.placeName?.trim() || undefined,
    address: details.address?.trim() || undefined,
    mapUrl: details.mapUrl?.trim() || undefined,
    mapEmbedUrl: details.mapEmbedUrl?.trim() || undefined,
    contactName: details.contactName?.trim() || undefined,
    phone: details.phone?.trim() || undefined,
    email: details.email?.trim() || undefined,
    bookingCode: details.bookingCode?.trim() || undefined,
    reservationTime: details.reservationTime?.trim() || undefined,
    websiteUrl: details.websiteUrl?.trim() || undefined,
    notes: details.notes?.trim() || undefined,
  };

  const hasContent = Object.entries(next).some(
    ([key, value]) => key !== 'type' && Boolean(value),
  );

  return hasContent ? next : null;
}

async function resolveAdvancedDetailsMap(
  details: ExpenseAdvancedDetails,
): Promise<ExpenseAdvancedDetails> {
  if (!details.mapUrl || details.mapEmbedUrl) return details;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return details;

  try {
    const response = await resolveMapEndpoint({
      json: { url: details.mapUrl },
    });

    if (!response.ok) return details;

    const payload = (await response.json()) as {
      embedUrl?: string | null;
    };

    if (!payload.embedUrl) return details;

    return {
      ...details,
      mapEmbedUrl: payload.embedUrl,
    };
  } catch {
    return details;
  }
}

function ParticipantAvatar({
  name,
  image,
  sizeClassName,
}: {
  name: string;
  image: string | null;
  sizeClassName: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizeClassName} rounded-full object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} flex items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600`}
    >
      {getInitials(name)}
    </div>
  );
}

function AddExpenseSkeleton({
  onBack,
  title,
}: {
  onBack: () => void;
  title: string;
}) {
  return (
    <MobilePageLayout title={title} onBack={onBack}>
      <div className="space-y-5 px-2 pb-28">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-14 flex-1 rounded-2xl" />
          </div>
          <Skeleton className="h-5 w-36 rounded-full" />
        </div>

        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </MobilePageLayout>
  );
}

function AdvancedDetailsInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  icon?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <div className="mt-2 flex h-12 items-center gap-2 rounded-full border border-gray-200 px-4 focus-within:border-rose-500">
        {icon ? <span className="shrink-0 text-gray-400">{icon}</span> : null}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>
    </label>
  );
}

export const Route = createFileRoute('/_authed/groups/$id/add-expense/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { expenseId?: string } => ({
    expenseId:
      typeof search.expenseId === 'string' && search.expenseId.length > 0
        ? search.expenseId
        : undefined,
  }),
  component: RouteComponent,
});

function formatEditableNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function createSharedExpenseItem(
  partial?: Partial<Pick<SharedExpenseItem, 'name' | 'amount'>>,
): SharedExpenseItem {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: partial?.name ?? '',
    amount: partial?.amount ?? '',
  };
}

function RouteComponent() {
  const { id } = Route.useParams();
  const { expenseId } = Route.useSearch();
  const isEditMode = Boolean(expenseId);
  const { navigateToGroupRoot } = useGroupFlowNavigation(id);

  const groupQuery = useGroupSummaryQuery(id);
  const expenseQuery = useGroupExpenseQuery(id, expenseId);
  const createCategoryMutation = useCreateCategoryMutation(id);
  const createExpenseMutation = useCreateExpenseMutation(id);
  const updateExpenseMutation = useUpdateExpenseMutation(id, expenseId ?? '');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [sharedExpenseItems, setSharedExpenseItems] = useState<
    SharedExpenseItem[]
  >([]);
  const [currency, setCurrency] = useState('COP');
  const [paidByIds, setPaidByIds] = useState<string[]>([]);
  const [payerValues, setPayerValues] = useState<Record<string, string>>({});
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [showCurrencyDrawer, setShowCurrencyDrawer] = useState(false);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [showAdvancedDetailsDrawer, setShowAdvancedDetailsDrawer] =
    useState(false);
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] =
    useState(false);
  const pendingCreateCategoryDialogRef = useRef(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(
    categoryIconOptions[1].id,
  );
  const [newCategoryCustomIcon, setNewCategoryCustomIcon] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(
    categoryColorOptions[0],
  );
  const [showSplitDrawer, setShowSplitDrawer] = useState(false);
  const [participantValues, setParticipantValues] = useState<
    Record<string, string>
  >({});
  const [advancedDetails, setAdvancedDetails] =
    useState<ExpenseAdvancedDetails>(emptyAdvancedDetails);
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | null>(
    null,
  );
  const attachmentFileNameRef = useRef<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const hasInitializedFormRef = useRef(false);
  const [isAmountAnimating, setIsAmountAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLInputElement | null>(null);
  const customCategoryIconInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const submitLockRef = useRef(false);
  const didMountAmountRef = useRef(false);
  const didInitializePayersRef = useRef(false);

  const members = groupQuery.data?.members ?? [];
  const categories = groupQuery.data?.categories ?? [];
  const expense = expenseQuery.data;
  const currentCurrency = currencyMeta[currency] ?? currencyMeta.COP;
  const selectedCategory = categories.find((item) => item.id === categoryId);
  const advancedDetailsEnabled =
    groupQuery.data?.advancedExpenseDetailsEnabled ?? false;
  const normalizedAdvancedDetails = normalizeAdvancedDetails(advancedDetails);
  const selectedAdvancedDetailsType =
    advancedDetailsTypeOptions.find(
      (option) => option.value === advancedDetails.type,
    ) ?? advancedDetailsTypeOptions[advancedDetailsTypeOptions.length - 1];
  const attachmentPreviewUrl =
    attachmentDataUrl ??
    ((expense as { attachmentUrl?: string | null } | undefined)
      ?.attachmentUrl ||
      null);
  const isCustomCategoryIcon = newCategoryIcon === customCategoryIconId;
  const customCategoryIcon = newCategoryCustomIcon.trim();
  const trimmedNewCategoryName = newCategoryName.trim();
  const restoredPayerValues = useMemo(
    () =>
      expense
        ? Object.fromEntries(
            (expense.paidByMembers.length > 0
              ? expense.paidByMembers
              : [
                  {
                    memberId: expense.paidBy.id,
                    amount: expense.amount,
                  },
                ]
            ).map((payer) => [
              payer.memberId,
              formatEditableNumber(payer.amount),
            ]),
          )
        : null,
    [expense],
  );
  const normalizedSharedExpenseItems = useMemo(
    () =>
      sharedExpenseItems.map((item) => ({
        ...item,
        normalizedAmount: Number(item.amount || 0),
      })),
    [sharedExpenseItems],
  );
  const normalizedSharedAmount = normalizedSharedExpenseItems.reduce(
    (sum, item) =>
      Number.isFinite(item.normalizedAmount) && item.normalizedAmount > 0
        ? sum + item.normalizedAmount
        : sum,
    0,
  );

  useEffect(() => {
    const node = amountInputRef.current;
    if (!node) return;

    const frame = window.requestAnimationFrame(() => {
      node.focus();
      node.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isCustomCategoryIcon) return;

    const frame = window.requestAnimationFrame(() => {
      customCategoryIconInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isCustomCategoryIcon]);

  useEffect(() => {
    void amount;
    void currency;

    if (!didMountAmountRef.current) {
      didMountAmountRef.current = true;
      return;
    }

    setIsAmountAnimating(true);
    const frame = window.requestAnimationFrame(() => {
      setIsAmountAnimating(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [amount, currency]);

  useEffect(() => {
    if (isEditMode) {
      if (!expense) return;

      const sharedSplit =
        (expense as { sharedSplit?: ExpenseSharedSplit | null }).sharedSplit ??
        null;

      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setSharedExpenseItems(
        sharedSplit?.items && sharedSplit.items.length > 0
          ? sharedSplit.items.map((item) =>
              createSharedExpenseItem({
                name: item.name,
                amount: formatEditableNumber(item.amount),
              }),
            )
          : sharedSplit
            ? [
                createSharedExpenseItem({
                  name: '',
                  amount: formatEditableNumber(sharedSplit.amount),
                }),
              ]
            : [],
      );
      setCurrency(expense.currency);
      setCategoryId(expense.category?.id ?? null);
      setPaidByIds(
        expense.paidByMembers.length > 0
          ? expense.paidByMembers.map((payer) => payer.memberId)
          : [expense.paidBy.id],
      );
      setPayerValues(restoredPayerValues ?? {});
      setParticipantIds(
        expense.participants.map((participant) => participant.memberId),
      );
      setSplitMethod(sharedSplit?.splitMethod ?? expense.splitMethod);
      setParticipantValues(
        Object.fromEntries(
          expense.participants.map((participant) => {
            const restoredSplitMethod =
              sharedSplit?.splitMethod ?? expense.splitMethod;
            const restoredValue =
              sharedSplit?.splitValues?.[participant.memberId];
            const sharedShareFallback =
              sharedSplit?.amount && expense.participants.length > 0
                ? sharedSplit.amount / expense.participants.length
                : 0;

            return [
              participant.memberId,
              typeof restoredValue === 'number'
                ? formatEditableNumber(restoredValue)
                : restoredSplitMethod === 'percentage'
                  ? formatEditableNumber(
                      (participant.share / expense.amount) * 100,
                    )
                  : formatEditableNumber(
                      participant.share - sharedShareFallback,
                    ),
            ];
          }),
        ),
      );
      setAdvancedDetails({
        ...emptyAdvancedDetails,
        ...((expense as { advancedDetails?: ExpenseAdvancedDetails | null })
          .advancedDetails ?? {}),
      });
      hasInitializedFormRef.current = true;
      return;
    }

    if (didInitializePayersRef.current || !groupQuery.data) return;

    didInitializePayersRef.current = true;
    setPaidByIds([groupQuery.data.myMembership?.id ?? members[0]?.id ?? '']);
    setParticipantIds(members.map((member) => member.id));
  }, [expense, groupQuery.data, isEditMode, members, restoredPayerValues]);

  useEffect(() => {
    if (splitMethod === 'equal') return;

    setParticipantValues((current) => {
      const next: Record<string, string> = {};
      const selectedCount = participantIds.length;
      const baseAmount = Math.max(
        Number(amount || 0) - normalizedSharedAmount,
        0,
      );
      const defaultValue =
        splitMethod === 'percentage'
          ? selectedCount > 0
            ? 100 / selectedCount
            : 0
          : selectedCount > 0
            ? baseAmount / selectedCount
            : 0;

      for (const participantId of participantIds) {
        next[participantId] =
          current[participantId] ??
          (defaultValue > 0 ? formatEditableNumber(defaultValue) : '');
      }

      return next;
    });
  }, [amount, normalizedSharedAmount, participantIds, splitMethod]);

  const parsedAmount = Number(amount);
  const normalizedAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const selectedCount = participantIds.length;
  const sharedAmountExceedsTotal =
    selectedCount > 0 && normalizedSharedAmount > normalizedAmount;
  const baseAmount = Math.max(normalizedAmount - normalizedSharedAmount, 0);
  const equalShare = selectedCount > 0 ? normalizedAmount / selectedCount : 0;
  const sharedShare =
    selectedCount > 0 ? normalizedSharedAmount / selectedCount : 0;

  useEffect(() => {
    setPayerValues((current) => {
      if (
        isEditMode &&
        restoredPayerValues &&
        Object.keys(current).length === 0
      ) {
        return restoredPayerValues;
      }

      if (paidByIds.length <= 1) {
        return paidByIds[0]
          ? {
              [paidByIds[0]]: formatEditableNumber(normalizedAmount),
            }
          : {};
      }

      const next: Record<string, string> = {};

      for (const payerId of paidByIds) {
        next[payerId] = '';
      }

      return next;
    });
  }, [isEditMode, normalizedAmount, paidByIds, restoredPayerValues]);

  const participantComputedAmounts = useMemo(() => {
    const result: Record<string, number> = {};

    for (const memberId of participantIds) {
      const rawValue = Number(participantValues[memberId] ?? '0');

      if (splitMethod === 'percentage') {
        result[memberId] = baseAmount * (rawValue / 100) + sharedShare;
        continue;
      }

      if (splitMethod === 'exact') {
        result[memberId] = rawValue + sharedShare;
        continue;
      }

      result[memberId] = equalShare;
    }

    return result;
  }, [
    baseAmount,
    equalShare,
    sharedShare,
    participantIds,
    participantValues,
    splitMethod,
  ]);

  const splitSum = useMemo(() => {
    return participantIds.reduce((sum, memberId) => {
      const value = Number(participantValues[memberId] ?? '0');
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [participantIds, participantValues]);

  const splitIsValid =
    selectedCount > 0 &&
    !sharedAmountExceedsTotal &&
    (splitMethod === 'equal'
      ? true
      : splitMethod === 'percentage'
        ? Math.abs(splitSum - 100) < 0.01 &&
          participantIds.every(
            (memberId) => Number(participantValues[memberId] ?? 0) > 0,
          )
        : Math.abs(splitSum + normalizedSharedAmount - normalizedAmount) <
            0.01 &&
          participantIds.every(
            (memberId) => Number(participantValues[memberId] ?? 0) > 0,
          ));

  const payerSum = useMemo(() => {
    return paidByIds.reduce((sum, memberId) => {
      const value = Number(payerValues[memberId] ?? '0');
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [paidByIds, payerValues]);

  const payerSplitIsValid =
    paidByIds.length <= 1 ||
    (Math.abs(payerSum - normalizedAmount) < 0.01 &&
      paidByIds.every((memberId) => Number(payerValues[memberId] ?? 0) > 0));
  const sharedExpenseItemsAreValid = normalizedSharedExpenseItems.every(
    (item) => item.name.trim().length > 0 && item.normalizedAmount > 0,
  );

  const canSubmit =
    description.trim().length > 0 &&
    normalizedAmount > 0 &&
    paidByIds.length > 0 &&
    selectedCount > 0 &&
    sharedExpenseItemsAreValid &&
    splitIsValid &&
    payerSplitIsValid;
  const showDescriptionError =
    hasTriedSubmit && description.trim().length === 0;
  const showParticipantsError = hasTriedSubmit && selectedCount === 0;
  const showSharedExpenseItemsError =
    hasTriedSubmit &&
    sharedExpenseItems.length > 0 &&
    !sharedExpenseItemsAreValid;

  const isPending = isEditMode
    ? updateExpenseMutation.isPending
    : createExpenseMutation.isPending;
  const isSubmitLocked = isPending || isSubmitting;
  const isLoading =
    groupQuery.isLoading || (isEditMode && expenseQuery.isLoading);
  const isLoadingError =
    groupQuery.isError || (isEditMode && expenseQuery.isError);

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const togglePayer = (memberId: string) => {
    setPaidByIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const toggleAllParticipants = () => {
    setParticipantIds((current) =>
      current.length === members.length
        ? []
        : members.map((member) => member.id),
    );
  };

  const setMethod = (nextMethod: SplitMethod) => {
    setSplitMethod(nextMethod);
    if (nextMethod === 'equal') {
      setParticipantValues({});
      setSharedExpenseItems([]);
    }
    setShowSplitDrawer(false);
  };

  const addSharedExpenseItem = () => {
    setSharedExpenseItems((current) => [...current, createSharedExpenseItem()]);
  };

  const updateSharedExpenseItem = (
    itemId: string,
    patch: Partial<Pick<SharedExpenseItem, 'name' | 'amount'>>,
  ) => {
    setSharedExpenseItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };

  const removeSharedExpenseItem = (itemId: string) => {
    setSharedExpenseItems((current) =>
      current.filter((item) => item.id !== itemId),
    );
  };

  const setCurrencyAndClose = (nextCurrency: string) => {
    setCurrency(nextCurrency);
    setShowCurrencyDrawer(false);
  };

  const openCreateCategoryDialog = () => {
    pendingCreateCategoryDialogRef.current = true;
    setShowCategoryDrawer(false);
  };

  useEffect(() => {
    if (showCategoryDrawer || !pendingCreateCategoryDialogRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      setShowCreateCategoryDialog(true);
      pendingCreateCategoryDialogRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [showCategoryDrawer]);

  const handleCreateCategory = async () => {
    if (!trimmedNewCategoryName || createCategoryMutation.isPending) return;

    try {
      const created = await createCategoryMutation.mutateAsync({
        name: trimmedNewCategoryName,
        icon: isCustomCategoryIcon
          ? customCategoryIcon || undefined
          : newCategoryIcon,
        color: newCategoryColor,
      });
      setCategoryId(created.id);
      setNewCategoryName('');
      setNewCategoryIcon(categoryIconOptions[1].id);
      setNewCategoryCustomIcon('');
      setNewCategoryColor(categoryColorOptions[0]);
      setShowCreateCategoryDialog(false);
      setShowCategoryDrawer(false);
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : 'No se pudo crear la categoría',
      );
    }
  };

  const handleAttachmentSelect = async (file: File | null) => {
    if (!file) return;

    setAttachmentError(null);

    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setAttachmentDataUrl(dataUrl);
      attachmentFileNameRef.current = file.name;
    } catch (selectionError) {
      setAttachmentDataUrl(null);
      attachmentFileNameRef.current = null;
      setAttachmentError(
        selectionError instanceof Error
          ? selectionError.message
          : 'No se pudo procesar la imagen',
      );
    } finally {
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    }
  };

  const clearAttachmentSelection = () => {
    setAttachmentDataUrl(null);
    attachmentFileNameRef.current = null;
    setAttachmentError(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (submitLockRef.current) return;

    setHasTriedSubmit(true);

    if (!canSubmit) {
      if (description.trim().length === 0) {
        descriptionInputRef.current?.focus();
      }
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const exactShares =
        selectedCount === 0 || splitMethod === 'equal'
          ? undefined
          : Object.fromEntries(
              participantIds.map((memberId) => [
                memberId,
                normalizedSharedAmount > 0
                  ? (participantComputedAmounts[memberId] ?? 0)
                  : Number(participantValues[memberId] ?? '0'),
              ]),
            );
      const payloadSplitMethod =
        selectedCount > 0 &&
        normalizedSharedAmount > 0 &&
        splitMethod !== 'equal'
          ? 'exact'
          : splitMethod;
      const sharedSplit =
        sharedExpenseItems.length > 0 &&
        normalizedSharedAmount > 0 &&
        splitMethod !== 'equal'
          ? {
              amount: normalizedSharedAmount,
              splitMethod,
              splitValues: Object.fromEntries(
                participantIds.map((memberId) => [
                  memberId,
                  Number(participantValues[memberId] ?? '0'),
                ]),
              ),
              items: normalizedSharedExpenseItems
                .filter(
                  (item) =>
                    item.name.trim().length > 0 && item.normalizedAmount > 0,
                )
                .map((item) => ({
                  name: item.name.trim(),
                  amount: item.normalizedAmount,
                })),
            }
          : undefined;

      const advancedDetailsPayload =
        advancedDetailsEnabled && normalizedAdvancedDetails
          ? await resolveAdvancedDetailsMap(normalizedAdvancedDetails)
          : null;

      const payload = {
        payers:
          paidByIds.length > 1
            ? paidByIds.map((memberId) => ({
                memberId,
                amount: Number(payerValues[memberId] ?? '0'),
              }))
            : undefined,
        description: description.trim(),
        amount: normalizedAmount,
        currency,
        ...(categoryId ? { categoryId } : {}),
        paidByIds,
        participantIds,
        splitMethod: payloadSplitMethod,
        exactShares,
        sharedSplit,
        ...(advancedDetailsEnabled && attachmentDataUrl
          ? {
              attachmentImage: {
                dataUrl: attachmentDataUrl,
                ...(attachmentFileNameRef.current
                  ? { fileName: attachmentFileNameRef.current }
                  : {}),
              },
            }
          : {}),
        ...(advancedDetailsEnabled && normalizedAdvancedDetails
          ? {
              advancedDetails:
                advancedDetailsPayload ?? normalizedAdvancedDetails,
            }
          : {}),
      };

      if (isEditMode && expenseId) {
        await updateExpenseMutation.mutateAsync(payload);
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueExpenseOffline(id, payload);
      } else {
        await createExpenseMutation.mutateAsync(payload);
      }

      void navigateToGroupRoot(true);
    } catch (submitError) {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEditMode
            ? 'No se pudo actualizar el gasto'
            : 'No se pudo crear el gasto',
      );
    }
  };

  if (isLoading) {
    return (
      <AddExpenseSkeleton
        title={isEditMode ? 'Editar gasto' : 'Nuevo gasto'}
        onBack={() => navigateToGroupRoot(true)}
      />
    );
  }

  if (isLoadingError || !groupQuery.data) {
    const message =
      groupQuery.error instanceof Error
        ? groupQuery.error.message
        : isEditMode && expenseQuery.error instanceof Error
          ? expenseQuery.error.message
          : 'No se pudo cargar el grupo';

    return (
      <MobilePageLayout
        title={isEditMode ? 'Editar gasto' : 'Nuevo gasto'}
        onBack={() => navigateToGroupRoot(true)}
      >
        <div className="flex flex-1 flex-col justify-center bg-white px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
          <button
            type="button"
            onClick={() => navigateToGroupRoot(true)}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Volver al grupo
          </button>
        </div>
      </MobilePageLayout>
    );
  }

  return (
    <MobilePageLayout
      title={isEditMode ? 'Editar gasto' : 'Nuevo gasto'}
      onBack={() => navigateToGroupRoot(true)}
    >
      <div className="px-2 pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <button
            type="button"
            onClick={() => setShowCurrencyDrawer(true)}
            className="flex items-center gap-1 text-left"
          >
            <span className="text-4xl font-light text-gray-900">
              {currentCurrency.label}
            </span>
            <ChevronDown className="size-5 text-gray-600" />
          </button>

          <label className="min-w-0 flex-1 text-right">
            <span className="sr-only">Monto</span>
            <div className="relative flex min-h-14 w-full items-end justify-end">
              <div
                aria-hidden="true"
                className={`pointer-events-none inline-flex origin-right items-baseline justify-end gap-1 text-4xl font-light leading-none text-gray-900 transition-transform duration-150 ease-out ${
                  isAmountAnimating ? 'scale-[1.02]' : 'scale-100'
                }`}
              >
                <span className="shrink-0">{getCurrencySymbol(currency)}</span>
                <span className="tabular-nums">
                  {amount.length > 0 ? amount : '0'}
                </span>
              </div>

              <input
                ref={amountInputRef}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                aria-label="Monto"
                className="absolute inset-0 h-full w-full bg-transparent text-right text-[16px] leading-none tabular-nums text-transparent outline-none caret-gray-900 [font-size:16px]"
              />
            </div>
          </label>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-base">{currentCurrency.flag}</span>
          <span className="text-sm text-gray-500">{currentCurrency.name}</span>
        </div>
      </div>

      <div className="space-y-5 px-2 pb-22">
        <label
          className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 ${
            showDescriptionError ? 'border-red-300' : 'border-gray-200'
          }`}
        >
          <input
            ref={descriptionInputRef}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Cena con amigos"
            aria-invalid={showDescriptionError}
            className={`w-full bg-transparent outline-none placeholder:text-gray-400 ${
              showDescriptionError ? 'text-red-700' : 'text-gray-700'
            }`}
          />
        </label>

        {showDescriptionError ? (
          <p className="-mt-3 px-4 text-xs font-medium text-red-600">
            Agrega un nombre al gasto
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setShowCategoryDrawer(true)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3.5 text-left"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `${selectedCategory?.color ?? '#f43f5e'}18`,
                color: selectedCategory?.color ?? '#f43f5e',
              }}
            >
              <CategoryIcon
                icon={selectedCategory?.icon}
                color={selectedCategory?.color}
                fallback={<Plus className="size-4" />}
              />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Categoría</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedCategory?.name ?? 'Sin categoría'}
              </p>
            </div>
          </div>
          <ChevronDown className="size-4 text-gray-400" />
        </button>

        {advancedDetailsEnabled ? (
          <button
            type="button"
            onClick={() => setShowAdvancedDetailsDrawer(true)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3.5 text-left"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <MapPin className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Detalles del lugar</p>
                <p className="truncate text-sm font-medium text-gray-900">
                  {normalizedAdvancedDetails?.placeName ??
                    selectedAdvancedDetailsType.label}
                </p>
              </div>
            </div>
            <ChevronDown className="size-4 text-gray-400" />
          </button>
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">Pagado por</p>
            <span className="text-xs text-gray-400">
              {paidByIds.length} seleccionada{paidByIds.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {members.map((member) => {
              const selected = paidByIds.includes(member.id);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => togglePayer(member.id)}
                  className="flex min-w-[72px] flex-col items-center"
                >
                  <div
                    className={`flex size-11 items-center justify-center overflow-hidden rounded-full border-2 ${
                      selected ? 'border-rose-500' : 'border-transparent'
                    }`}
                  >
                    <ParticipantAvatar
                      name={member.name}
                      image={member.image}
                      sizeClassName="size-full"
                    />
                  </div>
                  <span
                    className={`mt-1 inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-semibold ${
                      selected
                        ? 'border-rose-500 bg-rose-500 text-white'
                        : 'border-gray-300 bg-white text-transparent'
                    }`}
                  >
                    {selected ? <Check className="size-2.5" /> : '•'}
                  </span>
                  <span className="mt-1.5 max-w-[60px] truncate text-xs text-gray-600">
                    {member.isCurrentUser ? 'Tú' : member.name}
                  </span>
                </button>
              );
            })}
          </div>

          {paidByIds.length > 1 ? (
            <div className="mt-4 rounded-[28px] border border-gray-200 px-3 py-2">
              <div className="space-y-1">
                {paidByIds.map((payerId) => {
                  const payer = members.find((member) => member.id === payerId);
                  if (!payer) return null;

                  return (
                    <label
                      key={payerId}
                      className="flex items-center gap-3 px-1 py-1"
                    >
                      <ParticipantAvatar
                        name={payer.name}
                        image={payer.image}
                        sizeClassName="size-9 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <input
                          value={payerValues[payerId] ?? ''}
                          onChange={(event) =>
                            setPayerValues((current) => ({
                              ...current,
                              [payerId]: event.target.value,
                            }))
                          }
                          inputMode="decimal"
                          placeholder="Total pagado"
                          className="h-11 w-full rounded-full border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-rose-500"
                        />
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-1 text-xs">
                <span
                  className={
                    payerSplitIsValid ? 'text-gray-400' : 'text-red-500'
                  }
                >
                  {payerSplitIsValid
                    ? 'La suma de pagadores coincide con el total'
                    : 'La suma de pagadores debe ser igual al total'}
                </span>
                <span
                  className={
                    payerSplitIsValid ? 'text-gray-500' : 'text-red-500'
                  }
                >
                  {formatMoney(currency, payerSum)}
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">Se divide con</p>
            <button
              type="button"
              onClick={() => setShowSplitDrawer(true)}
              className="inline-flex items-center gap-1 text-rose-500"
            >
              <span className="text-sm font-medium">
                {splitMethods.find((item) => item.value === splitMethod)?.label}
              </span>
              <ChevronDown className="size-4" />
            </button>
          </div>

          {showParticipantsError ? (
            <p className="mb-3 text-xs font-medium text-red-600">
              Debes elegir al menos una persona con quien dividir el gasto
            </p>
          ) : null}

          <button
            type="button"
            onClick={toggleAllParticipants}
            className="mt-4 flex w-full items-center gap-3"
          >
            <div className="flex size-6 items-center justify-center rounded bg-rose-500">
              {selectedCount === members.length && members.length > 0 ? (
                <Minus className="size-4 text-white" />
              ) : (
                <Plus className="size-4 text-white" />
              )}
            </div>
            <span className="text-sm font-medium text-gray-900">Todos</span>
            <span className="ml-auto text-sm text-gray-500">
              {splitMethod === 'equal'
                ? formatMoney(currency, equalShare || 0)
                : splitMethod === 'percentage'
                  ? `${splitSum.toFixed(2)}% · +${formatMoney(currency, normalizedSharedAmount)}`
                  : formatMoney(
                      currency,
                      splitSum + normalizedSharedAmount || 0,
                    )}
            </span>
          </button>

          {splitMethod !== 'equal' ? (
            <div className="mt-4 rounded-2xl border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={addSharedExpenseItem}
                  className="flex size-6 shrink-0 items-center justify-center rounded bg-rose-500"
                  aria-label="Agregar gasto compartido"
                >
                  <Plus className="size-4 text-white" />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Gasto compartido
                  </p>
                  <p className="text-xs text-gray-500">
                    Servicio, propina o algo para todos
                  </p>
                </div>
              </div>

              {sharedExpenseItems.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {sharedExpenseItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[minmax(0,1fr)_7rem_2.5rem] items-center gap-2"
                    >
                      <input
                        value={item.name}
                        onChange={(event) =>
                          updateSharedExpenseItem(item.id, {
                            name: event.target.value,
                          })
                        }
                        placeholder="Nombre del gasto compartido"
                        className="h-11 rounded-full border border-gray-200 px-4 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                      <input
                        value={item.amount}
                        onChange={(event) =>
                          updateSharedExpenseItem(item.id, {
                            amount: event.target.value,
                          })
                        }
                        inputMode="decimal"
                        placeholder="0"
                        className="h-11 rounded-full border border-gray-200 px-4 text-right text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeSharedExpenseItem(item.id)}
                        className="flex size-10 items-center justify-center rounded-full border border-gray-200 text-gray-500"
                        aria-label="Eliminar gasto compartido"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {showSharedExpenseItemsError ? (
                <p className="mt-3 text-xs font-medium text-red-600">
                  Completa el nombre y valor de cada gasto compartido
                </p>
              ) : null}

              {normalizedSharedAmount > 0 && selectedCount > 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  +{formatMoney(currency, sharedShare)} por persona
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {members.map((member) => {
              const selected = participantIds.includes(member.id);
              const computedAmount = participantComputedAmounts[member.id] ?? 0;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4"
                >
                  <button
                    type="button"
                    onClick={() => toggleParticipant(member.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div
                      className={`flex size-6 items-center justify-center rounded-full ${
                        selected ? 'bg-rose-500' : 'bg-gray-300'
                      }`}
                    >
                      {selected ? (
                        <Check className="size-4 text-white" />
                      ) : (
                        <Plus className="size-4 text-white" />
                      )}
                    </div>
                    <ParticipantAvatar
                      name={member.name}
                      image={member.image}
                      sizeClassName="size-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-gray-900">
                        {member.name}
                        {member.isCurrentUser ? (
                          <span className="text-gray-500"> (Tú)</span>
                        ) : null}
                      </span>
                      {splitMethod !== 'equal' && selected ? (
                        <span className="block text-xs text-gray-500">
                          {formatMoney(currency, computedAmount)}
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {selected ? (
                    splitMethod === 'equal' ? (
                      <span className="shrink-0 text-sm font-medium text-gray-900">
                        {formatMoney(currency, equalShare || 0)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          value={participantValues[member.id] ?? ''}
                          onChange={(event) =>
                            setParticipantValues((current) => ({
                              ...current,
                              [member.id]: event.target.value,
                            }))
                          }
                          inputMode="decimal"
                          placeholder={
                            splitMethod === 'percentage' ? '0' : '0.00'
                          }
                          className="h-10 w-20 rounded-full border border-gray-200 px-3 text-right text-sm text-gray-900 outline-none"
                        />
                        <span className="text-xs text-gray-400">
                          {splitMethod === 'percentage' ? '%' : currency}
                        </span>
                      </div>
                    )
                  ) : (
                    <span className="shrink-0 text-sm text-gray-400">0</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {!splitIsValid && selectedCount > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {sharedAmountExceedsTotal
              ? 'El monto compartido no puede ser mayor que el total.'
              : splitMethod === 'percentage'
                ? 'La suma de porcentajes debe ser 100.'
                : 'La suma de montos individuales más el compartido debe coincidir con el total.'}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <p className="text-xs text-gray-500">
          {selectedCount === 0
            ? 'Selecciona al menos una persona para dividir este gasto'
            : splitMethod === 'percentage'
              ? `${selectedCount} participantes · ${splitSum.toFixed(2)}% sobre ${formatMoney(currency, baseAmount)} · total ${formatMoney(currency, normalizedAmount)}`
              : `${selectedCount} participantes · ${formatMoney(currency, splitMethod === 'equal' ? normalizedAmount : splitSum + normalizedSharedAmount)} de ${formatMoney(currency, normalizedAmount)}`}
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitLocked}
          className="h-14 w-full rounded-full bg-rose-500 text-base font-medium text-white hover:bg-rose-500/90"
        >
          {isSubmitLocked
            ? isEditMode
              ? 'Guardando...'
              : 'Agregando...'
            : isEditMode
              ? 'Guardar cambios'
              : 'Agregar gasto'}
        </Button>
      </div>

      <Drawer open={showSplitDrawer} onOpenChange={setShowSplitDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Método de división</DrawerTitle>
            <DrawerDescription>
              Elige cómo se repartirá este gasto.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-2 px-5 pb-5">
            {splitMethods.map((method) => {
              const active = splitMethod === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setMethod(method.value)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition ${
                    active ? 'bg-rose-50' : 'bg-white'
                  }`}
                >
                  <div>
                    <p className="text-base font-semibold text-[#132238]">
                      {method.label}
                    </p>
                    <p className="text-sm text-[#64748b]">
                      {method.value === 'equal'
                        ? 'Todos pagan lo mismo de este gasto.'
                        : method.value === 'percentage'
                          ? 'Cada persona paga un porcentaje del total.'
                          : 'Cada persona paga un monto distinto.'}
                    </p>
                  </div>
                  {active ? <Check className="size-5 text-rose-500" /> : null}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showAdvancedDetailsDrawer}
        onOpenChange={setShowAdvancedDetailsDrawer}
      >
        <DrawerContent className="h-dvh max-h-dvh">
          <DrawerHeader>
            <DrawerTitle>Detalles del lugar</DrawerTitle>
            <DrawerDescription>
              Agrega datos útiles para el viaje sin cambiar el gasto.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
            <section>
              <p className="mb-3 text-sm font-medium text-gray-900">
                Tipo de información
              </p>
              <div className="grid grid-cols-2 gap-2">
                {advancedDetailsTypeOptions.map((option) => {
                  const active = advancedDetails.type === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setAdvancedDetails((current) => ({
                          ...current,
                          type: option.value,
                        }))
                      }
                      className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                        active
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {option.label}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <AdvancedDetailsInput
              label="Nombre del lugar"
              value={advancedDetails.placeName ?? ''}
              onChange={(value) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  placeName: value,
                }))
              }
              placeholder={
                advancedDetails.type === 'food'
                  ? 'Restaurante'
                  : advancedDetails.type === 'stay'
                    ? 'Hotel o Airbnb'
                    : 'Lugar o proveedor'
              }
            />

            <AdvancedDetailsInput
              label="Dirección"
              value={advancedDetails.address ?? ''}
              onChange={(value) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  address: value,
                }))
              }
              placeholder="Calle, zona o referencia"
              icon={<MapPin className="size-4" />}
            />

            <AdvancedDetailsInput
              label="Ubicación en mapa"
              value={advancedDetails.mapUrl ?? ''}
              onChange={(value) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  mapUrl: value,
                }))
              }
              placeholder="https://maps.google.com/..."
              inputMode="url"
              icon={<MapPin className="size-4" />}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AdvancedDetailsInput
                label="Contacto"
                value={advancedDetails.contactName ?? ''}
                onChange={(value) =>
                  setAdvancedDetails((current) => ({
                    ...current,
                    contactName: value,
                  }))
                }
                placeholder="Host, restaurante..."
              />

              <AdvancedDetailsInput
                label="Teléfono o WhatsApp"
                value={advancedDetails.phone ?? ''}
                onChange={(value) =>
                  setAdvancedDetails((current) => ({
                    ...current,
                    phone: value,
                  }))
                }
                placeholder="+57..."
                inputMode="tel"
                icon={<Phone className="size-4" />}
              />
            </div>

            <AdvancedDetailsInput
              label="Correo"
              value={advancedDetails.email ?? ''}
              onChange={(value) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  email: value,
                }))
              }
              placeholder="contacto@lugar.com"
              inputMode="email"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AdvancedDetailsInput
                label="Código de reserva"
                value={advancedDetails.bookingCode ?? ''}
                onChange={(value) =>
                  setAdvancedDetails((current) => ({
                    ...current,
                    bookingCode: value,
                  }))
                }
                placeholder="ABC123"
              />

              <AdvancedDetailsInput
                label="Fecha u hora"
                value={advancedDetails.reservationTime ?? ''}
                onChange={(value) =>
                  setAdvancedDetails((current) => ({
                    ...current,
                    reservationTime: value,
                  }))
                }
                placeholder="Check-in, reserva..."
                icon={<CalendarClock className="size-4" />}
              />
            </div>

            <AdvancedDetailsInput
              label="Link externo"
              value={advancedDetails.websiteUrl ?? ''}
              onChange={(value) =>
                setAdvancedDetails((current) => ({
                  ...current,
                  websiteUrl: value,
                }))
              }
              placeholder="Booking, Airbnb, ticket..."
              inputMode="url"
              icon={<LinkIcon className="size-4" />}
            />

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">Imagen</p>
                {attachmentDataUrl ? (
                  <button
                    type="button"
                    onClick={clearAttachmentSelection}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-500"
                  >
                    <Trash2 className="size-3.5" />
                    Quitar nueva imagen
                  </button>
                ) : null}
              </div>

              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) =>
                  void handleAttachmentSelect(event.target.files?.[0] ?? null)
                }
              />

              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-3xl border border-dashed border-gray-300 bg-white p-3 text-left"
              >
                {attachmentPreviewUrl ? (
                  <img
                    src={attachmentPreviewUrl}
                    alt="Imagen del gasto"
                    className="size-20 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <Camera className="size-6" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">
                    {attachmentPreviewUrl ? 'Cambiar imagen' : 'Agregar imagen'}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Recibo, reserva, ticket o referencia del lugar
                  </span>
                </span>
              </button>

              {attachmentError ? (
                <p className="mt-2 text-xs text-rose-600">{attachmentError}</p>
              ) : null}
            </section>

            <label className="block">
              <span className="text-sm font-medium text-gray-900">Notas</span>
              <textarea
                value={advancedDetails.notes ?? ''}
                onChange={(event) =>
                  setAdvancedDetails((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Instrucciones, reglas, punto de encuentro..."
                className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-rose-500"
              />
            </label>
          </div>

          <div className="border-t border-gray-200 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full"
                onClick={() => setAdvancedDetails(emptyAdvancedDetails)}
              >
                Limpiar
              </Button>
              <Button
                type="button"
                className="h-11 rounded-full bg-primary text-white hover:bg-primary/90"
                onClick={() => setShowAdvancedDetailsDrawer(false)}
              >
                Guardar
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={showCategoryDrawer} onOpenChange={setShowCategoryDrawer}>
        <DrawerContent className="flex max-h-[85dvh] flex-col overflow-hidden">
          <DrawerHeader>
            <DrawerTitle>Categoría</DrawerTitle>
            <DrawerDescription>
              Elige una categoría para este gasto.
            </DrawerDescription>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 h-10 w-full justify-start rounded-full px-0 text-rose-500 hover:bg-rose-50 hover:text-rose-500"
              onClick={openCreateCategoryDialog}
            >
              <Plus className="mr-2 size-4" />
              Crear una nueva categoría
            </Button>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <button
              type="button"
              onClick={() => {
                setCategoryId(null);
                setShowCategoryDrawer(false);
              }}
              className="flex w-full items-center justify-between rounded-2xl px-1 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-medium text-gray-900">
                  Sin categoría
                </p>
              </div>
              <span
                className={`flex size-6 items-center justify-center rounded-full border ${
                  !categoryId
                    ? 'border-rose-500 bg-rose-500'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {!categoryId ? <Check className="size-4 text-white" /> : null}
              </span>
            </button>

            {categories.map((category) => {
              const active = categoryId === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(category.id);
                    setShowCategoryDrawer(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl px-1 py-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${category.color ?? '#f43f5e'}18`,
                        color: category.color ?? '#f43f5e',
                      }}
                    >
                      <CategoryIcon
                        icon={category.icon}
                        color={category.color}
                        fallback={<Plus className="size-4" />}
                      />
                    </span>
                    <p className="truncate text-base font-medium text-gray-900">
                      {category.name}
                    </p>
                  </div>
                  <span
                    className={`flex size-6 items-center justify-center rounded-full border ${
                      active
                        ? 'border-rose-500 bg-rose-500'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {active ? <Check className="size-4 text-white" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog
        open={showCreateCategoryDialog}
        onOpenChange={(nextOpen) => {
          setShowCreateCategoryDialog(nextOpen);
          if (!nextOpen) {
            pendingCreateCategoryDialogRef.current = false;
          }
        }}
      >
        <DialogContent className="max-h-[88dvh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[28px] p-0 sm:max-h-[85vh] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="px-5 pt-5 text-left text-base">
              Crear categoría
            </DialogTitle>
            <DialogDescription className="px-5 text-left">
              Agrega una nueva categoría para este grupo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 overflow-y-auto px-5 pb-5 pt-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-900">
                Nombre de la categoría
              </span>
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Transporte"
                className="h-12 rounded-full border border-gray-200 px-4 text-base shadow-[0_4px_12px_rgba(15,23,42,0.06)] outline-none focus:border-rose-500"
              />
            </label>

            <section>
              <p className="mb-3 text-sm font-medium text-gray-900">
                Selecciona un icono
              </p>
              <div className="grid grid-cols-6 gap-3">
                {categoryIconOptions.map((option) => {
                  const Icon = option.icon;
                  const active = newCategoryIcon === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setNewCategoryIcon(option.id)}
                      className={`flex size-9 items-center justify-center rounded-full border bg-white transition-colors ${
                        active
                          ? 'border-gray-900 text-gray-900'
                          : 'border-gray-200 text-gray-500'
                      }`}
                      aria-label={option.label}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setNewCategoryIcon(customCategoryIconId)}
                  className={`flex size-9 items-center justify-center rounded-full border bg-white transition-colors ${
                    isCustomCategoryIcon
                      ? 'border-gray-900 text-gray-900'
                      : 'border-gray-200 text-gray-500'
                  }`}
                  aria-label="Usar icono del teclado"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {isCustomCategoryIcon ? (
                <label className="mt-3 flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
                  <span className="text-sm font-medium text-gray-700">
                    Icono
                  </span>
                  <input
                    ref={customCategoryIconInputRef}
                    value={newCategoryCustomIcon}
                    onChange={(event) =>
                      setNewCategoryCustomIcon(
                        normalizeCategoryIconInput(event.target.value),
                      )
                    }
                    placeholder="🙂"
                    inputMode="text"
                    className="min-w-0 flex-1 bg-transparent text-xl outline-none"
                    aria-label="Icono personalizado"
                  />
                </label>
              ) : null}
            </section>

            <section>
              <p className="mb-3 text-sm font-medium text-gray-900">
                Selecciona un color
              </p>
              <div className="flex flex-wrap gap-4">
                {categoryColorOptions.map((color) => {
                  const active = newCategoryColor === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={`flex size-9 items-center justify-center rounded-full border transition-transform active:scale-95 ${
                        active ? 'border-rose-500' : 'border-transparent'
                      }`}
                      aria-label={`Color ${color}`}
                    >
                      <span
                        className="size-7 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="rounded-[24px] border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-4">
                <span
                  className="flex size-11 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${newCategoryColor}22`,
                    color: newCategoryColor,
                  }}
                >
                  <CategoryIcon
                    icon={
                      isCustomCategoryIcon
                        ? customCategoryIcon || null
                        : newCategoryIcon
                    }
                    color={newCategoryColor}
                    fallback={<Plus className="size-5" />}
                  />
                </span>
                <p className="min-w-0 truncate text-base font-semibold text-gray-900">
                  {trimmedNewCategoryName}
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="h-11 w-full rounded-full bg-primary text-white hover:bg-primary/90"
              onClick={handleCreateCategory}
              disabled={
                !trimmedNewCategoryName || createCategoryMutation.isPending
              }
            >
              {createCategoryMutation.isPending
                ? 'Creando...'
                : 'Guardar categoría'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Drawer open={showCurrencyDrawer} onOpenChange={setShowCurrencyDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Moneda</DrawerTitle>
            <DrawerDescription>
              Elige la moneda de este gasto.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-1 px-5 pb-5">
            {currencyOptions.map((option) => {
              const meta = currencyMeta[option];
              const active = currency === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCurrencyAndClose(option)}
                  className="flex w-full items-center justify-between rounded-2xl px-1 py-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-2xl">{meta.flag}</span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-gray-900">
                        {meta.label} - {meta.name}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`flex size-6 items-center justify-center rounded-full border ${
                      active
                        ? 'border-rose-500 bg-rose-500'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {active ? <Check className="size-4 text-white" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </MobilePageLayout>
  );
}
