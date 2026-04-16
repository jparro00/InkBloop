import type { AgentMessage } from '../../agents/types';
import BookingCard from './BookingCard';

interface ScheduleResponseProps {
  data: NonNullable<AgentMessage['scheduleData']>;
}

export default function ScheduleResponse({ data }: ScheduleResponseProps) {
  return (
    <div className="space-y-2 mt-2">
      {/* Summary text */}
      {data.summary && (
        <div className="text-[14px] text-text-s whitespace-pre-line bg-surface/40 rounded-lg px-3 py-2">
          {data.summary}
        </div>
      )}

      {/* Booking list */}
      {data.bookings && data.bookings.length > 0 && (
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
          {data.bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}
