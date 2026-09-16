with open('landing.jsx', 'r') as f:
    text = f.read()

config_var = """
const FORMIC_CONFIG = { avatar: "initials", sidebar: "full", sidebarState: "expanded", motion: true };
"""

text = text.replace('const TOOLTIP_CHIP', config_var + 'const TOOLTIP_CHIP')

with open('landing.jsx', 'w') as f:
    f.write(text)
print("Patched config var")
