import re

with open('index.html', 'r') as f:
    text = f.read()

# We need to remove the `.bento-card::before` block.
# Let's find it.
start = text.find('/* barely-there inner light')
if start != -1:
    end = text.find('.bento-card > *, .principle-card > *', start)
    if end != -1:
        text = text[:start] + text[end:]
        with open('index.html', 'w') as f:
            f.write(text)
        print("Removed inner glow!")
    else:
        print("Could not find end of inner glow block")
else:
    print("Could not find inner glow block")
