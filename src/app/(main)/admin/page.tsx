'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Image, Calendar, ScrollText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { UserItem, TimelineResponse, EventItem } from '@/types/api';

export default function AdminDashboard() {
  const { data: usersData } = useQuery<{ users: UserItem[] }>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: timelineData } = useQuery<TimelineResponse>({
    queryKey: ['timeline'],
    queryFn: async () => {
      const res = await fetch('/api/timeline');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const { data: eventsData } = useQuery<{ events: EventItem[] }>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/events');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const totalUsers = usersData?.users.length || 0;
  const pendingUsers = usersData?.users.filter((u) => !u.approved).length || 0;
  const totalMedia = timelineData?.years.reduce((sum, y) => sum + y.photoCount + y.videoCount, 0) || 0;
  const totalEvents = eventsData?.events.length || 0;

  const stats = [
    { label: '전체 사용자', value: totalUsers, icon: Users, color: 'text-blue-500' },
    { label: '승인 대기', value: pendingUsers, icon: Users, color: 'text-amber-500' },
    { label: '전체 미디어', value: totalMedia, icon: Image, color: 'text-emerald-500' },
    { label: '이벤트', value: totalEvents, icon: Calendar, color: 'text-purple-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`rounded-xl bg-muted p-3 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
