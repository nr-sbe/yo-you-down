# Yo, You Down?

**Open it. Make a plan. Get on with your day.**

[Open the planner](https://nr-sbe.github.io/yo-you-down/)

Send your friends a link, let everyone mark their available hours, and see the best times to hang out. A small, responsive web app you can host on **your own GitHub Pages**. No ChatGPT, OpenAI, Cloudflare, analytics, or runtime package dependencies.

## Try it locally

Install Node.js 22 or newer, then run this from the project folder:

```sh
node serve.mjs
```

Open **http://127.0.0.1:4173**. No `npm install` is needed. Use a web server; opening `index.html` directly with `file://` will not load JavaScript modules reliably.

The app opens directly to the plan form. Enter a hangout name and use the prefilled dates and hours, or adjust them. The time zone is always visible. **Update your availability** shows recent hangouts on this device; a friend's invite opens straight to its grid. The sample **Game night, anyone?** link lets you try responses immediately. Add your name, tap available one-hour blocks, and save. The best times rank by the number of available people, with earlier slots winning ties.

**Dark mode is the default.** The header toggle switches to light mode and remembers your preference. Both themes use tested text contrast, visible keyboard focus, and distinct selected states. Outfit typography and Phosphor icons are bundled locally; demo mode makes no third-party runtime requests.

## Publish and start planning with friends

Follow **[START-HERE.md](START-HERE.md)**: create a free Supabase project, run the supplied SQL, upload to your personal GitHub repository, add two public configuration variables, and run the included Pages workflow.

GitHub Pages serves the website; Supabase stores the shared responses. The GitHub workflow checks the live connection before publishing. Until you connect your project, the local preview is explicitly labeled **Local demo** and does not sync across devices.

Hash routes (`#demo`, `#create`, `#plan/...`) and relative assets work under GitHub repository subfolders. Friends open an invite directly to its availability grid. No sign-in is required for friends.

### How the small backend works

- Plan IDs are random UUIDs. Anyone with a plan link can see its name, note, participant names, and availability. Treat links as invitations; this is not a confidential calendar.
- Tables live in an unexposed private schema with row-level security enabled and no anonymous table permissions. The public API only allows creating a plan, reading one known plan ID, and saving one token-authorized response. There is no list-all-plans endpoint.
- Each browser creates a random edit token. Only its SHA-256 hash is stored in the database, and the token is never returned in the public response. Names are not identities, so two friends can share a name without overwriting each other.
- Live responses live in your database; browser storage only retains the edit capability. Clearing browser storage loses editing access to that response. For this demo there is no account recovery or host admin UI; the database owner can remove test records in Supabase.
- Live plans allow 50 respondents and up to 168 hourly choices across seven days. Names and notes have length limits. Each slot is an independent one-hour option, not a promise that a multi-hour block works.
- Everyone sees the organizer's named time zone. Times are wall-clock labels, not converted calendar instants. Daylight-saving transition hours may be ambiguous or skipped; avoid those hours in this demo.
- This is a friends-and-family prototype. There is no CAPTCHA, per-IP rate limiting, notification service, automatic data cleanup, or abuse-monitoring infrastructure. For a broad public launch, put rate limiting in front of anonymous writes and add a retention policy. You own the database and any applicable usage costs.

## Project map

```text
index.html             Page shell and metadata
styles.css             Responsive visual design
theme.js               Dark-first theme boot and saved preference
app.js                 Screens, selection, navigation, polling
domain.js              Dates, slot generation, ranking, safe text escaping
data.js                Explicit local demo and optional live API adapters
config.js              Public database configuration for local preview
supabase/schema.sql    Database schema and restricted RPC functions
tests/                 Dependency-free behavior checks
serve.mjs              Local preview server
scripts/build.mjs      Copies public files to dist/
.github/workflows/     GitHub Pages publishing
```

## Checks

```sh
node --test tests/*.test.js
node scripts/build.mjs
```

The app has no runtime npm dependencies. Outfit (SIL OFL) and Phosphor icons (MIT) are bundled with their licenses in `assets/`. No external script or font requests are needed. See `DESIGN.md` for the visual direction.

The SQL integration test uses a development-only PostgreSQL runtime: `npm install --no-save --ignore-scripts @electric-sql/pglite@0.5.8`, then `node scripts/test-database.mjs`. It checks actual SQL behavior and permissions, not a hosted Supabase connection. The Pages workflow also runs this test.

Live Supabase provisioning and the two-device check require your own project; they have not been run against a hosted account as part of this demo. See `VALIDATION.md` for local verification results.

## References

- [GitHub Pages publishing settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Supabase publishable keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase database functions and function privileges](https://supabase.com/docs/guides/database/functions)

MIT licensed. Make it yours.
