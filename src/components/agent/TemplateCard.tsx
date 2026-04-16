import type { DraftTemplate } from '../../agents/types';

interface TemplateCardProps {
  template: DraftTemplate;
  onSelect: (templateId: string) => void;
}

export default function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={() => onSelect(template.id)}
      className="w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg bg-surface/60 border border-border/40 active:bg-elevated/60 transition-colors cursor-pointer press-scale"
    >
      <span className="text-lg shrink-0 mt-0.5">{template.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] text-text-p font-medium">
          {template.label}
        </div>
        <div className="text-[13px] text-text-t line-clamp-2">
          {template.text}
        </div>
      </div>
    </button>
  );
}
