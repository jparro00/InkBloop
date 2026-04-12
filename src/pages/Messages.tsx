import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

export default function MessagesPage() {
  const { setHeaderLeft, setHeaderRight } = useUIStore();

  useEffect(() => {
    setHeaderLeft(null);
    setHeaderRight(null);
    return () => { setHeaderLeft(null); setHeaderRight(null); };
  }, [setHeaderLeft, setHeaderRight]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-16">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
          <MessageCircle size={32} className="text-accent" />
        </div>
        <h2 className="font-display text-xl font-bold text-text-p mb-2">Still Getting Inked</h2>
        <p className="text-text-s text-center text-base leading-relaxed max-w-[280px]">
          We're still drawing up the design and prepping the stencil for messaging. We'll get you in the chair soon.
        </p>
      </div>
    </div>
  );
}
