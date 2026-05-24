const LEGACY_TUTOR_AVATAR_PREFIX = '/avatars/';
const DEFAULT_TUTOR_AVATAR_FILE = 'default-tutor.jpg';

function getAvatarStorageBaseUrl() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/storage/v1/object/public/avatars`;
}

export function getDefaultTutorAvatarUrl() {
  const storageBaseUrl = getAvatarStorageBaseUrl();
  return storageBaseUrl
    ? `${storageBaseUrl}/${DEFAULT_TUTOR_AVATAR_FILE}`
    : `${LEGACY_TUTOR_AVATAR_PREFIX}${DEFAULT_TUTOR_AVATAR_FILE}`;
}

export function resolveTutorAvatarUrl(avatarUrl?: string | null) {
  if (!avatarUrl) return getDefaultTutorAvatarUrl();

  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

  if (avatarUrl.startsWith(LEGACY_TUTOR_AVATAR_PREFIX)) {
    return getDefaultTutorAvatarUrl();
  }

  if (avatarUrl.startsWith('/') && typeof window !== 'undefined') {
    return new URL(avatarUrl, window.location.origin).toString();
  }

  return avatarUrl;
}