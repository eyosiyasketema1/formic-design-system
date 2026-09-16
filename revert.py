import re

with open('landing.jsx', 'r') as f:
    text = f.read()

start = text.find('/* --- Injected Hooks --- */')
end = text.find('function BentoSwitcher() {')

if start != -1 and end != -1:
    text = text[:start] + text[end:]
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Reverted successfully")
else:
    print("Could not find blocks")
