const IMAGE = 'https://image.tmdb.org/t/p/';
const genreNames = new Map();
let genreCache;
const responseCache = new Map();
const pendingRequests = new Map();

export function imageUrl(path, size = 'w500') {
  return path ? `${IMAGE}${size}${path}` : '';
}

export function mapTitle(item, mediaType = item.media_type) {
  if (!item || !['movie', 'tv'].includes(mediaType)) return null;
  return {
    id: item.id,
    mediaType,
    title: item.title || item.name || 'Untitled',
    originalTitle: item.original_title || item.original_name || '',
    year: (item.release_date || item.first_air_date || '').slice(0, 4),
    rating: Number.isFinite(item.vote_average) ? item.vote_average.toFixed(1) : '',
    popularity: item.popularity || 0,
    type: mediaType === 'tv' ? 'Series' : 'Film',
    genres: (item.genres || (item.genre_ids || []).map(id => genreNames.has(id) ? { name: genreNames.get(id) } : null).filter(Boolean)).map(genre => genre.name).filter(Boolean),
    genreIds: item.genre_ids || [],
    language: item.original_language || '',
    originCountry: item.origin_country || [],
    poster: item.poster_path || '',
    backdrop: item.backdrop_path || '',
    overview: item.overview || '',
    runtime: mediaType === 'movie' ? (item.runtime ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m` : '') : (item.number_of_seasons ? `${item.number_of_seasons} seasons` : ''),
    director: item.credits?.crew?.find(person => person.job === 'Director')?.name || (item.created_by || []).map(person => person.name).join(', '),
    cast: (item.credits?.cast || []).slice(0, 5).map(person => person.name).join(', '),
    trailer: (item.videos?.results || []).find(video => video.site === 'YouTube' && video.key && video.official && ['Trailer','Teaser'].includes(video.type))?.key || null,
  };
}

export async function tmdb(endpoint, params = {}, { signal, cacheMs = 180000 } = {}) {
  if (!import.meta.env.TMDB_CONFIGURED) throw new Error('TMDB is not configured. Add TMDB_API_KEY or TMDB_ACCESS_TOKEN to .env.local.');
  const search = new URLSearchParams({ endpoint, ...Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== null).map(([key, value]) => [key, String(value)])) });
  const key = search.toString();
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.time < cacheMs) return cached.value;
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const request = (async () => {
    let response;
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(`/api/tmdb?${key}`, { signal });
      if (response.status !== 502 || attempt > 0) break;
      await new Promise(resolve => setTimeout(resolve, 180));
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `TMDB request failed (${response.status}).`);
    }
    const value = await response.json();
    responseCache.set(key, { time: Date.now(), value });
    return value;
  })();
  pendingRequests.set(key, request);
  try { return await request; }
  finally { pendingRequests.delete(key); }
}

export async function getGenres(media = 'movie') {
  if (!genreCache) genreCache = Promise.all(['movie', 'tv'].map(async type => {
    try {
      const data = await tmdb(`genre/${type}/list`, {}, { cacheMs: 86400000 });
      for (const genre of data.genres || []) genreNames.set(genre.id, genre.name);
      return [type, data.genres || []];
    } catch { return [type, []]; }
  })).then(Object.fromEntries);
  const result = await genreCache;
  return result[media] || [];
}

export const nativeGenres = [
  'Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Family','Fantasy','History','Horror','Music','Mystery','Romance','Science Fiction','TV Movie','Thriller','War','Western',
];

export const collections = [
  { name: 'Psychological Thriller', media: 'movie', genres: ['Thriller','Mystery'], keywords: 'psychological thriller' },
  { name: 'Supernatural Horror', media: 'movie', genres: ['Horror'], keywords: 'supernatural horror' },
  { name: 'Slasher Horror', media: 'movie', genres: ['Horror'], keywords: 'slasher' },
  { name: 'Found Footage', media: 'movie', genres: ['Horror'], keywords: 'found footage' },
  { name: 'Body Horror', media: 'movie', genres: ['Horror'], keywords: 'body horror' },
  { name: 'Survival', media: 'movie', genres: ['Adventure','Thriller'], keywords: 'survival' },
  { name: 'Martial Arts', media: 'movie', genres: ['Action'], keywords: 'martial arts' },
  { name: 'Biographical', media: 'movie', genres: ['Drama','History'], keywords: 'biography' },
  { name: 'Political Drama', media: 'movie', genres: ['Drama'], keywords: 'political drama' },
  { name: 'Legal Drama', media: 'movie', genres: ['Drama','Crime'], keywords: 'legal drama' },
  { name: 'Medical Drama', media: 'tv', genres: ['Drama'], keywords: 'medical drama' },
  { name: 'Historical Fiction', media: 'movie', genres: ['Drama','History'], keywords: 'historical fiction' },
  { name: 'Dark Comedy', media: 'movie', genres: ['Comedy','Drama'], keywords: 'dark comedy' },
  { name: 'Romantic Comedy', media: 'movie', genres: ['Comedy','Romance'], keywords: 'romantic comedy' },
  { name: 'Coming-of-Age', media: 'movie', genres: ['Drama','Comedy'], keywords: 'coming of age' },
  { name: 'Space Opera', media: 'movie', genres: ['Science Fiction','Adventure'], keywords: 'space opera' },
  { name: 'Cyberpunk', media: 'movie', genres: ['Science Fiction'], keywords: 'cyberpunk' },
  { name: 'Dystopian', media: 'movie', genres: ['Science Fiction'], keywords: 'dystopian' },
  { name: 'Superhero', media: 'movie', genres: ['Action','Science Fiction'], keywords: 'superhero' },
  { name: 'Mythology & Folklore', media: 'movie', genres: ['Fantasy'], keywords: 'mythology folklore' },
  { name: 'Disaster', media: 'movie', genres: ['Action','Thriller'], keywords: 'disaster' },
  { name: 'Heist', media: 'movie', genres: ['Crime','Action'], keywords: 'heist' },
  { name: 'Spy & Espionage', media: 'movie', genres: ['Action','Thriller'], keywords: 'spy espionage' },
  { name: 'Mystery Detective', media: 'movie', genres: ['Mystery','Crime'], keywords: 'detective' },
  { name: 'True Crime', media: 'tv', genres: ['Crime','Documentary'], keywords: 'true crime' },
];

export const globalRegions = [
  { name: 'Hollywood & English language', country: 'US', language: 'en' },
  { name: 'Hindi cinema', country: 'IN', language: 'hi' },
  { name: 'Telugu cinema', country: 'IN', language: 'te' },
  { name: 'Tamil cinema', country: 'IN', language: 'ta' },
  { name: 'Malayalam cinema', country: 'IN', language: 'ml' },
  { name: 'Kannada cinema', country: 'IN', language: 'kn' },
  { name: 'Bengali cinema', country: 'IN', language: 'bn' },
  { name: 'Marathi cinema', country: 'IN', language: 'mr' },
  { name: 'Punjabi cinema', country: 'IN', language: 'pa' },
  { name: 'Korean cinema', country: 'KR', language: 'ko' },
  { name: 'Japanese cinema & anime', country: 'JP', language: 'ja' },
  { name: 'Chinese cinema', country: 'CN', language: 'zh' },
  { name: 'French cinema', country: 'FR', language: 'fr' },
  { name: 'German cinema', country: 'DE', language: 'de' },
  { name: 'British cinema', country: 'GB', language: 'en' },
  { name: 'Italian cinema', country: 'IT', language: 'it' },
  { name: 'Spanish cinema', country: 'ES', language: 'es' },
  { name: 'Polish cinema', country: 'PL', language: 'pl' },
  { name: 'Swedish cinema', country: 'SE', language: 'sv' },
  { name: 'Turkish cinema', country: 'TR', language: 'tr' },
  { name: 'Iranian cinema', country: 'IR', language: 'fa' },
  { name: 'Spanish & Latin American', country: 'MX', language: 'es' },
  { name: 'Brazilian cinema', country: 'BR', language: 'pt' },
  { name: 'Middle Eastern cinema', country: 'EG', language: 'ar' },
  { name: 'African cinema', country: 'ZA', language: 'en' },
];
