/* Brief
   Reader:   the person who just watched their AI tool build a page
   Question: this is the stock look; can I change it?
   Action:   open the customizer in a new tab
   Register: text
*/
/* One card in the bottom-right corner, above every page the AI tool builds
   (not the welcome page), that says the look can be changed, with one link;
   Close and Customize both dismiss it for good. Mounted from main.tsx beside
   the app so it survives whatever happens to App.tsx. Delete this file and its
   two lines in main.tsx once the look is yours. */
import { useEffect, useState } from "react";
import Button from "./formic/components/Button";
import { Card, Icon, IconButton } from "./formic/components/primitives";

const CUSTOMIZE_URL = "https://formicai.dev/customize";
/* one key per install, so a card dismissed in an earlier project on the same
   localhost port does not stay dismissed in this one */
const STORAGE_KEY = "formic-nudge-__FORMIC_INSTALL__";
const dismissed = () => { try { return localStorage.getItem(STORAGE_KEY) === "off"; } catch { return false; } };
const onWelcome = () => Boolean(document.querySelector("[data-formic-welcome]"));

export default function CustomizeNudge() {
  /* hidden on the welcome page, where the prompts are the one thing to read;
     shows the moment the AI tool's page replaces it, and stays through every
     page after that until dismissed */
  const [shown, setShown] = useState(false);
  const [closed, setClosed] = useState(dismissed);
  useEffect(() => {
    if (closed) { setShown(false); return; }
    const check = () => setShown(!onWelcome());
    check();
    const watch = new MutationObserver(check);
    watch.observe(document.body, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, [closed]);
  /* Close is the only thing that dismisses it; Customize opens the customizer
     in a new tab and the card stays, so the way back is still on screen */
  const close = () => { setClosed(true); try { localStorage.setItem(STORAGE_KEY, "off"); } catch { /* private mode: the choice lasts the session */ } };
  if (!shown) return null;
  return (
    <Card role="region" aria-label="Make it yours" className="fixed right-4 bottom-4 z-40 flex w-full max-w-xs items-start gap-3 p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent-tint text-accent"><Icon name="sparkles" size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink">Make it yours</p>
        <p className="mt-0.5 text-caption text-ink-2">Accent, palette, font, radius and rail can be changed any time, and every page follows.</p>
        <Button variant="accent" size="sm" href={CUSTOMIZE_URL} target="_blank" icon={<Icon name="external" />} className="mt-3">Customize</Button>
      </div>
      <IconButton label="Close" onClick={close} className="-mt-1 -mr-1 shrink-0 text-ink-3 hover:bg-hover hover:text-ink">
        <Icon name="close" size={14} />
      </IconButton>
    </Card>
  );
}
