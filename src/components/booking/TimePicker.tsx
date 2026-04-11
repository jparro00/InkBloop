import { useState, useMemo, useRef, useEffect } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { Clock } from 'lucide-react';
import { useBookingStore } from '../../stores/bookingStore';
import { useClientStore } from '../../stores/clientStore';
import { typeColor } from '../../types';

const HOUR_H = 32;
const START_HOUR = 7;
const END_HOUR = 21;
const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (time: string) => void;
  date: string; // yyyy-MM-dd
  duration: number;
  editingBookingId?: string;
}

export default function TimePicker({ value, onChange, date, duration, editingBookingId }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allBookings = useBookingStore((s) => s.bookings);
  const getClient = useClientStore((s) => s.getClient);

  const selectedDate = date ? new Date(date + 'T00:00:00') : null;

  // Get bookings for the selected date
  const dayBookings = useMemo(() => {
    if (!selectedDate) return [];
    return allBookings
      .filter((b) => {
        if (editingBookingId && b.id === editingBookingId) return false;
        return isSameDay(new Date(b.date), selectedDate);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allBookings, selectedDate, editingBookingId]);

  // Parse selected time
  const [selHour, selMin] = value ? value.split(':').map(Number) : [10, 0];
  const selStart = selHour + selMin / 60;

  // Scroll to show selected time when opening
  useEffect(() => {
    if (open && scrollRef.current) {
      const targetScroll = (selStart - START_HOUR) * HOUR_H - 60;
      scrollRef.current.scrollTop = Math.max(0, targetScroll);
    }
  }, [open, selStart]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);
    const hourFloat = y / HOUR_H + START_HOUR;

    // Snap to nearest 15 minutes
    const snappedHour = Math.floor(hourFloat);
    const snappedMin = Math.round((hourFloat - snappedHour) * 4) * 15;
    const finalMin = snappedMin >= 60 ? 0 : snappedMin;
    const finalHour = snappedMin >= 60 ? snappedHour + 1 : snappedHour;

    if (finalHour >= START_HOUR && finalHour < END_HOUR) {
      onChange(`${String(finalHour).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`);
    }
  };

  const displayText = value
    ? format(new Date(2026, 0, 1, selHour, selMin), 'h:mm a')
    : 'Select time';

  return (
    <div ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full bg-input border border-border/60 rounded-xl px-4 text-left text-base flex items-center gap-3 transition-colors cursor-pointer ${value ? 'text-text-p' : 'text-text-t'}`}
        style={{ height: 48 }}
      >
        <Clock size={16} className="text-text-t shrink-0" />
        {displayText}
      </button>

      {/* Expanded timeline */}
      {open && (
        <div className="mt-2 bg-elevated border border-accent/20 rounded-xl shadow-glow overflow-hidden">
          {/* Date label */}
          {selectedDate && (
            <div className="text-center text-sm text-text-s font-medium py-2 border-b border-border/30">
              {format(selectedDate, 'EEEE, MMM d')}
            </div>
          )}

          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ height: 300 }}
          >
            <div
              className="relative"
              style={{ height: hours.length * HOUR_H }}
              onClick={handleTimelineClick}
            >
              {/* Hour grid */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full flex cursor-pointer"
                  style={{ top: (hour - START_HOUR) * HOUR_H, height: HOUR_H }}
                >
                  <div className="w-12 text-[10px] text-text-t text-right pr-2 shrink-0" style={{ marginTop: -6 }}>
                    {format(new Date(2026, 0, 1, hour), 'h a')}
                  </div>
                  <div className="flex-1 border-t border-border/15" />
                </div>
              ))}

              {/* Current time red line */}
              {selectedDate && isToday(selectedDate) && (() => {
                const now = new Date();
                const currentHour = now.getHours() + now.getMinutes() / 60;
                if (currentHour < START_HOUR || currentHour > END_HOUR) return null;
                const top = (currentHour - START_HOUR) * HOUR_H;
                return (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top, transform: 'translateY(-50%)' }}>
                    <div className="w-12 shrink-0" />
                    <div className="flex-1 h-[2px] bg-today" />
                  </div>
                );
              })()}

              {/* Existing bookings */}
              {dayBookings.map((booking) => {
                const d = new Date(booking.date);
                const startHour = d.getHours() + d.getMinutes() / 60;
                if (startHour < START_HOUR) return null;
                const top = (startHour - START_HOUR) * HOUR_H;
                const height = booking.duration * HOUR_H;
                const client = getClient(booking.client_id ?? '');
                const color = typeColor[booking.type];
                return (
                  <div
                    key={booking.id}
                    className="absolute left-12 right-1 rounded px-2 py-0.5 pointer-events-none overflow-hidden"
                    style={{
                      top,
                      height: Math.max(height, 20),
                      backgroundColor: `${color}20`,
                      borderLeft: `2px solid ${color}`,
                    }}
                  >
                    <div className="text-[10px] text-text-s truncate">
                      {client?.display_name || client?.name || 'Walk-in'}
                    </div>
                  </div>
                );
              })}

              {/* New booking preview */}
              {value && (() => {
                const top = (selStart - START_HOUR) * HOUR_H;
                const height = duration * HOUR_H;
                if (selStart < START_HOUR) return null;
                return (
                  <div
                    className="absolute left-12 right-1 rounded border-2 border-accent/60 pointer-events-none"
                    style={{
                      top,
                      height: Math.max(height, 20),
                      backgroundColor: 'rgba(74, 222, 128, 0.10)',
                    }}
                  >
                    <div className="text-[10px] text-accent font-medium px-2 py-0.5">
                      {format(new Date(2026, 0, 1, selHour, selMin), 'h:mm a')} · {duration}h
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
