import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Users, Palette, Settings } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

export const tabs = [
  { to: '/', icon: Calendar, label: 'Calendar' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/theme', icon: Palette, label: 'Theme' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function MobileTabBar() {
  const setCalendarView = useUIStore((s) => s.setCalendarView);
  const setCalendarDate = useUIStore((s) => s.setCalendarDate);
  const location = useLocation();

  const handleTabClick = (to: string) => {
    if (to === '/' && location.pathname === '/') {
      setCalendarView('month');
      setCalendarDate(new Date());
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom">
      <div className="bg-surface/80 backdrop-blur-xl border-t border-border/60">
        <div className="flex items-center justify-around h-20 px-4">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => handleTabClick(to)}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center min-w-[60px] min-h-[48px] px-4 py-2 rounded-lg transition-all duration-200 press-scale ${
                  isActive
                    ? 'text-accent'
                    : 'text-text-t active:text-text-s'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={24}
                    strokeWidth={1.5}
                    style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(var(--accent-rgb),0.5)) drop-shadow(0 0 14px rgba(var(--accent-rgb),0.25))' } : undefined}
                  />
                  <span className="text-xs mt-1 font-medium">{label}</span>
                  {isActive && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 pointer-events-none"
                      style={{
                        width: 56,
                        height: 8,
                        background: 'radial-gradient(ellipse 40% 50% at center, rgba(var(--accent-rgb),0.9) 0%, rgba(var(--accent-rgb),0.4) 30%, rgba(var(--accent-rgb),0.1) 60%, transparent 100%)',
                      }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
