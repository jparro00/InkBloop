export default function ThemePage() {
  const swatches = [
    { name: 'accent', value: '#B08CE8' },
    { name: 'accent-dim', value: '#8466B8' },
    { name: 'danger', value: '#CF6679' },
    { name: 'success', value: '#22D3EE' },
    { name: 'today', value: '#E05068' },
    { name: 'bg', value: '#121212' },
    { name: 'surface', value: '#1E1E1E' },
    { name: 'elevated', value: '#272727' },
    { name: 'input', value: '#2C2C2C' },
  ];

  const bookingTypes = [
    { type: 'Regular', color: '#5BA2FF' },
    { type: 'Touch Up', color: '#E8A87C' },
    { type: 'Consultation', color: '#6BB89E' },
    { type: 'Full Day', color: '#D4A65A' },
  ];

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="px-5 pt-6 pb-16 lg:px-8 max-w-xl mx-auto">

        {/* Brand */}
        <div className="flex items-center gap-4 mb-10">
          <img
            src={import.meta.env.BASE_URL + 'inkflow_logo.png'}
            alt="InkFlow"
            className="w-14 h-14 rounded-lg"
          />
          <div>
            <h1 className="font-display text-2xl text-text-p">InkFlow</h1>
            <p className="text-sm text-text-t">Theme Reference</p>
          </div>
        </div>

        {/* Fonts */}
        <section className="mb-10">
          <div className="text-xs text-accent uppercase tracking-wider font-medium mb-4">Fonts</div>

          <div className="mb-6">
            <div className="text-xs text-text-t mb-2">Display &mdash; DM Serif Display</div>
            <p className="font-display text-2xl text-text-p">April 2026</p>
            <p className="font-display text-xl text-text-s">New Booking</p>
            <p className="font-display text-lg text-text-t">Settings</p>
          </div>

          <div>
            <div className="text-xs text-text-t mb-2">UI &mdash; System Stack</div>
            <p className="text-md text-text-p">Sarah Mitchell &middot; Regular</p>
            <p className="text-base text-text-s">10:00 AM &mdash; 1:00 PM (3h)</p>
            <p className="text-sm text-text-t">Estimate: $450 &middot; Confirmed</p>
          </div>
        </section>

        {/* Colors */}
        <section className="mb-10">
          <div className="text-xs text-accent uppercase tracking-wider font-medium mb-4">Colors</div>
          <div className="flex flex-wrap gap-3 mb-5">
            {swatches.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md border border-border/30 shrink-0" style={{ background: s.value }} />
                <div>
                  <div className="text-xs text-text-s">{s.name}</div>
                  <div className="text-xs text-text-t font-mono">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-text-t mb-2">Booking types</div>
          <div className="flex flex-wrap gap-2">
            {bookingTypes.map((b) => (
              <div key={b.type} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/30" style={{ borderLeftWidth: 3, borderLeftColor: b.color, backgroundColor: `${b.color}12` }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="text-sm text-text-p">{b.type}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Components */}
        <section className="mb-10">
          <div className="text-xs text-accent uppercase tracking-wider font-medium mb-4">Components</div>

          {/* Buttons */}
          <div className="mb-5">
            <div className="text-xs text-text-t mb-2">Buttons</div>
            <div className="flex flex-wrap gap-3">
              <button className="px-5 py-2.5 bg-accent text-bg rounded-md font-medium shadow-glow active:shadow-glow-strong press-scale cursor-pointer text-sm">Save Booking</button>
              <button className="px-5 py-2.5 rounded-md border border-border/60 text-text-s text-sm press-scale cursor-pointer">Cancel</button>
              <button className="px-5 py-2.5 text-accent text-sm press-scale cursor-pointer">View Profile</button>
              <button className="px-5 py-2.5 bg-accent text-bg rounded-md font-medium opacity-40 cursor-not-allowed text-sm">Disabled</button>
            </div>
          </div>

          {/* Inputs */}
          <div className="mb-5">
            <div className="text-xs text-text-t mb-2">Inputs</div>
            <div className="space-y-2">
              <input className="w-full bg-input border border-border/60 rounded-md px-4 py-3 text-base text-text-p placeholder:text-text-t focus:outline-none focus:border-accent/40 transition-colors" placeholder="Search clients..." readOnly />
              <input className="w-full bg-input border-2 border-danger/60 rounded-md px-4 py-3 text-base text-text-p placeholder:text-text-t" placeholder="Required field" readOnly />
            </div>
          </div>

          {/* Sample card */}
          <div className="mb-5">
            <div className="text-xs text-text-t mb-2">Booking card</div>
            <div
              className="p-4 rounded-lg border border-border/30"
              style={{ borderLeftWidth: 3, borderLeftColor: '#5BA2FF', backgroundColor: '#5BA2FF12' }}
            >
              <div className="text-base text-text-p font-medium">Sarah Mitchell</div>
              <div className="text-sm text-text-s mt-1">10:00 AM &middot; Regular &middot; 3h</div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="mb-5">
            <div className="text-xs text-text-t mb-2">Tab bar</div>
            <div className="bg-surface/80 border border-border/60 rounded-lg p-3">
              <div className="flex items-center justify-around">
                {[
                  { label: 'Calendar', active: true },
                  { label: 'Clients', active: false },
                  { label: 'Messages', active: false },
                  { label: 'Settings', active: false },
                ].map((tab) => (
                  <div
                    key={tab.label}
                    className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-lg ${tab.active ? 'text-accent' : 'text-text-t'}`}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      style={tab.active ? { filter: 'drop-shadow(0 0 6px rgba(176,140,232,0.5)) drop-shadow(0 0 14px rgba(176,140,232,0.25))' } : undefined}
                    >
                      {tab.label === 'Calendar' && <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>}
                      {tab.label === 'Clients' && <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>}
                      {tab.label === 'Messages' && <><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></>}
                      {tab.label === 'Settings' && <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>}
                    </svg>
                    <span className="text-xs font-medium">{tab.label}</span>
                    {tab.active && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 pointer-events-none"
                        style={{
                          width: 56,
                          height: 8,
                          background: 'radial-gradient(ellipse 40% 50% at center, rgba(176,140,232,0.9) 0%, rgba(176,140,232,0.4) 30%, rgba(176,140,232,0.1) 60%, transparent 100%)',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status chips */}
          <div>
            <div className="text-xs text-text-t mb-2">Status</div>
            <div className="flex flex-wrap gap-2">
              {['Confirmed', 'Tentative', 'Completed', 'Cancelled'].map((s) => (
                <span key={s} className="px-3 py-2 text-sm rounded-md border border-border/60 text-text-s">{s}</span>
              ))}
            </div>
          </div>
        </section>

        <div className="text-xs text-text-t text-center pt-4 border-t border-border/30">InkFlow v0.1.0</div>
      </div>
    </div>
  );
}
