import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Mail } from 'lucide-react';
import AdminShell, { useOpenMobileMenu } from '../components/AdminShell';
import Topbar from '../components/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAdminStore } from '../store/useAdminStore';
import { fetchContactMessages, markContactMessageRead, topicLabel, type ContactMessage } from '../lib/contactService';

/** /admin/messages — messages from the public "Əlaqə" page's form, newest
 * first. The only action is "Oxundu" (mark read); there's no delete yet. */
export default function AdminMessagesPage() {
  const openMenu = useOpenMobileMenu();
  const token = useAdminStore((s) => s.admin?.token ?? '');
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchContactMessages(token)
      .then(setMessages)
      .catch(() => setLoadError(true));
  }, [token]);

  async function markRead(m: ContactMessage) {
    setBusyId(m.id);
    try {
      await markContactMessageRead(m.id, token);
      setMessages(await fetchContactMessages(token));
    } catch {
      toast.error('Əməliyyat uğursuz oldu.');
    } finally {
      setBusyId(null);
    }
  }

  const unread = messages?.filter((m) => !m.readAt).length ?? 0;

  return (
    <AdminShell>
      <Topbar title="Mesajlar" subtitle="Əlaqə səhifəsindən gələn mesajlar" onMenuClick={openMenu} />

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <Card padding="lg">
            <p className="mb-4 text-body-sm text-text-500">
              {messages && (unread > 0 ? `${unread} oxunmamış · cəmi ${messages.length}` : `Cəmi ${messages.length}`)}
            </p>

            {loadError && <p className="text-body-sm text-red-600">Yüklənmədi — backend işə düşübmü?</p>}
            {!loadError && messages === null && <p className="text-body-sm text-text-400">Yüklənir...</p>}
            {messages?.length === 0 && <p className="text-body-sm text-text-400">Hələ mesaj yoxdur.</p>}

            <div className="flex flex-col gap-3">
              {messages?.map((m) => (
                <article
                  key={m.id}
                  className={`rounded-xl border px-4 py-3 ${m.readAt ? 'border-border' : 'border-primary/40 bg-surface-alt'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-text-900">
                        {m.fullName}
                        {!m.readAt && (
                          <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-caption font-bold text-white">
                            Yeni
                          </span>
                        )}
                      </p>
                      {m.organization && <p className="text-body-sm font-semibold text-text-700">{m.organization}</p>}
                      <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline">
                        <Mail size={14} /> {m.email}
                      </a>
                    </div>
                    <div className="text-right">
                      <p className="text-caption font-semibold text-text-700">{topicLabel(m.topic)}</p>
                      <p className="text-caption text-text-400">{new Date(m.createdAt).toLocaleString('az-AZ')}</p>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-body-sm text-text-700">{m.message}</p>
                  {!m.readAt && (
                    <div className="mt-3">
                      <Button size="sm" variant="secondary" disabled={busyId === m.id} onClick={() => markRead(m)}>
                        <Check size={14} /> {busyId === m.id ? 'Yadda saxlanılır...' : 'Oxundu'}
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </AdminShell>
  );
}
