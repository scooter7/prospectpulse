'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { CampaignTactic } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, MousePointerClick, Percent } from 'lucide-react';

interface CampaignPerformanceProps {
  campaignId: string;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function CampaignPerformance({ campaignId }: CampaignPerformanceProps) {
  const supabase = createClient();

  const { data: tactics = [], isLoading } = useQuery({
    queryKey: ['campaign-tactics', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_tactics')
        .select('*')
        .eq('campaign_id', campaignId);
      if (error) throw error;
      return data as CampaignTactic[];
    },
    enabled: !!campaignId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const totalImpressions = tactics.reduce((sum, t) => sum + t.impressions, 0);
  const totalClicks = tactics.reduce((sum, t) => sum + t.clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-blue-100 p-2 text-blue-700">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Impressions</p>
              <p className="text-2xl font-bold">{formatNumber(totalImpressions)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-green-100 p-2 text-green-700">
              <MousePointerClick className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clicks</p>
              <p className="text-2xl font-bold">{formatNumber(totalClicks)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-purple-100 p-2 text-purple-700">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg CTR</p>
              <p className="text-2xl font-bold">{avgCtr.toFixed(2)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tactics Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tactic Name</TableHead>
              <TableHead>Tactic Type</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tactics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No tactics found for this campaign.
                </TableCell>
              </TableRow>
            ) : (
              tactics.map((tactic) => (
                <TableRow key={tactic.id}>
                  <TableCell className="font-medium">{tactic.tactic_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tactic.tactic_type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(tactic.impressions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(tactic.clicks)}
                  </TableCell>
                  <TableCell className="text-right">{tactic.ctr.toFixed(2)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
