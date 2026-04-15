import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { Clock, Check } from 'lucide-react';
import { useBookingStore } from '../../stores/bookingStore';
import { useClientStore } from '../../stores/clientStore';
import { getTypeColor, getTypeColorAlpha } from '../../types';

const HOUR_H = 32;
const VISIBLE_HEIGHT = 280;
const TOTAL_HOURS = 24;

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  date: string;
  duration: number;
  bookingType?: string;
  editingBookingId?: string;
}

export default function TimePicker({ value, onChange, date, duration, bookingType, editingBookingId }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const allBookings = useBookingStore((s) => s.bookings);
  const getClient = useClientStore((s) => s.getClient);

  const selectedDate = date ? new Date(date + 'T00:00:00') : null;

  const dayBookings = useMemo(() => {
    if (!selectedDate) return [];
    return allBookings
      .filter((b) => {
        if (editingBookingId && b.id === editingBookingId) return false;
        return isSameDay(new Date(b.date), selectedDate);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allBookings, selectedDate, editingBookingId]);

  const [selHour, selMin] = value ? value.split(':').map(Number) : [10, 0];
  const selStart = selHour + selMin / 60;

  // The preview block's TOP EDGE is fixed at a point in the visible area.
  // We place it 1/3 down so there's context above.
  const previewOffset = Math.round(VISIBLE_HEIGHT / 3);
  const topPadding = previewOffset;
  const bottomPadding = VISIBLE_HEIGHT - previewOffset;
  const totalScrollHeight = TOTAL_HOURS * HOUR_H + topPadding + bottomPadding;

  // Convert time to scroll position (top edge of preview = selected time)
  const timeToScroll = useCallback((hour: number) => {
    return hour * HOUR_H;
  }, []);

  // Convert scroll position to time
  const scrollToTime = useCallback((scrollTop: number) => {
    const hourFloat = scrollTop / HOUR_H;
    // Snap to 15 minutes, clamp to 0:00 - 23:45
    const totalMins = Math.max(0, Math.min(23 * 60 + 45, Math.round(hourFloat * 4) * 15));
    return { hour: Math.floor(totalMins / 60), min: totalMins % 60 };
  }, []);

  // Set initial scroll position when opening, and scroll picker into view
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = timeToScroll(selStart);
    }
    if (open && containerRef.current) {
      // Delay slightly so the expanded picker is in the DOM
      requestAnimationFrame(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [open]);

  // Sync scroll position when value changes from external input
  const syncScrollToValue = useCallback((time: string) => {
    if (!scrollRef.current) return;
    const [h, m] = time.split(':').map(Number);
    const targetScroll = timeToScroll(h + m / 60);
    scrollRef.current.scrollTop = targetScroll;
  }, [timeToScroll]);

  // Update time on scroll
  const isInputDriven = useRef(false);
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isInputDriven.current) return;
    const { hour, min } = scrollToTime(scrollRef.current.scrollTop);
    onChange(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }, [scrollToTime, onChange]);

  // Parse typed time input (e.g. "2:30 pm", "14:00", "230p")
  const parseTimeInput = useCallback((raw: string): string | null => {
    const s = raw.trim().toLowerCase();
    // Try HH:MM or H:MM with optional am/pm
    const match = s.match(/^(\d{1,2}):?(\d{2})?\s*(a|p|am|pm)?$/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3];
    if (period) {
      if (period.startsWith('p') && h < 12) h += 12;
      if (period.startsWith('a') && h === 12) h = 0;
    }
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    // Snap to nearest 15 min
    const snapped = Math.round(m / 15) * 15;
    const finalM = snapped === 60 ? 0 : snapped;
    const finalH = snapped === 60 ? (h + 1) % 24 : h;
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
  }, []);

  const handleTimeInputConfirm = useCallback((rawValue: string) => {
    const parsed = parseTimeInput(rawValue);
    if (parsed) {
      onChange(parsed);
      if (open) {
        isInputDriven.current = true;
        syncScrollToValue(parsed);
        requestAnimationFrame(() => { isInputDriven.current = false; });
      }
    }
  }, [parseTimeInput, onChange, open, syncScrollToValue]);

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

  const displayText = value
    ? format(new Date(2026, 0, 1, selHour, selMin), 'h:mm a')
    : 'Select time';

  return (
    <div ref={containerRef}>
      {/* Trigger — editable input when open, button when closed */}
      <div className="flex items-center gap-2">
        {open ? (
          <div className="flex-1 relative">
            <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-t shrink-0 pointer-events-none" />
            <input
              ref={timeInputRef}
              type="text"
              defaultValue={displayText}
              onBlur={(e) => handleTimeInputConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTimeInputConfirm((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-full bg-input border border-accent/40 rounded-md pl-11 pr-4 text-left text-base text-text-p focus:outline-none transition-colors"
              style={{ height: 48 }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`flex-1 bg-input border border-border/60 rounded-md px-4 text-left text-base flex items-center gap-3 transition-colors cursor-pointer ${value ? 'text-text-p' : 'text-text-t'}`}
            style={{ height: 48 }}
          >
            <Clock size={16} className="text-text-t shrink-0" />
            {displayText}
          </button>
        )}
        {open && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-12 h-12 rounded-md bg-accent text-bg flex items-center justify-center cursor-pointer press-scale shadow-glow active:shadow-glow-strong shrink-0"
          >
            <Check size={18} />
          </button>
        )}
      </div>

      {/* Expanded scroll picker */}
      {open && (
        <div className="mt-2 bg-elevated border border-accent/20 rounded-lg shadow-glow overflow-hidden relative">
          {/* Date label */}
          {selectedDate && (
            <div className="text-center text-sm text-text-s font-medium py-2 border-b border-border/30">
              {format(selectedDate, 'EEEE, MMM d')}
            </div>
          )}

          {/* Fixed preview block — top edge aligns with selected time */}
          {(() => {
            const bType = (bookingType || 'Regular') as import('../../types').BookingType;
            const previewColor = getTypeColor(bType);
            return (
              <div
                className="absolute left-12 right-3 z-10 pointer-events-none rounded"
                style={{
                  top: (selectedDate ? 37 : 0) + previewOffset,
                  height: Math.max(duration * HOUR_H, 20),
                  backgroundColor: getTypeColorAlpha(bType, 0.09),
                  border: `2px solid ${previewColor}`,
                  borderLeftWidth: 3,
                }}
              >
                <div className="text-2xs font-medium px-2 py-0.5" style={{ color: previewColor }}>
                  {format(new Date(2026, 0, 1, selHour, selMin), 'h:mm a')} · {duration}h
                </div>
              </div>
            );
          })()}

          {/* Scrollable timeline */}
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ height: VISIBLE_HEIGHT }}
            onScroll={handleScroll}
          >
            <div className="relative" style={{ height: totalScrollHeight }}>
              {/* Hour grid */}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => i).map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full flex"
                  style={{ top: topPadding + hour * HOUR_H, height: HOUR_H }}
                >
                  <div className="w-12 text-2xs text-text-t text-right pr-2 shrink-0" style={{ marginTop: -6 }}>
                    {hour > 0 ? format(new Date(2026, 0, 1, hour), 'h a') : '12 AM'}
                  </div>
                  <div className="flex-1 border-t border-border/15" />
                </div>
              ))}

              {/* Current time red line */}
              {selectedDate && isToday(selectedDate) && (() => {
                const now = new Date();
                const currentHour = now.getHours() + now.getMinutes() / 60;
                const top = topPadding + currentHour * HOUR_H;
                return (
                  <div className="absolute left-0 right-0 z-5 pointer-events-none flex items-center" style={{ top, transform: 'translateY(-50%)' }}>
                    <div className="w-12 shrink-0" />
                    <div className="flex-1 h-[2px] bg-today" />
                  </div>
                );
              })()}

              {/* Existing bookings */}
              {dayBookings.map((booking) => {
                const d = new Date(booking.date);
                const startHour = d.getHours() + d.getMinutes() / 60;
                const top = topPadding + startHour * HOUR_H;
                const height = booking.duration * HOUR_H;
                const client = getClient(booking.client_id ?? '');
                const color = getTypeColor(booking.type);
                return (
                  <div
                    key={booking.id}
                    className="absolute left-12 right-1 rounded px-2 py-0.5 pointer-events-none overflow-hidden"
                    style={{
                      top,
                      height: Math.max(height, 20),
                      backgroundColor: getTypeColorAlpha(booking.type, 0.12),
                      borderLeft: `2px solid ${color}`,
                    }}
                  >
                    <div className="text-2xs text-text-s truncate">
                      {client?.display_name || client?.name || 'Walk-in'} · {format(d, 'h:mm a')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
