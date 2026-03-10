'use client';

import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Users,
  Megaphone,
  Target,
  ContactRound,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const isAdmin = profile?.role === 'master_admin' || profile?.role === 'admin';
  const isAgency = profile?.role === 'agency';
  const isClient = profile?.role === 'client';

  const { data: agencyCount, isLoading: loadingAgencies } = useQuery({
    queryKey: ['dashboard', 'agencies'],
    queryFn: async () => {
      const { count } = await supabase
        .from('agencies')
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
    enabled: isAdmin,
  });

  const { data: clientCount, isLoading: loadingClients } = useQuery({
    queryKey: ['dashboard', 'clients'],
    queryFn: async () => {
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
    enabled: isAdmin || isAgency,
  });

  const { data: campaignCount, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['dashboard', 'campaigns'],
    queryFn: async () => {
      const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count ?? 0;
    },
  });

  const { data: leadCount, isLoading: loadingLeads } = useQuery({
    queryKey: ['dashboard', 'leads'],
    queryFn: async () => {
      const { count } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: contactCount, isLoading: loadingContacts } = useQuery({
    queryKey: ['dashboard', 'contacts'],
    queryFn: async () => {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
    enabled: isClient,
  });

  const stats: { title: string; value: number | undefined; loading: boolean; icon: React.ReactNode }[] = [];

  if (isAdmin) {
    stats.push({
      title: 'Total Agencies',
      value: agencyCount ?? undefined,
      loading: loadingAgencies,
      icon: <Building2 className="h-5 w-5 text-muted-foreground" />,
    });
  }

  if (isAdmin || isAgency) {
    stats.push({
      title: 'Total Clients',
      value: clientCount ?? undefined,
      loading: loadingClients,
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
    });
  }

  stats.push({
    title: 'Active Campaigns',
    value: campaignCount ?? undefined,
    loading: loadingCampaigns,
    icon: <Megaphone className="h-5 w-5 text-muted-foreground" />,
  });

  stats.push({
    title: 'Total Leads',
    value: leadCount ?? undefined,
    loading: loadingLeads,
    icon: <Target className="h-5 w-5 text-muted-foreground" />,
  });

  if (isClient) {
    stats.push({
      title: 'Total Contacts',
      value: contactCount ?? undefined,
      loading: loadingContacts,
      icon: <ContactRound className="h-5 w-5 text-muted-foreground" />,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your account.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{stat.value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
