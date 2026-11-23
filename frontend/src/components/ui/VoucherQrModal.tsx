import { QRCodeSVG } from 'qrcode.react';
import Modal from './Modal';

/**
 * Shown right after a real-backend redeem (LeaguesPage.tsx) or donate
 * (WalletPage.tsx) that returned a `voucherCode` — the QR a real-world
 * partner (the bookstore, the ice cream shop, one of the two sponsor banks)
 * scans or types in their own dashboard to look up and fulfill this exact
 * redemption/donation. The QR encodes just the bare code, not a URL — there's
 * no stable deployed origin for this app yet (see root CLAUDE.md's
 * "Deployment history" notes), so a partner looks it up through their own
 * PartnerDashboardPage.tsx (camera scan or manual entry) rather than a phone
 * camera app opening a link. See backend/README.md's "Vouchers and
 * partners".
 */
export default function VoucherQrModal({
  code,
  title,
  onClose,
}: {
  code: string | null;
  title: string;
  onClose: () => void;
}) {
  return (
    <Modal open={!!code} onClose={onClose} title="Tərəfdaş Kodu">
      {code && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-body-sm text-text-500">
            <b>{title}</b> üçün bu kodu almaq zamanı tərəfdaşa göstər — kamera ilə oxuda bilər və ya kodu əllə yaza
            bilərsən.
          </p>
          <div className="rounded-2xl border-2 border-border-soft bg-white p-4">
            <QRCodeSVG value={code} size={192} marginSize={2} />
          </div>
          <p className="rounded-xl bg-surface-alt px-4 py-2 font-display text-h4 font-bold tracking-widest text-text-900">
            {code}
          </p>
        </div>
      )}
    </Modal>
  );
}
