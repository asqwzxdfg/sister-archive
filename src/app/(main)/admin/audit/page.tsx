'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AuditLogItem, PaginatedResponse } from '@/types/api';

const ACTION_LABELS: Record<string, string> = {
  'auth.login': '로그인',
  'auth.register': '회원가입',
  'user.approve': '사용자 승인',
  'user.update': '사용자 수정',
  'user.delete': '사용자 삭제',
  'media.upload': '미디어 업로드',
  'media.update': '미디어 수정',
  'media.delete': '미디어 삭제',
  'event.create': '이벤트 생성',
  'event.update': '이벤트 수정',
  'event.delete': '이벤트 삭제',
};

export default function AuditPage() {
  const { data, isLoading } = useQuery<PaginatedResponse<AuditLogItem>>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/audit?limit=100');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-2">
        {isLoading && <p className="text-center text-muted-foreground py-8">로딩 중...</p>}
        {data?.items.map((log) => (
          <Card key={log.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">
                  {ACTION_LABELS[log.action] || log.action}
                </Badge>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{log.userName || '시스템'}</span>
                    {log.targetType && (
                      <span className="text-muted-foreground">
                        {' → '}{log.targetType}
                        {log.targetId && ` (${log.targetId.slice(0, 8)}...)`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <time className="text-xs text-muted-foreground">
                {new Date(log.createdAt).toLocaleString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </CardContent>
          </Card>
        ))}

        {!isLoading && (!data?.items || data.items.length === 0) && (
          <p className="text-center text-muted-foreground py-8">로그가 없습니다</p>
        )}
      </div>
    </motion.div>
  );
}
