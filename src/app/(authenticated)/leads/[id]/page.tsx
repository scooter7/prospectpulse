'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { CrmLead, LeadStage, InteractionFormat, CrmInteraction, CrmReminder } from '@/lib/types';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  Plus,
  FileText,
  MoreHorizontal,
} from 'lucide-react';

const STAGE_COLORS: Record<LeadStage, string> = {
  lead: 'bg-blue-100 text-blue-800',
  qualified: 'bg-yellow-100 text-yellow-800',
  proposal: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-green-100 text-green-800',
};

const FORMAT_ICONS: Record<InteractionFormat, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  text: <MessageSquare className="h-4 w-4" />,
  meeting: <Users className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const FORMAT_OPTIONS: { value: InteractionFormat; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'text', label: 'Text' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'other', label: 'Other' },
];

const CONTACT_METHODS = ['Call', 'Email', 'Text', 'Meeting', 'Other'];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const leadId = params.id as string;

  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notesLoaded, setNotesLoaded] = useState(false);

  // Interaction form state
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [interactionDate, setInteractionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [interactionFormat, setInteractionFormat] = useState<InteractionFormat>('call');
  const [interactionOutcome, setInteractionOutcome] = useState('');
  const [interactionNotes, setInteractionNotes] = useState('');

  // Reminder form state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderMethod, setReminderMethod] = useState('Call');
  const [reminderMessage, setReminderMessage] = useState('');

  const { data: lead, isLoading } = useQuery({
    queryKey: ['crm-lead', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select(
          '*, business:matched_businesses(*), campaign:campaigns(name, client:clients(name)), interactions:crm_interactions(*, user:profiles(full_name)), reminders:crm_reminders(*)'
        )
        .eq('id', leadId)
        .single();
      if (error) throw error;
      if (data && !notesLoaded) {
        setNotes(data.notes || '');
        setNotesLoaded(true);
      }
      return data as CrmLead & {
        business: NonNullable<CrmLead['business']>;
        campaign: { name: string; client: { name: string } };
        interactions: (CrmInteraction & { user: { full_name: string } | null })[];
        reminders: CrmReminder[];
      };
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async (stage: LeadStage) => {
      const { error } = await supabase
        .from('crm_leads')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const { error } = await supabase
        .from('crm_leads')
        .update({ notes: newNotes, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
    },
  });

  const saveContactMutation = useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      if (!lead?.business_id) return;
      const { error } = await supabase
        .from('matched_businesses')
        .update({ contact_name: name, contact_email: email })
        .eq('id', lead.business_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
    },
  });

  const addInteractionMutation = useMutation({
    mutationFn: async (data: {
      interaction_date: string;
      format: InteractionFormat;
      outcome: string;
      notes: string;
    }) => {
      const { error } = await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        user_id: user?.id || '',
        interaction_date: data.interaction_date,
        format: data.format,
        outcome: data.outcome || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      setInteractionDialogOpen(false);
      setInteractionOutcome('');
      setInteractionNotes('');
      setInteractionDate(format(new Date(), 'yyyy-MM-dd'));
      setInteractionFormat('call');
    },
  });

  const addReminderMutation = useMutation({
    mutationFn: async (data: {
      remind_at: string;
      contact_method: string;
      message: string;
    }) => {
      const { error } = await supabase.from('crm_reminders').insert({
        lead_id: leadId,
        user_id: user?.id || '',
        remind_at: data.remind_at,
        contact_method: data.contact_method,
        message: data.message || null,
        is_completed: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
      setReminderDialogOpen(false);
      setReminderDate('');
      setReminderMethod('Call');
      setReminderMessage('');
    },
  });

  const toggleReminderMutation = useMutation({
    mutationFn: async ({ reminderId, isCompleted }: { reminderId: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from('crm_reminders')
        .update({ is_completed: isCompleted })
        .eq('id', reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead', leadId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const sortedInteractions = [...(lead.interactions || [])].sort(
    (a, b) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime()
  );

  const sortedReminders = [...(lead.reminders || [])]
    .filter((r) => !r.is_completed)
    .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lead.business?.company_name || 'Unknown'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={STAGE_COLORS[lead.stage]}>
              {lead.stage.charAt(0).toUpperCase() + lead.stage.slice(1)}
            </Badge>
            {lead.business?.lead_score != null && (
              <Badge variant="outline">Score: {lead.business.lead_score}</Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Company</span>
                  <span className="font-medium">{lead.business?.company_name}</span>
                  <span className="text-muted-foreground">Address</span>
                  <span>{lead.business?.address || '-'}</span>
                  <span className="text-muted-foreground">City / State / Zip</span>
                  <span>
                    {[lead.business?.city, lead.business?.state, lead.business?.zip]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </span>
                  <span className="text-muted-foreground">Phone</span>
                  <span>{lead.business?.phone || '-'}</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Enter contact name"
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => saveContactMutation.mutate({ name: contactName, email: contactEmail })}
                  disabled={saveContactMutation.isPending}
                >
                  {saveContactMutation.isPending ? 'Saving...' : 'Save Contact'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lead Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Campaign</span>
                <span className="font-medium">{lead.campaign?.name || '-'}</span>
                <span className="text-muted-foreground">Client</span>
                <span>{lead.campaign?.client?.name || '-'}</span>
                <span className="text-muted-foreground">Total Clicks</span>
                <span>{lead.business?.total_clicks ?? 0}</span>
                <span className="text-muted-foreground">Ads Delivered</span>
                <span>{lead.business?.total_ads_delivered ?? 0}</span>
                <span className="text-muted-foreground">Touches</span>
                <span>{lead.business?.total_touches ?? 0}</span>
              </div>
              <Separator />
              <div>
                <Label>Stage</Label>
                <Select
                  value={lead.stage}
                  onValueChange={(value) => updateStageMutation.mutate(value as LeadStage)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  className="mt-1"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => updateNotesMutation.mutate(notes)}
                  disabled={updateNotesMutation.isPending}
                >
                  {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Interaction Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Interaction Timeline</CardTitle>
                <Dialog open={interactionDialogOpen} onOpenChange={setInteractionDialogOpen}>
                  <DialogTrigger>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Log Interaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Log Interaction</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={interactionDate}
                          onChange={(e) => setInteractionDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Format</Label>
                        <Select
                          value={interactionFormat}
                          onValueChange={(v) => setInteractionFormat(v as InteractionFormat)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FORMAT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Outcome</Label>
                        <Input
                          value={interactionOutcome}
                          onChange={(e) => setInteractionOutcome(e.target.value)}
                          placeholder="e.g., Left voicemail, Scheduled demo"
                        />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          rows={3}
                          value={interactionNotes}
                          onChange={(e) => setInteractionNotes(e.target.value)}
                          placeholder="Additional notes..."
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={addInteractionMutation.isPending}
                        onClick={() =>
                          addInteractionMutation.mutate({
                            interaction_date: interactionDate,
                            format: interactionFormat,
                            outcome: interactionOutcome,
                            notes: interactionNotes,
                          })
                        }
                      >
                        {addInteractionMutation.isPending ? 'Saving...' : 'Save Interaction'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {sortedInteractions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No interactions logged yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedInteractions.map((interaction) => (
                    <div key={interaction.id} className="flex gap-3 pb-4 border-b last:border-0">
                      <div className="mt-0.5 text-muted-foreground">
                        {FORMAT_ICONS[interaction.format] || <FileText className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs capitalize">
                            {interaction.format}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(interaction.interaction_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {interaction.outcome && (
                          <p className="text-sm font-medium">{interaction.outcome}</p>
                        )}
                        {interaction.notes && (
                          <p className="text-sm text-muted-foreground">{interaction.notes}</p>
                        )}
                        {interaction.user?.full_name && (
                          <p className="text-xs text-muted-foreground">
                            by {interaction.user.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Reminders</CardTitle>
                <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
                  <DialogTrigger>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Reminder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Reminder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={reminderDate}
                          onChange={(e) => setReminderDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Contact Method</Label>
                        <Select value={reminderMethod} onValueChange={(v) => setReminderMethod(v ?? "")}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_METHODS.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Message</Label>
                        <Textarea
                          rows={3}
                          value={reminderMessage}
                          onChange={(e) => setReminderMessage(e.target.value)}
                          placeholder="Reminder details..."
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={addReminderMutation.isPending || !reminderDate}
                        onClick={() =>
                          addReminderMutation.mutate({
                            remind_at: new Date(reminderDate).toISOString(),
                            contact_method: reminderMethod,
                            message: reminderMessage,
                          })
                        }
                      >
                        {addReminderMutation.isPending ? 'Saving...' : 'Save Reminder'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {sortedReminders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No upcoming reminders.
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-start gap-3 p-3 rounded-md border"
                    >
                      <Checkbox
                        checked={reminder.is_completed}
                        onCheckedChange={(checked) =>
                          toggleReminderMutation.mutate({
                            reminderId: reminder.id,
                            isCompleted: checked as boolean,
                          })
                        }
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(reminder.remind_at), 'MMM d, yyyy h:mm a')}
                          </span>
                          {reminder.contact_method && (
                            <Badge variant="secondary" className="text-xs">
                              {reminder.contact_method}
                            </Badge>
                          )}
                        </div>
                        {reminder.message && (
                          <p className="text-sm">{reminder.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
