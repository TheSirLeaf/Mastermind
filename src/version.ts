/** Versão do app (vem do package.json; `dev` fora do Vite, como em alguns testes). */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
