import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export const authReady = Boolean(supabase);

export async function loadWishlist(userId) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('wishlist').select('media_id, media_type, metadata').eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function addWishlist(userId, item) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('wishlist').upsert({
    user_id: userId,
    media_id: String(item.id),
    media_type: item.type === 'Series' ? 'tv' : 'movie',
    metadata: { title: item.title, year: item.year, poster: item.poster, rating: item.rating, genres: item.genres, overview: item.overview, backdrop: item.backdrop, trailer: item.trailer, runtime: item.runtime, director: item.director, cast: item.cast },
  }, { onConflict: 'user_id,media_id,media_type', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeWishlist(userId, item) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('wishlist').delete().eq('user_id', userId)
    .eq('media_id', String(item.id)).eq('media_type', item.type === 'Series' ? 'tv' : 'movie');
  if (error) throw error;
}

