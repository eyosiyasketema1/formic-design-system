with open('landing.jsx', 'r') as f:
    text = f.read()

text = text.replace(
    '<BentoCard label="LoadingState · three variants" span="sp2">',
    '<BentoCard label="LoadingState · three variants" span="sp2" body="body-center">'
)

with open('landing.jsx', 'w') as f:
    f.write(text)
