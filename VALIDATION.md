# Local validation — September 8, 2026

This records the checks actually performed on the final standalone GitHub Pages demo. It is not a certification of every browser or assistive technology.

## Automated checks

**13 tests passed, 0 failures.**

Also passed the actual PostgreSQL schema integration test with PGlite 0.5.8: schema installation, health endpoint, independent respondents, response editing, rejected impersonation, invalid slots/dates/time zones, blocked private-table access, and the 50-person cap. This is local database execution, not hosted Supabase verification.

Public configuration tests reject missing live configuration and unsafe/secret-key configuration.

- Slot generation across month/year/leap-day boundaries.
- Invalid dates, reversed hours, and oversized grids rejected.
- Overlap ranking, tie order, and empty availability handled.
- Untrusted display strings escaped.
- Time-zone labels retain the full IANA identifier.
- Local plan creation, persistence, response editing without duplication, and missing-plan handling.
- Dark mode on first visit, saved dark/light preference, invalid preference fallback, and storage-disabled fallback.
- Dark and light theme text-token pairs meet at least 4.5:1 contrast, including selected cells, hints, buttons, notifications, and validation errors.
- Input/grid boundaries, selected-state contrast, and keyboard focus meet at least 3:1 for the tested token pairs.
- JavaScript syntax checked; static build copies only public assets.

Tests ran using Node's test runner with `--test-isolation=none` because this machine's sandbox blocks spawned test processes. GitHub Actions uses the normal Node test runner.

## Browser checks

Performed in a Chromium-based browser against the local HTTP server.

| Surface or behavior                     | Result                                                               |
| --------------------------------------- | -------------------------------------------------------------------- |
| Root opens directly to plan form        | Passed                                                               |
| Desktop dark/light form and grid        | Passed                                                               |
| 390px viewport dark/light form and grid | Passed                                                               |
| 320px viewport form, error, and grid    | Passed                                                               |
| Document horizontal overflow            | None in checked layouts                                              |
| Four-day phone grid                     | All four columns fit at 390px viewport                               |
| Rendered text contrast scan             | Zero failures on checked form, grid, result, saved, and error states |
| Theme toggle and reload persistence     | Passed for both modes                                                |
| Keyboard Space selection                | Passed; selected state and 3px focus outline verified                |
| Organizer chooses Pacific time          | Grid visibly shows Pacific Time · America/Los_Angeles                |
| Create → select → save → reload         | Name and selected availability restored                              |
| Empty selection update                  | Participant shown as “Can’t make it”; no available time fabricated   |
| Recent-plan shortcut                    | Reopens saved response for editing                                   |
| Invalid end time                        | Clear inline error; text contrast passes in both themes              |
| Console errors during final checks      | None                                                                 |

Desktop dark form, desktop light grid, and mobile dark grid were also inspected as rendered screenshots. Browser viewport widths include the scrollbar; usable CSS widths during narrow checks were 375px and 305px. Wider date ranges intentionally scroll inside the grid rather than widening the page.

## Not exercised

- GitHub repository and Pages deployment are now complete; see deployment result below.
- Physical two-device testing and a full independent hosted security audit remain unperformed. Hosted schema, health, independent identities, and polling are now exercised as noted below.
- Safari, Firefox, physical iOS/Android devices, screen readers, and a full independent accessibility audit.

The demo is explicitly marked as browser-local until the optional shared database is connected.

## Final design refresh

Rechecked the Outfit/Phosphor midnight-blue and citrus design in dark and light themes. Desktop and 390px/320px forms and saved grids had no detected text-contrast failures or document overflow. Verified activity shortcut fills the name and create/select/save works. Inspected rendered desktop dark form, phone dark grid, and narrow light form. Added a wrapping full time-zone label and stacked date fields on narrow phones after visual review. Earlier broader behavior checks above preceded this visual refresh.

## Connected personal project — September 8, 2026

Installed the schema in the personal Free Supabase project and passed the live HTTP health check. Browser tests created a real plan, saved Test Alex on 127.0.0.1 and Test Sam on localhost (separate browser storage origins), and observed both responses together through polling. Updating a response to unavailable was also exercised. This verifies independent browser identities against the hosted database, not two physical devices.

With live configuration enabled, automated checks report 12 passed and one local-only adapter check intentionally skipped; the earlier unconfigured run passed all 13.

## Public deployment

Published at https://nr-sbe.github.io/yo-you-down/ from nr-sbe/yo-you-down. GitHub Actions run 34277461316 passed the behavior tests, PostgreSQL schema checks, static build, live database health check, and Pages deployment. The public page shows Live sharing and successfully created a plan and saved availability against Supabase.

## Drag selection, sticky labels, and viewer time zones

17 automated checks: 16 passed, one existing local-only adapter check skipped with live configuration. New tests cover rectangle add/erase/reverse/shrink semantics, preserved slot indexes across date rollovers, half-hour and quarter-hour offsets, source DST gaps/repeats, and receiver repeated-hour offset labels. Browser checks exercised a four-cell rectangle, single click, keyboard Space, saving, unchanged selections after zone switching, and a 168-slot grid. At 390px, two-axis scrolling retained the date header and time column; edge dragging scrolled and selected 28 slots. Switching those slots to Nepal time preserved all 28 and saved successfully to Supabase. No page overflow at 390px or 320px in the checked views. Physical touch/pen devices are not verified.
