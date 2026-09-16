import re

with open('index.html', 'r') as f:
    text = f.read()

old_bg = "background: radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%),\n    color-mix(in srgb, var(--accent) 70%, transparent), transparent 62%);"
new_bg = "background: radial-gradient(350px circle at var(--mx, 50%) var(--my, 50%),\n    var(--accent) 10%, transparent 60%);"

old_op = "opacity: calc(var(--glow, 0) * 0.85);"
new_op = "opacity: var(--glow, 0);"

if old_bg in text:
    text = text.replace(old_bg, new_bg)
    text = text.replace(old_op, new_op)
    with open('index.html', 'w') as f:
        f.write(text)
    print("Increased glow intensity!")
else:
    print("Could not find the glow background property")
