export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface TimelineYear {
  year: number;
  photoCount: number;
  videoCount: number;
  coverThumbnail: string | null;
  months: TimelineMonth[];
}

export interface TimelineMonth {
  month: number;
  photoCount: number;
  videoCount: number;
  coverThumbnail: string | null;
}

export interface TimelineResponse {
  years: TimelineYear[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    approved: boolean;
  };
}

export interface MediaItem {
  id: string;
  type: 'PHOTO' | 'VIDEO';
  filename: string;
  thumbnailUrl: string | null;
  webUrl: string | null;
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  capturedAt: string | null;
  storyAt: string | null;
  effectiveDate: string;
  processed: boolean;
}

export interface MediaDetail extends MediaItem {
  originalUrl: string;
  size: string;
  mimeType: string;
  hash: string;
  uploadedBy: {
    id: string;
    name: string;
  };
  events: EventItem[];
  createdAt: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  coverUrl: string | null;
  startDate: string;
  endDate: string | null;
  mediaCount?: number;
}

export interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  approved: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
