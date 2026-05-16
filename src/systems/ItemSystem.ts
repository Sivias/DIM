import type { Item } from '../data/types';
import { ITEM_TEMPLATES } from '../data/itemData';
import { uid, chance } from '../utils/random';

export function makeItem(templateId: string): Item {
  const tpl = ITEM_TEMPLATES[templateId];
  if (!tpl) throw new Error(`Unknown item template: ${templateId}`);
  return {
    id: uid(),
    templateId,
    name: tpl.name,
    type: tpl.type,
    slot: tpl.slot,
    description: tpl.description,
    value: tpl.baseValue,
    effect: { ...tpl.effect, statBonus: tpl.effect.statBonus ? { ...tpl.effect.statBonus } : undefined },
    rarity: tpl.rarity,
    icon: tpl.icon,
  };
}

/** Roll loot from a loot table, returns 0 or more items. */
export function rollLoot(lootTable: Array<{ itemTemplateId: string; chance: number }>): Item[] {
  const items: Item[] = [];
  for (const entry of lootTable) {
    if (chance(entry.chance)) {
      try {
        items.push(makeItem(entry.itemTemplateId));
      } catch {
        // template missing, skip
      }
    }
  }
  return items;
}

/** Rarity label for display */
export const RARITY_COLORS: Record<Item['rarity'], string> = {
  common:    '#aaa',
  uncommon:  '#4dba7f',
  rare:      '#5599ff',
  legendary: '#e6a817',
};

