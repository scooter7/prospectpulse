'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building2, Users, Megaphone } from 'lucide-react';
import Link from 'next/link';

export default function AgencyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const agencyId = params.id as string;

  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ['agency', agencyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agencyId)
        .single();
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['agency-clients', agencyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('*, campaigns:campaigns(id, name, status)')
        .eq('agency_id', agencyId);
      return data || [];
    },
  });

  if (agencyLoading) {
    return <div className="animate-pulse text-muted-foreground">Loading...</div>;
  }

  if (!agency) {
    return <div>Agency not found</div>;
  }

  const totalCampaigns = clients?.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, c: any) => sum + ((c.campaigns as unknown[])?.length || 0), 0
  ) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{agency.name}</h1>
          <p className="text-muted-foreground">Agency Overview</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agency</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agency.name}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clients & Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {clients && clients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {clients.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {(client.campaigns as Array<{ id: string; name: string; status: string }>)?.map((camp) => (
                          <Link
                            key={camp.id}
                            href={`/campaigns/${camp.id}`}
                            className="block text-sm text-blue-600 hover:underline"
                          >
                            {camp.name}
                          </Link>
                        ))}
                        {(!client.campaigns || (client.campaigns as unknown[]).length === 0) && (
                          <span className="text-sm text-muted-foreground">No campaigns</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {(client.campaigns as unknown[])?.length || 0} campaigns
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No clients found for this agency.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
