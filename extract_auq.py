with open('preview.html', 'r') as f:
    text = f.read()

start = text.find('const AUQ_DEFAULT_QUESTIONS = [')
end = text.find('/* ═══════════ Card family')

if start != -1 and end != -1:
    with open('auq.jsx', 'w') as f:
        f.write(text[start:end])
    print("Extracted AUQ!")
else:
    print("Could not find boundaries")
