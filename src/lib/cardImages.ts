import offshoreFallback from '../assets/images/turbine_offshore_giant_1794672962178.jpg';
import onshoreFallback from '../assets/images/turbine_onshore_tower_1794672962654.jpg';
import floatingFallback from '../assets/images/turbine_floating_deepwater_1794672964828.jpg';
import windbaseFallback from '../assets/images/wind_farm_mega_base_1794672963623.jpg';

/**
 * Real photographs live in src/assets/images/real/ and are registered by file name:
 * `hywind.jpg` becomes the photo key `hywind`. Each one must have a licence record in
 * src/data/photoCredits.ts (enforced by tests/photoCredits.test.ts).
 */
const REAL_PHOTOS = import.meta.glob('../assets/images/real/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const realPhotoMap: Record<string, string> = Object.fromEntries(
  Object.entries(REAL_PHOTOS).map(([filePath, url]) => [
    filePath.split('/').pop()!.replace(/\.(jpe?g|png)$/i, ''),
    url,
  ])
);

export const CARD_PHOTO_MAP: Record<string, string> = {
  // Concept illustrations made for Rotor Clash (no third-party rights involved).
  fallback_offshore: offshoreFallback,
  fallback_onshore: onshoreFallback,
  fallback_floating: floatingFallback,
  fallback_windbase: windbaseFallback,
  ...realPhotoMap,
};

export function resolveCardPhoto(photoKey: string): string {
  return CARD_PHOTO_MAP[photoKey] ?? offshoreFallback;
}
