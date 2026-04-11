import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useBookingStore } from '../../stores/bookingStore';

interface DatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (date: string) => void;
  missing?: boolean;
}

export default function DatePicker({ value, onChange, missing }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return startOfMonth(new Date(value + 'T00:00:00'));
    return startOfMonth(new Date());
  });

  const allBookings = useBookingStore((s) => s.bookings);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  // Get booked days for the visible month
  const bookedDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const set = new Set<string>();
    allBookings.forEach((b) => {
      const d = new Date(b.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        set.add(d.toDateString());
      }
    });
    return set;
  }, [allBookings, viewMonth]);

  // Build calendar grid
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const handleSelect = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const displayText = value
    ? format(new Date(value + 'T00:00:00'), 'MMM d, yyyy')
    : 'Select date';

  return (
    <div>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full bg-input rounded-xl px-4 text-left text-base flex items-center gap-3 transition-colors cursor-pointer ${
          missing
            ? 'border-2 border-danger/60'
            : 'border border-border/60'
        } ${value ? 'text-text-p' : 'text-text-t'}`}
        style={{ height: 48 }}
      >
        <Calendar size={16} className="text-text-t shrink-0" />
        {displayText}
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="mt-2 bg-input border border-border/60 rounded-xl p-3 space-y-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-s active:bg-elevated cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-text-p">
              {format(viewMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-s active:bg-elevated cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-xs text-text-t font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);
              const hasBooking = bookedDays.has(day.toDateString());

              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => handleSelect(day)}
                  className={`flex flex-col items-center justify-center py-1 cursor-pointer rounded-lg transition-colors ${
                    !inMonth ? 'opacity-25' : ''
                  }`}
                >
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
                      selected
                        ? 'bg-accent text-bg font-medium'
                        : today
                        ? 'text-today font-medium'
                        : 'text-text-p'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <span
                    className={`w-1 h-1 rounded-full mt-0.5 ${
                      hasBooking ? (selected ? 'bg-bg' : 'bg-accent') : 'bg-transparent'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
