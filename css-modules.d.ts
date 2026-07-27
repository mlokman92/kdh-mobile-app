/**
 * Metro resolves `import '@/global.css'` through the NativeWind transformer, but
 * TypeScript 6 (TS2882) needs an ambient declaration for the side-effect import.
 */
declare module '*.css'
