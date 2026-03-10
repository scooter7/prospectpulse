'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createClient } from '@/lib/supabase/client';
import { CrmLead, LeadStage, MatchedBusiness } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, GripVertical, MousePointerClick, Target } from 'lucide-react';

interface KanbanBoardProps {
  campaignId: string;
}

interface LeadWithBusiness extends Omit<CrmLead, 'business'> {
  business: Pick<MatchedBusiness, 'company_name' | 'city' | 'state' | 'total_clicks' | 'lead_score'>;
}

const STAGES: { key: LeadStage; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'lead', label: 'Lead', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  { key: 'qualified', label: 'Qualified', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
  { key: 'proposal', label: 'Proposal', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
  { key: 'negotiation', label: 'Negotiation', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
];

export default function KanbanBoard({ campaignId }: KanbanBoardProps) {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['crm-leads', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*, business:matched_businesses(company_name, city, state, total_clicks, lead_score)')
        .eq('campaign_id', campaignId);
      if (error) throw error;
      return (data as LeadWithBusiness[]) || [];
    },
  });

  const { data: availableBusinesses = [] } = useQuery({
    queryKey: ['available-businesses', campaignId, addDialogOpen],
    queryFn: async () => {
      const { data: allBusinesses, error: bizError } = await supabase
        .from('matched_businesses')
        .select('id, company_name, city, state, lead_score')
        .eq('campaign_id', campaignId);
      if (bizError) throw bizError;

      const existingBusinessIds = leads.map((l) => l.business_id);
      return // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (allBusinesses || []).filter((b: any) => !existingBusinessIds.includes(b.id));
    },
    enabled: addDialogOpen,
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: string; stage: LeadStage }) => {
      const { error } = await supabase
        .from('crm_leads')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
    },
    onMutate: async ({ leadId, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['crm-leads', campaignId] });
      const previous = queryClient.getQueryData<LeadWithBusiness[]>(['crm-leads', campaignId]);
      queryClient.setQueryData<LeadWithBusiness[]>(['crm-leads', campaignId], (old) =>
        (old || []).map((lead) => (lead.id === leadId ? { ...lead, stage } : lead))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['crm-leads', campaignId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads', campaignId] });
    },
  });

  const addLeadsMutation = useMutation({
    mutationFn: async (businessIds: string[]) => {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('client_id')
        .eq('id', campaignId)
        .single();

      const newLeads = businessIds.map((businessId) => ({
        business_id: businessId,
        campaign_id: campaignId,
        client_id: campaign?.client_id || '',
        stage: 'lead' as LeadStage,
        assigned_to: user?.id || null,
      }));
      const { error } = await supabase.from('crm_leads').insert(newLeads);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads', campaignId] });
      setAddDialogOpen(false);
      setSelectedBusinessIds([]);
    },
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId as LeadStage;
    const leadId = result.draggableId;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;
    updateStageMutation.mutate({ leadId, stage: newStage });
  };

  const getLeadsByStage = (stage: LeadStage) =>
    leads.filter((lead) => lead.stage === stage);

  const toggleBusinessSelection = (businessId: string) => {
    setSelectedBusinessIds((prev) =>
      prev.includes(businessId) ? prev.filter((id) => id !== businessId) : [...prev, businessId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Leads
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Leads from Matched Businesses</DialogTitle>
            </DialogHeader>
            {availableBusinesses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No available businesses to add. All matched businesses are already CRM leads.
              </p>
            ) : (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {availableBusinesses.map((biz: any) => (
                  <div
                    key={biz.id}
                    className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleBusinessSelection(biz.id)}
                  >
                    <Checkbox
                      checked={selectedBusinessIds.includes(biz.id)}
                      onCheckedChange={() => toggleBusinessSelection(biz.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{biz.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[biz.city, biz.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    {biz.lead_score != null && (
                      <Badge variant="secondary">{biz.lead_score}</Badge>
                    )}
                  </div>
                ))}
                <Button
                  className="w-full"
                  disabled={selectedBusinessIds.length === 0 || addLeadsMutation.isPending}
                  onClick={() => addLeadsMutation.mutate(selectedBusinessIds)}
                >
                  {addLeadsMutation.isPending ? 'Adding...' : `Add ${selectedBusinessIds.length} Lead(s)`}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => {
            const stageLeads = getLeadsByStage(stage.key);
            return (
              <div key={stage.key} className={`rounded-lg border ${stage.borderColor} ${stage.bgColor} min-h-[400px] flex flex-col`}>
                <div className={`p-3 border-b ${stage.borderColor}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${stage.color}`}>{stage.label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {stageLeads.length}
                    </Badge>
                  </div>
                </div>
                <Droppable droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 transition-colors ${
                        snapshot.isDraggingOver ? 'bg-muted/50' : ''
                      }`}
                    >
                      {stageLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-white rounded-md border shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
                              }`}
                              onClick={() => router.push(`/leads/${lead.id}`)}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-0.5 text-muted-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {lead.business?.company_name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {[lead.business?.city, lead.business?.state].filter(Boolean).join(', ')}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {lead.business?.lead_score != null && (
                                      <Badge variant="outline" className="text-xs">
                                        <Target className="h-3 w-3 mr-1" />
                                        {lead.business.lead_score}
                                      </Badge>
                                    )}
                                    {lead.business?.total_clicks != null && (
                                      <Badge variant="secondary" className="text-xs">
                                        <MousePointerClick className="h-3 w-3 mr-1" />
                                        {lead.business.total_clicks}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {stageLeads.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          No leads in this stage
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
