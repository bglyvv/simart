/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set for local dev via .env.development; unset in a production build until
   * a real backend is deployed somewhere (see contentService.ts). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
