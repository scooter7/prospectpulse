'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Campaign } from '@/lib/types';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Loader2 } from 'lucide-react';

interface CampaignWithClient extends Omit<Campaign, 'client'> {
  client: {
    name: string;
    agency: { name: string } | null;
  } | null;
}

function statusVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'default' as const;
    case 'paused':
      return 'secondary' as const;
    case 'completed':
      return 'outline' as const;
    default:
      return 'secondary' as const;
  }
}

export default function CampaignsPage() {
  const supabase = createClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, client:clients(name, agency:agencies(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CampaignWithClient[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground mt-1">View and manage campaigns.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No campaigns yet</h3>
          <p className="text-muted-foreground mt-1">
            Campaigns will appear here once they are created.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>{campaign.client?.name ?? '—'}</TableCell>
                  <TableCell>{campaign.client?.agency?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {campaign.start_date
                      ? new Date(campaign.start_date).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {campaign.end_date
                      ? new Date(campaign.end_date).toLocaleDateString()
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
