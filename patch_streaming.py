import re

with open('landing.jsx', 'r') as f:
    text = f.read()

old_block = '<BentoCard label="ChatComposer · tabs and replies" span="sp3" body="body-fill"><ChatComposer /></BentoCard>'

new_block = """<BentoCard label="Streaming · lines print one by one, the caret on the last, Stop in the bar" span="sp3" body="body-fill">
        <Terminal title="npm run formic" stream status="running" lines={[
          { text: "npm run formic", kind: "cmd" },
          { text: "> python3 src/formic/scripts/formic_check.py src", kind: "info" },
          { text: "formic: 6 file(s) built on the system — tokens, ramp, radii, Formic components, no second kit" },
          { text: "> python3 src/formic/scripts/compose_check.py src", kind: "info" },
          { text: "src/pages/Dashboard.tsx" },
          { text: "  ✗ figures   a StatCard delta with no period in reach", kind: "err" },
          { text: "1 composition issue(s). The brief is the rubric.", kind: "err" },
        ]} />
      </BentoCard>"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Replaced ChatComposer with Streaming!")
else:
    print("Could not find ChatComposer block.")
