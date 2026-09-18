// Formic Pro waitlist: one email in, one email out when Pro opens.
// Runs as a Vercel serverless function at /api/waitlist. Two places a signup
// can go, each optional, either one is enough:
//   RESEND_API_KEY  → an email to WAITLIST_TO (default eyosiyasketema@gmail.com)
//                     for every signup, sent through resend.com
//   KV_REST_API_URL + KV_REST_API_TOKEN → a Redis set, filled in by Vercel
//                     when "Upstash for Redis" is added in the Storage tab
// With neither set the function answers 503 and the page tells the person
// to email instead, so a missing setup never loses a signup silently.

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "POST only" });
  }
  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  // the honeypot field is hidden from people; a bot that fills it is thanked and ignored
  if (body.company) return res.status(200).json({ ok: true });
  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "That does not look like an email address." });

  const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
  const resendKey = process.env.RESEND_API_KEY, to = process.env.WAITLIST_TO || "eyosiyasketema@gmail.com";
  if (!(url && token) && !resendKey) return res.status(503).json({ ok: false, error: "The waitlist is not set up yet." });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  let already = false;
  try {
    if (url && token) {
      const cmd = async (...parts) => {
        const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(parts) });
        if (!r.ok) throw new Error(`store ${r.status}`);
        return (await r.json()).result;
      };
      // ten signups a day per address is plenty for a person
      const hits = await cmd("INCR", `waitlist:rate:${ip}`);
      if (hits === 1) await cmd("EXPIRE", `waitlist:rate:${ip}`, 86400);
      if (hits > 10) return res.status(429).json({ ok: false, error: "Too many tries today; please come back tomorrow." });
      const added = await cmd("SADD", "waitlist:pro", email);
      already = !added;
      if (added) await cmd("HSET", "waitlist:pro:meta", email, new Date().toISOString());
    }
    if (resendKey && !already) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.WAITLIST_FROM || "Formic <onboarding@resend.dev>",
          to: [to],
          reply_to: process.env.WAITLIST_REPLY_TO || to,
          subject: `Formic Pro waitlist: ${email}`,
          text: `${email} joined the Formic Pro waitlist on ${new Date().toISOString()}.`,
        }),
      });
      if (!r.ok) throw new Error(`resend ${r.status}`);
    }
    return res.status(200).json({ ok: true, already });
  } catch (err) {
    console.error("waitlist", err);
    return res.status(502).json({ ok: false, error: "Could not save that right now." });
  }
};

function safeJson(text) {
  try { return JSON.parse(text); } catch { return {}; }
}
