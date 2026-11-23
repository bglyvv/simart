import { useEffect, useState, type ReactNode } from 'react';

/** Every screen is built as a pixel-perfect 1920×1080 canvas matching the Figma frames. */
const DESIGN_W = 1920;
const DESIGN_H = 1080;

function computeScale() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
}

/**
 * Scales a fixed-size 1920×1080 design artboard to fit the real browser window,
 * so every screen is fully visible with no clipping and no blank margins —
 * on a laptop, an ultrawide monitor, or anything in between — while keeping
 * the exact pixel layout from Figma intact.
 */
export default function Stage({
  children,
  background = 'var(--color-bg)',
}: {
  children: ReactNode;
  /** Letterbox color shown around the artboard when the window's aspect ratio
   *  doesn't match 1920×1080. Defaults to the light app background; pass a
   *  dark page's own tone (e.g. "var(--color-navy-900)") for dark screens. */
  background?: string;
}) {
  const [scale, setScale] = useState(computeScale);

  useEffect(() => {
    const onResize = () => setScale(computeScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ background }}>
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
