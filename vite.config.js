import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function cineverseApi(tmdbKey, tmdbToken) {
  return {
    name: 'cineverse-server-api',
    configureServer(server) {
      server.middlewares.use('/api/tmdb', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const query = url.searchParams.get('query')?.trim();
        const endpoint = url.searchParams.get('endpoint') || 'search/multi';
        if (!tmdbKey && !tmdbToken) { res.statusCode = 503; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ error: 'TMDB is not configured' })); return; }
        if (!/^(search\/(multi|movie|tv|keyword)|trending\/(all|movie|tv)\/(day|week)|(movie|tv)\/(popular|top_rated|now_playing|upcoming|on_the_air|airing_today)|discover\/(movie|tv)|genre\/(movie|tv)\/list|(movie|tv)\/\d+(\/(similar|recommendations))?)$/.test(endpoint)) { res.statusCode = 400; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ error: 'Unsupported TMDB endpoint' })); return; }
        if (endpoint.startsWith('search/') && (!query || query.length > 100)) { res.statusCode = 400; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ error: 'Enter a search under 100 characters.' })); return; }
        try {
          const upstream = new URL(`https://api.themoviedb.org/3/${endpoint}`);
          if (query) upstream.searchParams.set('query', query);
          for (const [key, value] of url.searchParams) if (!['endpoint','query'].includes(key) && ['page','language','region','with_genres','with_keywords','with_original_language','with_origin_country','sort_by','primary_release_year','first_air_date_year','vote_average.gte','include_adult','append_to_response'].includes(key)) upstream.searchParams.set(key, value);
          if (url.searchParams.has('query')) upstream.searchParams.set('query', query);
          const headers = { accept: 'application/json' };
          if (tmdbKey) upstream.searchParams.set('api_key', tmdbKey); else if (tmdbToken) headers.Authorization = `Bearer ${tmdbToken}`;
          const response = await fetch(upstream, { headers });
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', endpoint.startsWith('search/') ? 'private, max-age=30' : 'public, max-age=300');
          res.end(JSON.stringify(await response.json()));
        } catch {
          res.statusCode = 502; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'TMDB could not be reached.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [react(), cineverseApi(env.TMDB_API_KEY, env.TMDB_ACCESS_TOKEN)], define: { 'import.meta.env.TMDB_CONFIGURED': JSON.stringify(Boolean(env.TMDB_API_KEY || env.TMDB_ACCESS_TOKEN)) } };
});
