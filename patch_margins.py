import re

with open('index.html', 'r') as f:
    text = f.read()

# Replace outside inset
old_inset = ".live-section { padding: 80px 0; --live-inset: 140px; }"
new_inset = ".live-section { padding: 80px 0; --live-inset: 180px; }"

# Replace inside padding
old_padding = "  padding: 40px 150px 150px 150px;"
new_padding = "  padding: 40px 100px 100px 100px;"

if old_inset in text and old_padding in text:
    text = text.replace(old_inset, new_inset)
    text = text.replace(old_padding, new_padding)
    with open('index.html', 'w') as f:
        f.write(text)
    print("Updated margins and paddings successfully!")
else:
    print("Could not find the exact old strings.")
