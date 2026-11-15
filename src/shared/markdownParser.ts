import {
  GroupLocaleText,
  ImageCategory,
  LocaleCode,
  QuartetGroup,
  TurbineCard,
  TurbineLocaleText,
} from './gameTypes.ts';

function parseMarkdownSections(raw: string): Record<string, string>[] {
  const sections = raw
    .replace(/\r\n/g, '\n')
    .split(/\n(?=##\s+)/)
    .filter((s) => s.trim().startsWith('##'));

  return sections.map((section) => {
    const kv: Record<string, string> = {};
    for (const line of section.split('\n')) {
      const m = line.match(/^\s*-\s*([a-zA-Z0-9_]+)\s*:\s*(.+)$/);
      if (m) {
        kv[m[1]] = m[2].trim();
      }
    }
    return kv;
  });
}

export function parseGroupLocaleMarkdown(raw: string): Record<number, GroupLocaleText> {
  const map: Record<number, GroupLocaleText> = {};
  for (const kv of parseMarkdownSections(raw)) {
    const id = Number(kv.id);
    if (!id) continue;
    map[id] = {
      name: kv.name || `Group ${id}`,
      subtitle: kv.subtitle || '',
    };
  }
  return map;
}

export function parseTurbineLocaleMarkdown(raw: string): Record<string, TurbineLocaleText> {
  const map: Record<string, TurbineLocaleText> = {};
  for (const kv of parseMarkdownSections(raw)) {
    if (!kv.id) continue;
    map[kv.id] = {
      country: kv.country || '',
      drivetrain: kv.drivetrain || '',
      engineeringNote: kv.engineeringNote || '',
    };
  }
  return map;
}

export function parseGroupsMarkdown(
  rawTechGroups: string,
  localeMaps: Record<LocaleCode, Record<number, GroupLocaleText>>
): QuartetGroup[] {
  const groups: QuartetGroup[] = [];

  for (const kv of parseMarkdownSections(rawTechGroups)) {
    const id = Number(kv.id);
    if (!id) continue;
    const enText = localeMaps.en[id] ?? { name: `Group ${id}`, subtitle: '' };
    const deText = localeMaps.de[id] ?? enText;
    groups.push({
      id,
      code: kv.code || String(id),
      category: (kv.category as ImageCategory) || 'offshore',
      translations: {
        en: enText,
        de: deText,
      },
    });
  }

  return groups.sort((a, b) => a.id - b.id);
}

export function parseTurbineMarkdown(
  rawTech: string,
  localeMaps: Record<LocaleCode, Record<string, TurbineLocaleText>>
): TurbineCard {
  const normalized = rawTech.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/);
  if (!match) {
    throw new Error('Invalid turbine markdown file: missing YAML frontmatter');
  }

  const frontmatter = match[1];
  const kv: Record<string, string> = {};
  for (const line of frontmatter.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key) kv[key] = val;
  }

  const id = kv.id;
  const enLocale = localeMaps.en[id] ?? { country: '', drivetrain: '', engineeringNote: '' };
  const deLocale = localeMaps.de[id] ?? enLocale;

  return {
    id,
    groupId: Number(kv.groupId),
    slot: kv.slot as 'A' | 'B' | 'C' | 'D',
    modelName: kv.modelName,
    manufacturer: kv.manufacturer,
    deploymentType: kv.deploymentType as TurbineCard['deploymentType'],
    imageCategory: (kv.imageCategory as ImageCategory) || 'offshore',
    photoKey: kv.photoKey || 'fallback_offshore',
    isRealPhoto: kv.isRealPhoto === 'true',
    year: Number(kv.year),
    sweptAreaM2: Number(kv.sweptAreaM2),
    flagshipPlant: kv.flagshipPlant,
    flagshipLocation: kv.flagshipLocation,
    turbineCountInPlant: Number(kv.turbineCountInPlant),
    sourceUrl: kv.sourceUrl,
    sourceLabel: kv.sourceLabel,
    stats: {
      ratedPowerMw: Number(kv.ratedPowerMw),
      rotorDiameterM: Number(kv.rotorDiameterM),
      hubHeightM: Number(kv.hubHeightM),
      // Cut-in speed is only documented for deck 1; deck-2 cards leave it out (0 = unused).
      cutInWindMs: kv.cutInWindMs === undefined ? 0 : Number(kv.cutInWindMs),
      plantCapacityMw: Number(kv.plantCapacityMw),
      firstPowerYear: Number(kv.year),
    },
    translations: {
      en: enLocale,
      de: deLocale,
    },
  };
}
