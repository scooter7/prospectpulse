'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { MatchedBusiness } from '@/lib/types';
import { HeaderStats } from './HeaderStats';

const MapContainerDynamic = dynamic(() => import('./MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px] rounded-md border bg-muted">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  ),
});

interface ProspectMapProps {
  campaignId: string;
}

export function ProspectMap({ campaignId }: ProspectMapProps) {
  const supabase = createClient();

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['matched-businesses', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matched_businesses')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('lead_score', { ascending: true });
      if (error) throw error;
      return data as MatchedBusiness[];
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

  const totalAdsDelivered = businesses.reduce((sum, b) => sum + b.total_ads_delivered, 0);
  const totalClicks = businesses.reduce((sum, b) => sum + b.total_clicks, 0);
  const totalTouches = businesses.reduce((sum, b) => sum + b.total_touches, 0);

  return (
    <div className="space-y-6">
      <HeaderStats
        businessesMatched={businesses.length}
        totalAdsDelivered={totalAdsDelivered}
        totalClicks={totalClicks}
        totalTouches={totalTouches}
      />

      <MapContainerDynamic businesses={businesses} />
    </div>
  );
}
