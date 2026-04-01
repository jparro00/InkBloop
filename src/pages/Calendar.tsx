import CalendarHeader from '../components/calendar/CalendarHeader';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
import { useUIStore } from '../stores/uiStore';

export default function CalendarPage() {
  const calendarView = useUIStore((s) => s.calendarView);

  return (
    <div className="h-full flex flex-col">
      <CalendarHeader />
      {calendarView === 'month' && <MonthView />}
      {calendarView === 'week' && <WeekView />}
      {calendarView === 'day' && <DayView />}
    </div>
  );
}
