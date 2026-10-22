import { freeSlots, groupByDay, localParts, localTime, spread } from "../src/interviews/availability";

// 2026-10-22 Perşembe 08:00 (İstanbul)
const from = localTime(2026, 9, 22, 8);

describe("boş saat bulma", () => {
  it("yalnızca hafta içi iş saatlerini ve öğle arası dışını önerir", () => {
    const slots = freeSlots([], { durationMin: 60, from, days: 4, noticeHours: 0 });
    const parts = slots.map(localParts);
    expect(parts.every((p) => p.weekday >= 1 && p.weekday <= 5)).toBe(true);
    expect(parts.every((p) => p.hour >= 9 && p.hour * 60 + p.minute + 60 <= 18 * 60)).toBe(true);
    // 12:00 başlayan 60 dk'lık mülakat öğle arasına taşar.
    expect(parts.some((p) => p.hour === 12)).toBe(false);
    // Cumartesi-pazar atlanır: Perşembe, Cuma, Pazartesi
    expect(new Set(parts.map((p) => p.d))).toEqual(new Set([22, 23, 26]));
  });

  it("dolu saatleri tampon süresiyle birlikte dışarıda bırakır", () => {
    const busy = [{ start: localTime(2026, 9, 23, 10), end: localTime(2026, 9, 23, 11) }];
    const slots = freeSlots(busy, { durationMin: 30, from, days: 1, noticeHours: 0 });
    const friday = slots.map(localParts).filter((p) => p.d === 23).map((p) => `${p.hour}:${String(p.minute).padStart(2, "0")}`);
    expect(friday).not.toContain("9:30"); // 10:00'a 15 dk tampon kalmıyor
    expect(friday).not.toContain("10:30");
    expect(friday).not.toContain("11:00"); // 11:00 bitişine 15 dk tampon
    expect(friday).toContain("9:00");
    expect(friday).toContain("11:30");
  });

  it("bildirim süresinden yakın saati önermez", () => {
    const slots = freeSlots([], { durationMin: 60, from, days: 1, noticeHours: 12 });
    expect(slots[0].getTime()).toBeGreaterThanOrEqual(from.getTime() + 12 * 3600_000);
  });

  it("önerileri günlere sabah ve öğleden sonra olarak dağıtır", () => {
    const slots = freeSlots([], { durationMin: 60, from, days: 7, noticeHours: 0 });
    const picks = spread(slots, 6).map(localParts);
    expect(picks).toHaveLength(6);
    expect(picks.filter((p) => p.d === 22).map((p) => p.hour)).toEqual([9, 14]);
    expect(groupByDay(slots)[0].date).toBe("2026-10-22");
  });
});
