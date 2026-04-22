export function parsePositiveIntegerSearchParam(
  value: string | null,
  fallbackValue: number
) {
  if (!value) {
    return fallbackValue;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallbackValue;
}

export function parseSearchParamEnum<T extends string>(
  value: string | null,
  allowedValues: readonly T[],
  fallbackValue: T
) {
  return value !== null && allowedValues.includes(value as T)
    ? (value as T)
    : fallbackValue;
}

export function updateSearchParams(
  currentSearchParams: URLSearchParams,
  updates: Record<string, number | string | null | undefined>
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      nextSearchParams.delete(key);
      return;
    }

    nextSearchParams.set(key, String(value));
  });

  return nextSearchParams;
}
