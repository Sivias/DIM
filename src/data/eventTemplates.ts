// Flavor text templates. {HERO}, {ENEMY}, {ITEM}, {DAMAGE}, {HEAL}, {GOLD}, {ROOM} are replaced at runtime.

export const COMBAT_ATTACK = [
  '{HERO} draws back and swings true, driving {DAMAGE} points of pain into {ENEMY}.',
  '{HERO}\'s blade finds purchase in {ENEMY}\'s flank, dealing {DAMAGE} damage.',
  'With a battle cry, {HERO} hammers {ENEMY} for {DAMAGE} damage.',
  '{HERO} sidesteps and counters, striking {ENEMY} for {DAMAGE} piercing damage.',
  '{HERO} lunges, landing a blow on {ENEMY} that echoes off the stone walls — {DAMAGE} damage.',
];

export const ENEMY_ATTACK = [
  '{ENEMY} snarls and lashes out at {HERO}, dealing {DAMAGE} damage.',
  'With surprising speed, {ENEMY} rakes {HERO} across the arm for {DAMAGE} damage.',
  '{ENEMY} slams into {HERO} with reckless force — {DAMAGE} damage taken.',
  'A gleaming claw from {ENEMY} finds the gap in {HERO}\'s guard, inflicting {DAMAGE} damage.',
  '{ENEMY} shrieks and drives a crooked blade into {HERO}\'s leg, dealing {DAMAGE} damage.',
];

export const HERO_KILLED = [
  '{HERO} collapses, eyes wide, and is still. They will adventure no more today.',
  'With a final gasp, {HERO} crumples to the floor. The party fights on — for them.',
  '{HERO} falls, pale as ash, overcome by wounds. The enemy shows no mercy.',
];

export const PARTY_WIPED = [
  'The last of the party falls. Only silence remains in the {ROOM}.',
  'Darkness closes in as the final hero is struck down. The {ROOM} claims another.',
];

export const COMBAT_VICTORY = [
  'The last of the enemies collapses. The party catches their breath, victorious.',
  'Silence falls. The creatures lie defeated, and the party stands, battered but alive.',
  'With a final blow, the battle ends. The {ROOM} grows still once more.',
];

export const DISCOVERY = [
  'Beneath a loose flagstone, {HERO} discovers {ITEM}!',
  'A rusted chest in the corner yields {ITEM}.',
  'Wedged between two fallen beams, the party finds {ITEM}.',
  'Scratched into the wall is an arrow that leads to a hidden alcove — {ITEM} rests within.',
];

export const TRAP_TRIGGERED = [
  'A pressure plate clicks underfoot. Darts fly from the wall, striking {HERO} for {DAMAGE} damage.',
  '{HERO} steps into a wire trip and a cage of blades drops — {DAMAGE} damage!',
  'The floor gives way briefly. {HERO} scrambles free but takes {DAMAGE} fall damage.',
];

export const LORE = [
  'Faded inscriptions on the wall speak of a sorcerer who sealed themselves below.',
  'Scratched into the door are desperate warnings in an unknown tongue.',
  'An old torch still burns — someone else has been here recently.',
  'The architecture changes here, hinting at a far older civilization beneath.',
  'Strange symbols are carved at every doorway. The cleric mutters a troubled prayer.',
];

export const FLOOR_REST = [
  'The party makes camp in a defensible alcove. Wounds are bound and rations shared.',
  'A heavy door is wedged shut behind them. For a moment, there is warmth and quiet.',
  'Bloodied and breathless, the party takes stock. They have come far — and there is farther yet to go.',
];

export const FLOOR_COMPLETE = [
  'The lower door grinds open. A cold draught rises from below. The next floor awaits.',
  'With the creatures of this level routed, the staircase yawns darkly before the party.',
];

export const QUEST_COMPLETE = [
  'The objective is achieved. The party turns their boot toward home — and the inn.',
  'Done. Well done. The road back feels shorter when pockets are heavier.',
  'The job is finished. {HERO} leads the party back toward familiar fire and ale.',
];

export const INN_CHORE_DONE: Record<string, string[]> = {
  bar_clean: [
    'The bartop is wiped clean, revealing a knotted oak grain beneath years of grime.',
    'Stale cloths soaked and wrung, {HERO} scrubs the bar until it gleams.',
  ],
  bar_keg: [
    'A fresh keg is cracked. The sweet smell of a new brew fills the mead hall.',
    'The old keg is tapped dry and rolled away. A fresh one rolls into place with a satisfying clunk.',
  ],
  bar_sweep: [
    'Dust, sawdust, and suspicious unidentified debris are swept into a corner.',
    'The floor boards protest as the broom passes over them, but they look better for it.',
  ],
  kitchen_unload: [
    'Crates and sacks are hauled in from the yard, stacked neatly by the hearth.',
    'The delivery is in. The kitchen smells of earth and fresh produce.',
  ],
  kitchen_cook: [
    'The pot bubbles steadily. The inn fills with the smell of a proper meal.',
    'Three hearty dishes prepared. Heroes will eat well tonight.',
    "Bread baked, stew simmered, broth seasoned. A good day's cooking.",
  ],
  kitchen_sort: [
    'Turnips and mushrooms are sorted into their proper crates — the kitchen feels almost civilised.',
    'The pantry is organised. Finding dinner will no longer be an adventure of its own.',
  ],
  stable_hay: [
    'Fresh hay is spread and the horses nicker contentedly.',
    'Bales shifted, stalls swept. The stable smells marginally better.',
  ],
  stable_feed: [
    'Each horse buries its nose in the feed trough with enthusiasm.',
    'Water refilled, feed distributed. The animals are content.',
  ],
  stable_groom: [
    'Coat brushed to a gleam, mane untangled — the horses look almost noble.',
    'Each horse is brushed and fussed over. They seem pleased with the attention.',
  ],
  cellar_brew: [
    'The potion quietly simmers, then settles into a rich {ITEM} with a satisfying pop of the cork.',
    'Ingredients measured, heated, and strained. A fresh {ITEM} is ready for use.',
  ],
  rooms_tidy: [
    'Fresh linens, swept floors, and plumped pillows — the guest rooms are almost inviting.',
    'Cobwebs cleared and chamber pots emptied. The rooms are ready for new guests.',
  ],
};



