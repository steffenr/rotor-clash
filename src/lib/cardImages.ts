import offshoreFallback from '../assets/images/turbine_offshore_giant_1794672962178.jpg';
import onshoreFallback from '../assets/images/turbine_onshore_tower_1794672962654.jpg';
import floatingFallback from '../assets/images/turbine_floating_deepwater_1794672964828.jpg';
import windbaseFallback from '../assets/images/wind_farm_mega_base_1794672963623.jpg';

import alphaVentus from '../assets/images/real/alpha_ventus.jpg';
import altaWind from '../assets/images/real/alta_wind.jpg';
import enerconE126 from '../assets/images/real/enercon_e126.jpg';
import enerconE82 from '../assets/images/real/enercon_e82.jpg';
import enerconEp5 from '../assets/images/real/enercon_ep5.jpg';
import gansuWind from '../assets/images/real/gansu_wind.jpg';
import haliadeX from '../assets/images/real/haliade_x.jpg';
import hornsea2 from '../assets/images/real/hornsea_2.jpg';
import hywind from '../assets/images/real/hywind.jpg';
import londonArray from '../assets/images/real/london_array.jpg';
import nordexN149 from '../assets/images/real/nordex_n149.jpg';
import osterild from '../assets/images/real/osterild.jpg';
import saintNazaire from '../assets/images/real/saint_nazaire.jpg';
import siemensSwt from '../assets/images/real/siemens_swt.jpg';
import vestasV117 from '../assets/images/real/vestas_v117.jpg';
import vestasV150 from '../assets/images/real/vestas_v150.jpg';
import vestasV164 from '../assets/images/real/vestas_v164.jpg';
import vestasV90 from '../assets/images/real/vestas_v90.jpg';
import walney from '../assets/images/real/walney.jpg';

export const CARD_PHOTO_MAP: Record<string, string> = {
  fallback_offshore: offshoreFallback,
  fallback_onshore: onshoreFallback,
  fallback_floating: floatingFallback,
  fallback_windbase: windbaseFallback,
  alpha_ventus: alphaVentus,
  alta_wind: altaWind,
  enercon_e126: enerconE126,
  enercon_e82: enerconE82,
  enercon_ep5: enerconEp5,
  gansu_wind: gansuWind,
  haliade_x: haliadeX,
  hornsea_2: hornsea2,
  hywind: hywind,
  london_array: londonArray,
  nordex_n149: nordexN149,
  osterild: osterild,
  saint_nazaire: saintNazaire,
  siemens_swt: siemensSwt,
  vestas_v117: vestasV117,
  vestas_v150: vestasV150,
  vestas_v164: vestasV164,
  vestas_v90: vestasV90,
  walney: walney,
};

export function resolveCardPhoto(photoKey: string): string {
  return CARD_PHOTO_MAP[photoKey] ?? offshoreFallback;
}
