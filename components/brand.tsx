"use client";
import type { CSSProperties } from "react";
/* ─────────────────────────────────────────────────────────
 * BRAND — the Formic logomark as an inline SVG
 * Traced from assets/formic-logomark-512.png so it can be coloured
 * with currentColor (the accent in AppSidebar's header) instead of
 * shipping a PNG that needs a mask. Brand SVGs are the sanctioned
 * exception to the Phosphor-only icon rule.
 * ───────────────────────────────────────────────────────── */
export function FormicMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <path fill="currentColor" fillRule="evenodd" d="M203 373 L204 378 L211 383 L221 388 L223 388 L233 392 L242 393 L243 394 L268 394 L269 393 L278 392 L279 391 L290 388 L300 383 L306 379 L308 376 L308 373 L289 349 L278 356 L276 356 L273 358 L266 359 L265 360 L246 360 L245 359 L238 358 L235 356 L233 356 L229 354 L222 349Z M120 244 L120 278 L213 278 L214 279 L213 280 L207 281 L204 283 L199 284 L196 286 L194 286 L178 294 L173 298 L167 301 L154 312 L153 312 L140 325 L140 326 L129 339 L131 341 L155 357 L159 356 L179 335 L198 322 L219 313 L222 313 L230 310 L242 309 L243 308 L268 308 L269 309 L275 309 L276 310 L280 310 L281 311 L285 311 L289 313 L292 313 L298 316 L300 316 L305 319 L307 319 L313 323 L318 325 L332 335 L348 351 L348 352 L354 357 L358 356 L382 339 L376 331 L370 325 L370 324 L359 313 L358 313 L348 304 L331 293 L317 286 L315 286 L312 284 L310 284 L297 279 L298 278 L391 278 L391 244Z M147 184 L147 185 L154 192 L155 192 L164 200 L176 208 L183 211 L189 215 L191 215 L196 218 L198 218 L201 220 L203 220 L213 224 L216 224 L221 226 L225 226 L226 227 L230 227 L231 228 L238 228 L239 229 L272 229 L273 228 L280 228 L281 227 L285 227 L286 226 L290 226 L291 225 L298 224 L299 223 L310 220 L338 206 L352 196 L364 185 L364 184 L341 161 L339 161 L327 172 L315 180 L303 186 L301 186 L298 188 L296 188 L289 191 L286 191 L281 193 L277 193 L276 194 L270 194 L269 195 L242 195 L241 194 L230 193 L229 192 L226 192 L225 191 L222 191 L221 190 L213 188 L191 177 L180 169 L172 161 L170 161Z M201 143 L201 144 L217 154 L219 154 L227 158 L230 158 L231 159 L238 160 L239 161 L244 161 L245 162 L266 162 L267 161 L277 160 L278 159 L284 158 L287 156 L289 156 L303 149 L310 144 L307 139 L289 117 L275 125 L269 126 L268 127 L264 127 L263 128 L248 128 L247 127 L239 126 L228 121 L222 117Z" />
    </svg>
  );
}

/* ── BrandIcon — company and social marks, from the same Phosphor set ── */
/* Rule 3 says one icon package. Phosphor ships the logos, so no second
 * library: <BrandIcon name="github" />. Monochrome by default —
 * currentColor, the same grid and weights as the UI icons, coloured
 * like any icon (ink, ink-2, accent). `color="brand"` paints the mark
 * in its published colour (styles/brands.css), for the places where the
 * logo has to be recognised at a glance: sign-in buttons, an
 * integrations directory, a "connected accounts" row. Never for
 * navigation or status, where a row of brand colours reads as a
 * sticker sheet. A mark Phosphor does not draw (Vercel, AWS, Docker,
 * Gmail, Zoom…) is a BrandLogo in brand-logos.tsx, the real mark. */
