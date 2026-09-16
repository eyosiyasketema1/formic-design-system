with open('landing.jsx', 'r') as f:
    text = f.read()

tooltip_vars = """
const TOOLTIP_CHIP = "primitive-tooltip rounded-chip px-2 py-1 text-tiny font-medium whitespace-nowrap";
const TOOLTIP_CHIP_STYLE = { background: "var(--tooltip-bg)", color: "var(--tooltip-fg)" };
"""

text = text.replace('function useTip() {', tooltip_vars + 'function useTip() {')

with open('landing.jsx', 'w') as f:
    f.write(text)
print("Patched tooltip vars")
