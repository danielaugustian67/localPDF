/// <reference types="vite/client" />

declare module 'pako' {
  const pako: any
  export default pako
  export const deflate: any
  export const inflate: any
}
