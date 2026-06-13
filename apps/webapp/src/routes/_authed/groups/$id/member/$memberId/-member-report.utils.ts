export type MemberReportSearch = {
  categoryId?: string;
  categoryName?: string;
  uncategorized: boolean;
  paidOnly: boolean;
  startDate?: string;
  endDate?: string;
};

export function parseMemberReportSearch(search: Record<string, unknown>) {
  return {
    categoryId:
      typeof search.categoryId === 'string' && search.categoryId.length > 0
        ? search.categoryId
        : undefined,
    categoryName:
      typeof search.categoryName === 'string' && search.categoryName.length > 0
        ? search.categoryName
        : undefined,
    uncategorized:
      search.uncategorized === true || search.uncategorized === 'true',
    paidOnly: search.paidOnly === true || search.paidOnly === 'true',
    startDate:
      typeof search.startDate === 'string' && search.startDate.length > 0
        ? search.startDate
        : undefined,
    endDate:
      typeof search.endDate === 'string' && search.endDate.length > 0
        ? search.endDate
        : undefined,
  } satisfies MemberReportSearch;
}

export function sortCurrencyEntries(values: Record<string, number>) {
  return Object.entries(values).sort((left, right) => {
    if (left[0] === right[0]) return 0;
    return left[0].localeCompare(right[0]);
  });
}

export function getMemberReportTitle(input: {
  memberName?: string;
  categoryName?: string;
}) {
  if (!input.memberName) return 'Gastos del participante';
  if (input.categoryName) {
    return `Gastos de ${input.memberName} en ${input.categoryName}`;
  }

  return `Gastos de ${input.memberName}`;
}

export function getMemberReportIntroCopy(input: {
  categoryName?: string;
  paidOnly: boolean;
  startDate?: string;
  endDate?: string;
}) {
  if (input.paidOnly) {
    if (input.categoryName) {
      return `Revisa solo los gastos de ${input.categoryName.toLowerCase()} que esta persona pagó.`;
    }

    if (input.startDate && input.endDate) {
      return 'Revisa solo los gastos que esta persona pagó en este rango.';
    }

    return 'Revisa solo los gastos que esta persona pagó.';
  }

  if (input.categoryName) {
    return `Revisa solo los gastos de ${input.categoryName.toLowerCase()} donde esta persona pagó o participa.`;
  }

  if (input.startDate && input.endDate) {
    return 'Revisa solo los gastos de este rango donde esta persona pagó o participa.';
  }

  return 'Revisa solo los gastos donde esta persona pagó o participa.';
}

export function getMemberReportSummaryCopy(paidOnly: boolean) {
  return paidOnly
    ? 'Total de su parte en gastos que pagó'
    : 'Total que ha gastado en este filtro';
}

export function getMemberReportListTitle(input: {
  categoryName?: string;
  paidOnly: boolean;
}) {
  if (input.paidOnly) {
    return input.categoryName
      ? `Gastos pagados en ${input.categoryName}`
      : 'Gastos que pagó';
  }

  return input.categoryName
    ? `Gastos en ${input.categoryName}`
    : 'Gastos relacionados';
}

export function getMemberReportListCopy(input: {
  categoryName?: string;
  paidOnly: boolean;
  startDate?: string;
  endDate?: string;
}) {
  if (input.paidOnly) {
    if (input.categoryName) {
      return 'Solo pagados por esta persona en esta categoría';
    }

    if (input.startDate && input.endDate) {
      return 'Solo los que pagó en este rango de fecha';
    }

    return 'Solo los que pagó';
  }

  if (input.categoryName) return 'Solo de esta categoría';
  if (input.startDate && input.endDate) return 'Solo de este rango de fecha';
  return 'Donde pagó o participa';
}

export function getMemberReportEmptyCopy(input: {
  categoryName?: string;
  paidOnly: boolean;
  startDate?: string;
  endDate?: string;
}) {
  if (input.paidOnly) {
    if (input.categoryName) {
      return 'Cuando pague un gasto de esta categoría aparecerá aquí.';
    }

    if (input.startDate && input.endDate) {
      return 'Cuando pague un gasto en este rango aparecerá aquí.';
    }

    return 'Cuando pague un gasto aparecerá aquí.';
  }

  if (input.categoryName) {
    return 'Cuando esté involucrado en un gasto de esta categoría aparecerá aquí.';
  }

  if (input.startDate && input.endDate) {
    return 'Cuando esté involucrado en un gasto de este rango aparecerá aquí.';
  }

  return 'Cuando esté involucrado en un gasto aparecerá aquí.';
}
