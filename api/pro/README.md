# api/pro: the Formic Pro registry

The paid tier on the same rails as the free one. The free registry is static files under `registry/`, served at `/r/<name>.json`. Pro items live in the Upstash store the waitlist already uses and are served at `/r/pro/<name>.json` by a Vercel function that checks a license key against Polar before answering. The CLI (`npx formicai key <key>`, then `npx formicai add <pro name>`) is the only client; nothing here is a page.

Three functions, one shared module:

| file | route | who calls it |
|---|---|---|
| `item.js` | `GET /r/pro/registry.json` (public catalogue), `GET /r/pro/<name>.json` (keyed item) | the CLI, on `add`, `list`, `docs`, `update` |
| `activate.js` | `POST /api/pro/activate` | the CLI, once, on `formicai key` |
| `publish.js` | `POST /api/pro/publish` | the private `formic-pro` repo's CI through `scripts/publish_pro.py` |
| `_lib.js` | (not a route: Vercel ignores `api/` files that start with `_`) | the three above and `test.mjs` |

`vercel.json` rewrites `/r/pro/registry.json` and `/r/pro/:name.json` onto `/api/pro/item?name=…`, listed before the free rewrites so `pro/…` matches first, and sets `Cache-Control: private, no-store` on `/r/pro/(.*)` so the CDN never caches a keyed answer. The free registry keeps its public five-minute cache; its header rule now matches one path segment (`/(registry|r)/:name.json`) so it cannot touch `/r/pro/`.

## The contract

`GET /r/pro/registry.json`, no key. The same shape as the free `registry.json` plus `pro: true` on every item:

```json
{ "$schema": "https://ui.shadcn.com/schema/registry.json", "name": "formic-pro", "homepage": "https://formicai.dev/pro",
  "version": "1.0.0", "items": [ { "name": "agent-workspace", "title": "…", "description": "…", "type": "registry:item",
  "registryDependencies": ["https://formicai.dev/r/formic.json"], "dependencies": [], "files": [ … ], "pro": true } ] }
```

Before anything is published it answers `"version": "0"` and `"items": []`.

`GET /r/pro/<name>.json` with `Authorization: Bearer <key>` and, optionally, `X-Formic-Activation: <activation id>`: the item JSON (a complete registry item with file contents inline, `pro: true`), `Cache-Control: private, no-store`.

Every error, from every endpoint, is `{ "error": "<code>", "message": "<one sentence>" }`. The CLI prints the message and switches on the code:

| status | code | when | message |
|---|---|---|---|
| 401 | `missing_key` | no `Authorization` header | This component is in Formic Pro. Add your key with: npx formicai key <key>. Get one at https://formicai.dev/pro |
| 401 | `invalid_key` | Polar does not know the key | That key is not valid. Check it in your Polar purchase page, or get one at https://formicai.dev/pro |
| 403 | `expired` | past `expires_at` | Your Formic Pro key expired on 2027-01-31. Renew at https://formicai.dev/pro (the date is left out when Polar refused without giving one) |
| 403 | `revoked` | revoked or disabled in Polar | Your Formic Pro key was revoked. Contact hello@formicai.dev |
| 403 | `wrong_product` | the key's `benefit_id` is not `POLAR_BENEFIT_ID` | That key is for a different product. Formic Pro keys come from https://formicai.dev/pro |
| 403 | `activation_limit` | every seat on the key is taken (activate only) | Every seat on that key is in use. Free one in your Polar purchase page, or contact hello@formicai.dev |
| 404 | `not_found` | no such Pro item, or a name that is not a name | No Pro component named <name>. npx formicai add --list shows the names |
| 429 | `rate_limited` | more than 60 requests a minute on one key, or 20 keyless from one IP | Too many requests; wait a minute and try again |
| 502 | `upstream` | Polar unreachable or 5xx (never cached) | Could not check your key right now; try again in a minute |
| 502 | `store` | Upstash unreachable | The Pro registry is not reachable right now; try again in a minute |
| 503 | `not_configured` | `POLAR_ORG_ID` (or `PRO_PUBLISH_SECRET` for publish) unset | Formic Pro is not open yet. Join the list at https://formicai.dev/#pro |
| 401 | `unauthorized` | wrong publish secret | That publish secret is not right |
| 413 | `too_large` | publish body over 8 MB | That payload is above the 8 MB publish limit; split it |

`POST /api/pro/activate` body `{ "key": "…", "label": "<hostname or project name>" }` answers `{ "activation_id": "…", "expires_at": "…" | null, "display_key": "XXXX-****" }`. The CLI keeps `activation_id` and sends it as `X-Formic-Activation` on item requests. When the benefit has no activation limit Polar refuses to activate; the key is validated instead and `activation_id` is `null`, which the CLI treats as "no header to send". A stale activation id (the person reinstalled) never reads as a bad key: the item function retries the validate without it.

`POST /api/pro/publish` with `Authorization: Bearer <PRO_PUBLISH_SECRET>` and body `{ "version": "1.0.0", "registry": { … }, "items": { "<name>": <item> } }` writes `pro:registry` and every `pro:item:<name>`, stamps `pro: true`, and deletes the items that are no longer in the payload (tracked in the set `pro:names`). Answer: `{ "ok": true, "items": N, "removed": M }`. Two optional fields exist because Vercel stops request bodies at 4.5 MB before a function runs: `"prune": false` writes items without deleting anything, and `"names": [ … ]` is the full list to keep when the final call carries the catalogue and no items. `scripts/publish_pro.py` does this on its own; a registry that fits in one call is sent in one call. The name `registry` is reserved.

