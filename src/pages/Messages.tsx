import { MessageCircle } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';

export default function MessagesPage() {
  return (
    <div className="h-full flex flex-col">
      <AppHeader />

      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-16">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
          <MessageCircle size={32} className="text-accent" />
        </div>
        <h2 className="font-display text-xl font-bold text-text-p mb-2">Still Getting Inked</h2>
        <p className="text-text-s text-center text-base leading-relaxed max-w-[280px]">
          Client messaging is in the chair right now. Sit tight — no walk-ins on this feature just yet.
        </p>
      </div>
    </div>
  );
}
