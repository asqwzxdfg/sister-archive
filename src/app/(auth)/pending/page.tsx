'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PendingPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold">승인 대기 중</h2>
          <p className="mt-3 max-w-sm text-muted-foreground">
            회원가입이 완료되었습니다. 관리자의 승인을 기다려주세요.
            승인이 완료되면 서비스를 이용하실 수 있습니다.
          </p>
          <Link href="/login" className="mt-6">
            <Button variant="outline">로그인 페이지로</Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
