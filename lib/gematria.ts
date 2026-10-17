/** SKOOBY Gematria Calendar — symbolic only. Not a trading signal. */
export type Cipher = 'english-ordinal' | 'english-reduction' | 'english-reverse' | 'hebrew-standard' | 'hebrew-gadol';
const HEBREW_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת';
const HEBREW_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400];
const HEBREW_FINAL: Record<string, [number, number]> = {'ך': [20, 500], 'ם': [40, 600], 'ן': [50, 700], 'ף': [80, 800], 'ץ': [90, 900]};
export function digitRoot(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Expected a nonnegative integer');
  return value === 0 ? 0 : 1 + ((value - 1) % 9);
}
export function gematriaValue(text: string, cipher: Cipher): number {
  if (cipher.startsWith('hebrew-')) {
    const letters = text.normalize('NFKD').replace(/[\u0591-\u05C7]/g, '');
    const values = [...letters].flatMap((ch) => {
      const index = HEBREW_LETTERS.indexOf(ch);
      if (index !== -1) return [HEBREW_VALUES[index]];
      if (HEBREW_FINAL[ch]) return [HEBREW_FINAL[ch][cipher === 'hebrew-gadol' ? 1 : 0]];
      return [];
    });
    if (!values.length) throw new Error('Enter a name written in Hebrew script for this cipher.');
    return values.reduce((a, b) => a + b, 0);
  }
  const letters: string[] = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().match(/[A-Z]/g) ?? [];
  if (!letters.length) throw new Error('Enter a name using Latin letters for an English cipher.');
  return letters.reduce((total, ch) => {
    const n = ch.charCodeAt(0) - 64;
    return total + (cipher === 'english-reverse' ? 27 - n : cipher === 'english-reduction' ? digitRoot(n) : n);
  }, 0);
}
function parseISODate(iso: string): { year: number; month: number; day: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Enter a valid birth date.');
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('Enter a valid birth date.');
  return {year, month, day};
}
function dateDigits(iso: string): number {
  return [...iso.replace(/-/g, '')].reduce((sum, n) => sum + Number(n), 0);
}
export function lifePathNumber(birthDate: string): number {
  parseISODate(birthDate);
  return digitRoot(dateDigits(birthDate));
}
/** Calendar-year personal-day numerology. Distinct from historical gematria. */
export function personalDayNumber(birthDate: string, targetDate: string): number {
  const born = parseISODate(birthDate);
  const target = parseISODate(targetDate);
  const personalYear = digitRoot(born.month + born.day + digitRoot(target.year));
  const personalMonth = digitRoot(personalYear + target.month);
  return digitRoot(personalMonth + target.day);
}
function isoFromUTC(date: Date): string {
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}
function todayInZone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now);
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? '';
  return [get('year'), get('month'), get('day')].join('-');
}
export type SymbolicWindow = {date: string; localTime: string; personalDay: number; timeRoot: number; matchScore: number; explanations: string[]};
export function getSymbolicCalendar(input: {
  name: string; hebrewName?: string; focusPhrase?: string; birthDate: string;
  cipher: Cipher; timezone: string; now?: Date;
}): {nameValue: number; nameRoot: number; lifePath: number; focusRoot: number | null; windows: SymbolicWindow[]} {
  const nameValue = gematriaValue(input.cipher.startsWith('hebrew-') ? (input.hebrewName ?? '') : input.name, input.cipher);
  const nameRoot = digitRoot(nameValue);
  const lifePath = lifePathNumber(input.birthDate);
  const focusRoot = input.focusPhrase?.trim() ? digitRoot(gematriaValue(input.focusPhrase, input.cipher)) : null;
  const today = todayInZone(input.now ?? new Date(), input.timezone);
  if (input.birthDate > today) throw new Error('Birth date cannot be in the future.');
  const start = parseISODate(today);
  const anchor = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const windows: SymbolicWindow[] = [];
  for (let offset = 1; offset <= 30; offset += 1) {
    const current = new Date(anchor.getTime());
    current.setUTCDate(current.getUTCDate() + offset);
    const date = isoFromUTC(current);
    const personalDay = personalDayNumber(input.birthDate, date);
    let best: SymbolicWindow | null = null;
    for (let hour = 9; hour <= 20; hour += 1) {
      for (const minute of [0, 15, 30, 45]) {
        const timeRoot = digitRoot(hour * 100 + minute);
        const explanations: string[] = [];
        let matchScore = 0;
        if (personalDay === nameRoot) {matchScore += 4; explanations.push('Personal day matches name root');}
        if (personalDay === lifePath) {matchScore += 3; explanations.push('Personal day matches life path');}
        if (timeRoot === nameRoot) {matchScore += 2; explanations.push('Clock digits match name root');}
        if (timeRoot === lifePath) {matchScore += 2; explanations.push('Clock digits match life path');}
        if (focusRoot !== null && personalDay === focusRoot) {matchScore += 1; explanations.push('Personal day matches focus phrase');}
        const candidate: SymbolicWindow = {
          date, localTime: [String(hour).padStart(2, '0'), String(minute).padStart(2, '0')].join(':'),
          personalDay, timeRoot, matchScore, explanations,
        };
        if (!best || candidate.matchScore > best.matchScore) best = candidate;
      }
    }
    if (best && best.matchScore >= 4) windows.push(best);
  }
  windows.sort((a, b) => b.matchScore - a.matchScore || a.date.localeCompare(b.date) || a.localTime.localeCompare(b.localTime));
  return {nameValue, nameRoot, lifePath, focusRoot, windows: windows.slice(0, 8)};
}
