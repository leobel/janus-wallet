/// <reference types="vite/client" />

interface ViteTypeOptions {
    // By adding this line, you can make the type of ImportMetaEnv strict
    // to disallow unknown keys.
    strictImportMetaEnv: unknown
  }
  
  interface ImportMetaEnv {
    readonly VITE_SERVER_BASE_URL: string
    readonly VITE_APP_TITLE: string
    readonly VITE_CARDANO_NETWORK: string
    readonly VITE_COINS_PER_UTXO_BYTE: number
    readonly VITE_TRANSACTION_MAX_FEE: number
    readonly VITE_CIRCUIT_POLICY: string
    readonly VITE_CIRCUIT_ASSET_NAME: string
    readonly VITE_FAKE_USER_NONCE: string
    readonly VITE_FAKE_USER_PWD_HASH: string
    readonly VITE_FAKE_USER_ADDRESS: string
    readonly VITE_BALANCE_POLLING_INTERVAL: number
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }