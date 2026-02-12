'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, ScrollText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { href: '/admin', label: '대시보드', icon: BarChart3 },
  { href: '/admin/users', label: '사용자 관리', icon: Users },
  { href: '/admin/audit', label: '감사 로그', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">관리자</h1>
        <div className="mt-4 flex gap-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn('gap-1.5', isActive && 'font-medium')}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
