import { useState } from 'react';
import Modal, { useModalDismiss } from '../common/Modal';
import { useClientStore } from '../../stores/clientStore';

export interface CreateClientInitialData {
  name?: string;
  instagram?: string;
  facebook?: string;
}

interface CreateClientFormProps {
  onClose: () => void;
  initialData?: CreateClientInitialData;
  onCreated?: (clientId: string) => void;
}

const inputClass = "w-full bg-input border border-border/60 rounded-md px-4 py-3.5 text-base text-text-p placeholder:text-text-t focus:outline-none focus:border-accent/40 transition-colors min-h-[48px]";
const labelClass = "text-sm text-text-t uppercase tracking-wider mb-2 block font-medium";

function CreateClientFormContent({ initialData, onCreated }: { initialData?: CreateClientInitialData; onCreated?: (clientId: string) => void }) {
  const addClient = useClientStore((s) => s.addClient);
  const dismiss = useModalDismiss();

  const [name, setName] = useState(initialData?.name ?? '');
  const [phone, setPhone] = useState('');

  const isValid = name.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    try {
      const created = await addClient({
        name: name.trim(),
        phone: phone || undefined,
        instagram: initialData?.instagram || undefined,
        facebook: initialData?.facebook || undefined,
        tags: [],
      });
      onCreated?.(created.id);
    } catch (e) {
      console.error('Failed to create client:', e);
    }
    dismiss();
  };

  return (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col lg:flex-row lg:justify-end gap-3 pt-4 border-t border-border/40">
        <button
          onClick={dismiss}
          className="hidden lg:block px-4 py-2.5 text-sm text-text-s hover:text-text-p transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full lg:w-auto px-6 py-4 lg:py-2.5 text-base bg-accent text-bg rounded-md font-medium cursor-pointer press-scale transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-glow active:shadow-glow-strong min-h-[52px]"
        >
          Add Client
        </button>
      </div>
    </div>
  );
}

export default function CreateClientForm({ onClose, initialData, onCreated }: CreateClientFormProps) {
  return (
    <Modal title="New Client" onClose={onClose} width="lg:max-w-[520px]">
      <CreateClientFormContent initialData={initialData} onCreated={onCreated} />
    </Modal>
  );
}
