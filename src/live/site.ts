// live/site.ts
// Endereço público do site (onde os espectadores entram). Sem imports: usado pelo app e pelos pacotes.

/** O site publicado no Cloudflare. */
export const PUBLIC_SITE = 'https://mastermind.patrickorb3.workers.dev';

const LOCAL_HOST =
  /^(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * Origem usada no link da sala. Quando o editor roda numa máquina local (localhost, rede interna) o
 * celular da plateia não alcança esse endereço, então usa o site publicado.
 */
export function siteOrigin(
  hostname: string = location.hostname,
  origin: string = location.origin
): string {
  return LOCAL_HOST.test(hostname) ? PUBLIC_SITE : origin;
}

/** Link de participação de uma sala. */
export function joinUrl(code: string, hostname?: string, origin?: string): string {
  return `${siteOrigin(hostname, origin)}/join/${code}`;
}
