import re

with open('landing.jsx', 'r') as f:
    text = f.read()

old_block = """  return (
    <div style={{ position: 'relative', display: 'flex', flex: 1 }}>
      <div style={{ 
        position: tab === 'chat' ? 'relative' : 'absolute',
        top: 0, left: 0, right: 0, height: tab === 'chat' ? 'auto' : '100%',
        opacity: tab === 'chat' ? 1 : 0, 
        pointerEvents: tab === 'chat' ? 'auto' : 'none',
        transform: tab === 'chat' ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <Bento key={tab} />
      </div>
      <div style={{ 
        position: tab === 'dashboard' ? 'relative' : 'absolute',
        top: 0, left: 0, right: 0, height: tab === 'dashboard' ? 'auto' : '100%',
        opacity: tab === 'dashboard' ? 1 : 0, 
        pointerEvents: tab === 'dashboard' ? 'auto' : 'none',
        transform: tab === 'dashboard' ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column'
      }}>
        <BentoDashboard key={tab} />
      </div>
    </div>
  );"""

new_block = """  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ 
        position: tab === 'chat' ? 'relative' : 'absolute',
        top: 0, left: 0, right: 0, width: '100%', height: tab === 'chat' ? 'auto' : '100%',
        opacity: tab === 'chat' ? 1 : 0, 
        pointerEvents: tab === 'chat' ? 'auto' : 'none',
        transform: tab === 'chat' ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <Bento key={tab} />
      </div>
      <div style={{ 
        position: tab === 'dashboard' ? 'relative' : 'absolute',
        top: 0, left: 0, right: 0, width: '100%', height: tab === 'dashboard' ? 'auto' : '100%',
        opacity: tab === 'dashboard' ? 1 : 0, 
        pointerEvents: tab === 'dashboard' ? 'auto' : 'none',
        transform: tab === 'dashboard' ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 500ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <BentoDashboard key={tab} />
      </div>
    </div>
  );"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open('landing.jsx', 'w') as f:
        f.write(text)
    print("Fixed width collapse in BentoSwitcher!")
else:
    print("Could not find old BentoSwitcher block to replace.")
