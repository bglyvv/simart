/**
 * BOOK SERVICE — the landing page's book catalog, managed from /admin/books.
 * `GET /api/books` and the image URLs are open (the public landing page reads
 * them); everything else needs the admin bearer token. See "Books" in
 * backend/README.md.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type BookScene = 'meadow' | 'forest' | 'space' | 'sea' | 'sunny';
export type AuthorGender = 'male' | 'female';

export interface BookStoreLink {
  name: string;
  url: string;
}

export interface Book {
  id: string;
  title: string;
  category: string;
  ageRange: string;
  pageCount: number;
  priceAzn: number;
  about: string;
  quote: string;
  isbn: string | null;
  backScene: BookScene;
  sortOrder: number;
  authorName: string;
  authorBio: string;
  authorGender: AuthorGender;
  coverImageId: string;
  backCoverImageId: string | null;
  authorPhotoImageId: string | null;
  storeLinks: BookStoreLink[];
  deletedAt: string | null;
}

/** What the form edits. No sortOrder: new books go to the end, and the order is
 * changed by drag and drop (`reorderBooks`). */
export type BookInput = Omit<Book, 'id' | 'deletedAt' | 'coverImageId' | 'sortOrder'> & { coverImageId: string | null };

function url(path: string): URL {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not set — see frontend/.env.development.');
  return new URL(path, API_BASE_URL);
}

async function request<T>(method: string, path: string, token?: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // the browser sets the multipart boundary itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const response = await fetch(url(path), { method, headers, body: payload, signal });
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(problem?.error ?? `${method} ${path} failed: ${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function bookImageUrl(id: string): string {
  return url(`/api/books/images/${id}`).toString();
}

export const fetchBooks = (signal?: AbortSignal) => request<Book[]>('GET', '/api/books', undefined, undefined, signal);

export const fetchDeletedBooks = (token: string) => request<Book[]>('GET', '/api/books/deleted', token);

export const createBook = (input: BookInput, token: string) => request<Book>('POST', '/api/books', token, input);

export const updateBook = (id: string, input: BookInput, token: string) =>
  request<Book>('PUT', `/api/books/${id}`, token, input);

/** Every active book id, first to last. 400 if the list is stale. */
export const reorderBooks = (ids: string[], token: string) => request<void>('PUT', '/api/books/order', token, { ids });

export const deleteBook = (id: string, token: string) => request<void>('DELETE', `/api/books/${id}`, token);

export const restoreBook = (id: string, token: string) => request<void>('POST', `/api/books/${id}/restore`, token);

/** Uploads one image (JPEG/PNG/WebP, max 5 MB) and returns its id. */
export async function uploadBookImage(file: File, token: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const result = await request<{ id: string }>('POST', '/api/books/images', token, form);
  return result.id;
}
