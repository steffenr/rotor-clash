import groupsMd from '../data/groups.md?raw';
import enGroupsMd from '../data/locales/en/groups.md?raw';
import deGroupsMd from '../data/locales/de/groups.md?raw';
import enTurbinesMd from '../data/locales/en/turbines.md?raw';
import deTurbinesMd from '../data/locales/de/turbines.md?raw';
import { QuartetGroup, TurbineCard } from '../shared/gameTypes';
import {
  parseGroupLocaleMarkdown,
  parseGroupsMarkdown,
  parseTurbineLocaleMarkdown,
  parseTurbineMarkdown,
} from '../shared/markdownParser';

const turbineMarkdownModules = import.meta.glob('../data/turbines/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const groupLocales = {
  en: parseGroupLocaleMarkdown(enGroupsMd),
  de: parseGroupLocaleMarkdown(deGroupsMd),
};

const turbineLocales = {
  en: parseTurbineLocaleMarkdown(enTurbinesMd),
  de: parseTurbineLocaleMarkdown(deTurbinesMd),
};

export const QUARTET_GROUPS: QuartetGroup[] = parseGroupsMarkdown(groupsMd, groupLocales);

export const TURBINE_DECK: TurbineCard[] = Object.values(turbineMarkdownModules)
  .map((raw) => parseTurbineMarkdown(raw, turbineLocales))
  .sort((a, b) => a.groupId - b.groupId || a.slot.localeCompare(b.slot));

export const CARD_BY_ID: Record<string, TurbineCard> = Object.fromEntries(
  TURBINE_DECK.map((c) => [c.id, c])
);

export const GROUP_BY_ID: Record<number, QuartetGroup> = Object.fromEntries(
  QUARTET_GROUPS.map((g) => [g.id, g])
);
