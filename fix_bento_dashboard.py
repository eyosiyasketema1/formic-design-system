with open('landing.jsx', 'r') as f:
    text = f.read()

old_bento = """<TaskRows variant="Timeline" rows={[ { title: "Deploy v2", status: "completed" }, { title: "Update schema", status: "pending" } ]} />"""
new_bento = """<TaskRows />"""

text = text.replace(old_bento, new_bento)

with open('landing.jsx', 'w') as f:
    f.write(text)
