const ALLOWED_ENDPOINT = /^(search\/(multi|movie|tv|keyword)|trending\/(all|movie|tv)\/(day|week)|(movie|tv)\/(popular|top_rated|now_playing|upcoming|on_the_air|airing_today)|discover\/(movie|tv)|genre\/(movie|tv)\/list|(movie|tv)\/\d+(\/(similar|recommendations))?)$/;
const FORWARDED_PARAMS = new Set(['page','language','region','with_genres','with_keywords','with_original_language','with_origin_country','sort_by','primary_release_year','first_air_date_year','vote_average.gte','include_adult','append_to_response']);

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') return send(res, 405, { error: 'Only GET requests are supported.' });
  const input = new URL(req.url, 'http://localhost');
  const endpoint = input.searchParams.get('endpoint') || 'search/multi';
  const query = input.searchParams.get('query')?.trim();
  if (!process.env.TMDB_API_KEY && !process.env.TMDB_ACCESS_TOKEN) {
    return send(res, 503, { error: 'TMDB is not configured on the server.' });
  }
  if (!ALLOWED_ENDPOINT.test(endpoint)) return send(res, 400, { error: 'Unsupported TMDB endpoint.' });
  if (endpoint.startsWith('search/') && (!query || query.length > 100)) return send(res, 400, { error: 'Enter a search under 100 characters.' });
  try {
    const upstream = new URL(`https://api.themoviedb.org/3/${endpoint}`);
    for (const [key, value] of input.searchParams) {
      if (key === 'query' && query) upstream.searchParams.set(key, query);
      else if (FORWARDED_PARAMS.has(key)) upstream.searchParams.set(key, value);
    }
    const headers = { accept: 'application/json' };
    if (process.env.TMDB_API_KEY) upstream.searchParams.set('api_key', process.env.TMDB_API_KEY);
    else if (process.env.TMDB_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.TMDB_ACCESS_TOKEN}`;
    const response = await fetch(upstream, { headers });
    const body = await response.json();
    res.setHeader('Cache-Control', endpoint.startsWith('search/') ? 'private, max-age=30' : 'public, max-age=300');
    return send(res, response.status, body);
  } catch {
    return send(res, 502, { error: 'TMDB could not be reached.' });
  }
}

function send(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(value));
}
