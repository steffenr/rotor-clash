import fs from 'node:fs';
import path from 'node:path';
import { QuartetGroup, TurbineCard } from '../shared/gameTypes.ts';
import {
  parseGroupLocaleMarkdown,
  parseGroupsMarkdown,
  parseTurbineLocaleMarkdown,
  parseTurbineMarkdown,
} from '../shared/markdownParser.ts';

const DATA_DIR = path.resolve(process.cwd(), 'src', 'data');
const LOCALES_DIR = path.join(DATA_DIR, 'locales');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.md');
const TURBINES_DIR = path.join(DATA_DIR, 'turbines');

function loadGroupsFromDisk(): QuartetGroup[] {
  const rawTech = fs.readFileSync(GROUPS_FILE, 'utf-8');
  const enRaw = fs.readFileSync(path.join(LOCALES_DIR, 'en', 'groups.md'), 'utf-8');
  const deRaw = fs.readFileSync(path.join(LOCALES_DIR, 'de', 'groups.md'), 'utf-8');

  return parseGroupsMarkdown(rawTech, {
    en: parseGroupLocaleMarkdown(enRaw),
    de: parseGroupLocaleMarkdown(deRaw),
  });
}

function loadTurbinesFromDisk(): TurbineCard[] {
  const enRaw = fs.readFileSync(path.join(LOCALES_DIR, 'en', 'turbines.md'), 'utf-8');
  const deRaw = fs.readFileSync(path.join(LOCALES_DIR, 'de', 'turbines.md'), 'utf-8');
  const turbineLocales = {
    en: parseTurbineLocaleMarkdown(enRaw),
    de: parseTurbineLocaleMarkdown(deRaw),
  };

  const files = fs
    .readdirSync(TURBINES_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();
  return files
    .map((f) =>
      parseTurbineMarkdown(fs.readFileSync(path.join(TURBINES_DIR, f), 'utf-8'), turbineLocales)
    )
    .sort((a, b) => a.groupId - b.groupId || a.slot.localeCompare(b.slot));
}

export const SERVER_QUARTET_GROUPS: QuartetGroup[] = loadGroupsFromDisk();
export const SERVER_TURBINE_DECK: TurbineCard[] = loadTurbinesFromDisk();
export const SERVER_CARD_BY_ID: Record<string, TurbineCard> = Object.fromEntries(
  SERVER_TURBINE_DECK.map((c) => [c.id, c])
);
