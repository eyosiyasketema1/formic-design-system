with open('landing.jsx', 'r') as f:
    text = f.read()

text = text.replace(
    '<BentoCard label="ApprovalCard · answer it" span="sp2"><ApprovalCard /></BentoCard>',
    '<BentoCard label="ApprovalCard · answer it" span="sp2" body="body-fill"><ApprovalCard /></BentoCard>'
)

with open('landing.jsx', 'w') as f:
    f.write(text)
