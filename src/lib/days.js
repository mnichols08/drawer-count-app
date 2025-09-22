import { _getActiveDaysEntry, saveDaysData } from './persistence.js';

export function seedPreviousDays(count, options = {}) {
  const { includeToday = false, overwrite = false } = options;
  const seededKeys = [];
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randomFloat(min, max, decimals = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(decimals)); }
  try {
    const today = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (!includeToday && i === 0) continue;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      const { data, pid, entry } = _getActiveDaysEntry(true);
      if (!overwrite && entry.days[key]) continue;

      const base = { drawer: randomFloat(200, 800), roa: randomFloat(50, 200), slips: randomFloat(20, 300), checks: randomFloat(0, 200), hundreds: randomInt(0, 10), fifties: randomInt(0, 10), twenties: randomInt(0, 20), tens: randomInt(0, 20), fives: randomInt(0, 20), dollars: randomInt(0, 50), quarters: randomInt(0, 40), dimes: randomInt(0, 50), nickels: randomInt(0, 50), pennies: randomInt(0, 100), quarterrolls: randomInt(0, 4), dimerolls: randomInt(0, 4), nickelrolls: randomInt(0, 4), pennyrolls: randomInt(0, 4) };
      const extra = { slips: Array.from({length: randomInt(0, 3)}, () => randomFloat(10, 100)), checks: Array.from({length: randomInt(0, 2)}, () => randomFloat(10, 100)) };
      const charges = randomFloat(0, 50);
      const netSales = randomFloat(80, 550);
      const totalReceived = randomFloat(100, 600);
      const grossProfitAmount = randomFloat(10, 100);
      const grossProfitPercent = randomFloat(5, 30);
      const numInvoices = randomInt(1, 20);
      const numVoids = randomInt(0, 3);
      let balance = netSales - charges + base.drawer + base.roa; balance = Math.max(0, Math.min(balance, 1000));

      const dummyState = {
        version: 2,
        timestamp: Date.now(),
        base,
        extra,
        optional: { charges, totalReceived, netSales, grossProfitAmount, grossProfitPercent, numInvoices, numVoids },
        balance,
        started: true,
        completed: true,
        collapsed: false
      };
      entry.days[key] = { state: dummyState, savedAt: Date.now(), label: `Seeded ${key}` };
      data[pid] = entry; saveDaysData(data);
      seededKeys.push(key);
    }
    return seededKeys;
  } catch (e) { return seededKeys; }
}
