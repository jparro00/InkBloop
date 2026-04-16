import { useState, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import Modal from '../common/Modal';
import { useClientStore } from '../../stores/clientStore';
import { useUIStore } from '../../stores/uiStore';
import { fetchAvailableProfiles } from '../../services/clientService';
import type { Client, LinkedProfile } from '../../types';

interface ClientFormProps {
  client?: Client;
  onClose: () => void;
}

function PlatformLinkField({
  label,
  platform,
  currentPsid,
  linkedProfiles,
  allClients,
  onLink,
  onUnlink,
}: {
  label: string;
  platform: 'instagram' | 'messenger';
  currentPsid?: string;
  linkedProfiles: Record<string, LinkedProfile>;
  allClients: Client[];
  onLink: (psid: string) => void;
  onUnlink: () => void;
}) {
  const [profiles, setProfiles] = useState<LinkedProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const linkedProfile = currentPsid ? linkedProfiles[currentPsid] : undefined;

  // Which PSIDs are already linked to other clients on this platform
  const takenPsids = new Set(
    allClients
      .map((c) => (platform === 'instagram' ? c.instagram : c.facebook))
      .filter(Boolean)
  );

  const loadProfiles = async () => {
    if (loaded) return;
    const p = await fetchAvailableProfiles(platform);
    setProfiles(p);
    setLoaded(true);
  };

  const handleOpen = () => {
    setOpen(true);
    loadProfiles();
  };

  const available = profiles.filter((p) => !takenPsids.has(p.psid) || p.psid === currentPsid);

  const labelClass = "text-sm text-text-t uppercase tracking-wider mb-2 block font-medium";

  if (currentPsid && linkedProfile) {
    return (
      <div>
        <label className={labelClass}>{label}</label>
        <div className="flex items-center gap-2 bg-input border border-border/60 rounded-md px-4 py-3 min-h-[48px]">
          {linkedProfile.profilePic && (
            <img src={linkedProfile.profilePic} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
          )}
          <span className="text-base text-text-p flex-1 truncate">{linkedProfile.name}</span>
          <button
            type="button"
            onClick={onUnlink}
            className="text-text-t hover:text-danger transition-colors cursor-pointer press-scale p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className={labelClass}>{label}</label>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between bg-input border border-border/60 rounded-md px-4 py-3.5 text-base text-text-t cursor-pointer hover:border-border-s transition-colors min-h-[48px]"
      >
        <span>Link from messages...</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-elevated border border-border/60 rounded-lg shadow-md z-20 max-h-48 overflow-y-auto">
            {available.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-t">
                {loaded ? 'No available threads' : 'Loading...'}
              </div>
            ) : (
              available.map((p) => (
                <button
                  key={p.psid}
                  type="button"
                  onClick={() => {
                    onLink(p.psid);
                    setOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-surface active:bg-surface transition-colors cursor-pointer press-scale"
                >
                  {p.profilePic ? (
                    <img src={p.profilePic} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-medium shrink-0">
                      {p.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-text-p truncate">{p.name}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ClientForm({ client, onClose }: ClientFormProps) {
  const addClient = useClientStore((s) => s.addClient);
  const updateClient = useClientStore((s) => s.updateClient);
  const linkedProfiles = useClientStore((s) => s.linkedProfiles);
  const allClients = useClientStore((s) => s.clients);
  const pendingChanges = useUIStore((s) => s.pendingClientChanges);
  const changedFields = useUIStore((s) => s.changedClientFields);

  const parseDob = (dob: string) => {
    if (!dob) return { dobMonth: '', dobDay: '', dobYear: '' };
    const [y, m, d] = dob.split('-');
    return { dobMonth: String(parseInt(m)), dobDay: String(parseInt(d)), dobYear: y };
  };
  const initDob = parseDob(client?.dob ?? '');
  const defaultYear = String(new Date().getFullYear() - 18);

  // Apply agent's pending changes over existing client data
  const [form, setForm] = useState({
    name: pendingChanges?.name ?? client?.name ?? '',
    display_name: client?.display_name ?? '',
    phone: pendingChanges?.phone ?? client?.phone ?? '',
    dobMonth: initDob.dobMonth,
    dobDay: initDob.dobDay,
    dobYear: initDob.dobYear || defaultYear,
    tags: pendingChanges?.tags?.join(', ') ?? client?.tags.join(', ') ?? '',
  });

  const [igPsid, setIgPsid] = useState<string | undefined>(client?.instagram);
  const [fbPsid, setFbPsid] = useState<string | undefined>(client?.facebook);

  const dirty = useMemo(() => {
    if (!client) return (
      form.name !== '' ||
      form.display_name !== '' ||
      form.phone !== '' ||
      form.dobMonth !== '' ||
      form.dobDay !== '' ||
      form.dobYear !== defaultYear ||
      form.tags !== '' ||
      igPsid !== undefined ||
      fbPsid !== undefined
    );
    return (
      form.name !== (client.name ?? '') ||
      form.display_name !== (client.display_name ?? '') ||
      form.phone !== (client.phone ?? '') ||
      form.dobMonth !== initDob.dobMonth ||
      form.dobDay !== initDob.dobDay ||
      form.tags !== (client.tags.join(', ') ?? '') ||
      igPsid !== client.instagram ||
      fbPsid !== client.facebook
    );
  }, [form, igPsid, fbPsid, client, initDob]);

  // If we just linked a new PSID, fetch its profile so it shows immediately
  const fetchLinkedProfilesForNew = async (psids: string[]) => {
    const { fetchLinkedProfiles } = await import('../../services/clientService');
    const newProfiles = await fetchLinkedProfiles(psids);
    useClientStore.setState((s) => ({
      linkedProfiles: { ...s.linkedProfiles, ...newProfiles },
    }));
  };

  const dobValue =
    form.dobMonth && form.dobDay && form.dobYear
      ? `${form.dobYear}-${form.dobMonth.padStart(2, '0')}-${form.dobDay.padStart(2, '0')}`
      : '';

  const isValid = form.name.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    const data = {
      name: form.name,
      display_name: form.display_name || undefined,
      phone: form.phone || undefined,
      instagram: igPsid || undefined,
      facebook: fbPsid || undefined,
      dob: dobValue || undefined,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      if (client) {
        // Explicitly clear unlinked fields
        const updates: Partial<Client> = { ...data };
        if (!igPsid && client.instagram) updates.instagram = undefined;
        if (!fbPsid && client.facebook) updates.facebook = undefined;
        await updateClient(client.id, updates);
      } else {
        await addClient(data);
      }
    } catch (e) {
      console.error('Failed to save client:', e);
    }
    onClose();
  };

  const inputClass =
    'w-full bg-input border border-border/60 rounded-md px-4 py-3.5 text-base text-text-p placeholder:text-text-t focus:outline-none focus:border-accent/40 transition-colors min-h-[48px]';
  const changedInputClass =
    'w-full bg-input border border-accent/60 rounded-md px-4 py-3.5 text-base text-text-p placeholder:text-text-t focus:outline-none focus:border-accent/40 transition-colors min-h-[48px]';
  const labelClass = 'text-sm text-text-t uppercase tracking-wider mb-2 block font-medium';
  const changedLabel = (field: string, text: string) => (
    <label className={labelClass}>
      {text}
      {changedFields.has(field) && (
        <span className="ml-2 text-accent text-xs normal-case tracking-normal font-normal">AI updated</span>
      )}
    </label>
  );

  return (
    <Modal title={client ? 'Edit Client' : 'New Client'} onClose={onClose} width="lg:max-w-[520px]" canCollapse={dirty}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            {changedLabel('name', 'Name *')}
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={changedFields.has('name') ? changedInputClass : inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Display Name</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="What you call them"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          {changedLabel('phone', 'Phone')}
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={changedFields.has('phone') ? changedInputClass : inputClass}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PlatformLinkField
            label="Instagram"
            platform="instagram"
            currentPsid={igPsid}
            linkedProfiles={linkedProfiles}
            allClients={allClients}
            onLink={(psid) => {
              setIgPsid(psid);
              fetchLinkedProfilesForNew([psid]);
            }}
            onUnlink={() => setIgPsid(undefined)}
          />
          <PlatformLinkField
            label="Facebook"
            platform="messenger"
            currentPsid={fbPsid}
            linkedProfiles={linkedProfiles}
            allClients={allClients}
            onLink={(psid) => {
              setFbPsid(psid);
              fetchLinkedProfilesForNew([psid]);
            }}
            onUnlink={() => setFbPsid(undefined)}
          />
        </div>

        <div>
          <label className={labelClass}>Date of Birth</label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={form.dobMonth}
              onChange={(e) => setForm((f) => ({ ...f, dobMonth: e.target.value }))}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Month</option>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                (m, i) => (
                  <option key={i} value={String(i + 1)}>
                    {m}
                  </option>
                )
              )}
            </select>
            <select
              value={form.dobDay}
              onChange={(e) => setForm((f) => ({ ...f, dobDay: e.target.value }))}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i} value={String(i + 1)}>
                  {i + 1}
                </option>
              ))}
            </select>
            <select
              value={form.dobYear}
              onChange={(e) => setForm((f) => ({ ...f, dobYear: e.target.value }))}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Year</option>
              {Array.from({ length: 100 }, (_, i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div>
          {changedLabel('tags', 'Tags (comma separated)')}
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="returning, cover-up specialist"
            className={changedFields.has('tags') ? changedInputClass : inputClass}
          />
        </div>

        <div className="flex flex-col lg:flex-row lg:justify-end gap-3 pt-4 border-t border-border/40">
          <button
            onClick={onClose}
            className="hidden lg:block px-4 py-2.5 text-sm text-text-s hover:text-text-p transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="w-full lg:w-auto px-6 py-4 lg:py-2.5 text-base bg-accent text-bg rounded-md font-medium cursor-pointer press-scale transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-glow active:shadow-glow-strong min-h-[52px]"
          >
            {client ? 'Update Client' : 'Add Client'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
