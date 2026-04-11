import { NavLink } from 'react-router-dom';
import { Calendar, Users, Search, Settings } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

const navItems = [
  { to: '/', icon: Calendar, label: 'Calendar', action: undefined },
  { to: '/clients', icon: Users, label: 'Clients', action: undefined },
  { to: '/search', icon: Search, label: 'Search', action: 'search' as const },
  { to: '/settings', icon: Settings, label: 'Settings', action: undefined },
];

export default function Sidebar() {
  const { sidebarCollapsed, setSearchOpen } = useUIStore();

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-surface/90 backdrop-blur-xl border-r border-border/40 z-40 flex-col hidden lg:flex transition-all duration-300 ${
        sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 h-16 border-b border-border/40 ${sidebarCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-accent shrink-0">
          <path d="M12 2C12 2 9.5 8 9 12c-.3 2.5.5 4.5 2 6.5L12 20l1-1.5c1.5-2 2.3-4 2-6.5C14.5 8 12 2 12 2z" fill="currentColor" opacity="0.7"/>
          <path d="M12 18.5c-.3.8-.5 1.8-.4 2.8.05.4.15.7.4.7s.35-.3.4-.7c.1-1-.1-2-.4-2.8z" fill="currentColor"/>
        </svg>
        {!sidebarCollapsed && (
          <span className="font-display text-md text-text-p font-bold tracking-wide">
            InkFlow
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 flex flex-col gap-1 px-3">
        {navItems.map(({ to, icon: Icon, label, action }) => (
          <NavLink
            key={to}
            to={action === 'search' ? '#' : to}
            onClick={
              action === 'search'
                ? (e) => {
                    e.preventDefault();
                    setSearchOpen(true);
                  }
                : undefined
            }
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md transition-all duration-200 ${
                sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'
              } ${
                isActive && action !== 'search'
                  ? 'text-accent bg-accent/8 shadow-glow'
                  : 'text-text-t hover:text-text-s hover:bg-elevated/40'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.5} />
            {!sidebarCollapsed && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
