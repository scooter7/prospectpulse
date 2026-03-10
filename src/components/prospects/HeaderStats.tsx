'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Building2, Eye, MousePointerClick, Zap } from 'lucide-react';

interface HeaderStatsProps {
  businessesMatched: number;
  totalAdsDelivered: number;
  totalClicks: number;
  totalTouches: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

const stats = [
  { key: 'businessesMatched', label: 'Businesses Matched', icon: Building2, color: 'bg-blue-100 text-blue-700' },
  { key: 'totalAdsDelivered', label: 'Total Ads Delivered', icon: Eye, color: 'bg-green-100 text-green-700' },
  { key: 'totalClicks', label: 'Total Clicks', icon: MousePointerClick, color: 'bg-amber-100 text-amber-700' },
  { key: 'totalTouches', label: 'Total Touches', icon: Zap, color: 'bg-purple-100 text-purple-700' },
] as const;

export function HeaderStats({
  businessesMatched,
  totalAdsDelivered,
  totalClicks,
  totalTouches,
}: HeaderStatsProps) {
  const values: Record<string, number> = {
    businessesMatched,
    totalAdsDelivered,
    totalClicks,
    totalTouches,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ key, label, icon: Icon, color }) => (
        <Card key={key}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`rounded-md p-2 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{formatNumber(values[key])}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
