import re

with open('landing.jsx', 'r') as f:
    text = f.read()

# Add key={tab} to Bento and BentoDashboard
text = text.replace('<Bento />', '<Bento key={tab} />')
text = text.replace('<BentoDashboard />', '<BentoDashboard key={tab} />')

with open('landing.jsx', 'w') as f:
    f.write(text)
print("Added keys to Bento grids")
