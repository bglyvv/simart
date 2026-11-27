import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import { ABOUT_MARKUP } from './landing/aboutMarkup';
import { handleSiteLinkClick } from './landing/siteLinks';

/** Public "Haqqında" page (/haqqinda), open to everyone, logged in or not.
 * Shares the landing page's header, contact section, footer and styles. The
 * markup is a static, trusted constant. */
export default function AboutPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    window.scrollTo(0, 0);
    const onClick = (e: MouseEvent) => handleSiteLinkClick(e, root, navigate);
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [navigate]);

  return <div ref={rootRef} className="landing-page about-page" dangerouslySetInnerHTML={{ __html: ABOUT_MARKUP }} />;
}
