import re

with open('preview.html', 'r') as f:
    content = f.read()

components = ['StatCard', 'BarChart', 'LineChart', 'DonutChart', 'ChartLegend', 'ChartTip', 'DataTable', 'StatusCell', 'StatStrip']
extracted = []

# Using a simpler matching: find function X and then count braces
for comp in components:
    match = re.search(r'function ' + comp + r'\s*\(', content)
    if not match:
        continue
    start_idx = match.start()
    
    # find the matching closing brace for the function
    brace_count = 0
    in_function = False
    end_idx = start_idx
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            brace_count += 1
            in_function = True
        elif content[i] == '}':
            brace_count -= 1
        
        if in_function and brace_count == 0:
            end_idx = i + 1
            break
            
    extracted.append(content[start_idx:end_idx])

with open('dashboard_components.jsx', 'w') as f:
    f.write('\n\n'.join(extracted))
