'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Profile, Agency, Client, UserRole } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Settings,
  UserPlus,
  Loader2,
  Key,
  BrainCircuit,
} from 'lucide-react';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'master_admin', label: 'Master Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'agency', label: 'Agency' },
  { value: 'client', label: 'Client' },
];

export default function SettingsPage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole | ''>('');
  const [newUserAgencyId, setNewUserAgencyId] = useState('');
  const [newUserClientId, setNewUserClientId] = useState('');
  const [creating, setCreating] = useState(false);

  const isAdmin = profile?.role === 'master_admin' || profile?.role === 'admin';

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Agency[];
    },
    enabled: isAdmin,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-for-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Client[];
    },
    enabled: isAdmin,
  });

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserName || !newUserRole) return;
    setCreating(true);
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          full_name: newUserName,
          role: newUserRole,
          agency_id: newUserAgencyId || null,
          client_id: newUserClientId || null,
        }),
      });
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('');
      setNewUserAgencyId('');
      setNewUserClientId('');
      setDialogOpen(false);
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  const filteredClients = newUserAgencyId
    ? clients?.filter((c) => c.agency_id === newUserAgencyId)
    : clients;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage users and API configuration.
        </p>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users who have access to the platform.</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-name">Full Name</Label>
                  <Input
                    id="user-name"
                    placeholder="John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newUserRole}
                    onValueChange={(v) => setNewUserRole(v as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Agency</Label>
                  <Select value={newUserAgencyId} onValueChange={(v) => setNewUserAgencyId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agency (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies?.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={newUserClientId} onValueChange={(v) => setNewUserClientId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleCreateUser}
                  disabled={
                    !newUserEmail.trim() ||
                    !newUserName.trim() ||
                    !newUserRole ||
                    creating
                  }
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !users || users.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No users found.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Simplifi API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Simplifi API Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure your Simplifi API credentials. These are stored as environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="simplifi-api-key">API Key</Label>
              <Input
                id="simplifi-api-key"
                type="password"
                placeholder="SIMPLIFI_API_KEY"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="simplifi-user-key">User Key</Label>
              <Input
                id="simplifi-user-key"
                type="password"
                placeholder="SIMPLIFI_USER_KEY"
                disabled
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Set <code className="bg-muted px-1 rounded text-xs">SIMPLIFI_API_KEY</code> and{' '}
            <code className="bg-muted px-1 rounded text-xs">SIMPLIFI_USER_KEY</code> in your{' '}
            <code className="bg-muted px-1 rounded text-xs">.env.local</code> file.
          </p>
        </CardContent>
      </Card>

      {/* OpenAI API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-muted-foreground" />
            <CardTitle>OpenAI API Configuration</CardTitle>
          </div>
          <CardDescription>
            Used for GPT-4o-mini marketing creative generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openai-api-key">API Key</Label>
            <Input
              id="openai-api-key"
              type="password"
              placeholder="OPENAI_API_KEY"
              disabled
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Set <code className="bg-muted px-1 rounded text-xs">OPENAI_API_KEY</code> in your{' '}
            <code className="bg-muted px-1 rounded text-xs">.env.local</code> file. This key is used
            for GPT-4o-mini marketing creative generation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
