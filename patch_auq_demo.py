with open('landing.jsx', 'r') as f:
    text = f.read()

demo = """function AskUserQuestionsDemo() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col h-full items-start gap-3 w-full">
      <AskUserQuestions key={run} onComplete={() => {}} />
      <Button variant="ghost" size="sm" icon={<Icon name="retry" size={14} />} onClick={() => setRun((r) => r + 1)}>Start over</Button>
    </div>
  );
}

function BentoCard("""

text = text.replace('function BentoCard(', demo)

old_block = """<BentoCard label="Streaming · lines print one by one, the caret on the last, Stop in the bar" span="sp3" body="body-fill">
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

new_block = """<BentoCard label="Three questions · single-select with Other, multi-select with Skip, free text" span="sp3" body="body-center">
        <AskUserQuestionsDemo />
      </BentoCard>"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Replaced Streaming with AskUserQuestionsDemo!")
else:
    print("Could not find old block.")
