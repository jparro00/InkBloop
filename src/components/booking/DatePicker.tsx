import { useState, useMemo, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useBookingStore } from '../../stores/bookingStore';

interface DatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (date: string) => void;
  missing?: boolean;
}

function MonthGrid({ month, selectedDate, bookedDays, onSelect }: {
  month: Date;
  selectedDate: Date | null;
  bookedDays: Set<string>;
  onSelect: (day: Date) => void;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="grid grid-cols-7 gap-0 shrink-0" style={{ width: 'calc(100% / 3)' }}>
      {days.map((day) => {
        const inMonth = isSameMonth(day, month);
        const selected = selectedDate && isSameDay(day, selectedDate);
        const today = isToday(day);
        const hasBooking = bookedDays.has(day.toDateString());

        return (
          <button
            type="button"
            key={day.toISOString()}
            onClick={() => onSelect(day)}
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
                hasBooking ? (selected ? 'bg-accent' : 'bg-text-t') : 'bg-transparent'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function DatePicker({ value, onChange, missing }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return startOfMonth(new Date(value + 'T00:00:00'));
    return startOfMonth(new Date());
  });

  const allBookings = useBookingStore((s) => s.bookings);
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const carouselX = useMotionValue(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const pendingMonth = useRef<Date | null>(null);

  const prevMonth = subMonths(viewMonth, 1);
  const nextMonth = addMonths(viewMonth, 1);

  // Get booked days for all 3 visible months
  const bookedDays = useMemo(() => {
    const set = new Set<string>();
    const months = [prevMonth, viewMonth, nextMonth];
    allBookings.forEach((b) => {
      const d = new Date(b.date);
      for (const m of months) {
        if (d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth()) {
          set.add(d.toDateString());
          break;
        }
      }
    });
    return set;
  }, [allBookings, viewMonth, prevMonth, nextMonth]);

  const handleSelect = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const bindSwipe = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [dx], first, last }) => {
      if (first) {
        if (animRef.current && pendingMonth.current) {
          animRef.current.stop();
          setViewMonth(pendingMonth.current);
          pendingMonth.current = null;
          animRef.current = null;
        }
        carouselX.set(0);
      }
      carouselX.set(mx);
      if (last) {
        if (Math.abs(mx) > 40 || vx > 0.3) {
          const dir = dx > 0 ? -1 : 1;
          const w = carouselRef.current?.offsetWidth ?? 300;
          const newMonth = dir === 1 ? addMonths(viewMonth, 1) : subMonths(viewMonth, 1);
          pendingMonth.current = newMonth;
          animRef.current = animate(carouselX, -dir * w, {
            type: 'spring', stiffness: 300, damping: 30, mass: 0.8,
            onComplete: () => {
              setViewMonth(newMonth);
              carouselX.set(0);
              animRef.current = null;
              pendingMonth.current = null;
            },
          });
        } else {
          animate(carouselX, 0, { type: 'spring', stiffness: 400, damping: 30 });
        }
      }
    },
    { axis: 'x', filterTaps: true, threshold: 10, pointer: { touch: true } }
  );

  const displayText = value
    ? format(new Date(value + 'T00:00:00'), 'MMM d, yyyy')
    : 'Select date';

  // Close when clicking outside
  const containerRef = useRef<HTMLDivElement>(null);
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

  return (
    <div ref={containerRef}>
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
        <div className="mt-2 bg-elevated border border-accent/20 rounded-xl p-3 space-y-3 shadow-glow overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-s active:bg-surface cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-text-p">
              {format(viewMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-s active:bg-surface cursor-pointer"
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

          {/* 3-panel carousel */}
          <div {...bindSwipe()} ref={carouselRef} className="overflow-hidden" style={{ touchAction: 'pan-y' }}>
            <motion.div className="flex" style={{ x: carouselX, marginLeft: '-100%' }}>
              <MonthGrid month={prevMonth} selectedDate={selectedDate} bookedDays={bookedDays} onSelect={handleSelect} />
              <MonthGrid month={viewMonth} selectedDate={selectedDate} bookedDays={bookedDays} onSelect={handleSelect} />
              <MonthGrid month={nextMonth} selectedDate={selectedDate} bookedDays={bookedDays} onSelect={handleSelect} />
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
