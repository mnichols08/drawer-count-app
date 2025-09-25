const DEFAULT_PROFILE_ID = 'default';
const DEFAULT_PROFILE_NAME = 'Default';

function _clone(value) {
  if (value === null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

function _safeParse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function _sortObjectDeep(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => _sortObjectDeep(item));
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = _sortObjectDeep(value[key]);
  }
  return sorted;
}

function _stableStringify(value) {
  return JSON.stringify(_sortObjectDeep(value));
}

function _hasMeaningfulState(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value).length > 0;
  }
  return true;
}

function _coerceProfilesData(data) {
  const base = {};
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'profiles' || key === 'activeId' || key === 'updatedAt') continue;
      base[key] = _clone(value);
    }
  }
  base.activeId = (data && typeof data.activeId === 'string') ? data.activeId : DEFAULT_PROFILE_ID;
  base.updatedAt = Number(data && data.updatedAt ? data.updatedAt : 0) || 0;
  base.profiles = {};
  const sourceProfiles = (data && typeof data === 'object' && data.profiles && typeof data.profiles === 'object') ? data.profiles : {};
  for (const [id, info] of Object.entries(sourceProfiles)) {
    if (!info || typeof info !== 'object') continue;
    const entry = _clone(info);
    entry.name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : id;
    entry.updatedAt = Number(entry.updatedAt || 0) || 0;
    entry.prefs = (entry.prefs && typeof entry.prefs === 'object') ? _clone(entry.prefs) : {};
    base.profiles[id] = entry;
  }
  return base;
}

function _ensureDefaultProfile(profiles, timestamp) {
  const ts = (typeof timestamp === 'number' && timestamp > 0) ? timestamp : Date.now();
  if (!profiles[DEFAULT_PROFILE_ID]) {
    profiles[DEFAULT_PROFILE_ID] = { name: DEFAULT_PROFILE_NAME, state: null, prefs: {}, updatedAt: ts };
    return ts;
  }
  const profile = profiles[DEFAULT_PROFILE_ID];
  if (!profile.name) profile.name = DEFAULT_PROFILE_NAME;
  if (!profile.prefs || typeof profile.prefs !== 'object') profile.prefs = {};
  profile.updatedAt = Number(profile.updatedAt || 0) || ts;
  if (profile.updatedAt < ts) profile.updatedAt = ts;
  return profile.updatedAt;
}

function _mergeProfileEntry(localProfile, remoteProfile) {
  if (!localProfile && !remoteProfile) return null;
  if (!remoteProfile) return _clone(localProfile);
  if (!localProfile) return _clone(remoteProfile);

  const local = _clone(localProfile);
  const remote = _clone(remoteProfile);
  const localUpdatedAt = Number(local.updatedAt || 0) || 0;
  const remoteUpdatedAt = Number(remote.updatedAt || 0) || 0;

  let primary = local;
  let secondary = remote;
  if (remoteUpdatedAt > localUpdatedAt) {
    primary = remote;
    secondary = local;
  }

  const mergedPrefs = { ...(secondary.prefs || {}), ...(primary.prefs || {}) };
  const primaryHasState = _hasMeaningfulState(primary.state);
  const secondaryHasState = _hasMeaningfulState(secondary.state);
  const state = primaryHasState ? _clone(primary.state) : (secondaryHasState ? _clone(secondary.state) : null);

  const merged = {
    ...secondary,
    ...primary,
    prefs: mergedPrefs,
    state,
    name: primary.name || secondary.name || DEFAULT_PROFILE_NAME,
    updatedAt: Math.max(localUpdatedAt, remoteUpdatedAt)
  };

  return merged;
}

