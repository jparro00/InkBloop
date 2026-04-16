import type { ConversationSummary } from '../../services/messageService';

interface ConversationCardProps {
  conversation: ConversationSummary;
  onSelect: (conversationId: string) => void;
}

export default function ConversationCard({
  conversation,
  onSelect,
}: ConversationCardProps) {
  const platformLabel =
    conversation.platform === 'instagram' ? 'Instagram' : 'Messenger';
  const platformIcon =
    conversation.platform === 'instagram' ? '📸' : '💬';

  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg bg-surface/60 border border-border/40 active:bg-elevated/60 transition-colors cursor-pointer press-scale"
    >
      {conversation.profilePic ? (
        <img
          src={conversation.profilePic}
          alt={conversation.participantName}
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-lg shrink-0">
          {platformIcon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] text-text-p font-medium">
          {platformLabel}
        </div>
        <div className="text-[13px] text-text-t truncate">
          {conversation.participantName}
          {conversation.lastMessage && ` · ${conversation.lastMessage}`}
        </div>
      </div>
    </button>
  );
}
