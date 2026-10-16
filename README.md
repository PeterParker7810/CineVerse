# CineVerse

CineVerse is a cinematic discovery app for films, series, and their official trailers. The credential-free demo includes a curated catalog and local browser persistence for watchlist, trailer history, and genre taste. It never hosts or substitutes full movie/episode content.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Build with `npm run build`.

## Optional TMDB integration

The curated catalog works without credentials. For live search and global discovery, create `.env.local` from `.env.example`. Add either a TMDB v3 API key or a TMDB API Read Access Token:

```env
TMDB_API_KEY=your_tmdb_v3_api_key
# Or use the API Read Access Token instead:
TMDB_ACCESS_TOKEN=
```

The Vite development server proxies TMDB through `/api/tmdb`; credentials are read only by the server process and are not prefixed with `VITE_` or embedded in client code. The proxy allowlists supported catalog endpoints and query parameters, and the browser caches repeated responses in memory. Restart Vite after changing credentials. Production deployments can use the included Vercel serverless handler at `api/tmdb.js`; set the TMDB variables in the deployment environment. TMDB data and images are subject to TMDB attribution and usage terms and catalog availability depends on TMDB coverage.

Movies and TV pages support popular, trending, top rated, now playing/airing, and upcoming/on-air collections with page navigation. Genre pages use TMDB's movie and TV genre IDs; additional subgenre shelves resolve TMDB keyword IDs before calling Discover rather than assigning invented genre IDs. International Cinema uses original-language and origin-country filters, including language-specific Indian cinema. More regions/languages can be added by extending `src/lib/tmdb.js`.

## Authentication and account wishlist

Authentication and cross-session wishlist sync use Supabase Auth and Postgres. Without credentials, CineVerse remains in guest mode and saves the wishlist in local storage. It does not pretend a guest has signed in.

1. Create a Supabase project. Enable email/password and phone/SMS providers as desired. Phone OTP needs a configured SMS provider and may require paid credits.
2. Create `.env.local` from `.env.example` and fill in the Supabase project URL and browser-safe publishable/anon key:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_publishable_anon_key
   ```

The anon/publishable key is intended for browser use. Never put a service-role key in client environment variables. This workspace is configured with the connected Supabase project and the existing client in `src/lib/supabase.js` is reused. The remote schema was inspected before setup and had no app tables; the wishlist migration is now applied. The migration file is [`supabase/migrations/202610160001_wishlist.sql`](supabase/migrations/202610160001_wishlist.sql); it adds a unique `(user_id, media_id, media_type)` constraint and row-level security policies so each signed-in user can only access their own rows.
4. In Supabase Auth, enable email/password and configure email verification plus password-recovery redirect URLs for the local app and production domain. For phone OTP, enable Phone and configure an SMS provider/template and any required credits/billing. These provider settings cannot be established from the browser client.

When a guest signs in, saved demo-catalog titles are merged into the account wishlist. Account data uses provider sessions and RLS; passwords and SMS codes are never stored by CineVerse. Supabase Auth's user ID is the stable profile/account identity. Theme preference is stored in the guest's local storage and, for signed-in users, their own Supabase Auth user metadata. Email/SMS provider settings, redirect allowlists, and SMS credits remain Supabase project configuration requirements.

## Demo behavior

- Search matches titles case-insensitively in the local catalog and supports debounced, server-proxied TMDB suggestions and result pages when configured. Keyboard arrows and Enter navigate suggestions; Escape dismisses them.
- Trailer controls open the title's listed YouTube trailer. Missing trailer IDs show a clear message instead of a different video.
- Guest wishlist, watched trailers, and genre preferences persist in local storage. Signed-in wishlist changes are account-isolated and synchronized through Supabase.
- Recommendations use selected genre affinity, similar genres from saved titles, trailer history exclusions, explicit likes, and ratings as a secondary signal. The shuffle uses weighted sampling and avoids repeating the exact prior lineup where there are enough candidates.
- Seven theme presets plus custom accent and surface colors are available from Settings. Signed-in theme settings sync through the authenticated user's metadata; guest settings remain local.
- Metadata in the local fallback is a curated development dataset. Check official TMDB sources for current/live availability, ratings, and catalog details.

