# Share your first real hangout

**This copy is already connected to your Supabase project.** The schema is installed and `config.js` contains its public connection values. Skip step 1; repository variables in step 2 are optional for this configured copy. Do not rerun the schema. The instructions below also serve people setting up their own copy.

Your website runs on **your own GitHub Pages**. Supabase stores the responses so friends on different devices see the same plan. Friends need no accounts.

## 1. Create your free database

1. Sign up at [Supabase](https://supabase.com/dashboard) and create a project on the **Free** plan. Save its database password privately; this app does not need it.
2. Once the project is ready, open **SQL Editor**, create a new query, paste the full contents of [supabase/schema.sql](supabase/schema.sql), and run it **once**. Use a new project; this script is not designed to be rerun over existing tables.
3. Find your **Project URL** and **publishable API key** in the project's connection/API settings. The key starts with `sb_publishable_`. These two values are public browser configuration. Never use a secret key, service-role key, or database password.

Supabase lists a $0/month Free plan with a 500 MB database. Free projects may pause after a week of inactivity; resume yours in the dashboard if needed. See [current pricing](https://supabase.com/pricing). This should comfortably cover a small friends-and-family trial, though usage limits still apply.

## 2. Upload and publish on GitHub

1. Create a **public** repository named `yo-you-down` in your personal GitHub account.
2. Upload the contents of this folder into the repository root. Include the hidden `.github/workflows/pages.yml` and `.nojekyll` files. Do not upload the ZIP itself or nest the app inside another folder. If your file picker hides dotfiles, enable hidden files or use GitHub Desktop to add the whole folder.
3. In the repository, open **Settings → Secrets and variables → Actions → Variables**. Add these two **repository variables**:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | Your HTTPS Project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | Your `sb_publishable_...` key |

4. Open **Settings → Pages** and set the publishing source to **GitHub Actions**.
5. Open **Actions → Publish GitHub Pages → Run workflow** on `main`. An initial run before adding the variables may fail; rerun after setup. The workflow tests the app, checks the database connection, and deploys the public files.
6. Open the URL shown in Pages settings, usually `https://YOUR-USERNAME.github.io/yo-you-down/`.

The workflow deliberately refuses to publish an unconfigured browser-only demo. Future pushes to `main` automatically republish.

## 3. Make a plan and send its invite

The home screen should say **Live sharing**. Tap an activity or type a name, check the dates and time zone, then press **Create & copy invite**. Send the copied link to your friends. If clipboard access is unavailable, use **Copy invite link** on the plan screen or copy its address.

Before sharing widely, open the invite in a private window or a second device. Save another person's availability, then confirm both responses appear on the first device within 15 seconds. Update your own response and confirm it changes without adding a duplicate.

**Local demo** means responses stay in one browser. Existing local demo plans are never automatically uploaded; create a new plan after connecting Supabase.

## Local preview

With Node.js 22 or newer, run `node serve.mjs` and open `http://127.0.0.1:4173`. No package installation is needed. To preview live sharing locally, put your two public values in `config.js`; otherwise the local preview remains a demo. GitHub repository variables override that file during the Actions build.

## Troubleshooting

- **Build says configuration missing:** check both repository variable names exactly and rerun the workflow.
- **Database connection check fails:** confirm the project is running, the URL/key match that project, and the SQL completed successfully. A paused project must be resumed.
- **Missing tables or function:** run the supplied SQL in a fresh project. Do not paste partial fragments or repeatedly run the whole script over an existing installation.
- **Old local plan won't open for a friend:** create a new plan on the published site after it says Live sharing.
- **Lost ability to edit:** editing is tied to the browser that submitted the response. Clearing its storage loses that capability. This small app has no account-recovery system.

The code and local checks are complete; your personal cloud account, GitHub publication, and final two-device check must happen during this setup.
