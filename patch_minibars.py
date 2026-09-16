import re

with open('landing.jsx', 'r') as f:
    text = f.read()

old_block = """      <BentoCard label="DonutChart · center label" span="sp2" body="body-center">
        <DonutChart size={160} label="Clients by stage" center={<><span className="text-display font-semibold text-ink tabular-nums">60</span><span className="text-small text-ink-3">clients</span></>} legend="list" format={(n) => String(n)} segments={[
          { name: "Prospect", value: 15 }, { name: "In talks", value: 14 }, { name: "Active", value: 20 }, { name: "At risk", value: 7 }, { name: "Past", value: 4 },
        ]} />
      </BentoCard>"""

new_block = """      <BentoCard label="MiniBars · capsule columns on tracks, and a two-series stack" span="sp2" body="body-center">
        <div className="flex w-full max-w-80 flex-col gap-4">
          <MiniBars values={[8, 22, 14, 17, 26, 15, 18]} />
          <MiniBars values={[120, 140, 95, 160, 130]} split={[80, 90, 70, 100, 85]} names={["Revenue", "Cost"]} labels={["Bank", "Creamery", "Ministry", "Sunrise", "Air"]} legend track={false} format={(v) => `ETB ${v}k`} />
        </div>
      </BentoCard>"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Replaced DonutChart with MiniBars successfully!")
else:
    print("Could not find the exact old block.")
