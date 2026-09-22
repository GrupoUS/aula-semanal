/**
 * Chave única da decisão de cookies.
 *
 * Existe porque três consumidores precisam do MESMO literal e estavam com
 * cópias independentes: o script inline do <head> (que marca
 * `data-consent-pending` antes do primeiro paint), o gate do PageView em
 * `Layout.astro` e o próprio banner. Um typo em qualquer um deles fazia o
 * banner reaparecer para quem já tinha decidido — sem erro, sem sintoma óbvio.
 */
export const CONSENT_KEY = "otb_aula_cookie_consent";
export const CONSENT_GRANTED = "granted";
export const CONSENT_REVOKED = "revoked";
