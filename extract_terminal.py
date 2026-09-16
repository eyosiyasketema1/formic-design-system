with open('preview.html', 'r') as f:
    text = f.read()

start = text.find('const DEFAULT_TERMINAL_LINES')
end = text.find('/* ═══════════ FileTree')

if start != -1 and end != -1:
    with open('terminal.jsx', 'w') as f:
        f.write(text[start:end])
    print("Extracted Terminal!")
else:
    print("Could not find boundaries")
