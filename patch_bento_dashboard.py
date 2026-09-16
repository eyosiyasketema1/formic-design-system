import re

with open('landing.jsx', 'r') as f:
    text = f.read()

old_block = """function BentoDashboard() {
  return (
    <div className="bento">"""

new_block = """function BentoDashboard() {
  return (
    <div className="bento" style={{ height: '100%' }}>"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Added height: 100% to BentoDashboard!")
else:
    print("Could not find old block.")
