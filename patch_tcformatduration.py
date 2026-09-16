import re

with open('landing.jsx', 'r') as f:
    text = f.read()

tc_format = """const tcFormatDuration = (ms) => {
  if (ms === undefined) return "";
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60000), s = Math.round((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, "0")}s`;
};
"""

target = "function Terminal({"
if target in text:
    text = text.replace(target, tc_format + "\n" + target)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Injected tcFormatDuration successfully!")
else:
    print("Could not find insertion target.")
