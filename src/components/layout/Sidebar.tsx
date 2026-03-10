'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  Megaphone,
  Contact,
  Bell,
  Settings,
  LogOut,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();

  const isAdmin = profile?.role === 'master_admin' || profile?.role === 'admin';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { href: '/agencies', label: 'Agencies', icon: Building2, show: isAdmin },
    { href: '/clients', label: 'Clients', icon: Users, show: profile?.role !== 'client' },
    { href: '/campaigns', label: 'Campaigns', icon: Megaphone, show: true },
    { href: '/contacts', label: 'Contacts', icon: Contact, show: true },
    { href: '/reminders', label: 'Lead Follower', icon: Bell, show: true },
    { href: '/settings', label: 'Settings', icon: Settings, show: isAdmin },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-slate-50 dark:bg-slate-950">
      <div className="flex items-center gap-2 px-6 py-5">
        <Target className="h-7 w-7 text-blue-600" />
        <span className="text-xl font-bold">
          Prospect<span className="text-blue-600">Pulse</span>
        </span>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-4">
        <div className="mb-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
          <p className="text-sm font-medium truncate">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            {profile?.role?.replace('_', ' ')}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
