import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useClientStore } from '../stores/clientStore';
import { useBookingStore } from '../stores/bookingStore';
import { useUIStore } from '../stores/uiStore';
import ClientForm from '../components/client/ClientForm';
import type { BookingStatus } from '../types';

const statusDot: Record<BookingStatus, string> = {
  Confirmed: 'bg-text-p',
  Tentative: 'bg-[#6B6560]',
  Completed: 'bg-[#3D8C5C]',
  Cancelled: 'bg-[#7A3535]',
  'No-show': 'bg-[#8A6A2A]',
};

type Tab = 'overview' | 'appointments' | 'documents' | 'notes';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useClientStore((s) => s.getClient(id ?? ''));
  const addNote = useClientStore((s) => s.addNote);
  const clientBookings = useBookingStore((s) => s.getBookingsForClient(id ?? ''));
  const { setSelectedBookingId, openBookingForm, setPrefillBookingData } = useUIStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!client) {
    return (
      <div className="p-5">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-text-s active:text-text-p mb-4 cursor-pointer press-scale"
        >
          <ArrowLeft size={18} /> Clients
        </button>
        <div className="text-text-t text-sm">Client not found.</div>
      </div>
    );
  }

  const upcoming = clientBookings.filter(
    (b) => new Date(b.date) > new Date() && b.status !== 'Cancelled'
  );
  const sorted = [...clientBookings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'appointments', label: 'Appts' },
    { key: 'documents', label: 'Docs' },
    { key: 'notes', label: 'Notes' },
  ];

  const handleNewBooking = () => {
    setPrefillBookingData({ client_id: client.id });
    openBookingForm();
  };

  const handleAddNote = () => {
    if (noteText.trim()) {
      addNote(client.id, noteText.trim());
      setNoteText('');
    }
  };

  return (
    <div className="px-4 pt-4 pb-4 lg:px-6 lg:pt-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-text-s active:text-text-p transition-colors cursor-pointer press-scale"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Clients</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-border/60 text-text-s active:text-text-p transition-colors cursor-pointer press-scale"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={handleNewBooking}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent text-bg cursor-pointer press-scale"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Profile */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent text-lg font-medium shrink-0">
          {client.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-xl text-text-p truncate">{client.name}</h1>
          <div className="text-sm text-text-s mt-0.5 truncate">
            {[client.phone, client.instagram].filter(Boolean).join(' · ')}
          </div>
          <div className="text-xs text-text-t mt-1">
            {clientBookings.length} session{clientBookings.length !== 1 ? 's' : ''}
            {upcoming.length > 0 && ` · ${upcoming.length} upcoming`}
            {client.dob && ` · Born ${format(new Date(client.dob), 'MMM d, yyyy')}`}
          </div>
          {client.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {client.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] rounded-md bg-surface text-text-t border border-border/40"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-0 overflow-x-auto border-b border-border/40 mb-5 -mx-4 px-4 lg:mx-0 lg:px-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm transition-colors cursor-pointer whitespace-nowrap border-b-2 ${
              tab === t.key
                ? 'text-accent border-accent'
                : 'text-text-t active:text-text-s border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 max-w-xl">
          {[
            { label: 'Skin Tone', value: client.skin_tone },
            { label: 'Allergies', value: client.allergies },
            { label: 'Date of Birth', value: client.dob ? format(new Date(client.dob), 'MMM d, yyyy') : undefined },
            { label: 'Email', value: client.email },
            { label: 'Instagram', value: client.instagram },
            { label: 'Phone', value: client.phone },
          ]
            .filter((f) => f.value)
            .map((f) => (
              <div key={f.label} className="bg-surface/60 rounded-xl p-4 border border-border/30">
                <div className="text-xs text-text-t uppercase tracking-wider mb-1 font-medium">{f.label}</div>
                <div className="text-sm text-text-p">{f.value}</div>
              </div>
            ))}

          {upcoming.length > 0 && (
            <div className="lg:col-span-2 bg-accent-glow rounded-xl p-4 border border-accent/10">
              <div className="text-xs text-text-t uppercase tracking-wider mb-2 font-medium">Next Appointment</div>
              <button
                onClick={() => setSelectedBookingId(upcoming[0].id)}
                className="text-sm text-text-p active:text-accent transition-colors cursor-pointer press-scale"
              >
                {upcoming[0].type} &middot; {format(new Date(upcoming[0].date), 'MMM d, yyyy h:mm a')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Appointments */}
      {tab === 'appointments' && (
        <div className="space-y-1">
          {sorted.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBookingId(b.id)}
              className="w-full text-left flex items-center gap-3 px-3 py-3.5 rounded-xl active:bg-elevated/40 transition-colors cursor-pointer press-scale"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${statusDot[b.status]} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-p truncate">
                  {b.type}{b.style && ` · ${b.style}`}
                </div>
                <div className="text-xs text-text-s mt-0.5">
                  {format(new Date(b.date), 'MMM d, yyyy')}
                  {b.placement && ` · ${b.placement}`}
                  {` · ${b.duration}h`}
                </div>
              </div>
              <span className="text-xs text-text-t shrink-0">{b.status}</span>
            </button>
          ))}
          {sorted.length === 0 && (
            <div className="text-center py-12 text-text-t text-sm">No appointments yet.</div>
          )}
        </div>
      )}

      {/* Documents */}
      {tab === 'documents' && (
        <div className="text-center py-16 text-text-t text-sm">
          Document uploads available when Supabase Storage is connected.
        </div>
      )}

      {/* Notes */}
      {tab === 'notes' && (
        <div>
          <div className="flex gap-2 mb-5">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="flex-1 bg-input border border-border/60 rounded-xl px-4 py-3 text-sm text-text-p placeholder:text-text-t focus:outline-none focus:border-accent/40 resize-none transition-colors"
            />
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim()}
              className="px-4 bg-accent text-bg text-sm rounded-xl cursor-pointer press-scale transition-all disabled:opacity-40 disabled:cursor-not-allowed self-end py-3"
            >
              Add
            </button>
          </div>

          <div className="space-y-3">
            {client.notes.map((note, i) => (
              <div key={i} className="bg-surface/60 rounded-xl p-4 border border-border/30">
                <div className="text-[10px] text-text-t mb-2 uppercase tracking-wider font-medium">
                  {format(new Date(note.ts), 'MMM d, yyyy h:mm a')}
                </div>
                <div className="text-sm text-text-s leading-relaxed">{note.text}</div>
              </div>
            ))}
            {client.notes.length === 0 && (
              <div className="text-center py-12 text-text-t text-sm">No notes yet.</div>
            )}
          </div>
        </div>
      )}

      {editing && <ClientForm client={client} onClose={() => setEditing(false)} />}
    </div>
  );
}
