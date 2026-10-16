import { supabase } from './supabase.js';

export const PROFILE_MEDIA_BUCKET = 'cineverse-profile-media';

export const defaultProfile = {
  display_name: '', username: '', nickname: '', bio: '', favorite_title: '', favorite_genres: [],
  preferred_languages: [], preferred_countries: [], favorite_people: [], avatar_path: null,
  avatar_preset: 'orbit', avatar_position: 50, banner_path: null, banner_preset: 'crimson',
  banner_position: 50, preferences: {},
};

export const avatarPresets = [
  { id: 'orbit', label: 'Orbit', mark: '✦', color: 'linear-gradient(135deg,#44202f,#c84462)' },
  { id: 'eclipse', label: 'Eclipse', mark: '◐', color: 'linear-gradient(135deg,#211b42,#7860bd)' },
  { id: 'comet', label: 'Comet', mark: '☄', color: 'linear-gradient(135deg,#173847,#45a6ba)' },
  { id: 'nova', label: 'Nova', mark: '✧', color: 'linear-gradient(135deg,#4a2b1a,#d28b51)' },
  { id: 'nebula', label: 'Nebula', mark: '✺', color: 'linear-gradient(135deg,#303050,#ba709e)' },
  { id: 'aurora', label: 'Aurora', mark: '✷', color: 'linear-gradient(135deg,#1f443d,#64b29a)' },
];

export const bannerPresets = [
  { id: 'crimson', label: 'Crimson dusk', color: 'linear-gradient(115deg,#160b13,#6b1c39 54%,#d24d63)' },
  { id: 'ocean', label: 'Deep ocean', color: 'linear-gradient(115deg,#08141a,#12485b 54%,#49a6aa)' },
  { id: 'violet', label: 'Violet orbit', color: 'linear-gradient(115deg,#100e1d,#45326b 54%,#9b69c6)' },
  { id: 'emerald', label: 'Emerald hour', color: 'linear-gradient(115deg,#0c1813,#1b553f 54%,#76a878)' },
  { id: 'gold', label: 'Golden frame', color: 'linear-gradient(115deg,#20160c,#805122 54%,#d19b58)' },
  { id: 'rose', label: 'Rose afterglow', color: 'linear-gradient(115deg,#211017,#73384f 54%,#d08a9f)' },
];

export const defaultPersonalization = {
  favoriteGenres: ['Sci-Fi', 'Drama', 'Thriller'], favoriteTvGenres: [], languages: [], countries: [],
  favoritePeople: [], contentTypes: ['movie', 'tv'],
  homepageSections: { trending: true, recommendations: true, watched: true, films: true, series: true, gems: true, acclaimed: true },
  defaultDiscovery: 'Home', priority: 'balanced', emphasis: 'personalized',
};

export function validateProfile(profile) {
  const username = String(profile.username || '').trim().toLowerCase();
  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) throw new Error('Usernames must be 3–24 characters and use lowercase letters, numbers, or underscores.');
  if (String(profile.display_name || '').length > 60) throw new Error('Display name must be 60 characters or fewer.');
  if (String(profile.nickname || '').length > 40) throw new Error('Nickname must be 40 characters or fewer.');
  if (String(profile.bio || '').length > 220) throw new Error('Bio must be 220 characters or fewer.');
  return { ...profile, username };
}

export async function loadProfile(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId, profile) {
  if (!supabase || !userId) throw new Error('Sign in to save your profile.');
  const value = validateProfile(profile);
  const { data, error } = await supabase.from('profiles').upsert({
    user_id: userId, display_name: value.display_name || '', username: value.username || null,
    nickname: value.nickname || '', bio: value.bio || '', favorite_title: value.favorite_title || '',
    favorite_genres: value.favorite_genres || [], preferred_languages: value.preferred_languages || [],
    preferred_countries: value.preferred_countries || [], favorite_people: value.favorite_people || [],
    avatar_path: value.avatar_path || null, avatar_preset: value.avatar_preset || 'orbit',
    avatar_position: value.avatar_position ?? 50, banner_path: value.banner_path || null,
    banner_preset: value.banner_preset || 'crimson', banner_position: value.banner_position ?? 50,
    preferences: value.preferences || {}, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).select('*').single();
  if (error) {
    if (error.code === '23505') throw new Error('That username is already in use. Choose another handle.');
    throw error;
  }
  return data;
}

export async function uploadProfileImage(userId, file, type) {
  if (!supabase || !userId) throw new Error('Sign in to upload profile images.');
  if (!['avatar', 'banner'].includes(type)) throw new Error('Choose an avatar or banner image.');
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  const maxBytes = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`${type === 'avatar' ? 'Avatar' : 'Banner'} images must be under ${type === 'avatar' ? '5' : '10'} MB.`);
  const bitmap = await createImageBitmap(file);
  const limit = type === 'avatar' ? 640 : 1800;
  const scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.86));
  if (!blob) throw new Error('This browser could not prepare the image. Try another JPEG, PNG, or WebP file.');
  const path = `${userId}/${type}.webp`;
  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(path, blob, { contentType: 'image/webp', cacheControl: '3600', upsert: true });
  if (error) throw error;
  return path;
}

export async function signProfileImage(path) {
  if (!supabase || !path) return '';
  const { data, error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data?.signedUrl || '';
}

export async function removeProfileImage(path) {
  if (!supabase || !path) return;
  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}

