import { BookMarked, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { KnowledgeDocument } from '@/types';

interface RelatedDocumentsListProps {
  documents?: KnowledgeDocument[];
  title?: string;
  compact?: boolean;
  className?: string;
}

export function RelatedDocumentsList({
  documents = [],
  title = '引用资料',
  compact = false,
  className
}: RelatedDocumentsListProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className={cn('rounded-xl border border-border/50 bg-background/70', compact ? 'mt-2 p-2.5' : 'mt-3 p-3', className)}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <BookMarked className="h-3.5 w-3.5 text-blue-500" />
        <span>{title}</span>
        <Badge variant="secondary" className="text-[10px]">
          {documents.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {documents.map((document) => (
          <div key={document.id} className="rounded-lg border border-border/50 bg-muted/40 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                <span className={cn('truncate font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>{document.title}</span>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {document.category}
              </Badge>
            </div>
            <p className={cn('mt-1 leading-relaxed text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>{document.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
