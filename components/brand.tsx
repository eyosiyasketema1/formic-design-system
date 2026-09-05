"use client";
import type { CSSProperties } from "react";
/* ─────────────────────────────────────────────────────────
 * BRAND — the Formic logomark as an inline SVG
 * Traced from assets/formic-logomark-512.png so it can be coloured
 * with currentColor (the accent in AppSidebar's header) instead of
 * shipping a PNG that needs a mask. Brand SVGs are the sanctioned
 * exception to the Tabler-only icon rule.
 * ───────────────────────────────────────────────────────── */
export function FormicMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <path fill="currentColor" fillRule="evenodd" d="M203 373 L204 378 L211 383 L221 388 L223 388 L233 392 L242 393 L243 394 L268 394 L269 393 L278 392 L279 391 L290 388 L300 383 L306 379 L308 376 L308 373 L289 349 L278 356 L276 356 L273 358 L266 359 L265 360 L246 360 L245 359 L238 358 L235 356 L233 356 L229 354 L222 349Z M120 244 L120 278 L213 278 L214 279 L213 280 L207 281 L204 283 L199 284 L196 286 L194 286 L178 294 L173 298 L167 301 L154 312 L153 312 L140 325 L140 326 L129 339 L131 341 L155 357 L159 356 L179 335 L198 322 L219 313 L222 313 L230 310 L242 309 L243 308 L268 308 L269 309 L275 309 L276 310 L280 310 L281 311 L285 311 L289 313 L292 313 L298 316 L300 316 L305 319 L307 319 L313 323 L318 325 L332 335 L348 351 L348 352 L354 357 L358 356 L382 339 L376 331 L370 325 L370 324 L359 313 L358 313 L348 304 L331 293 L317 286 L315 286 L312 284 L310 284 L297 279 L298 278 L391 278 L391 244Z M147 184 L147 185 L154 192 L155 192 L164 200 L176 208 L183 211 L189 215 L191 215 L196 218 L198 218 L201 220 L203 220 L213 224 L216 224 L221 226 L225 226 L226 227 L230 227 L231 228 L238 228 L239 229 L272 229 L273 228 L280 228 L281 227 L285 227 L286 226 L290 226 L291 225 L298 224 L299 223 L310 220 L338 206 L352 196 L364 185 L364 184 L341 161 L339 161 L327 172 L315 180 L303 186 L301 186 L298 188 L296 188 L289 191 L286 191 L281 193 L277 193 L276 194 L270 194 L269 195 L242 195 L241 194 L230 193 L229 192 L226 192 L225 191 L222 191 L221 190 L213 188 L191 177 L180 169 L172 161 L170 161Z M201 143 L201 144 L217 154 L219 154 L227 158 L230 158 L231 159 L238 160 L239 161 L244 161 L245 162 L266 162 L267 161 L277 160 L278 159 L284 158 L287 156 L289 156 L303 149 L310 144 L307 139 L289 117 L275 125 L269 126 L268 127 L264 127 L263 128 L248 128 L247 127 L239 126 L228 121 L222 117Z" />
    </svg>
  );
}

/* ── BrandIcon — company and social marks, from the same Tabler set ── */
/* Rule 3 says one icon package. Tabler ships the brands, so no second
 * library: <BrandIcon name="github" />. Monochrome by default —
 * currentColor, the same 24-grid as the UI icons, coloured like any
 * icon (ink, ink-2, accent). `color="brand"` paints the mark in its
 * published colour (styles/brands.css), for the places where the logo
 * has to be recognised at a glance: sign-in buttons, an integrations
 * directory, a "connected accounts" row. Never for navigation or
 * status, where a row of brand colours reads as a sticker sheet. */
