import re

with open('index.html', 'r') as f:
    text = f.read()

# 1. Change Gallery to Component in navbar
text = text.replace('<a href="./preview.html" class="hero-link">Gallery</a>', '<a href="./preview.html" class="hero-link">Component</a>')

# 2. Make value-card-1 text and icon white
old_vc1 = ".value-card-1 { background: var(--accent); color: #000; }"
new_vc1 = ".value-card-1 { background: var(--accent); color: #fff; }"
if old_vc1 in text:
    text = text.replace(old_vc1, new_vc1)
else:
    print("Failed to replace value-card-1")

# 3. Add icon to See Live Components
old_live_link = '<a href="https://formicai.dev/preview.html" target="_blank" class="live-link">See Live Components</a>'
new_live_link = '<a href="https://formicai.dev/preview.html" target="_blank" class="live-link"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>See Live Components</a>'
if old_live_link in text:
    text = text.replace(old_live_link, new_live_link)
else:
    print("Failed to replace live-link HTML")

old_live_link_css = """.live-title, .live-link {
  font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;
  color: #1c1c1b; text-decoration: none;
}"""
new_live_link_css = """.live-title {
  font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;
  color: #1c1c1b;
}
.live-link {
  font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;
  color: #1c1c1b; text-decoration: none;
  display: inline-flex; align-items: center; gap: 6px;
}"""
if old_live_link_css in text:
    text = text.replace(old_live_link_css, new_live_link_css)
else:
    print("Failed to replace live-link CSS")

with open('index.html', 'w') as f:
    f.write(text)

print("Applied all 3 requested changes!")
