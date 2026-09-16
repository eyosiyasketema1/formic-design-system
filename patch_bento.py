with open('landing.jsx', 'r') as f:
    text = f.read()

import re

# We will replace BentoDashboard
old_bento_match = re.search(r'function BentoDashboard\(\) \{.*?\n\}', text, re.DOTALL)
if not old_bento_match:
    print("Could not find BentoDashboard!")
    exit(1)

new_bento = """function BentoDashboard() {
  return (
    <div className="bento">
      {/* Row 1 */}
      <BentoCard label="Gauge · ticks light in sequence" span="sp2" body="body-center">
        <Gauge percent={64} label="of people become clients" />
      </BentoCard>
      
      <BentoCard label="DonutChart · segments" span="sp2" body="body-center">
        <DonutChart size={180} label="Revenue by city" format={(n) => `ETB ${compact(n)}`} segments={[
            { name: "Addis Ababa", value: 1920000, detail: "8 clients" },
            { name: "Nairobi", value: 640000, detail: "3 clients" },
            { name: "Dubai", value: 410000, detail: "2 clients" }
          ]} />
      </BentoCard>
      
      <BentoCard label="DonutChart · center label" span="sp2" body="body-center">
        <DonutChart size={160} label="Clients by stage" center={<><span className="text-display font-semibold text-ink tabular-nums">60</span><span className="text-small text-ink-3">clients</span></>} legend="list" format={(n) => String(n)} segments={[
          { name: "Prospect", value: 15 }, { name: "In talks", value: 14 }, { name: "Active", value: 20 }, { name: "At risk", value: 7 }, { name: "Past", value: 4 },
        ]} />
      </BentoCard>

      {/* Row 2 */}
      <BentoCard label="RadarChart · shares across axes" span="sp3" body="body-center">
        <RadarChart axes={["Design", "Build", "Research", "Motion", "Strategy", "Support"]} max={100} format={(n) => `${n}h`} series={[
            { name: "Design team", values: [82, 34, 41, 28, 22, 18] },
            { name: "Build team", color: 3, values: [26, 88, 20, 12, 30, 46] },
          ]} />
      </BentoCard>
      
      <BentoCard label="ScatterChart · quantities" span="sp3" body="body-fill">
        <ScatterChart />
      </BentoCard>

      {/* Row 3 */}
      <BentoCard label="BarChart · filling a panel" span="sp3" body="body-fill">
        <BarChart horizontal variant="stacked" axis labels={["Referrals", "Website", "Repeat clients", "Events", "Directories"]} series={[
          { name: "Won", values: [9, 6, 8, 7, 10] },
          { name: "Lost", color: 5, values: [4, 7, 3, 5, 1] },
        ]} format={(n) => String(n)} />
      </BentoCard>
      
      <BentoCard label="LineChart · dashed guides" span="sp3" body="body-fill">
        <LineChart guides labels={["W1", "W2", "W3", "W4", "W5", "W6"]} series={[
          { name: "Margin change", values: [1.2, -0.8, -2.1, 0.4, 1.9, 2.6] },
          { name: "Cost change", color: 2, values: [-0.5, 0.9, 1.4, -0.2, -1.1, -0.6] },
        ]} />
      </BentoCard>
    </div>
  );
}"""

text = text.replace(old_bento_match.group(0), new_bento)

with open('landing.jsx', 'w') as f:
    f.write(text)
print("Updated BentoDashboard successfully!")
