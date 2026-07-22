# Google Drive Backup — Setup (T-032)

The static (local-first) build can auto-back-up your save to **your own**
Google Drive. Everything runs in the browser — there is no server, no shared
secret, and the app owner never sees your data. Saves go to your Drive's hidden
**appDataFolder** (your quota, invisible in the normal Drive UI).

To turn it on you register **one OAuth Client ID** in Google Cloud and paste it
into Settings → Google Drive Backup. It takes ~5 minutes and costs nothing.

## What you register

A browser OAuth **token client** (implicit/token flow). It has:

- **No client secret** (browser flows don't use one).
- Only the **`drive.appdata`** scope — a *non-sensitive* scope, so Google does
  not require app verification for personal/testing use.

## Steps (Google Cloud Console)

1. **Create a project** — <https://console.cloud.google.com/projectcreate>.
   Any name (e.g. "language-tutor-backup"). Select it.

2. **Enable the Drive API** — APIs & Services → Library → search "Google Drive
   API" → **Enable**.

3. **OAuth consent screen** — APIs & Services → OAuth consent screen:
   - User type: **External** → Create.
   - Fill the required app name + your email; you can skip the optional fields.
   - **Scopes**: Add scope → paste
     `https://www.googleapis.com/auth/drive.appdata` → Update.
   - **Test users**: add your own Google account.
   - **Leave the publishing status as "Testing".** In Testing mode, only your
     added test users can use it and **no verification is needed**. That is all
     personal use requires. (Publishing would trigger Google's review; you don't
     need it.)

4. **Create the OAuth client ID** — APIs & Services → Credentials →
   Create credentials → **OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins** — add every origin you open the app from
     (token clients validate the JS *origin*, not a redirect URI):
     - `https://<your-username>.github.io` — the GitHub Pages deploy
       (e.g. `https://burakbilgehan.github.io`). Origin only, **no path**.
     - `http://localhost:3000` — if you also run it locally.
   - Leave "Authorized redirect URIs" empty.
   - Create → copy the **Client ID** (looks like
     `1234567890-abcdef.apps.googleusercontent.com`).

5. **Paste it into the app** — Settings → Google Drive Backup → OAuth Client ID
   → paste → Save → **Connect Drive**. Approve the consent popup once.

## How it behaves after that

- **Auto-upload** on lesson completion and on app startup (when there's new
  progress), keeping the **last 5** versions in your appDataFolder.
- **Startup check**: if another device uploaded a newer save, you're asked
  "load it?" (last-write-wins; you decide).
- **Token expiry** (~1 hour): a silent refresh is attempted first. If it can't
  (Google session ended), the pending backup is **queued** and a "Reconnect"
  bar appears — one click flushes it. No progress is lost.
- **Access tokens live in memory only** — never in localStorage. Only the
  public Client ID is stored locally.

## Troubleshooting

- **"Could not connect" / popup closes immediately** — the origin you're on
  isn't in *Authorized JavaScript origins*, or you're not a listed test user.
- **`redirect_uri_mismatch`** — you added a path or a trailing slash. Origins
  must be scheme+host only (`https://you.github.io`).
- **`access_denied`** — you're not added as a test user on the consent screen.
