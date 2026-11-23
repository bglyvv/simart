import { useEffect, useId, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

/**
 * Thin React wrapper around html5-qrcode's own high-level
 * `Html5QrcodeScanner` — it renders its own full UI (camera permission
 * prompt, camera picker, a file-upload fallback) into the given div, so
 * this component only owns the mount/unmount lifecycle, not the scanning
 * UI itself. Used by PartnerDashboardPage.tsx to read a voucher's code
 * straight off a QR code shown on a child's phone.
 */
export default function QrScanner({ onScan }: { onScan: (code: string) => void }) {
  // useId (not Math.random()) — a plain, stable value safe to read during
  // render, rather than a ref (which React flags as render-impure) seeded
  // by an impure call.
  const containerId = `qr-scanner-${useId()}`;
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      containerId,
      { fps: 10, qrbox: { width: 220, height: 220 } },
      false,
    );
    scanner.render((decodedText) => onScanRef.current(decodedText), undefined);

    return () => {
      // clear() is async and can reject if the camera was never actually
      // granted — swallow it, there's nothing useful to do with that error
      // on unmount.
      scanner.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={containerId} className="overflow-hidden rounded-xl" />;
}
