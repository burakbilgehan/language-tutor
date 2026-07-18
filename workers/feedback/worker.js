/**
 * Kumo feedback proxy (T-017 option 3).
 *
 * Receives anonymous feedback from the static site and files it as a GitHub
 * issue on the owner's repo using a fine-grained PAT (secret GITHUB_TOKEN).
 * Screenshots are committed to the ASSET_BRANCH via the contents API and
 * embedded in the issue body as a raw.githubusercontent.com image.
 *
 * POST / with JSON:
 *   { kind: "bug"|"idea", title?: string, desc: string,
 *     page?: string, mode?: string, lang?: string, ua?: string,
 *     screenshot?: string }   // data URL, image/jpeg or image/png
 *
 * Responds { ok: true, url: <issue html url> } or { ok: false, error }.
 *
 * Abuse posture: strict origin allow-list + payload size caps. No auth by
 * design (that is the point). If spam ever shows up, add Turnstile here.
 */

const MAX_DESC = 5000;
const MAX_TITLE = 120;
const MAX_SHOT_BYTES = 3 * 1024 * 1024; // decoded image bytes

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") ?? "";
    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim());
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    const json = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "method" });
    if (!allowed.includes(origin)) return json(403, { ok: false, error: "origin" });

    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { ok: false, error: "bad_json" });
    }

    const kind = body.kind === "idea" ? "idea" : "bug";
    const desc = String(body.desc ?? "").trim();
    const userTitle = String(body.title ?? "").trim().slice(0, MAX_TITLE);
    if (!desc) return json(400, { ok: false, error: "empty_desc" });
    if (desc.length > MAX_DESC) return json(400, { ok: false, error: "desc_too_long" });

    const gh = (path, init = {}) =>
      fetch(`https://api.github.com${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "kumo-feedback-worker",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
      });

    // Screenshot → commit to the asset branch, reference by raw URL.
    let shotUrl = null;
    if (typeof body.screenshot === "string" && body.screenshot.startsWith("data:image/")) {
      const m = body.screenshot.match(/^data:image\/(png|jpeg);base64,(.+)$/);
      if (!m) return json(400, { ok: false, error: "bad_screenshot" });
      const [, ext, b64] = m;
      if (b64.length * 0.75 > MAX_SHOT_BYTES)
        return json(400, { ok: false, error: "screenshot_too_big" });

      await ensureBranch(gh, env);
      const path = `shots/${new Date().toISOString().slice(0, 10)}-${crypto
        .randomUUID()
        .slice(0, 8)}.${ext === "jpeg" ? "jpg" : ext}`;
      const put = await gh(
        `/repos/${env.GITHUB_REPO}/contents/${path}`,
        {
          method: "PUT",
          body: JSON.stringify({
            message: `feedback screenshot ${path}`,
            content: b64,
            branch: env.ASSET_BRANCH,
          }),
        },
      );
      if (put.ok) {
        shotUrl = `https://raw.githubusercontent.com/${env.GITHUB_REPO}/${env.ASSET_BRANCH}/${path}`;
      }
      // Upload failure is non-fatal: file the issue without the image.
    }

    const kindLabel = kind === "bug" ? "Sorun" : "Öneri";
    const title =
      `[${kindLabel}] ` +
      (userTitle || `${body.page ?? "?"} — ${desc.slice(0, 48)}${desc.length > 48 ? "…" : ""}`);
    const meta = [
      kindLabel,
      body.page ? `Sayfa: ${String(body.page).slice(0, 200)}` : null,
      body.mode ? `Mod: ${String(body.mode).slice(0, 20)}` : null,
      body.lang ? `Dil: ${String(body.lang).slice(0, 20)}` : null,
      body.ua ? `Tarayıcı: ${String(body.ua).slice(0, 300)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const issueBody =
      desc +
      (shotUrl ? `\n\n![screenshot](${shotUrl})` : "") +
      `\n\n---\n${meta}\n`;

    const res = await gh(`/repos/${env.GITHUB_REPO}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, body: issueBody, labels: ["feedback"] }),
    });
    if (!res.ok) return json(502, { ok: false, error: `github_${res.status}` });
    const issue = await res.json();
    return json(200, { ok: true, url: issue.html_url });
  },
};

/** Create the asset branch off the default branch if it doesn't exist yet. */
async function ensureBranch(gh, env) {
  const head = await gh(`/repos/${env.GITHUB_REPO}/git/ref/heads/${env.ASSET_BRANCH}`);
  if (head.ok) return;
  const repo = await (await gh(`/repos/${env.GITHUB_REPO}`)).json();
  const base = await (
    await gh(`/repos/${env.GITHUB_REPO}/git/ref/heads/${repo.default_branch}`)
  ).json();
  await gh(`/repos/${env.GITHUB_REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${env.ASSET_BRANCH}`,
      sha: base.object.sha,
    }),
  });
}
