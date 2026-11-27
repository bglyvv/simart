/**
 * CONTACT SERVICE — the public "Əlaqə" page's form, and the admin's "Mesajlar"
 * list. Sending is open (rate-limited server-side: 5 per 15 minutes); listing
 * and marking read need the admin bearer token. See "Contact" in
 * backend/README.md.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type ContactTopic = 'general' | 'partnership' | 'support' | 'feedback';

const TOPIC_LABELS: Record<ContactTopic, string> = {
  general: 'Ümumi sual',
  partnership: 'Əməkdaşlıq təklifi',
  support: 'Texniki problem',
  feedback: 'Təklif və rəy',
};

/** Topics offered in the "Bizə yazın" form. Partnership has its own popup
 * (with a company field) instead, so it isn't in this list. */
export const FORM_TOPICS: { value: ContactTopic; label: string }[] = (['general', 'support', 'feedback'] as const).map(
  (value) => ({ value, label: TOPIC_LABELS[value] }),
);

export function topicLabel(topic: string): string {
  return TOPIC_LABELS[topic as ContactTopic] ?? topic;
}

export interface ContactMessageInput {
  fullName: string;
  email: string;
  topic: ContactTopic | '';
  message: string;
  /** Company or organization — only the partnership popup asks for it. */
  organization?: string;
  /** Honeypot — always '' from a real visitor. */
  website: string;
}

export interface ContactMessage {
  id: string;
  fullName: string;
  email: string;
  organization: string | null;
  topic: ContactTopic;
  message: string;
  createdAt: string;
  readAt: string | null;
}

function url(path: string): URL {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  return new URL(path, API_BASE_URL);
}

async function request<T>(method: string, path: string, token?: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(url(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 429) throw new Error('Çox sayda mesaj göndərildi. Bir az sonra yenidən cəhd edin.');
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `${method} ${path} failed: ${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const sendContactMessage = (input: ContactMessageInput) =>
  request<void>('POST', '/api/contact/messages', undefined, input);

export const fetchContactMessages = (token: string) =>
  request<ContactMessage[]>('GET', '/api/admin/contact-messages', token);

export const markContactMessageRead = (id: string, token: string) =>
  request<void>('POST', `/api/admin/contact-messages/${id}/read`, token);
