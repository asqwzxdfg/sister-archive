'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

type FormState = {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export default function MyPage() {
  const { user, isLoading, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [form, setForm] = useState<FormState>({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name ?? '',
      }));
    }
  }, [user]);

  const roleLabel = useMemo(() => {
    if (!user) return '-';
    switch (user.role) {
      case 'OWNER':
        return '관리자';
      case 'EDITOR':
        return '에디터';
      default:
        return '사용자';
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('이미지 파일(jpg/png/webp)만 업로드할 수 있습니다');
      return;
    }

    setIsAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setAvatarError(data.error || '아바타 업로드에 실패했습니다');
        return;
      }

      const cacheBuster = `?t=${Date.now()}`;
      setUser({
        ...user,
        avatarUrl: data.avatarUrl ? `${data.avatarUrl}${cacheBuster}` : null,
      });
    } catch {
      setAvatarError('서버에 연결할 수 없습니다');
    } finally {
      setIsAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) return;

    if (form.newPassword && form.newPassword !== form.confirmNewPassword) {
      setError('새 비밀번호가 일치하지 않습니다');
      return;
    }

    const payload: Record<string, string> = {};
    if (form.name && form.name !== user.name) payload.name = form.name;
    if (form.newPassword) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setError('수정할 내용이 없습니다');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '회원정보 수정에 실패했습니다');
        return;
      }

      setUser(data.user);
      setSuccess('회원정보가 수정되었습니다');
      setIsEditing(false);
      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      }));
    } catch {
      setError('서버에 연결할 수 없습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center text-muted-foreground">
        회원 정보를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">마이페이지</h1>
        <p className="mt-1 text-muted-foreground">내 계정 정보를 확인하고 수정하세요</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>회원정보</CardTitle>
          <CardDescription>현재 계정 정보입니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt="프로필 이미지"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.name?.slice(0, 1)
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">프로필 이미지</p>
                <p className="text-xs text-muted-foreground">
                  256x256 권장, jpg/png/webp
                </p>
              </div>
            </div>
            <div className="sm:ml-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAvatarUploading}
              >
                {isAvatarUploading ? '업로드 중...' : '아바타 변경'}
              </Button>
            </div>
          </div>
          {avatarError && (
            <p className="mt-2 text-sm text-destructive">{avatarError}</p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">이름</p>
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">이메일</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">권한</p>
              <div>
                <Badge variant="secondary">{roleLabel}</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">승인 상태</p>
              <div>
                <Badge variant={user.approved ? 'success' : 'warning'}>
                  {user.approved ? '승인됨' : '승인 대기'}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">가입일</p>
              <p className="text-sm font-medium">
                {user.createdAt ? formatDate(user.createdAt) : '-'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditing(true);
                setError('');
                setSuccess('');
              }}
            >
              회원정보 수정
            </Button>
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>회원정보 수정</CardTitle>
            <CardDescription>변경할 내용만 입력하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">현재 비밀번호</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="비밀번호 변경 시 입력"
                    value={form.currentPassword}
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="6자 이상"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">새 비밀번호 확인</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="새 비밀번호 재입력"
                  value={form.confirmNewPassword}
                  onChange={(e) => setForm({ ...form, confirmNewPassword: e.target.value })}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-emerald-600">{success}</p>}

              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setError('');
                    setSuccess('');
                  }}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '저장하기'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
