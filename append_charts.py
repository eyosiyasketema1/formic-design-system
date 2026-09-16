import re

with open('preview.html', 'r') as f:
    text = f.read()

# Extract useReducedMotion
urm_match = re.search(r'function useReducedMotion\(\) \{.*?\n\}', text, re.DOTALL)
urm = urm_match.group(0) if urm_match else ''

# Extract useWidth
uw_match = re.search(r'function useWidth\(\) \{.*?\n\}', text, re.DOTALL)
uw = uw_match.group(0) if uw_match else ''

# Extract charts block
charts_start = text.find('/* ═══════════ Charts (mirrors components/charts.tsx) ═══════════ */')
charts_end = text.find('function Page_statcard() {') # We know Page_statcard is right after the components
charts_block = text[charts_start:charts_end].strip()

# Combine
new_content = f"""

/* --- Injected Hooks --- */
{urm}

{uw}

/* --- Injected Charts --- */
{charts_block}

"""

with open('landing.jsx', 'r') as f:
    landing_text = f.read()

# Insert before BentoSwitcher
landing_text = landing_text.replace('function BentoSwitcher() {', new_content + 'function BentoSwitcher() {')

with open('landing.jsx', 'w') as f:
    f.write(landing_text)