## How a key is checked

1. The key's SHA-256 is the cache key: `pro:key:<hash>` holds the last verdict (`status`, `expires_at`, `benefit_id`, `display_key`, `checked_at`) for 600 seconds. A hit answers without touching Polar, so a build that adds ten components asks Polar once. Refusals are cached too; a revoked key stays refused for the same ten minutes after a re-grant.
2. On a miss the function POSTs `https://api.polar.sh/v1/customer-portal/license-keys/validate` with `{ key, organization_id, benefit_id?, activation_id? }`. No Polar token is needed; that endpoint is public by design. Polar answers 200 with `status: "granted"` and the key's fields, or 404 with a `detail` sentence for every refusal; `_lib.classifyRefusal` maps "has expired" to `expired`, "no longer active" to `revoked`, "does not match given benefit" to `wrong_product` and the rest to `invalid_key` (those strings are from Polar's own `license_key/service.py`).
3. A granted verdict is still refused when its `benefit_id` is not ours or its `expires_at` has passed since it was cached, with the date in the message.
4. Rate limits use the `INCR` then `EXPIRE` pattern from `waitlist.js`: `pro:rate:key:<hash>` (60 a minute) and `pro:rate:ip:<ip>` (20 a minute, keyless requests only, which never reach Polar).

## Store keys

| key | type | holds |
|---|---|---|
| `pro:registry` | string | the catalogue JSON |
| `pro:item:<name>` | string | one item JSON |
| `pro:names` | set | every published name, for pruning |
| `pro:key:<sha256>` | string, TTL 600 | a key's verdict |
| `pro:rate:*` | string, TTL 60 | rate-limit counters |

## Environment variables

Set these in the Vercel project (Settings, Environment Variables), for Production and Preview. None is ever in code.

| name | where the value comes from |
|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | already set: Vercel fills them when Upstash for Redis is added in the Storage tab |
| `POLAR_ORG_ID` | Polar dashboard, Settings, General: the organization ID (a UUID). Also visible in the address bar of any dashboard page |
| `POLAR_BENEFIT_ID` | Polar dashboard, Products, Benefits, the "Formic Pro" license-key benefit: its ID (a UUID) in the benefit's page URL. With it set, keys from any other benefit are refused as `wrong_product`; leave it unset only while there is no benefit yet |
| `PRO_PUBLISH_SECRET` | make one: `openssl rand -hex 32`. The same value goes into the private repo's CI secrets for `publish_pro.py` |
| `POLAR_SANDBOX` | set to `1` on a Preview deployment to talk to `https://sandbox-api.polar.sh` with a sandbox organization and its own IDs; never on Production |

## Testing

`node api/pro/test.mjs` runs all three handlers in-process with a `Map` in place of Upstash and a stub in place of Polar: no network, under a second, exit 1 on any failure. `scripts/qa_check.py` runs it as step 4g, so CI does too. It covers: the empty catalogue, publish then item served, publish with the wrong or no secret, 413, the reserved name, no key, a bad key, expired, revoked, another product's key, a valid key, the cache hit (the second add does not call Polar), a cached refusal, 404 for an unknown item, the 60-a-minute limit, activation (id returned, no-activation benefits, expired, bad, missing), a stale activation id, pruning on republish, chunked publish, `not_configured`, Polar unreachable, 405, and no store.

Against a real Polar sandbox: create a sandbox organization at `https://sandbox.polar.sh`, a product with a license-key benefit, buy it with Polar's test card, and on a Preview deployment set `POLAR_SANDBOX=1` with the sandbox organization and benefit IDs. Then:

```
curl -s https://<preview>.vercel.app/r/pro/registry.json
curl -s -H "Authorization: Bearer <sandbox key>" https://<preview>.vercel.app/r/pro/<name>.json | head -c 300
curl -s -X POST -H "Content-Type: application/json" -d '{"key":"<sandbox key>","label":"curl"}' https://<preview>.vercel.app/api/pro/activate
```

## Publishing from the private repo

`formic-pro` has this repo's layout and a copy of `scripts/build_registry.py` and `scripts/publish_pro.py`. On merge to its main branch, CI runs:

```
PRO_PUBLISH_SECRET=… python3 scripts/publish_pro.py --url https://staging.formicai.dev   # then, after a look:
PRO_PUBLISH_SECRET=… python3 scripts/publish_pro.py
```

The script builds every component as `build_registry.py` would, drops the base, the all-item and the shared modules (those stay in the free registry, and every Pro item's `registryDependencies` points at `https://formicai.dev/r/formic.json` for them), links Pro-to-Pro imports at `/r/pro/<name>.json`, rewrites the install target to `~/src/formic/pro/<File>.tsx` (`--install-dir` changes it), and POSTs. `--dry-run` prints the names and the payload size and sends nothing. Because a Pro file lands one folder below the free components, the script rewrites its imports: `./primitives`, `./hooks`, `./Button` and every other free module become `../components/<name>`, while an import of another Pro item stays `./<Name>`. The private repo keeps the same flat layout as this one (every component in `components/`), so `build_registry.py`'s import check passes there and the rewrite happens only at publish time.
