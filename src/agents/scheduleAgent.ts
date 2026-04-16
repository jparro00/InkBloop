import { useBookingStore } from '../stores/bookingStore';
import { useAgentStore } from '../stores/agentStore';
import { scheduleConfig } from './scheduleConfig';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays } from 'date-fns';
import type { Booking } from '../types';
import type { ResolvedScheduleQuery } from './types';

/**
 * Schedule Agent — computes everything locally from bookingStore data.
 * No AI call, no DB call. Panel stays open for follow-up queries.
 */

export function executeScheduleQuery(data: ResolvedScheduleQuery) {
  const store = useAgentStore.getState();
  const bookings = useBookingStore.getState().bookings;

  const now = new Date();
  const rangeStart = data.date_range_start ? new Date(data.date_range_start) : startOfWeek(now, { weekStartsOn: 1 });
  const rangeEnd = data.date_range_end ? new Date(data.date_range_end) : endOfWeek(now, { weekStartsOn: 1 });

  // Filter bookings in range (exclude cancelled/no-show)
  const inRange = bookings.filter((b) => {
    const d = new Date(b.date);
    return (
      d >= rangeStart &&
      d <= rangeEnd &&
      b.status !== 'Cancelled' &&
      b.status !== 'No-show'
    );
  });

  // Further filter by booking type if specified
  const filtered = data.booking_type
    ? inRange.filter((b) => b.type.toLowerCase() === data.booking_type!.toLowerCase())
    : inRange;

  const rangeLabel = formatRange(rangeStart, rangeEnd);

  switch (data.query_type) {
    case 'count': {
      const typeLabel = data.booking_type ?? 'booking';
      const plural = filtered.length === 1 ? typeLabel : `${typeLabel}s`;
      store.replaceLastLoading({
        text: `You have **${filtered.length} ${plural}** ${rangeLabel}.`,
        scheduleData: {
          type: 'count',
          count: filtered.length,
          bookings: filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        },
      });
      break;
    }

    case 'list': {
      const sorted = filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sorted.length === 0) {
        store.replaceLastLoading({
          text: `No bookings ${rangeLabel}.`,
          scheduleData: { type: 'list', bookings: [] },
        });
      } else {
        store.replaceLastLoading({
          text: `${sorted.length} booking${sorted.length === 1 ? '' : 's'} ${rangeLabel}:`,
          scheduleData: { type: 'list', bookings: sorted },
        });
      }
      break;
    }

    case 'available': {
      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      const { workingDays, workingHours, minGapForAvailable } = scheduleConfig;
      const [startH, startM] = workingHours.start.split(':').map(Number);
      const [endH, endM] = workingHours.end.split(':').map(Number);

      const availableDays: string[] = [];

      for (const day of days) {
        const dow = day.getDay();
        if (!workingDays.includes(dow)) continue;

        const dayBookings = inRange
          .filter((b) => {
            const bd = new Date(b.date);
            return bd.toISOString().split('T')[0] === format(day, 'yyyy-MM-dd');
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (dayBookings.length === 0) {
          availableDays.push(format(day, 'EEEE, MMM d'));
          continue;
        }

        // Calculate biggest gap
        const biggestGap = findBiggestGap(dayBookings, startH, startM, endH, endM);
        if (biggestGap >= minGapForAvailable) {
          availableDays.push(format(day, 'EEEE, MMM d'));
        }
      }

      if (availableDays.length === 0) {
        store.replaceLastLoading({
          text: `No available days ${rangeLabel} based on your schedule config.`,
          scheduleData: { type: 'available' },
        });
      } else {
        store.replaceLastLoading({
          text: `Available days ${rangeLabel}:`,
          scheduleData: {
            type: 'available',
            summary: availableDays.map((d) => `• ${d}`).join('\n'),
          },
        });
      }
      break;
    }

    case 'summary': {
      const byType: Record<string, { count: number; hours: number }> = {};
      let totalHours = 0;
      for (const b of filtered) {
        if (!byType[b.type]) byType[b.type] = { count: 0, hours: 0 };
        byType[b.type].count++;
        byType[b.type].hours += b.duration;
        totalHours += b.duration;
      }

      const lines = Object.entries(byType)
        .map(([type, data]) => `• ${type}: ${data.count} (${data.hours}h)`)
        .join('\n');

      store.replaceLastLoading({
        text: `Schedule summary ${rangeLabel}:`,
        scheduleData: {
          type: 'summary',
          count: filtered.length,
          summary: `${lines}\n\nTotal: ${filtered.length} bookings, ${totalHours}h`,
          bookings: filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        },
      });
      break;
    }
  }
}

function findBiggestGap(
  bookings: Booking[],
  startH: number,
  startM: number,
  endH: number,
  endM: number
): number {
  const dayStart = startH * 60 + startM;
  const dayEnd = endH * 60 + endM;

  // Convert bookings to minute ranges
  const slots = bookings.map((b) => {
    const d = new Date(b.date);
    const start = d.getHours() * 60 + d.getMinutes();
    const end = start + b.duration * 60;
    return { start, end };
  });

  let maxGap = 0;
  let cursor = dayStart;

  for (const slot of slots) {
    if (slot.start > cursor) {
      maxGap = Math.max(maxGap, slot.start - cursor);
    }
    cursor = Math.max(cursor, slot.end);
  }

  // Gap after last booking
  if (dayEnd > cursor) {
    maxGap = Math.max(maxGap, dayEnd - cursor);
  }

  return maxGap / 60; // Convert to hours
}

function formatRange(start: Date, end: Date): string {
  const now = new Date();
  const startDay = format(start, 'yyyy-MM-dd');
  const endDay = format(end, 'yyyy-MM-dd');
  const todayStr = format(now, 'yyyy-MM-dd');

  // Same day
  if (startDay === endDay) {
    if (startDay === todayStr) return 'today';
    const tomorrow = addDays(now, 1);
    if (startDay === format(tomorrow, 'yyyy-MM-dd')) return 'tomorrow';
    return `on ${format(start, 'EEEE, MMM d')}`;
  }

  // This week
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  if (startDay === weekStart && endDay === weekEnd) return 'this week';

  return `from ${format(start, 'MMM d')} to ${format(end, 'MMM d')}`;
}
