import re

with open('landing.jsx', 'r') as f:
    text = f.read()

old_switcher = """function BentoSwitcher() {
  const [tab, setTab] = useState("chat");
  
  useEffect(() => {
    const handler = (e) => setTab(e.detail);
    window.addEventListener('tab-change', handler);
    return () => window.removeEventListener('tab-change', handler);
  }, []);

  return tab === "chat" ? <Bento /> : <BentoDashboard />;
}"""

new_switcher = """function BentoSwitcher() {
  const [tab, setTab] = useState("chat");
  
  useEffect(() => {
    const handler = (e) => setTab(e.detail);
    window.addEventListener('tab-change', handler);
    return () => window.removeEventListener('tab-change', handler);
  }, []);

  return (
    <div style={{ display: 'grid' }}>
      <div style={{ 
        gridArea: '1 / 1', 
        opacity: tab === 'chat' ? 1 : 0, 
        pointerEvents: tab === 'chat' ? 'auto' : 'none',
        transform: tab === 'chat' ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <Bento />
      </div>
      <div style={{ 
        gridArea: '1 / 1', 
        opacity: tab === 'dashboard' ? 1 : 0, 
        pointerEvents: tab === 'dashboard' ? 'auto' : 'none',
        transform: tab === 'dashboard' ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <BentoDashboard />
      </div>
    </div>
  );
}"""

if old_switcher in text:
    text = text.replace(old_switcher, new_switcher)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Patched successfully!")
else:
    print("Could not find old_switcher in landing.jsx!")