import {
  AmazonLogo, AndroidLogo, AngularLogo, AppStoreLogo, AppleLogo, BehanceLogo,
  CodaLogo, CodepenLogo, CodesandboxLogo, DevToLogo, DiscordLogo, DribbbleLogo,
  DropboxLogo, FacebookLogo, FigmaLogo, FramerLogo, GithubLogo, GitlabLogo,
  GoogleChromeLogo, GoogleDriveLogo, GoogleLogo, GooglePlayLogo, InstagramLogo, LinkedinLogo,
  LinktreeLogo, LinuxLogo, MarkdownLogo, MastodonLogo, MediumLogo, MessengerLogo,
  MetaLogo, MicrosoftExcelLogo, MicrosoftOutlookLogo, MicrosoftPowerpointLogo, MicrosoftTeamsLogo, MicrosoftWordLogo,
  NotionLogo, OpenAiLogo, PatreonLogo, PaypalLogo, PinterestLogo, RedditLogo,
  ReplitLogo, SketchLogo, SkypeLogo, SlackLogo, SnapchatLogo, SoundcloudLogo,
  SpotifyLogo, StackOverflowLogo, SteamLogo, StripeLogo, TelegramLogo, ThreadsLogo,
  TiktokLogo, TumblrLogo, TwitchLogo, TwitterLogo, WechatLogo, WhatsappLogo,
  WindowsLogo, XLogo, YoutubeLogo,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

export type BrandName =
  "github" | "google" | "apple" | "windows" | "slack" | "notion" | "figma" | "linkedin" | "x" | "twitter" | "instagram" | "facebook" | "messenger" | "youtube" | "tiktok" | "telegram" | "whatsapp" | "wechat" | "skype" | "discord" | "stripe" | "paypal" | "spotify" | "soundcloud" | "android" | "linux" | "chrome" | "openai" | "google-drive" | "google-play" | "app-store" | "amazon" | "meta" | "pinterest" | "reddit" | "threads" | "snapchat" | "twitch" | "mastodon" | "medium" | "tumblr" | "behance" | "dribbble" | "framer" | "sketch" | "gitlab" | "codepen" | "codesandbox" | "replit" | "stack-overflow" | "dev-to" | "dropbox" | "teams" | "outlook" | "excel" | "word" | "powerpoint" | "steam" | "patreon" | "angular" | "markdown" | "coda" | "linktree";
const BRANDS: Record<BrandName, PhosphorIcon> = {
  "github": GithubLogo,
  "google": GoogleLogo,
  "apple": AppleLogo,
  "windows": WindowsLogo,
  "slack": SlackLogo,
  "notion": NotionLogo,
  "figma": FigmaLogo,
  "linkedin": LinkedinLogo,
  "x": XLogo,
  "twitter": TwitterLogo,
  "instagram": InstagramLogo,
  "facebook": FacebookLogo,
  "messenger": MessengerLogo,
  "youtube": YoutubeLogo,
  "tiktok": TiktokLogo,
  "telegram": TelegramLogo,
  "whatsapp": WhatsappLogo,
  "wechat": WechatLogo,
  "skype": SkypeLogo,
  "discord": DiscordLogo,
  "stripe": StripeLogo,
  "paypal": PaypalLogo,
  "spotify": SpotifyLogo,
  "soundcloud": SoundcloudLogo,
  "android": AndroidLogo,
  "linux": LinuxLogo,
  "chrome": GoogleChromeLogo,
  "openai": OpenAiLogo,
  "google-drive": GoogleDriveLogo,
  "google-play": GooglePlayLogo,
  "app-store": AppStoreLogo,
  "amazon": AmazonLogo,
  "meta": MetaLogo,
  "pinterest": PinterestLogo,
  "reddit": RedditLogo,
  "threads": ThreadsLogo,
  "snapchat": SnapchatLogo,
  "twitch": TwitchLogo,
  "mastodon": MastodonLogo,
  "medium": MediumLogo,
  "tumblr": TumblrLogo,
  "behance": BehanceLogo,
  "dribbble": DribbbleLogo,
  "framer": FramerLogo,
  "sketch": SketchLogo,
  "gitlab": GitlabLogo,
  "codepen": CodepenLogo,
  "codesandbox": CodesandboxLogo,
  "replit": ReplitLogo,
  "stack-overflow": StackOverflowLogo,
  "dev-to": DevToLogo,
  "dropbox": DropboxLogo,
  "teams": MicrosoftTeamsLogo,
  "outlook": MicrosoftOutlookLogo,
  "excel": MicrosoftExcelLogo,
  "word": MicrosoftWordLogo,
  "powerpoint": MicrosoftPowerpointLogo,
  "steam": SteamLogo,
  "patreon": PatreonLogo,
  "angular": AngularLogo,
  "markdown": MarkdownLogo,
  "coda": CodaLogo,
  "linktree": LinktreeLogo,
};
export const BRAND_NAMES = Object.keys(BRANDS) as BrandName[];

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
  /** 2 and up is bold, under 2 regular, as with Icon */
  strokeWidth?: number;
  /** "mono" (default) inherits currentColor; "brand" uses the mark's own colour */
  color?: "mono" | "brand";
  className?: string;
  style?: CSSProperties;
}) {
  const Glyph = BRANDS[name];
  return <Glyph aria-hidden size={size} weight={strokeWidth >= 2 ? "bold" : "regular"} className={className} style={color === "brand" ? { color: `var(--brand-${name})`, ...style } : style} />;
}
