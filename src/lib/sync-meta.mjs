export function migrateLegacySyncMeta(previous, { hasLocalData, now = Date.now() }) {
  const hasCurrentShape = previous
    && typeof previous.dirty === 'boolean'
    && Number.isInteger(previous.revision);
  if (hasCurrentShape) return previous;

  const updatedAt = hasLocalData
    ? Math.max(now, Number(previous?.updatedAt || 0) + 1)
    : Number(previous?.updatedAt || 0);
  return {
    ...(previous || {}),
    updatedAt,
    dirty: !!hasLocalData,
    revision: hasLocalData ? Math.max(1, Number(previous?.revision || 0)) : 0
  };
}

export function canApplyRemoteSync(meta, remoteUpdatedAt, { requireNewer = true } = {}) {
  if (meta?.dirty) return false;
  return !requireNewer || Number(remoteUpdatedAt || 0) > Number(meta?.updatedAt || 0);
}

export function hasMeaningfulLocalSyncData(kind, rawValue) {
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    if (kind === 'profiles') {
      return !!parsed.profiles
        && typeof parsed.profiles === 'object'
        && Object.keys(parsed.profiles).length > 0;
    }
    if (kind === 'days') {
      return Object.values(parsed).some((entry) => entry
        && typeof entry === 'object'
        && entry.days
        && typeof entry.days === 'object'
        && Object.keys(entry.days).length > 0);
    }
    return Object.keys(parsed).length > 0;
  } catch(_) {
    return false;
  }
}
