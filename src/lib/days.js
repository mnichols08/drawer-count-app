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

      // Generate base drawer and ROA amounts
      const drawer = randomFloat(200, 800);
      const roa = randomFloat(50, 200);
      
      // For a balanced drawer: total - roa - drawer - 150 = 0
      // So total should equal: roa + drawer + 150
      const targetTotal = roa + drawer + 150;
      
  // Generate smaller, more reasonable cash amounts
      const hundreds = randomInt(0, Math.min(5, Math.floor(targetTotal / 200)));
      const cashAfterHundreds = targetTotal - (hundreds * 100);
      const fifties = randomInt(0, Math.min(8, Math.floor(cashAfterHundreds / 100))); 
      const cashAfterFifties = cashAfterHundreds - (fifties * 50);
  // Use progressively reduced remaining cash to keep values reasonable
  const twenties = randomInt(0, Math.min(15, Math.floor(cashAfterFifties / 40)));
  const cashAfterTwenties = cashAfterFifties - (twenties * 20);
  const tens = randomInt(0, Math.min(20, Math.floor(cashAfterTwenties / 20)));
  const cashAfterTens = cashAfterTwenties - (tens * 10);
  const fives = randomInt(0, Math.min(25, Math.floor(cashAfterTens / 10)));
  const cashAfterFives = cashAfterTens - (fives * 5);
  const dollars = randomInt(0, Math.min(40, Math.floor(cashAfterFives / 5)));
      const quarters = randomInt(0, 20);
      const dimes = randomInt(0, 30);
      const nickels = randomInt(0, 30);
      const pennies = randomInt(0, 50);
      const quarterrolls = randomInt(0, 2);
      const dimerolls = randomInt(0, 2);
      const nickelrolls = randomInt(0, 2);
      const pennyrolls = randomInt(0, 2);
      
      // Calculate cash total from denominations
      const cashTotal = (hundreds * 100) + (fifties * 50) + (twenties * 20) + (tens * 10) + 
                       (fives * 5) + (dollars * 1) + (quarters * 0.25) + (dimes * 0.10) + 
                       (nickels * 0.05) + (pennies * 0.01) + (quarterrolls * 10) + 
                       (dimerolls * 5) + (nickelrolls * 2) + (pennyrolls * 0.50);
      
      // Generate smaller extra slips and checks
      const extraSlipCount = randomInt(0, 2);
      const extraCheckCount = randomInt(0, 1);
      const maxExtraAmount = Math.max(20, (targetTotal - cashTotal) * 0.3); // Limit extra to 30% of remaining
      
      const extra = { 
        slips: Array.from({length: extraSlipCount}, () => randomFloat(5, Math.min(50, maxExtraAmount / Math.max(1, extraSlipCount)))), 
        checks: Array.from({length: extraCheckCount}, () => randomFloat(5, Math.min(50, maxExtraAmount / Math.max(1, extraCheckCount)))) 
      };
      
      // Calculate extra total
      const extraSlipsTotal = extra.slips.reduce((sum, val) => sum + val, 0);
      const extraChecksTotal = extra.checks.reduce((sum, val) => sum + val, 0);
      const extraTotal = extraSlipsTotal + extraChecksTotal;
      
      // Ensure balance is always ~0 by adjusting when cash+extras exceed the target
      // Work in cents to avoid floating point errors
      const toCents = (n) => Math.round(n * 100);
      const fromCents = (c) => parseFloat((c / 100).toFixed(2));
      let cashCents = toCents(cashTotal);
      const extraCents = toCents(extraTotal);
      const targetCents = toCents(targetTotal);

      // If cash+extras exceed target, reduce cash denominations greedily (from smallest to largest)
      let overCents = (cashCents + extraCents) - targetCents;
      if (overCents > 0) {
        const denom = [
          { name: 'pennies', value: 1, count: pennies },
          { name: 'nickels', value: 5, count: nickels },
          { name: 'dimes', value: 10, count: dimes },
          { name: 'quarters', value: 25, count: quarters },
          { name: 'dollars', value: 100, count: dollars },
          { name: 'fives', value: 500, count: fives },
          { name: 'tens', value: 1000, count: tens },
          { name: 'twenties', value: 2000, count: twenties },
          { name: 'fifties', value: 5000, count: fifties },
          { name: 'hundreds', value: 10000, count: hundreds },
          { name: 'pennyrolls', value: 50, count: pennyrolls },
          { name: 'nickelrolls', value: 200, count: nickelrolls },
          { name: 'dimerolls', value: 500, count: dimerolls },
          { name: 'quarterrolls', value: 1000, count: quarterrolls }
        ];
        // Reduce from the smallest denominations up to keep realism and reach exact cents
        for (let i = 0; i < denom.length && overCents > 0; i++) {
          const d = denom[i];
          if (!d.count || d.count <= 0) continue;
          const maxReduce = Math.min(d.count, Math.floor(overCents / d.value) + (overCents % d.value > 0 ? 1 : 0));
          if (maxReduce <= 0) continue;
          const reduceBy = maxReduce;
          denom[i].count -= reduceBy;
          overCents -= reduceBy * d.value;
        }
        // Recompute denomination counts from adjusted values
        ({ pennies, nickels, dimes, quarters, dollars, fives, tens, twenties, fifties, hundreds, pennyrolls, nickelrolls, dimerolls, quarterrolls } = denom.reduce((acc, d) => { acc[d.name] = d.count; return acc; }, { pennies, nickels, dimes, quarters, dollars, fives, tens, twenties, fifties, hundreds, pennyrolls, nickelrolls, dimerolls, quarterrolls }));
        // Recompute cash total after adjustment
        cashCents = (
          (hundreds * 10000) + (fifties * 5000) + (twenties * 2000) + (tens * 1000) + (fives * 500) + (dollars * 100) +
          (quarters * 25) + (dimes * 10) + (nickels * 5) + (pennies * 1) + (quarterrolls * 1000) + (dimerolls * 500) + (nickelrolls * 200) + (pennyrolls * 50)
        );
        // If still over by a few cents due to lack of small coins, clamp
        if (cashCents + extraCents > targetCents) {
          const diff = (cashCents + extraCents) - targetCents;
          cashCents -= diff;
        }
      }

      // Calculate exactly what we need for base slips and checks after any adjustment
      const adjustedCashTotal = fromCents(cashCents);
      const neededForBalance = Math.max(0, targetTotal - adjustedCashTotal - extraTotal);

      // Distribute the needed amount between base slips and checks (always non-negative)
      let slipsAmount, checksAmount;
      const slipsPortion = randomFloat(0.4, 0.6); // 40-60% to slips
      slipsAmount = neededForBalance * slipsPortion;
      checksAmount = neededForBalance - slipsAmount;
      
  const base = { drawer, roa, slips: slipsAmount, checks: checksAmount, hundreds, fifties, twenties, tens, fives, dollars, quarters, dimes, nickels, pennies, quarterrolls, dimerolls, nickelrolls, pennyrolls };
      
      const charges = randomFloat(0, 50);
      const netSales = randomFloat(80, 550);
      const totalReceived = randomFloat(100, 600);
      const grossProfitAmount = randomFloat(10, 100);
      const grossProfitPercent = randomFloat(5, 30);
      const numInvoices = randomInt(1, 20);
      const numVoids = randomInt(0, 3);
      
  // The balance should now be ~0 (within rounding tolerance)
  const balance = 0;

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
  } catch (_e) { 
    return seededKeys; 
  }
}
