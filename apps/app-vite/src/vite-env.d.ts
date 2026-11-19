/// <reference types="vite/client" />
/// <reference types="@repo/client-types/env" />

// Drops Vite's catch-all key type, so a misspelled import.meta.env key fails the type check.
interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}
