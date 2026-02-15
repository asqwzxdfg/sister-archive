'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Camera, Calendar, Upload, Settings, LogOut, Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/years', label: '타임라인', icon: Camera },
  { href: '/events', label: '이벤트', icon: Calendar },
];

const editorItems = [
  { href: '/upload', label: '업로드', icon: Upload },
];

const accountItems = [
  { href: '/mypage', label: '마이페이지', icon: User },
];

const adminItems = [
  { href: '/admin', label: '관리', icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isEditor = user?.role === 'OWNER' || user?.role === 'EDITOR';
  const isOwner = user?.role === 'OWNER';

  const allItems = [
    ...navItems,
    ...(isEditor ? editorItems : []),
    ...accountItems,
    ...(isOwner ? adminItems : []),
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' }).catch(() => {});
    document.cookie = 'access_token=; Path=/; Max-Age=0';
    document.cookie = 'refresh_token=; Path=/api/auth/refresh; Max-Age=0';
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/years" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">Yuna&apos;s Story</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2',
                    isActive && 'bg-secondary font-medium',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
          <div className="ml-2 h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </nav>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t md:hidden overflow-hidden bg-background"
          >
            <nav className="flex flex-col gap-1 p-4">
              {allItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-3"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
