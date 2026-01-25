/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Client-side environment variables
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Server-side environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly DATABASE_URL: string;
      readonly BACKEND_API_URL: string;
      readonly BACKEND_API_KEY: string;
      readonly NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};
