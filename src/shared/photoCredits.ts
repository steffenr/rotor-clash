import { PHOTO_CREDITS } from '../data/photoCredits.ts';

/**
 * Credit for one card photo. Every photo in the game comes from Wikimedia Commons under a free
 * licence (CC0, public domain, CC BY or CC BY-SA); the card detail shows author, licence and source.
 */
export interface PhotoCredit {
  /** File name inside src/assets/images/real/ (without a folder). */
  file: string;
  /** Commons file title, for example "Hywind Scotland.jpg". */
  title: string;
  author: string;
  /** Short licence name, for example "CC BY-SA 4.0". */
  license: string;
  licenseUrl: string;
  /** The Commons file page, which lists the full attribution. */
  sourceUrl: string;
  /** SHA-256 of the shipped image file; a test fails if the file is swapped without updating its credit. */
  sha256: string;
}

const FREE_LICENSE = /^(cc0|public domain|cc[- ]by(-sa)?[ -]?\d)/i;

export function isFreeLicense(license: string): boolean {
  return FREE_LICENSE.test(license.trim());
}

export function getPhotoCredit(photoKey: string): PhotoCredit | null {
  return PHOTO_CREDITS[photoKey] ?? null;
}
