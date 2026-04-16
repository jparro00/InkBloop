import type { Client } from '../../types';
import { useClientStore } from '../../stores/clientStore';

interface ClientCardProps {
  client: Client;
  onSelect: (clientId: string) => void;
}

export default function ClientCard({ client, onSelect }: ClientCardProps) {
  const linkedProfiles = useClientStore((s) => s.linkedProfiles);

  const pic =
    client.profile_pic ||
    (client.instagram && linkedProfiles[client.instagram]?.profilePic) ||
    (client.facebook && linkedProfiles[client.facebook]?.profilePic);

  return (
    <button
      onClick={() => onSelect(client.id)}
      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg bg-surface/60 border border-border/40 active:bg-elevated/60 transition-colors cursor-pointer press-scale"
    >
      {pic ? (
        <img
          src={pic}
          alt={client.name}
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-medium shrink-0">
          {client.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] text-text-p font-medium truncate">
          {client.name}
        </div>
        {(client.phone || client.tags.length > 0) && (
          <div className="text-[13px] text-text-t truncate">
            {[client.phone, ...client.tags.slice(0, 2)].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </button>
  );
}
