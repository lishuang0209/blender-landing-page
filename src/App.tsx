import { useEffect, useRef, useState } from 'react';
import { MouseScrubVideo } from './MouseScrubVideo';
import { Showcase } from './Showcase';

const DOWNLOAD = 'https://www.blender.org/download/';
const NAV = [
  { label: 'Overview', href: '#learn' },
  { label: 'Showreel', href: '#reel' },
  { label: 'Explore', href: '#showcase' },
];


export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector('a')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  return <div id="home" className="site-shell">
    <header className="site-header">
      <a href="#home" className="wordmark" aria-label="Blender home"><img src={`${import.meta.env.BASE_URL}blender-official-icon.svg`} width="32" height="32" alt="" aria-hidden="true" />BLENDER</a>
      <div className="header-actions">
        <a className="header-pill" href={DOWNLOAD} target="_blank" rel="noreferrer">GET BLENDER <span aria-hidden="true">↗</span></a>
        <button ref={menuButton} className="menu-pill" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen(value => !value)}>MENU <span aria-hidden="true">••</span></button>
      </div>
    </header>

    <div className={`menu-backdrop ${menuOpen ? 'is-open' : ''}`} aria-hidden="true" onClick={() => setMenuOpen(false)} />
    <aside ref={drawer} id="site-menu" className={`menu-drawer ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen} aria-label="Site menu">
      <div className="drawer-header"><span className="wordmark">BLENDER</span><button type="button" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)}>CLOSE ×</button></div>
      <nav aria-label="Page navigation">
        {NAV.map((item, index) => <a key={item.href} href={item.href} tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)}><span>0{index + 1}</span>{item.label}<span aria-hidden="true">↗</span></a>)}
      </nav>
      <a className="header-pill drawer-download" href={DOWNLOAD} tabIndex={menuOpen ? 0 : -1} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>DOWNLOAD BLENDER ↗</a>
    </aside>

    <main>
      <section className="hero-card" aria-labelledby="hero-title">
        <MouseScrubVideo />
        <div className="hero-copy">
          <h1 id="hero-title">A world of ideas.<br />Made in 3D.</h1>
          <p>Meet Blender. Your imagination,<br />from the first idea to the final frame.</p>
        </div>
      </section>

      <div className="scroll-cue" aria-hidden="true"><span>+</span><span>+</span></div>

      <Showcase />
    </main>

    <footer className="site-footer"><a href="https://www.blender.org/" target="_blank" rel="noreferrer">BLENDER.ORG ↗</a><span>INDEPENDENT CONCEPT · BUILT FOR CREATIVITY</span><a href="#home">BACK TO TOP ↑</a></footer>
  </div>;
}
