// One-click unsubscribe for the waitlist and Pro notes. The link in every
// email carries the address and a token derived from a secret, so nobody can
// unsubscribe someone else by guessing. Unsubscribed addresses go into a set
// the announce script skips; the person never has to write to us.
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const email = String(req.query.e || "").trim().toLowerCase();
  const token = String(req.query.t || "");
  const secret = process.env.WAITLIST_SECRET || process.env.RESEND_API_KEY || "";
  const expected = crypto.createHash("sha256").update(secret + email).digest("hex").slice(0, 16);
  const page = (title, body) => res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").end(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Formic</title>` +
    `<style>body{margin:0;background:#fff;color:#1a1a1a;font:15px/1.6 Urbanist,ui-sans-serif,system-ui,sans-serif}main{max-width:32rem;margin:18vh auto;padding:0 24px}h1{font-size:22px;font-weight:600;margin:0 0 8px}p{margin:0 0 12px;color:#5c5c5c}a{color:#557611}</style>` +
    `<main><h1>${title}</h1><p>${body}</p><p><a href="https://formicai.dev/">formicai.dev</a></p></main>`,
  );
  if (!email || token !== expected) return page("That link does not work", "It may be incomplete. Reply to any email from us and we will remove you by hand.");
  const url = process.env.KV_REST_API_URL, kv = process.env.KV_REST_API_TOKEN;
  if (!url || !kv) return page("Noted", "Reply to any email from us and we will remove you by hand.");
  try {
    await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${kv}`, "Content-Type": "application/json" }, body: JSON.stringify(["SADD", "waitlist:unsub", email]) });
    return page("You are unsubscribed", `${email} will not hear from Formic again. Rejoin any time from the site.`);
  } catch (err) {
    console.error("unsubscribe", err);
    return page("Something went wrong", "Please try the link again in a minute, or reply to the email.");
  }
};
