'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LeadScoreBadgeProps {
  score: number;
  total?: number;
}

function getScoreColor(score: number): string {
  if (score <= 10) return 'bg-green-100 text-green-800 border-green-200';
  if (score <= 25) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (score <= 50) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

export function LeadScoreBadge({ score, total }: LeadScoreBadgeProps) {
  return (
    <Badge variant="outline" className={cn('font-semibold', getScoreColor(score))}>
      #{score}{total != null && ` / ${total}`}
    </Badge>
  );
}