function mergeProfilesPayload({ localRaw, remoteRaw } = {}) {
  const localDataRaw = _safeParse(localRaw);
  const remoteDataRaw = _safeParse(remoteRaw);
  const localData = _coerceProfilesData(localDataRaw);
  const remoteData = _coerceProfilesData(remoteDataRaw);

  const mergedExtras = {};
  if (remoteDataRaw && typeof remoteDataRaw === 'object') {
    for (const [key, value] of Object.entries(remoteDataRaw)) {
      if (key === 'profiles' || key === 'activeId' || key === 'updatedAt') continue;
      mergedExtras[key] = _clone(value);
    }
  }
  if (localDataRaw && typeof localDataRaw === 'object') {
    for (const [key, value] of Object.entries(localDataRaw)) {
      if (key === 'profiles' || key === 'activeId' || key === 'updatedAt') continue;
      mergedExtras[key] = _clone(value);
    }
  }

  const profileIds = new Set([
    ...Object.keys(remoteData.profiles || {}),
    ...Object.keys(localData.profiles || {})
  ]);

  const mergedProfiles = {};
  let highestUpdated = Math.max(Number(localData.updatedAt || 0), Number(remoteData.updatedAt || 0));
  for (const id of Array.from(profileIds).sort()) {
    const merged = _mergeProfileEntry(localData.profiles[id], remoteData.profiles[id]);
    if (!merged) continue;
    mergedProfiles[id] = merged;
    highestUpdated = Math.max(highestUpdated, Number(merged.updatedAt || 0));
  }

  const ensured = _ensureDefaultProfile(mergedProfiles, highestUpdated);
  highestUpdated = Math.max(highestUpdated, ensured, 0);

  let activeId = localData.activeId;
  if (!activeId || !mergedProfiles[activeId]) {
    activeId = remoteData.activeId;
  }
  if (!activeId || !mergedProfiles[activeId]) {
    activeId = DEFAULT_PROFILE_ID;
  }

  const merged = {
    ...mergedExtras,
    profiles: mergedProfiles,
    activeId,
    updatedAt: highestUpdated
  };

  const mergedRaw = _stableStringify(merged);
  const localComparable = (localDataRaw && typeof localDataRaw === 'object') ? localDataRaw : {};
  const remoteComparable = (remoteDataRaw && typeof remoteDataRaw === 'object') ? remoteDataRaw : {};
  const localChanged = mergedRaw !== _stableStringify(localComparable);
  const remoteChanged = mergedRaw !== _stableStringify(remoteComparable);

  return {
    merged,
    mergedRaw,
    mergedUpdatedAt: highestUpdated,
    localChanged,
    remoteChanged
  };
}

function _coerceDaysData(data) {
  const result = {};
  if (!data || typeof data !== 'object') return result;
  for (const [profileId, entry] of Object.entries(data)) {
    if (!entry || typeof entry !== 'object') continue;
    const cloneEntry = _clone(entry);
    const days = {};
    if (cloneEntry.days && typeof cloneEntry.days === 'object') {
      for (const [dayKey, info] of Object.entries(cloneEntry.days)) {
        if (!info || typeof info !== 'object') continue;
        const copy = _clone(info);
        copy.savedAt = Number(copy.savedAt || 0) || 0;
        days[dayKey] = copy;
      }
    }
    cloneEntry.days = days;
    result[profileId] = cloneEntry;
  }
  return result;
}

function _mergeSingleDay(localDay, remoteDay) {
  if (!localDay && !remoteDay) return null;
  if (!remoteDay) {
    const copy = _clone(localDay);
    if (copy) copy.savedAt = Number(copy.savedAt || 0) || 0;
    return copy;
  }
  if (!localDay) {
    const copy = _clone(remoteDay);
    if (copy) copy.savedAt = Number(copy.savedAt || 0) || 0;
    return copy;
  }

  const localSavedAt = Number(localDay.savedAt || 0) || 0;
  const remoteSavedAt = Number(remoteDay.savedAt || 0) || 0;

  let primary = localDay;
  let secondary = remoteDay;
  if (remoteSavedAt > localSavedAt) {
    primary = remoteDay;
    secondary = localDay;
  }

  const merged = {
    ..._clone(secondary),
    ..._clone(primary)
  };
  merged.savedAt = Math.max(localSavedAt, remoteSavedAt);

  const primaryHasState = _hasMeaningfulState(primary.state);
  const secondaryHasState = _hasMeaningfulState(secondary.state);
  if (!primaryHasState && secondaryHasState) {
    merged.state = _clone(secondary.state);
  }

  return merged;
}

