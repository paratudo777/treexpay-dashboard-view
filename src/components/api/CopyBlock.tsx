import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyBlockProps {
  content: string;
  label?: string;
  className?: string;
}

export function CopyBlock({ content, label, className }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative group", className)}>
      {label && (
        <div className="absolute top-2 left-3 z-10">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">{label}</span>
        </div>
      )}
      <pre className={cn(
        "bg-[hsl(260,20%,8%)] border border-white/[0.06] rounded-xl text-sm font-mono overflow-x-auto select-none",
        label ? "pt-8 pb-4 px-4" : "p-4"
      )}>
        {content}
      </pre>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCopy}
        className={cn(
          "absolute top-2 right-2 h-8 px-2.5 rounded-lg transition-all duration-200",
          "bg-white/[0.06] hover:bg-primary/20 border border-white/[0.08]",
          "text-muted-foreground hover:text-primary",
          copied && "bg-green-500/20 text-green-400 border-green-500/30"
        )}
      >
        {copied ? (
          <><Check className="h-3.5 w-3.5 mr-1" />Copiado</>
        ) : (
          <><Copy className="h-3.5 w-3.5 mr-1" />Copiar</>
        )}
      </Button>
    </div>
  );
}
