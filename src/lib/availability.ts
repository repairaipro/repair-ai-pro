/**
 * Availability merge engine.
 *
 * Computes a contractor's real bookable time slots by combining:
 *   1. Default working hours (per weekday)
 *   2. Native calendar day-blocks (available/busy/blocked from ContractorCalendar)
 *   3. Already-booked appointments (across all their jobs)
 *   4. Buffer time between bookings (travel/prep)
 *
 * All times are handled as UTC epoch ms internally; callers format for display.
 */

export interface WorkingHours {
  [day: string]: { enabled: boolean; start: string; end: string }; // start/end = "HH:mm"
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: { enabled: true, start: '08:00', end: '18:00' },
  tue: { enabled: true, start: '08:00', end: '18:00' },
  wed: { enabled: true, start: '08:00', end: '18:00' },
  thu: { enabled: true, start: '08:00', end: '18:00' },
  fri: { enabled: true, start: '08:00', end: '18:00' },
  sat: { enabled: false, start: '09:00', end: '14:00' },
  sun: { enabled: false, start: '09:00', end: '14:00' },
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface BusyBlock {
  startMs: number;
  endMs: number;
}

export interface Slot {
  startMs: number;
  endMs: number;
}

interface GenerateSlotsParams {
  workingHours: WorkingHours;
  dayStatuses: Map<string, 'available' | 'busy' | 'blocked'>; // "YYYY-MM-DD" -> status
  busyBlocks: BusyBlock[]; // existing appointments + external calendar busy times
  jobDurationMinutes: number;
  bufferMinutes: number;
  daysAhead?: number; // how many days to generate, default 14
  slotIntervalMinutes?: number; // granularity of slot start times, default 30
  now?: Date; // for testability
}

export function generateAvailableSlots({
  workingHours,
  dayStatuses,
  busyBlocks,
  jobDurationMinutes,
  bufferMinutes,
  daysAhead = 14,
  slotIntervalMinutes = 30,
  now = new Date(),
}: GenerateSlotsParams): Slot[] {
  const slots: Slot[] = [];
  const durationMs = jobDurationMinutes * 60_000;
  const bufferMs = bufferMinutes * 60_000;

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);

    const dateStr = toDateStr(day);
    const dayStatus = dayStatuses.get(dateStr);

    // Fully blocked days produce no slots
    if (dayStatus === 'blocked') continue;

    const weekday = DAY_KEYS[day.getDay()];
    const hours = workingHours[weekday];
    if (!hours || !hours.enabled) continue;

    const [startH, startM] = hours.start.split(':').map(Number);
    const [endH, endM] = hours.end.split(':').map(Number);

    const dayStart = new Date(day);
    dayStart.setHours(startH, startM, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(endH, endM, 0, 0);

    let cursor = dayStart.getTime();
    // Don't offer slots in the past (today's earlier hours)
    if (dayOffset === 0 && cursor < now.getTime()) {
      cursor = roundUpToInterval(now.getTime(), slotIntervalMinutes);
    }

    while (cursor + durationMs <= dayEnd.getTime()) {
      const slotStart = cursor;
      const slotEnd = cursor + durationMs;

      const overlapsBusy = busyBlocks.some(
        (b) => slotStart < b.endMs + bufferMs && slotEnd + bufferMs > b.startMs
      );

      if (!overlapsBusy) {
        slots.push({ startMs: slotStart, endMs: slotEnd });
      }

      cursor += slotIntervalMinutes * 60_000;
    }
  }

  return slots;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function roundUpToInterval(ms: number, intervalMinutes: number): number {
  const intervalMs = intervalMinutes * 60_000;
  return Math.ceil(ms / intervalMs) * intervalMs;
}

/** Group slots by calendar day for display, e.g. { "2026-07-04": [...] } */
export function groupSlotsByDay(slots: Slot[]): Record<string, Slot[]> {
  const grouped: Record<string, Slot[]> = {};
  for (const slot of slots) {
    const d = new Date(slot.startMs);
    const key = toDateStr(d);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }
  return grouped;
}

/**
 * Fetches a contractor's booked (proposed/accepted) appointments in one
 * query via the `appointments` collectionGroup, filtered by the
 * denormalized `contractorId` field written at appointment-creation time.
 *
 * Replaces the older pattern of fetching every job claimed by the
 * contractor and then querying each job's appointments subcollection
 * individually (N+1 reads on every booking-picker page load).
 */
export async function fetchContractorBusyBlocks(
  adminDb: FirebaseFirestore.Firestore,
  contractorId: string
): Promise<BusyBlock[]> {
  const apptsSnap = await adminDb
    .collectionGroup('appointments')
    .where('contractorId', '==', contractorId)
    .where('status', 'in', ['proposed', 'accepted'])
    .get();

  const blocks: BusyBlock[] = [];
  apptsSnap.forEach((a) => {
    const data = a.data();
    const startMs = data.startAt?.toDate?.()?.getTime();
    const endMs = data.endAt?.toDate?.()?.getTime();
    if (startMs && endMs) blocks.push({ startMs, endMs });
  });
  return blocks;
}
