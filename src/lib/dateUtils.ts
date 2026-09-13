// Bikram Sambat (BS) <-> Gregorian (AD) Date Converter Utility
// Covers BS years 2075 to 2090 with accurate day counts per month

export const BS_MONTH_NAMES = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

// Days in each month for BS years 2075-2090
const BS_CALENDAR_DATA: Record<number, number[]> = {
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2088: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};

// Reference point: 2075-01-01 BS corresponds to 2018-04-14 AD
const REF_BS_YEAR = 2075;
const REF_BS_MONTH = 1;
const REF_BS_DAY = 1;
const REF_AD_DATE = new Date(Date.UTC(2018, 3, 14)); // 2018-04-14 (month index 3 is April)

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function adToBs(adDateString: string): string {
  try {
    if (!adDateString) return '';
    const parts = adDateString.split('-');
    if (parts.length < 3) return '';
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const targetAd = new Date(Date.UTC(year, month, day));
    let diffDays = Math.round((targetAd.getTime() - REF_AD_DATE.getTime()) / MS_PER_DAY);

    if (diffDays < 0) {
      // Fallback rough estimate if before 2075
      const estYear = year + 57;
      return `${estYear}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    }

    let bsYear = REF_BS_YEAR;
    let bsMonth = REF_BS_MONTH;
    let bsDay = REF_BS_DAY;

    while (diffDays > 0) {
      const daysInYearData = BS_CALENDAR_DATA[bsYear];
      if (!daysInYearData) {
        // approximate 365
        diffDays -= 365;
        bsYear++;
        continue;
      }
      const daysInMonth = daysInYearData[bsMonth - 1];
      if (diffDays >= daysInMonth - (bsDay - 1)) {
        diffDays -= daysInMonth - (bsDay - 1);
        bsDay = 1;
        bsMonth++;
        if (bsMonth > 12) {
          bsMonth = 1;
          bsYear++;
        }
      } else {
        bsDay += diffDays;
        diffDays = 0;
      }
    }

    return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export function bsToAd(bsDateString: string): string {
  try {
    if (!bsDateString) return '';
    const parts = bsDateString.split('-');
    if (parts.length < 3) return '';
    const bsYear = parseInt(parts[0], 10);
    const bsMonth = parseInt(parts[1], 10);
    const bsDay = parseInt(parts[2], 10);

    if (isNaN(bsYear) || isNaN(bsMonth) || isNaN(bsDay)) return '';

    let totalDays = 0;
    if (bsYear < REF_BS_YEAR) {
      // Approximate backward
      const diffYears = REF_BS_YEAR - bsYear;
      const targetTime = REF_AD_DATE.getTime() - diffYears * 365.25 * MS_PER_DAY;
      const d = new Date(targetTime);
      return d.toISOString().split('T')[0];
    }

    for (let y = REF_BS_YEAR; y < bsYear; y++) {
      const monthData = BS_CALENDAR_DATA[y] || [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];
      totalDays += monthData.reduce((acc, curr) => acc + curr, 0);
    }

    const currentYearData = BS_CALENDAR_DATA[bsYear] || [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];
    for (let m = 1; m < bsMonth; m++) {
      totalDays += currentYearData[m - 1];
    }
    totalDays += bsDay - REF_BS_DAY;

    const adTime = REF_AD_DATE.getTime() + totalDays * MS_PER_DAY;
    const adDate = new Date(adTime);
    return adDate.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function getCurrentAdDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getCurrentBsDate(): string {
  return adToBs(getCurrentAdDate());
}

export function formatBsDateFriendly(bsDate: string): string {
  if (!bsDate) return '';
  const parts = bsDate.split('-');
  if (parts.length < 3) return bsDate;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = BS_MONTH_NAMES[monthIdx] || parts[1];
  return `${parts[2]} ${monthName} ${parts[0]}`;
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNPR(amount: number): string {
  return `रू ${formatCurrency(amount)}`;
}