function _mergeDaysEntry(localEntry, remoteEntry) {
  if (!localEntry && !remoteEntry) return {};
  const merged = {
    ..._clone(remoteEntry || {}),
    ..._clone(localEntry || {})
  };

  const localDays = (localEntry && typeof localEntry === 'object' && localEntry.days && typeof localEntry.days === 'object') ? localEntry.days : {};
  const remoteDays = (remoteEntry && typeof remoteEntry === 'object' && remoteEntry.days && typeof remoteEntry.days === 'object') ? remoteEntry.days : {};
  const dayKeys = new Set([
    ...Object.keys(remoteDays),
    ...Object.keys(localDays)
  ]);
  const mergedDays = {};
  for (const key of Array.from(dayKeys).sort()) {
    const record = _mergeSingleDay(localDays[key], remoteDays[key]);
    if (record) mergedDays[key] = record;
  }
  merged.days = mergedDays;

  if (localEntry && typeof localEntry.lastVisitedDate === 'string') merged.lastVisitedDate = localEntry.lastVisitedDate;
  else if (remoteEntry && typeof remoteEntry.lastVisitedDate === 'string') merged.lastVisitedDate = remoteEntry.lastVisitedDate;

  if (localEntry && typeof localEntry._activeViewDateKey === 'string') merged._activeViewDateKey = localEntry._activeViewDateKey;
  else if (remoteEntry && typeof remoteEntry._activeViewDateKey === 'string') merged._activeViewDateKey = remoteEntry._activeViewDateKey;

  if (localEntry && Object.prototype.hasOwnProperty.call(localEntry, '_editUnlocked')) merged._editUnlocked = !!localEntry._editUnlocked;
  else if (remoteEntry && Object.prototype.hasOwnProperty.call(remoteEntry, '_editUnlocked')) merged._editUnlocked = !!remoteEntry._editUnlocked;

  return merged;
}

function _maxSavedAt(entry) {
  if (!entry || typeof entry !== 'object' || !entry.days || typeof entry.days !== 'object') return 0;
  let max = 0;
  for (const info of Object.values(entry.days)) {
    const savedAt = Number(info && info.savedAt ? info.savedAt : 0) || 0;
    if (savedAt > max) max = savedAt;
  }
  return max;
}

function mergeDaysPayload({ localRaw, remoteRaw } = {}) {
  const localDataRaw = _safeParse(localRaw);
  const remoteDataRaw = _safeParse(remoteRaw);
  const localData = _coerceDaysData(localDataRaw);
  const remoteData = _coerceDaysData(remoteDataRaw);

  const profileIds = new Set([
    ...Object.keys(remoteData || {}),
    ...Object.keys(localData || {})
  ]);

  const merged = {};
  let highestSavedAt = 0;
  for (const id of Array.from(profileIds).sort()) {
    const entry = _mergeDaysEntry(localData[id], remoteData[id]);
    merged[id] = entry;
    highestSavedAt = Math.max(highestSavedAt, _maxSavedAt(entry));
  }

  const mergedRaw = _stableStringify(merged);
  const localComparable = (localDataRaw && typeof localDataRaw === 'object') ? localDataRaw : {};
  const remoteComparable = (remoteDataRaw && typeof remoteDataRaw === 'object') ? remoteDataRaw : {};
  const localChanged = mergedRaw !== _stableStringify(localComparable);
  const remoteChanged = mergedRaw !== _stableStringify(remoteComparable);

  return {
    merged,
    mergedRaw,
    mergedUpdatedAt: highestSavedAt,
    localChanged,
    remoteChanged
  };
}

export { mergeProfilesPayload, mergeDaysPayload };
