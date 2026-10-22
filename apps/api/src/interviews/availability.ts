/**
 * Mülakatçıların takviminden boş saat bulma. Saf fonksiyonlar: veritabanını servis okur, burada sadece hesap yapılır.
 * Türkiye 2016'dan beri yaz saati uygulamıyor; iş saatleri sabit UTC+3 ile hesaplanır.
 */

export const TZ_OFFSET_MIN = 180;
const MIN = 60_000;

export interface Busy {
  start: Date;
  end: Date;
}

export interface SlotOptions {
  durationMin: number;
  from: Date;
  days: number;
  /** İş günü başlangıç ve bitiş saati (yerel). */
  dayStart?: number;
  dayEnd?: number;
  stepMin?: number;
  /** Mülakatlar arasında bırakılacak boşluk. */
  bufferMin?: number;
  /** Bu süreden daha yakın saatler önerilmez (adayın hazırlanabilmesi için). */
  noticeHours?: number;
}

/** Yerel takvim günü ve saatinden UTC zamanı üretir. */
export function localTime(y: number, m: number, d: number, hour: number, minute = 0) {
  return new Date(Date.UTC(y, m, d, hour, minute) - TZ_OFFSET_MIN * MIN);
}

/** UTC zamanın yerel takvim bileşenleri. */
export function localParts(date: Date) {
  const l = new Date(date.getTime() + TZ_OFFSET_MIN * MIN);
  return { y: l.getUTCFullYear(), m: l.getUTCMonth(), d: l.getUTCDate(), weekday: l.getUTCDay(), hour: l.getUTCHours(), minute: l.getUTCMinutes() };
}

export function overlaps(a: Busy, b: Busy) {
  return a.start < b.end && b.start < a.end;
}

/** Hafta içi iş saatlerinde, dolu aralıklarla çakışmayan tüm başlangıç saatlerini döndürür. */
export function freeSlots(busy: Busy[], o: SlotOptions): Date[] {
  const { durationMin, from, days, dayStart = 9, dayEnd = 18, stepMin = 30, bufferMin = 15, noticeHours = 12 } = o;
  const earliest = new Date(from.getTime() + noticeHours * 3600_000);
  const padded = busy.map((b) => ({ start: new Date(b.start.getTime() - bufferMin * MIN), end: new Date(b.end.getTime() + bufferMin * MIN) }));
  const out: Date[] = [];
  const today = localParts(from);

  for (let i = 0; i <= days; i++) {
    const day = localTime(today.y, today.m, today.d + i, 12);
    const { y, m, d, weekday } = localParts(day);
    if (weekday === 0 || weekday === 6) continue;
    // Öğle arası (12:30-13:30) mülakat konmaz.
    const lunch = { start: localTime(y, m, d, 12, 30), end: localTime(y, m, d, 13, 30) };
    for (let t = dayStart * 60; t + durationMin <= dayEnd * 60; t += stepMin) {
      const start = localTime(y, m, d, 0, t);
      const slot = { start, end: new Date(start.getTime() + durationMin * MIN) };
      if (start < earliest || overlaps(slot, lunch)) continue;
      if (padded.some((b) => overlaps(slot, b))) continue;
      out.push(start);
    }
  }
  return out;
}

/** Çok sayıda boş saatten her güne sabah/öğleden sonra dağılan, en fazla `max` öneri seçer. */
export function spread(slots: Date[], max = 6, perDay = 2) {
  const byDay = new Map<string, Date[]>();
  for (const s of slots) {
    const p = localParts(s);
    const key = `${p.y}-${p.m}-${p.d}`;
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  const picks: Date[] = [];
  for (const list of byDay.values()) {
    const morning = list.find((s) => localParts(s).hour < 12);
    const afternoon = list.find((s) => localParts(s).hour >= 14) ?? list.find((s) => localParts(s).hour >= 13);
    for (const s of [morning, afternoon].filter((x): x is Date => !!x).slice(0, perDay)) picks.push(s);
    if (picks.length >= max) break;
  }
  return picks.slice(0, max);
}

/** Saatleri yerel güne göre gruplar (arayüzde gün gün göstermek için). */
export function groupByDay(slots: Date[]) {
  const groups = new Map<string, string[]>();
  for (const s of slots) {
    const p = localParts(s);
    const key = `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
    groups.set(key, [...(groups.get(key) ?? []), s.toISOString()]);
  }
  return [...groups.entries()].map(([date, times]) => ({ date, slots: times }));
}

const FMT = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** "24 Ekim Cuma 14:00" gibi, e-posta ve takvim metinleri için. */
export function formatLocal(date: Date) {
  return FMT.format(date);
}
