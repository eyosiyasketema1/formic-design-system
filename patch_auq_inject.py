with open('landing.jsx', 'r') as f:
    text = f.read()

with open('auq.jsx', 'r') as f:
    auq_code = f.read()

target = "function BentoCard("
if target in text:
    text = text.replace(target, auq_code + "\n" + target)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Injected AskUserQuestions code!")
else:
    print("Could not find insertion target.")
