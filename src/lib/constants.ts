export const ROLES = ['OWNER', 'EDITOR', 'VIEWER'] as const;
export type RoleType = (typeof ROLES)[number];

export const EVENT_CATEGORIES = [
  { value: 'birthday', label: '생일' },
  { value: 'trip', label: '여행' },
  { value: 'first_birthday', label: '돌잔치' },
  { value: 'graduation', label: '입학/졸업' },
  { value: 'family', label: '가족행사' },
  { value: 'daily', label: '일상' },
  { value: 'other', label: '기타' },
] as const;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export const THUMBNAIL_SIZE = 320;
export const WEB_OPTIMIZED_MAX = 1920;

export const PROCESSED_DIR = process.env.PROCESSED_MEDIA_PATH || '/data/processed';
export const SOURCE_PHOTO_DIR = '/data/photo';
export const SOURCE_VIDEO_DIR = '/data/video';
