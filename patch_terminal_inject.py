import re

with open('landing.jsx', 'r') as f:
    text = f.read()

with open('terminal.jsx', 'r') as f:
    terminal_code = f.read()

target = "function BentoCard("
if target in text:
    text = text.replace(target, terminal_code + "\n" + target)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Injected Terminal code!")
else:
    print("Could not find insertion target.")
