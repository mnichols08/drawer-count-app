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
      const twenties = randomInt(0, Math.min(15, Math.floor(cashAfterFifties / 40)));
      const tens = randomInt(0, Math.min(20, Math.floor(cashAfterFifties / 20)));
      const fives = randomInt(0, Math.min(25, Math.floor(cashAfterFifties / 10)));
      const dollars = randomInt(0, Math.min(40, Math.floor(cashAfterFifties / 5)));
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
      
      // Calculate exactly what we need for base slips and checks
      const neededForBalance = targetTotal - cashTotal - extraTotal;
      
      // Distribute the needed amount between base slips and checks
      // If neededForBalance is negative, we need to set minimal amounts
      let slipsAmount, checksAmount;
      if (neededForBalance >= 0) {
        const slipsPortion = randomFloat(0.4, 0.6); // 40-60% to slips
        slipsAmount = neededForBalance * slipsPortion;
        checksAmount = neededForBalance - slipsAmount;
      } else {
        // When cash already exceeds target, set minimal slip/check amounts
        slipsAmount = randomFloat(10, 30);
        checksAmount = randomFloat(5, 20);
      }
      
      const base = { drawer, roa, slips: slipsAmount, checks: checksAmount, hundreds, fifties, twenties, tens, fives, dollars, quarters, dimes, nickels, pennies, quarterrolls, dimerolls, nickelrolls, pennyrolls };
      
      const charges = randomFloat(0, 50);
      const netSales = randomFloat(80, 550);
      const totalReceived = randomFloat(100, 600);
      const grossProfitAmount = randomFloat(10, 100);
      const grossProfitPercent = randomFloat(5, 30);
      const numInvoices = randomInt(1, 20);
      const numVoids = randomInt(0, 3);
      
      // The balance should now be close to 0 (within rounding tolerance)
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
