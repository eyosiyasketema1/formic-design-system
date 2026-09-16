import re

with open('index.html', 'r') as f:
    text = f.read()

new_theme_vars = """
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-chart-track: var(--chart-track);
"""

text = text.replace('--color-orange-tint: var(--orange-tint);', '--color-orange-tint: var(--orange-tint);' + new_theme_vars)

with open('index.html', 'w') as f:
    f.write(text)
print("Added chart colors to Tailwind theme")
