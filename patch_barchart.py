import re

with open('landing.jsx', 'r') as f:
    text = f.read()

old_block = """      <BentoCard label="BarChart · filling a panel" span="sp3" body="body-fill">
        <BarChart horizontal variant="stacked" axis labels={["Referrals", "Website", "Repeat clients", "Events", "Directories"]} series={[
          { name: "Won", values: [9, 6, 8, 7, 10] },
          { name: "Lost", color: 5, values: [4, 7, 3, 5, 1] },
        ]} format={(n) => String(n)} />
      </BentoCard>"""

new_block = """      <BentoCard label="BarChart · stacked, three series" span="sp3" body="body-fill">
        <BarChart fill variant="stacked" labels={["Q1", "Q2", "Q3", "Q4"]} series={[
          { name: "Direct", values: [18, 24, 20, 29] },
          { name: "Referral", color: 3, values: [11, 9, 15, 12] },
          { name: "Organic", color: 5, values: [7, 13, 9, 16] },
        ]} />
      </BentoCard>"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Replaced BarChart successfully!")
else:
    print("Could not find the exact old block.")
