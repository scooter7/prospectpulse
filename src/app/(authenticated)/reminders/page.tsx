'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { CrmReminder, CrmLead, MatchedBusiness } from '@/lib/types';
import { format, formatDistanceToNow, isPast } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  Phone,
} from 'lucide-react';

interface ReminderWithLead extends CrmReminder {
  lead: CrmLead & {
    business: Pick<MatchedBusiness, 'company_name' | 'phone'>;
  };
}

const CONTACT_METHODS = ['Call', 'Email', 'Text', 'Meeting', 'Other'];

export default function RemindersPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showCompleted, setShowCompleted] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [snoozeReminderId, setSnoozeReminderId] = useState<string | null>(null);
  const [snoozeDate, setSnoozeDate] = useState('');

  // Add reminder form state
  const [reminderLeadId, setReminderLeadId] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderMethod, setReminderMethod] = useState('Call');
  const [reminderMessage, setReminderMessage] = useState('');

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['crm-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_reminders')
        .select('*, lead:crm_leads(*, business:matched_businesses(company_name, phone))')
        .order('remind_at', { ascending: true });
      if (error) throw error;
      return (data as ReminderWithLead[]) || [];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['crm-leads-for-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, business:matched_businesses(company_name)');
      if (error) throw error;
      return data || [];
    },
    enabled: addDialogOpen,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('crm_reminders')
        .update({ is_completed: true })
        .eq('id', reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-reminders'] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ reminderId, newDate }: { reminderId: string; newDate: string }) => {
      const { error } = await supabase
        .from('crm_reminders')
        .update({ remind_at: newDate })
        .eq('id', reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-reminders'] });
      setSnoozeDialogOpen(false);
      setSnoozeReminderId(null);
      setSnoozeDate('');
    },
  });

  const addReminderMutation = useMutation({
    mutationFn: async (data: {
      lead_id: string;
      remind_at: string;
      contact_method: string;
      message: string;
    }) => {
      const { error } = await supabase.from('crm_reminders').insert({
        lead_id: data.lead_id,
        user_id: user?.id || '',
        remind_at: data.remind_at,
        contact_method: data.contact_method,
        message: data.message || null,
        is_completed: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-reminders'] });
      setAddDialogOpen(false);
      setReminderLeadId('');
      setReminderDate('');
      setReminderMethod('Call');
      setReminderMessage('');
    },
  });

  const now = new Date();
  const overdueReminders = reminders.filter(
    (r) => !r.is_completed && isPast(new Date(r.remind_at))
  );
  const upcomingReminders = reminders.filter(
    (r) => !r.is_completed && !isPast(new Date(r.remind_at))
  );
  const completedReminders = reminders.filter((r) => r.is_completed);

  const openSnooze = (reminderId: string) => {
    setSnoozeReminderId(reminderId);
    setSnoozeDate('');
    setSnoozeDialogOpen(true);
  };

  const ReminderCard = ({
    reminder,
    variant,
  }: {
    reminder: ReminderWithLead;
    variant: 'overdue' | 'upcoming' | 'completed';
  }) => {
    const borderColor =
      variant === 'overdue'
        ? 'border-red-300 bg-red-50/50'
        : variant === 'completed'
        ? 'border-muted bg-muted/30'
        : 'border-border';

    return (
      <Card className={`${borderColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className={`font-medium text-sm ${variant === 'completed' ? 'text-muted-foreground line-through' : ''}`}>
                  {reminder.lead?.business?.company_name || 'Unknown Company'}
                </p>
                {reminder.contact_method && (
                  <Badge
                    variant={variant === 'overdue' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {reminder.contact_method}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {format(new Date(reminder.remind_at), 'MMM d, yyyy h:mm a')}
                  {variant !== 'completed' && (
                    <span className={variant === 'overdue' ? ' text-red-600 font-medium' : ''}>
                      {' '}
                      ({formatDistanceToNow(new Date(reminder.remind_at), { addSuffix: true })})
                    </span>
                  )}
                </span>
              </div>
              {reminder.lead?.business?.phone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{reminder.lead.business.phone}</span>
                </div>
              )}
              {reminder.message && (
                <p className={`text-sm mt-1 ${variant === 'completed' ? 'text-muted-foreground' : ''}`}>
                  {reminder.message}
                </p>
              )}
            </div>
            {variant !== 'completed' && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openSnooze(reminder.id)}
                >
                  Snooze
                </Button>
                <Button
                  size="sm"
                  onClick={() => markCompleteMutation.mutate(reminder.id)}
                  disabled={markCompleteMutation.isPending}
                >
                  Mark Complete
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Follower</h1>
          <p className="text-muted-foreground">Stay on top of your prospect follow-ups</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Reminder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Lead</Label>
                <Select value={reminderLeadId} onValueChange={(v) => setReminderLeadId(v ?? "")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.business?.company_name || lead.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                disabled={!reminderLeadId || !reminderDate || addReminderMutation.isPending}
                onClick={() =>
                  addReminderMutation.mutate({
                    lead_id: reminderLeadId,
                    remind_at: new Date(reminderDate).toISOString(),
                    contact_method: reminderMethod,
                    message: reminderMessage,
                  })
                }
              >
                {addReminderMutation.isPending ? 'Adding...' : 'Add Reminder'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overdue Section */}
      {overdueReminders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-600">
              Overdue ({overdueReminders.length})
            </h2>
          </div>
          <div className="space-y-2">
            {overdueReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} variant="overdue" />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Upcoming ({upcomingReminders.length})</h2>
        </div>
        {upcomingReminders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No upcoming reminders. Add one to stay on track.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} variant="upcoming" />
            ))}
          </div>
        )}
      </div>

      {/* Completed Section (Collapsible) */}
      {completedReminders.length > 0 && (
        <div className="space-y-3">
          <button
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Completed ({completedReminders.length})</h2>
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {completedReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} variant="completed" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialogOpen} onOpenChange={setSnoozeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Snooze Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Date & Time</Label>
              <Input
                type="datetime-local"
                value={snoozeDate}
                onChange={(e) => setSnoozeDate(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!snoozeDate || snoozeMutation.isPending}
              onClick={() =>
                snoozeReminderId &&
                snoozeMutation.mutate({
                  reminderId: snoozeReminderId,
                  newDate: new Date(snoozeDate).toISOString(),
                })
              }
            >
              {snoozeMutation.isPending ? 'Snoozing...' : 'Snooze'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
