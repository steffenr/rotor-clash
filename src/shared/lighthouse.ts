/**
 * Geometry of the "turbine next to a 45 m lighthouse" diagram on every card.
 *
 * Both objects are drawn with ONE scale, so their heights are in the true proportion
 * (a 100 m hub is 2.2 lighthouses tall, an 18 m hub is 0.4). The scale is chosen per card so that the
 * taller of the two (the turbine's blade tip or the lighthouse) fills the drawing; a card with a small
 * turbine therefore shows a large lighthouse and a card with a giant turbine a small one.
 *
 * Units are SVG user units of the diagram's viewBox (72 x 84, ground line at y = 76).
 */
export const LIGHTHOUSE_HEIGHT_M = 45;
/** Height of the lighthouse artwork in the SVG, in user units, at scale 1. */
export const LIGHTHOUSE_ART_HEIGHT = 23;
export const DIAGRAM_GROUND_Y = 76;
/** Free space kept above the highest point. */
const DIAGRAM_TOP_MARGIN = 6;

export interface LighthouseDiagram {
  /** User units per metre, the same for the turbine and the lighthouse. */
  unitsPerMetre: number;
  /** y of the hub (the tower top). */
  hubY: number;
  /** Blade length (rotor radius) in user units. */
  bladeLen: number;
  /** Factor to apply to the lighthouse artwork (drawn at 1 = 23 units for 45 m). */
  lighthouseScale: number;
}

export function lighthouseDiagram(hubHeightM: number, rotorDiameterM: number): LighthouseDiagram {
  const hub = Math.max(0, hubHeightM);
  const radius = Math.max(0, rotorDiameterM) / 2;
  // The highest point is the blade tip when a blade points straight up, or the lighthouse top.
  const highestM = Math.max(LIGHTHOUSE_HEIGHT_M, hub + radius);
  const unitsPerMetre = (DIAGRAM_GROUND_Y - DIAGRAM_TOP_MARGIN) / highestM;
  return {
    unitsPerMetre,
    hubY: DIAGRAM_GROUND_Y - hub * unitsPerMetre,
    bladeLen: radius * unitsPerMetre,
    lighthouseScale: (LIGHTHOUSE_HEIGHT_M * unitsPerMetre) / LIGHTHOUSE_ART_HEIGHT,
  };
}
