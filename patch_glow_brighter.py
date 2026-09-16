import re

with open('index.html', 'r') as f:
    text = f.read()

old_bg = "background: radial-gradient(350px circle at var(--mx, 50%) var(--my, 50%),\n    var(--accent) 10%, transparent 60%);"
new_bg = "background: radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%),\n    var(--accent) 20%, transparent 80%);"

if old_bg in text:
    text = text.replace(old_bg, new_bg)
    with open('index.html', 'w') as f:
        f.write(text)
    print("Made glow even brighter!")
else:
    print("Could not find the previous glow background property")
