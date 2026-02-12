'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { UserItem } from '@/types/api';

const ROLE_LABELS: Record<string, string> = {
  OWNER: '소유자',
  EDITOR: '편집자',
  VIEWER: '뷰어',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  OWNER: 'default',
  EDITOR: 'secondary',
  VIEWER: 'outline',
};

export default function UsersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ users: UserItem[] }>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const pendingUsers = data?.users.filter((u) => !u.approved) || [];
  const approvedUsers = data?.users.filter((u) => u.approved) || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Pending users */}
      {pendingUsers.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">승인 대기 ({pendingUsers.length})</h2>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')} 가입
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(user.id)}
                      disabled={approveMutation.isPending}
                      className="gap-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      승인
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(user.id)}
                      disabled={deleteMutation.isPending}
                      className="gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      거부
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved users */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">사용자 목록 ({approvedUsers.length})</h2>
        <div className="space-y-3">
          {approvedUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      <Badge variant={ROLE_VARIANTS[user.role] || 'outline'}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.role !== 'OWNER' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          updateRoleMutation.mutate({
                            userId: user.id,
                            role: user.role === 'EDITOR' ? 'VIEWER' : 'EDITOR',
                          })
                        }
                        disabled={updateRoleMutation.isPending}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {user.role === 'EDITOR' ? '뷰어로' : '편집자로'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => {
                          if (confirm(`${user.name}님을 삭제하시겠습니까?`)) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {isLoading && (
        <p className="text-center text-muted-foreground">로딩 중...</p>
      )}
    </motion.div>
  );
}
