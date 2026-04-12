import { useUIStore } from '../../stores/uiStore';

export default function AppHeader() {
  const headerLeft = useUIStore((s) => s.headerLeft);
  const headerRight = useUIStore((s) => s.headerRight);

  return (
    <div className="px-3 pt-4 pb-2 flex items-center shrink-0 relative min-h-[60px]">
      {headerLeft && <div className="z-10">{headerLeft}</div>}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center">
          <img src={`${import.meta.env.BASE_URL}inkflow_logo.png`} alt="Keeps Ink" className="w-7 h-7 absolute -left-9" />
          <span className="font-display text-lg font-bold text-text-p tracking-wide">Keeps Ink</span>
        </div>
      </div>
      {headerRight && <div className="ml-auto z-10">{headerRight}</div>}
    </div>
  );
}
