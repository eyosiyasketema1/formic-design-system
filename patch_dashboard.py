with open('landing.jsx', 'r') as f:
    text = f.read()

old_bento = """function BentoDashboard() {
  return (
    <div className="bento">
      <BentoCard label="Calendar · schedule views" span="sp2"><Calendar /></BentoCard>
      <BentoCard label="TaskRows · recent activity" span="sp2"><TaskRows /></BentoCard>
      <BentoCard label="Progress · metrics" span="sp2">
        <div className="flex h-full flex-col justify-center gap-5 py-2">
          <Progress value={78} label="CPU Usage" tone="danger" />
          <Progress value={45} label="Memory" tone="accent" />
          <Progress value={12} label="Storage" tone="success" />
        </div>
      </BentoCard>
      <BentoCard label="DiffStat · tracking" span="sp3" body="body-center">
        <div className="flex gap-8">
           <div><div className="text-small text-ink-2 mb-1">Revenue</div><div className="text-display font-semibold">$24,500</div><DiffStat add={12.5} /></div>
           <div><div className="text-small text-ink-2 mb-1">Users</div><div className="text-display font-semibold">1,204</div><DiffStat add={5.2} /></div>
        </div>
      </BentoCard>
      <BentoCard label="ColorPicker · theming" span="sp3" body="body-center"><ColorPicker /></BentoCard>
    </div>
  );
}"""

new_bento = """function BentoDashboard() {
  return (
    <div className="bento">
      <BentoCard label="Calendar · schedule views" span="sp2"><Calendar /></BentoCard>
      <BentoCard label="TaskRows · recent activity" span="sp2"><TaskRows /></BentoCard>
      <BentoCard label="Progress · metrics" span="sp2">
        <div className="flex h-full flex-col justify-center gap-5 py-2">
          <Progress value={78} label="CPU Usage" tone="danger" />
          <Progress value={45} label="Memory" tone="accent" />
          <Progress value={12} label="Storage" tone="success" />
        </div>
      </BentoCard>
      <BentoCard label="DiffStat · tracking" span="sp3" body="body-center">
        <div className="flex gap-8">
           <div><div className="text-small text-ink-2 mb-1">Revenue</div><div className="text-display font-semibold">$24,500</div><DiffStat add={12.5} /></div>
           <div><div className="text-small text-ink-2 mb-1">Users</div><div className="text-display font-semibold">1,204</div><DiffStat add={5.2} /></div>
        </div>
      </BentoCard>
      <BentoCard label="ColorPicker · theming" span="sp3" body="body-center"><ColorPicker /></BentoCard>
      <BentoCard label="Card 6 · placeholder" span="sp3" body="body-center"><div className="text-ink-2">Awaiting component...</div></BentoCard>
      <BentoCard label="Card 7 · placeholder" span="sp3" body="body-center"><div className="text-ink-2">Awaiting component...</div></BentoCard>
    </div>
  );
}"""

if old_bento in text:
    text = text.replace(old_bento, new_bento)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Patched successfully!")
else:
    print("Could not find old_bento!")
