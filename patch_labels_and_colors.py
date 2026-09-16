import re

with open('index.html', 'r') as f:
    text = f.read()

# 1. Change "Open the live gallery" to "Open live components"
text = text.replace('Open the live gallery<svg', 'Open live components<svg')

# 2. Change ">Component<" to ">Components<" in navbar
text = text.replace('class="hero-link">Component</a>', 'class="hero-link">Components</a>')

# 3. Change color to #ffffff for .live-title and .live-link
old_live_title = """.live-title {
  font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;
  color: #1c1c1b;
}"""
new_live_title = """.live-title {
  font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;
  color: #ffffff;
}"""

old_live_link = """.live-link {
  font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;
  color: #1c1c1b; text-decoration: none;
  display: inline-flex; align-items: center; gap: 6px;
}"""
new_live_link = """.live-link {
  font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;
  color: #ffffff; text-decoration: none;
  display: inline-flex; align-items: center; gap: 6px;
}"""

if old_live_title in text:
    text = text.replace(old_live_title, new_live_title)
    print("Replaced .live-title color")
else:
    print("Failed to replace .live-title color")

if old_live_link in text:
    text = text.replace(old_live_link, new_live_link)
    print("Replaced .live-link color")
else:
    print("Failed to replace .live-link color")

with open('index.html', 'w') as f:
    f.write(text)

print("Patch complete.")
