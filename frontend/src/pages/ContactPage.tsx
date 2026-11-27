import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Handshake,
  List,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  User,
  Building2,
  X,
} from 'lucide-react';
import './LandingPage.css';
import contact from '../data/contact.json';
import kidsArt from '../assets/contact/kids.webp';
import puzzleArt from '../assets/contact/puzzle.webp';
import { SITE_FOOTER, siteHeader } from './landing/markup';
import { handleSiteLinkClick } from './landing/siteLinks';
import { FORM_TOPICS, sendContactMessage, type ContactMessageInput } from '../lib/contactService';

const EMPTY: ContactMessageInput = { fullName: '', email: '', topic: '', message: '', website: '' };

/** Public "Əlaqə" page (/elaqe), open to everyone, logged in or not. The
 * header and footer are the landing page's shared markup; the form posts to
 * POST /api/contact/messages and admins read the result at /admin/messages. */
export default function ContactPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [form, setForm] = useState<ContactMessageInput>(EMPTY);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    window.scrollTo(0, 0);
    const onClick = (e: MouseEvent) => handleSiteLinkClick(e, root, navigate);
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [navigate]);

  const set = <K extends keyof ContactMessageInput>(key: K, value: ContactMessageInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await sendContactMessage(form);
      setSent(true);
      setForm(EMPTY);
    } catch (err) {
      showSendError(err);
    } finally {
      setSending(false);
    }
  }


  return (
    <div ref={rootRef} className="landing-page contact-page">
      <div dangerouslySetInnerHTML={{ __html: siteHeader('contact') }} />

      <main className="contact">
        <section className="contact-intro">
          <h1>
            Əlaqə
            <svg className="contact-spark" viewBox="0 0 40 40" aria-hidden="true">
              <path d="M8 16 4 6M18 12l3-10M25 22l11-4M23 30l12 4" stroke="#ffc83d" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
          </h1>
          <p>Sualınız, təklifiniz və ya əməkdaşlıq ideyanız var? Bizimlə əlaqə saxlayın!</p>
          <img className="contact-art" src={kidsArt} alt="Noutbukda SİMART-a baxan iki uşaq" width={1100} height={952} />
        </section>

        <section className="contact-card contact-form-card" aria-labelledby="writeTitle">
          <h2 id="writeTitle" className="contact-card-title">
            <Mail size={40} strokeWidth={1.8} className="contact-title-mail" aria-hidden="true" /> Bizə yazın
          </h2>

          {sent ? (
            <div className="contact-sent" role="status">
              <CheckCircle2 size={48} aria-hidden="true" />
              <h3>Mesajınız göndərildi!</h3>
              <p>Təşəkkür edirik. Ən qısa zamanda sizinlə əlaqə saxlayacağıq.</p>
              <button type="button" className="contact-link-btn" onClick={() => setSent(false)}>
                Yeni mesaj yaz
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <Field icon={<User size={20} />}>
                <input
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Ad və soyad"
                  aria-label="Ad və soyad"
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                />
              </Field>
              <Field icon={<Mail size={20} />}>
                <input
                  required
                  type="email"
                  maxLength={200}
                  autoComplete="email"
                  placeholder="E-poçt"
                  aria-label="E-poçt"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <Field icon={<List size={20} />} trailing={<ChevronDown size={20} />}>
                <select
                  required
                  aria-label="Mövzu"
                  className={form.topic ? '' : 'is-placeholder'}
                  value={form.topic}
                  onChange={(e) => set('topic', e.target.value as ContactMessageInput['topic'])}
                >
                  <option value="" disabled>
                    Mövzu
                  </option>
                  {FORM_TOPICS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field icon={<MessageCircle size={20} />} tall>
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                  placeholder="Mesajınız"
                  aria-label="Mesajınız"
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                />
              </Field>
              {/* Honeypot: hidden from people, filled in by bots. */}
              <input
                className="contact-hp"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                name="website"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
              />
              <button type="submit" className="contact-submit" disabled={sending}>
                <Send size={20} aria-hidden="true" /> {sending ? 'Göndərilir...' : 'Mesajı göndər'}
              </button>
            </form>
          )}
        </section>

        <div className="contact-side">
          <section className="contact-card" aria-labelledby="infoTitle">
            <h2 id="infoTitle" className="contact-card-title">
              <span className="contact-tile tile-lilac" aria-hidden="true">
                <Phone size={24} />
              </span>
              Əlaqə məlumatları
            </h2>
            <ul className="contact-info">
              <li>
                <Mail size={22} aria-hidden="true" />
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
              {contact.phone && (
                <li>
                  <Phone size={22} aria-hidden="true" />
                  <a href={`tel:${String(contact.phone).replace(/\s/g, '')}`}>{contact.phone}</a>
                </li>
              )}
              <li>
                <MapPin size={22} aria-hidden="true" />
                <span>{contact.address}</span>
              </li>
              <li>
                <Clock size={22} aria-hidden="true" />
                <span>{contact.hours}</span>
              </li>
            </ul>
          </section>

          <section className="contact-card" aria-labelledby="partnerTitle">
            <h2 id="partnerTitle" className="contact-card-title">
              <span className="contact-tile tile-amber" aria-hidden="true">
                <Handshake size={26} />
              </span>
              Partnyorluq
            </h2>
            <p className="contact-partner-text">
              Təhsil, kitab nəşriyyatı, texnologiya və uğurlu layihələr üçün əməkdaşlıq imkanlarını müzakirə etməkdən
              məmnun olarıq.
            </p>
            <button type="button" className="contact-outline-btn" onClick={() => setPartnerOpen(true)}>
              Əməkdaşlıq təklifi göndərin <ArrowRight size={20} aria-hidden="true" />
            </button>
          </section>

          <img className="contact-puzzle" src={puzzleArt} alt="" width={440} height={237} loading="lazy" />
        </div>
      </main>

      <div dangerouslySetInnerHTML={{ __html: SITE_FOOTER }} />

      <AnimatePresence>{partnerOpen && <PartnershipDialog onClose={() => setPartnerOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function showSendError(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  // Backend validation and the rate-limit message are Azerbaijani already.
  toast.error(/[əğıöüçş]/i.test(message) ? message : 'Mesaj göndərilmədi. Bir az sonra yenidən cəhd edin.');
}

const EMPTY_PARTNER: ContactMessageInput = {
  fullName: '',
  organization: '',
  email: '',
  topic: 'partnership',
  message: '',
  website: '',
};

/** "Əməkdaşlıq təklifi göndərin" popup — its own form (with a company field),
 * sent with the partnership topic. Escape or the backdrop closes it. */
function PartnershipDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<ContactMessageInput>(EMPTY_PARTNER);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      html.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const set = <K extends keyof ContactMessageInput>(key: K, value: ContactMessageInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await sendContactMessage(form);
      setSent(true);
    } catch (err) {
      showSendError(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      className="contact-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="contact-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="partnerDialogTitle"
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 14 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="contact-modal-close" aria-label="Bağla" onClick={onClose}>
          <X size={20} />
        </button>
        <h2 id="partnerDialogTitle" className="contact-card-title">
          <span className="contact-tile tile-amber" aria-hidden="true">
            <Handshake size={26} />
          </span>
          Əməkdaşlıq təklifi
        </h2>

        {sent ? (
          <div className="contact-sent" role="status">
            <CheckCircle2 size={48} aria-hidden="true" />
            <h3>Təklifiniz göndərildi!</h3>
            <p>Təşəkkür edirik. Komandamız təklifinizə baxıb sizinlə əlaqə saxlayacaq.</p>
            <button type="button" className="contact-link-btn" onClick={onClose}>
              Bağla
            </button>
          </div>
        ) : (
          <>
            <p className="contact-modal-lead">Təşkilatınız və təklifiniz barədə qısa məlumat yazın.</p>
            <form className="contact-form" onSubmit={handleSubmit}>
              <Field icon={<User size={20} />}>
                <input
                  ref={firstFieldRef}
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Ad və soyad"
                  aria-label="Ad və soyad"
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                />
              </Field>
              <Field icon={<Building2 size={20} />}>
                <input
                  required
                  maxLength={150}
                  autoComplete="organization"
                  placeholder="Şirkət / təşkilat"
                  aria-label="Şirkət / təşkilat"
                  value={form.organization}
                  onChange={(e) => set('organization', e.target.value)}
                />
              </Field>
              <Field icon={<Mail size={20} />}>
                <input
                  required
                  type="email"
                  maxLength={200}
                  autoComplete="email"
                  placeholder="E-poçt"
                  aria-label="E-poçt"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <Field icon={<MessageCircle size={20} />} tall>
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  placeholder="Təklifiniz"
                  aria-label="Təklifiniz"
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                />
              </Field>
              <input
                className="contact-hp"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                name="website"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
              />
              <button type="submit" className="contact-submit" disabled={sending}>
                <Send size={20} aria-hidden="true" /> {sending ? 'Göndərilir...' : 'Təklifi göndər'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({ icon, trailing, tall, children }: { icon: ReactNode; trailing?: ReactNode; tall?: boolean; children: ReactNode }) {
  return (
    <label className={tall ? 'contact-field tall' : 'contact-field'}>
      <span className="contact-field-icon" aria-hidden="true">
        {icon}
      </span>
      {children}
      {trailing && (
        <span className="contact-field-trailing" aria-hidden="true">
          {trailing}
        </span>
      )}
    </label>
  );
}
