import { Effect, Schema } from 'effect';

const groupError =
  <Self>() =>
  <const Tag extends string>(
    tag: Tag,
    message: string,
    status: 400 | 403 | 404 | 409,
  ) =>
    Schema.TaggedError<Self>()(
      tag,
      {
        error: Schema.String.pipe(
          Schema.withConstructorDefault(Effect.succeed(message)),
        ),
      },
      { httpApiStatus: status },
    );

export class GroupNotFound extends groupError<GroupNotFound>()(
  'GroupNotFound',
  'Grupo no encontrado',
  404,
) {}
export class GroupAccessDenied extends groupError<GroupAccessDenied>()(
  'GroupAccessDenied',
  'No tienes acceso a este grupo',
  400,
) {}

export class GroupCategoryNameRequired extends groupError<GroupCategoryNameRequired>()(
  'GroupCategoryNameRequired',
  'El nombre de la categoría es obligatorio',
  400,
) {}
export class GroupCategoryNotFound extends groupError<GroupCategoryNotFound>()(
  'GroupCategoryNotFound',
  'Categoría no encontrada',
  404,
) {}
export class GroupCategoryNameConflict extends groupError<GroupCategoryNameConflict>()(
  'GroupCategoryNameConflict',
  'Ya existe una categoría con ese nombre',
  409,
) {}
export class GroupCategoryHasExpenses extends groupError<GroupCategoryHasExpenses>()(
  'GroupCategoryHasExpenses',
  'La categoría tiene gastos asociados',
  409,
) {}
export class GroupCategoryTargetSame extends groupError<GroupCategoryTargetSame>()(
  'GroupCategoryTargetSame',
  'La categoría destino debe ser diferente',
  400,
) {}
export class GroupCategoryTargetNotFound extends groupError<GroupCategoryTargetNotFound>()(
  'GroupCategoryTargetNotFound',
  'Categoría destino no encontrada',
  404,
) {}

export class GroupMemberNotFound extends groupError<GroupMemberNotFound>()(
  'GroupMemberNotFound',
  'Participante no encontrado',
  400,
) {}
export class GroupMemberRemoveForbidden extends groupError<GroupMemberRemoveForbidden>()(
  'GroupMemberRemoveForbidden',
  'Solo el creador puede eliminar participantes',
  400,
) {}
export class GroupOwnerRemoveForbidden extends groupError<GroupOwnerRemoveForbidden>()(
  'GroupOwnerRemoveForbidden',
  'No puedes eliminar al creador del grupo',
  400,
) {}
export class GroupMemberHasExpenses extends groupError<GroupMemberHasExpenses>()(
  'GroupMemberHasExpenses',
  'El participante ya tiene gastos',
  400,
) {}
export class GroupMemberUnlinkForbidden extends groupError<GroupMemberUnlinkForbidden>()(
  'GroupMemberUnlinkForbidden',
  'Solo el creador puede desvincular participantes',
  400,
) {}
export class GroupMemberAlreadyUnlinked extends groupError<GroupMemberAlreadyUnlinked>()(
  'GroupMemberAlreadyUnlinked',
  'El participante ya no tiene una cuenta vinculada',
  400,
) {}
export class GroupOwnerUnlinkForbidden extends groupError<GroupOwnerUnlinkForbidden>()(
  'GroupOwnerUnlinkForbidden',
  'No puedes desvincular al creador del grupo',
  400,
) {}

export class GroupOwnerTransferForbidden extends groupError<GroupOwnerTransferForbidden>()(
  'GroupOwnerTransferForbidden',
  'Solo el dueño puede transferir el grupo',
  403,
) {}
export class GroupOwnerTransferTargetRequired extends groupError<GroupOwnerTransferTargetRequired>()(
  'GroupOwnerTransferTargetRequired',
  'El nuevo dueño debe tener una cuenta vinculada',
  400,
) {}
export class GroupOwnerTransferTargetSame extends groupError<GroupOwnerTransferTargetSame>()(
  'GroupOwnerTransferTargetSame',
  'Ese participante ya es el dueño del grupo',
  400,
) {}

export class GroupExpenseNotFound extends groupError<GroupExpenseNotFound>()(
  'GroupExpenseNotFound',
  'Gasto no encontrado',
  404,
) {}
export class GroupExpenseIdConflict extends groupError<GroupExpenseIdConflict>()(
  'GroupExpenseIdConflict',
  'El identificador del gasto ya existe',
  400,
) {}
export class GroupExpensePayerInvalid extends groupError<GroupExpensePayerInvalid>()(
  'GroupExpensePayerInvalid',
  'El pagador no pertenece al grupo',
  400,
) {}
export class GroupExpenseCategoryInvalid extends groupError<GroupExpenseCategoryInvalid>()(
  'GroupExpenseCategoryInvalid',
  'La categoría no pertenece al grupo',
  400,
) {}
export class GroupExpenseParticipantsInvalid extends groupError<GroupExpenseParticipantsInvalid>()(
  'GroupExpenseParticipantsInvalid',
  'El desglose contiene participantes inválidos',
  400,
) {}
export class GroupExpenseLineItemsInvalid extends groupError<GroupExpenseLineItemsInvalid>()(
  'GroupExpenseLineItemsInvalid',
  'No se pudo relacionar el desglose con sus participantes',
  400,
) {}
export class GroupExpenseDeleted extends groupError<GroupExpenseDeleted>()(
  'GroupExpenseDeleted',
  'No puedes editar un gasto eliminado',
  400,
) {}
export class GroupSettlementParticipantsInvalid extends groupError<GroupSettlementParticipantsInvalid>()(
  'GroupSettlementParticipantsInvalid',
  'Participantes de liquidación inválidos',
  400,
) {}
