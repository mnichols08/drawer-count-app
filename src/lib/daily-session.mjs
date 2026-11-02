export const AUTOSAVE_DELAY_MS = 500;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function millisecondsUntilNextLocalDay(date = new Date()) {
  const nextDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    1
  );
  return Math.max(1, nextDay.getTime() - date.getTime());
}

export function shouldRolloverDay(observedDateKey, date = new Date()) {
  return !!observedDateKey && observedDateKey !== getLocalDateKey(date);
}

export function getDayRecordStatus(record) {
  if (!record || typeof record !== 'object') return 'missing';
  if (record.status === 'draft') return 'draft';
  return 'completed';
}

export function isMatchingSyncRevision(pendingRevision, receivedRevision) {
  return Number(pendingRevision) > 0 && Number(pendingRevision) === Number(receivedRevision);
}
