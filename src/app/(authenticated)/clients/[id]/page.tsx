'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, Megaphone, Target } from 'lucide-react';
import Link from 'next/link';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const clientId = params.id as string;

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('*, agency:agencies(name)')
        .eq('id', clientId)
        .single();
      return data;
    },
  });

  const { data: campaigns } = useQuery({
    queryKey: ['client-campaigns', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: leadCount } = useQuery({
    queryKey: ['client-leads-count', clientId],
    queryFn: async () => {
      const { count } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);
      return count || 0;
    },
  });

  if (isLoading) {
    return <div className="animate-pulse text-muted-foreground">Loading...</div>;
  }

  if (!client) {
    return <div>Client not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground">
            Agency: {(client.agency as { name: string })?.name}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agency</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(client.agency as { name: string })?.name}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns && campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {campaigns.map((camp: any) => (
                  <TableRow key={camp.id}>
                    <TableCell>
                      <Link
                        href={`/campaigns/${camp.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {camp.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={camp.status === 'active' ? 'default' : 'secondary'}
                      >
                        {camp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{camp.start_date || '-'}</TableCell>
                    <TableCell>{camp.end_date || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No campaigns found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
