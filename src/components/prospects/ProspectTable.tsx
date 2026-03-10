'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import { createClient } from '@/lib/supabase/client';
import type { MatchedBusiness } from '@/lib/types';
import { HeaderStats } from './HeaderStats';
import { LeadScoreBadge } from './LeadScoreBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface ProspectTableProps {
  campaignId: string;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function ProspectTable({ campaignId }: ProspectTableProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isAdding, setIsAdding] = useState(false);

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

  const columns = useMemo<ColumnDef<MatchedBusiness>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(!!checked)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'lead_score',
        header: 'Lead Score',
        cell: ({ row }) => {
          const score = row.getValue<number | null>('lead_score');
          return score != null ? (
            <LeadScoreBadge score={score} total={businesses.length} />
          ) : (
            <span className="text-muted-foreground">--</span>
          );
        },
      },
      {
        accessorKey: 'company_name',
        header: 'Company Name',
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue<string>('company_name')}</span>
        ),
      },
      {
        accessorKey: 'address',
        header: 'Address',
      },
      {
        accessorKey: 'city',
        header: 'City',
      },
      {
        accessorKey: 'state',
        header: 'State',
      },
      {
        accessorKey: 'zip',
        header: 'Zip',
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
      },
      {
        accessorKey: 'total_clicks',
        header: 'Total Clicks',
        cell: ({ row }) => formatNumber(row.getValue<number>('total_clicks')),
      },
      {
        accessorKey: 'total_ads_delivered',
        header: 'Ads Delivered',
        cell: ({ row }) => formatNumber(row.getValue<number>('total_ads_delivered')),
      },
    ],
    [businesses.length]
  );

  const table = useReactTable({
    data: businesses,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const handleAddToContacts = async () => {
    if (selectedRows.length === 0) return;

    setIsAdding(true);
    try {
      // Get the campaign's client_id
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('client_id')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      const contacts = selectedRows.map((row) => {
        const b = row.original;
        return {
          client_id: campaign.client_id,
          business_id: b.id,
          company_name: b.company_name,
          address: b.address,
          city: b.city,
          state: b.state,
          zip: b.zip,
          phone: b.phone,
        };
      });

      const { error } = await supabase.from('contacts').insert(contacts);
      if (error) throw error;

      toast.success(`${selectedRows.length} contact(s) added successfully.`);
      setRowSelection({});
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add contacts';
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedRows.length} of {businesses.length} row(s) selected
        </p>
        <Button
          onClick={handleAddToContacts}
          disabled={selectedRows.length === 0 || isAdding}
          size="sm"
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          {isAdding ? 'Adding...' : 'Add Selected to Contacts'}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  No matched businesses found for this campaign.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