import {
  IconBrandAdobe,
  IconBrandAirbnb,
  IconBrandAirtable,
  IconBrandAmazon,
  IconBrandAndroid,
  IconBrandApple,
  IconBrandAsana,
  IconBrandAws,
  IconBrandAzure,
  IconBrandBehance,
  IconBrandBitbucket,
  IconBrandBooking,
  IconBrandChrome,
  IconBrandDiscord,
  IconBrandDisney,
  IconBrandDocker,
  IconBrandDribbble,
  IconBrandFacebook,
  IconBrandFigma,
  IconBrandFirebase,
  IconBrandFramer,
  IconBrandGit,
  IconBrandGithub,
  IconBrandGithubCopilot,
  IconBrandGitlab,
  IconBrandGmail,
  IconBrandGoogle,
  IconBrandGoogleAnalytics,
  IconBrandGoogleDrive,
  IconBrandGooglePlay,
  IconBrandInstagram,
  IconBrandJavascript,
  IconBrandLaravel,
  IconBrandLinkedin,
  IconBrandMastercard,
  IconBrandMastodon,
  IconBrandMedium,
  IconBrandMeta,
  IconBrandNetflix,
  IconBrandNextjs,
  IconBrandNotion,
  IconBrandOffice,
  IconBrandOnedrive,
  IconBrandOpenai,
  IconBrandPaypal,
  IconBrandPhp,
  IconBrandPinterest,
  IconBrandPython,
  IconBrandReact,
  IconBrandReddit,
  IconBrandSamsungpass,
  IconBrandSketch,
  IconBrandSlack,
  IconBrandSnapchat,
  IconBrandSoundcloud,
  IconBrandSpotify,
  IconBrandStripe,
  IconBrandSupabase,
  IconBrandTailwind,
  IconBrandTeams,
  IconBrandTelegram,
  IconBrandTesla,
  IconBrandThreads,
  IconBrandTiktok,
  IconBrandTrello,
  IconBrandTripadvisor,
  IconBrandTwitch,
  IconBrandTypescript,
  IconBrandUber,
  IconBrandUbuntu,
  IconBrandVercel,
  IconBrandVimeo,
  IconBrandVisa,
  IconBrandVue,
  IconBrandWebflow,
  IconBrandWhatsapp,
  IconBrandWindows,
  IconBrandWordpress,
  IconBrandX,
  IconBrandYoutube,
  IconBrandZoom,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
export type BrandName =
  "github" | "google" | "apple" | "windows" | "slack" | "notion" | "figma" | "linkedin" | "x" | "instagram" | "facebook" | "youtube" | "tiktok" | "telegram" | "whatsapp" | "discord" | "stripe" | "paypal" | "spotify" | "android" | "chrome" | "openai" | "vercel" | "github-copilot" | "gmail" | "google-drive" | "zoom" | "trello" | "asana" | "airtable" | "amazon" | "meta" | "pinterest" | "reddit" | "threads" | "snapchat" | "twitch" | "mastodon" | "medium" | "behance" | "dribbble" | "wordpress" | "webflow" | "framer" | "adobe" | "sketch" | "visa" | "mastercard" | "docker" | "aws" | "azure" | "firebase" | "supabase" | "vue" | "react" | "nextjs" | "tailwind" | "typescript" | "javascript" | "python" | "php" | "laravel" | "git" | "gitlab" | "bitbucket" | "ubuntu" | "teams" | "office" | "onedrive" | "google-analytics" | "google-play" | "samsungpass" | "tesla" | "uber" | "airbnb" | "booking" | "tripadvisor" | "soundcloud" | "vimeo" | "netflix" | "disney";
const BRANDS: Record<BrandName, TablerIcon> = {
  "github": IconBrandGithub,
  "google": IconBrandGoogle,
  "apple": IconBrandApple,
  "windows": IconBrandWindows,
  "slack": IconBrandSlack,
  "notion": IconBrandNotion,
  "figma": IconBrandFigma,
  "linkedin": IconBrandLinkedin,
  "x": IconBrandX,
  "instagram": IconBrandInstagram,
  "facebook": IconBrandFacebook,
  "youtube": IconBrandYoutube,
  "tiktok": IconBrandTiktok,
  "telegram": IconBrandTelegram,
  "whatsapp": IconBrandWhatsapp,
  "discord": IconBrandDiscord,
  "stripe": IconBrandStripe,
  "paypal": IconBrandPaypal,
  "spotify": IconBrandSpotify,
  "android": IconBrandAndroid,
  "chrome": IconBrandChrome,
  "openai": IconBrandOpenai,
  "vercel": IconBrandVercel,
  "github-copilot": IconBrandGithubCopilot,
  "gmail": IconBrandGmail,
  "google-drive": IconBrandGoogleDrive,
  "zoom": IconBrandZoom,
  "trello": IconBrandTrello,
  "asana": IconBrandAsana,
  "airtable": IconBrandAirtable,
  "amazon": IconBrandAmazon,
  "meta": IconBrandMeta,
  "pinterest": IconBrandPinterest,
  "reddit": IconBrandReddit,
  "threads": IconBrandThreads,
  "snapchat": IconBrandSnapchat,
  "twitch": IconBrandTwitch,
  "mastodon": IconBrandMastodon,
  "medium": IconBrandMedium,
  "behance": IconBrandBehance,
  "dribbble": IconBrandDribbble,
  "wordpress": IconBrandWordpress,
  "webflow": IconBrandWebflow,
  "framer": IconBrandFramer,
  "adobe": IconBrandAdobe,
  "sketch": IconBrandSketch,
  "visa": IconBrandVisa,
  "mastercard": IconBrandMastercard,
  "docker": IconBrandDocker,
  "aws": IconBrandAws,
  "azure": IconBrandAzure,
  "firebase": IconBrandFirebase,
  "supabase": IconBrandSupabase,
  "vue": IconBrandVue,
  "react": IconBrandReact,
  "nextjs": IconBrandNextjs,
  "tailwind": IconBrandTailwind,
  "typescript": IconBrandTypescript,
  "javascript": IconBrandJavascript,
  "python": IconBrandPython,
  "php": IconBrandPhp,
  "laravel": IconBrandLaravel,
  "git": IconBrandGit,
  "gitlab": IconBrandGitlab,
  "bitbucket": IconBrandBitbucket,
  "ubuntu": IconBrandUbuntu,
  "teams": IconBrandTeams,
  "office": IconBrandOffice,
  "onedrive": IconBrandOnedrive,
  "google-analytics": IconBrandGoogleAnalytics,
  "google-play": IconBrandGooglePlay,
  "samsungpass": IconBrandSamsungpass,
  "tesla": IconBrandTesla,
  "uber": IconBrandUber,
  "airbnb": IconBrandAirbnb,
  "booking": IconBrandBooking,
  "tripadvisor": IconBrandTripadvisor,
  "soundcloud": IconBrandSoundcloud,
  "vimeo": IconBrandVimeo,
  "netflix": IconBrandNetflix,
  "disney": IconBrandDisney,
};
export function BrandIcon({
  name,
  size = 16,
  strokeWidth = 1.8,
  color = "mono",
  className,
  style,
}: {
  name: BrandName;
  size?: number;
  strokeWidth?: number;
  /** "mono" (default) inherits currentColor; "brand" uses the mark's own colour */
  color?: "mono" | "brand";
  className?: string;
  style?: CSSProperties;
}) {
  const Glyph = BRANDS[name];
  return <Glyph aria-hidden size={size} stroke={strokeWidth} className={className} style={color === "brand" ? { color: `var(--brand-${name})`, ...style } : style} />;
}
