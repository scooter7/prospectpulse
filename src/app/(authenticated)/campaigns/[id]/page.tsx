'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Campaign } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignPerformance } from '@/components/campaigns/CampaignPerformance';
import { ProspectMap } from '@/components/prospects/ProspectMap';
import { ProspectTable } from '@/components/prospects/ProspectTable';
import KanbanBoard from '@/components/crm/KanbanBoard';
import { BarChart3, Map, TableProperties, Kanban } from 'lucide-react';

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const supabase = createClient();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, client:clients(name, agency:agencies(name))')
        .eq('id', campaignId)
        .single();
      if (error) throw error;
      return data as Campaign & { client: { name: string; agency: { name: string } } };
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

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Campaign not found.</p>
      </div>
    );
  }

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString() : 'N/A';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
        <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
          <span>{campaign.client?.name}</span>
          <span>&middot;</span>
          <span>
            {formatDate(campaign.start_date)} &ndash; {formatDate(campaign.end_date)}
          </span>
        </div>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-1.5">
            <Map className="h-4 w-4" />
            ProspectPulse Map
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5">
            <TableProperties className="h-4 w-4" />
            ProspectPulse Leads
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5">
            <Kanban className="h-4 w-4" />
            Lead Tracker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <CampaignPerformance campaignId={campaignId} />
        </TabsContent>

        <TabsContent value="map">
          <ProspectMap campaignId={campaignId} />
        </TabsContent>

        <TabsContent value="leads">
          <ProspectTable campaignId={campaignId} />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanBoard campaignId={campaignId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
