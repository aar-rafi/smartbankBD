/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BANK_CODE: string;
  readonly VITE_BANK_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

