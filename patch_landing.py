import re

with open('landing.jsx', 'r') as f:
    text = f.read()

# Replace BentoSwitcher with an improved version using a custom event
old_switcher = """function BentoSwitcher() {
  const [tab, setTab] = useState("chat");
  
  useEffect(() => {
    const tabs = document.querySelectorAll('.live-tab');
    const handler = (e) => {
      tabs.forEach(b => b.classList.remove('is-active'));
      e.target.classList.add('is-active');
      setTab(e.target.textContent.toLowerCase());
    };
    tabs.forEach(t => t.addEventListener('click', handler));
    return () => tabs.forEach(t => t.removeEventListener('click', handler));
  }, []);

  return tab === "chat" ? <Bento /> : <BentoDashboard />;
}"""

new_switcher = """function LiveTabs() {
  const [active, setActive] = useState("chat");
  
  const setTab = (t) => {
    setActive(t);
    window.dispatchEvent(new CustomEvent('tab-change', { detail: t }));
  };

  return (
    <div className="live-tabs">
      <button className={`live-tab ${active === 'chat' ? 'is-active' : ''}`} onClick={() => setTab('chat')}>Chat</button>
      <button className={`live-tab ${active === 'dashboard' ? 'is-active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
    </div>
  );
}

function BentoSwitcher() {
  const [tab, setTab] = useState("chat");
  
  useEffect(() => {
    const handler = (e) => setTab(e.detail);
    window.addEventListener('tab-change', handler);
    return () => window.removeEventListener('tab-change', handler);
  }, []);

  return tab === "chat" ? <Bento /> : <BentoDashboard />;
}"""

text = text.replace(old_switcher, new_switcher)

# Also add the mount for the new tabs
text = text.replace('mount("rail", <BentoSwitcher />);', 'mount("rail", <BentoSwitcher />);\n  mount("live-tabs-mount", <LiveTabs />);')

with open('landing.jsx', 'w') as f:
    f.write(text)
