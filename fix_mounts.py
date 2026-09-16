with open('landing.jsx', 'r') as f:
    lines = f.readlines()

# Find the mount block
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if 'if (typeof document !== "undefined") {' in line:
        start_idx = i
    if start_idx != -1 and line.strip() == '}':
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    mount_block = lines[start_idx:end_idx+1]
    # Remove it from the original position
    del lines[start_idx:end_idx+1]
    
    # Append it to the very end
    lines.append('\n')
    lines.extend(mount_block)
    
    with open('landing.jsx', 'w') as f:
        f.writelines(lines)
