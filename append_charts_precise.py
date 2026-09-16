import re

with open('preview.html', 'r') as f:
    text = f.read()

# Extract useReducedMotion
urm_match = re.search(r'function useReducedMotion\(\) \{.*?\n\}', text, re.DOTALL)
urm = urm_match.group(0) if urm_match else ''

# Extract useWidth
uw_match = re.search(r'function useWidth\(\) \{.*?\n\}', text, re.DOTALL)
uw = uw_match.group(0) if uw_match else ''

charts_start = text.find('/* ═══════════ Charts (mirrors components/charts.tsx) ═══════════ */')
charts_end = text.find('/* ═══════════ StatCard / MetricRow (mirrors components/StatCard.tsx) ═══════════ */')
charts_block = text[charts_start:charts_end].strip()

new_content = f"""

/* --- Injected Hooks --- */
{urm}

{uw}

const TOOLTIP_CHIP = "primitive-tooltip rounded-chip px-2 py-1 text-tiny font-medium whitespace-nowrap";
const TOOLTIP_CHIP_STYLE = {{ background: "var(--tooltip-bg)", color: "var(--tooltip-fg)" }};
const FORMIC_CONFIG = {{ avatar: "initials", sidebar: "full", sidebarState: "expanded", motion: true }};

/* --- Injected Charts --- */
{charts_block}

"""

with open('landing.jsx', 'r') as f:
    landing_text = f.read()

landing_text = landing_text.replace('function BentoSwitcher() {', new_content + 'function BentoSwitcher() {')

with open('landing.jsx', 'w') as f:
    f.write(landing_text)
print("Injected precise charts")
