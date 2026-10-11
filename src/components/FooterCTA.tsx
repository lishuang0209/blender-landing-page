const words = ['Ready','to','create','your','next','world?'];

export function FooterCTA() {
  return <div className="footer-cta">
    <div className="footer-cta-heading">
      <p className="footer-cta-eyebrow">EVERY WORLD BEGINS WITH AN IDEA.</p>
      <h3 aria-label="Ready to create your next world?">{words.map((word,index) => <Fragment key={word}>{index === 3 && <br aria-hidden="true" />}<span className="footer-cta-word" aria-hidden="true">{word}{index < words.length-1 ? ' ' : ''}</span></Fragment>)}</h3>
    </div>
    <div className="footer-cta-details">
      <p className="footer-cta-description">From a first sketch to the final frame.<br />Build it. Move it. Bring it to life with Blender.</p>
      <div className="footer-cta-links">
        <a href="https://www.blender.org/download/" target="_blank" rel="noreferrer">GET BLENDER <span aria-hidden="true">↗</span><i className="footer-cta-rule" /></a>
        <a href="https://studio.blender.org/" target="_blank" rel="noreferrer">EXPLORE BLENDER STUDIO <span aria-hidden="true">↗</span><i className="footer-cta-rule" /></a>
      </div>
      <div className="footer-cta-resources">
        <div><span>CREATIVE TOOLKIT</span><a href="https://www.blender.org/features/" target="_blank" rel="noreferrer">Model · Animate · Render ↗</a></div>
        <div><span>CREATE TOGETHER</span><a href="https://www.blender.org/community/" target="_blank" rel="noreferrer">Meet the community ↗</a></div>
      </div>
    </div>
  </div>;
}
import {Fragment} from 'react';
