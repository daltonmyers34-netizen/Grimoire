// D&D 5e SRD spell database for Grimoire DM companion.
// Fields:
//   name           - spell name
//   level          - 0 for cantrips, 1-9 otherwise
//   kind           - 'save' | 'attack' | 'heal' | 'buff'
//   saveAbility    - 'str'|'dex'|'con'|'int'|'wis'|'cha' (kind 'save' only)
//   dice           - damage/heal dice ('8d6'); '' when the spell deals no damage/healing.
//                    Flat amounts are encoded as NdD1 (e.g. Heal 70 -> '70d1').
//   upcastDice     - extra dice per slot level above base (omitted when none)
//   damageType     - damage type (omitted for heals / no-damage spells)
//   range          - feet (5 = touch, 0 = self)
//   aoeFt          - blast radius in feet; cones/lines approximated as a radius
//   concentration  - true if the spell requires concentration
//   applyCondition - condition inflicted on a failed save, or stance for buffs

const SPELL_DB = [
  // ---- Cantrips ----
  { name: 'Fire Bolt', level: 0, kind: 'attack', dice: '1d10', damageType: 'fire', range: 120, concentration: false },
  { name: 'Ray of Frost', level: 0, kind: 'attack', dice: '1d8', damageType: 'cold', range: 60, concentration: false },
  { name: 'Sacred Flame', level: 0, kind: 'save', saveAbility: 'dex', dice: '1d8', damageType: 'radiant', range: 60, concentration: false },
  { name: 'Eldritch Blast', level: 0, kind: 'attack', dice: '1d10', damageType: 'force', range: 120, concentration: false },
  { name: 'Acid Splash', level: 0, kind: 'save', saveAbility: 'dex', dice: '1d6', damageType: 'acid', range: 60, concentration: false },
  { name: 'Poison Spray', level: 0, kind: 'save', saveAbility: 'con', dice: '1d12', damageType: 'poison', range: 10, concentration: false },
  { name: 'Chill Touch', level: 0, kind: 'attack', dice: '1d8', damageType: 'necrotic', range: 120, concentration: false },
  { name: 'Shocking Grasp', level: 0, kind: 'attack', dice: '1d8', damageType: 'lightning', range: 5, concentration: false },
  { name: 'Produce Flame', level: 0, kind: 'attack', dice: '1d8', damageType: 'fire', range: 30, concentration: false },
  { name: 'Thorn Whip', level: 0, kind: 'attack', dice: '1d6', damageType: 'piercing', range: 30, concentration: false },
  { name: 'Vicious Mockery', level: 0, kind: 'save', saveAbility: 'wis', dice: '1d4', damageType: 'psychic', range: 60, concentration: false },
  { name: 'Toll the Dead', level: 0, kind: 'save', saveAbility: 'wis', dice: '1d8', damageType: 'necrotic', range: 60, concentration: false }, // 1d12 vs wounded targets
  { name: 'Word of Radiance', level: 0, kind: 'save', saveAbility: 'con', dice: '1d6', damageType: 'radiant', range: 0, aoeFt: 5, concentration: false },

  // ---- Level 1 ----
  { name: 'Magic Missile', level: 1, kind: 'attack', dice: '3d4', upcastDice: '1d4', damageType: 'force', range: 120, concentration: false }, // auto-hit; 3 darts of 1d4+1
  { name: 'Burning Hands', level: 1, kind: 'save', saveAbility: 'dex', dice: '3d6', upcastDice: '1d6', damageType: 'fire', range: 0, aoeFt: 15, concentration: false },
  { name: 'Cure Wounds', level: 1, kind: 'heal', dice: '1d8', upcastDice: '1d8', range: 5, concentration: false },
  { name: 'Healing Word', level: 1, kind: 'heal', dice: '1d4', upcastDice: '1d4', range: 60, concentration: false },
  { name: 'Guiding Bolt', level: 1, kind: 'attack', dice: '4d6', upcastDice: '1d6', damageType: 'radiant', range: 120, concentration: false },
  { name: 'Inflict Wounds', level: 1, kind: 'attack', dice: '3d10', upcastDice: '1d10', damageType: 'necrotic', range: 5, concentration: false },
  { name: 'Thunderwave', level: 1, kind: 'save', saveAbility: 'con', dice: '2d8', upcastDice: '1d8', damageType: 'thunder', range: 0, aoeFt: 15, concentration: false },
  { name: 'Chromatic Orb', level: 1, kind: 'attack', dice: '3d8', upcastDice: '1d8', damageType: 'fire', range: 90, concentration: false }, // damage type is caster's choice
  { name: 'Witch Bolt', level: 1, kind: 'attack', dice: '1d12', upcastDice: '1d12', damageType: 'lightning', range: 30, concentration: true },
  { name: 'Ice Knife', level: 1, kind: 'attack', dice: '1d10', upcastDice: '1d6', damageType: 'piercing', range: 60, aoeFt: 5, concentration: false }, // burst adds 2d6 cold (Dex save)
  { name: 'Hellish Rebuke', level: 1, kind: 'save', saveAbility: 'dex', dice: '2d10', upcastDice: '1d10', damageType: 'fire', range: 60, concentration: false },
  { name: 'Bless', level: 1, kind: 'buff', dice: '', range: 30, concentration: true },
  { name: 'Shield of Faith', level: 1, kind: 'buff', dice: '', range: 60, concentration: true },
  { name: 'Faerie Fire', level: 1, kind: 'save', saveAbility: 'dex', dice: '', range: 60, aoeFt: 10, concentration: true },
  { name: 'Sleep', level: 1, kind: 'save', saveAbility: 'wis', dice: '5d8', upcastDice: '2d8', range: 90, aoeFt: 20, concentration: false, applyCondition: 'Incapacitated' }, // no save in RAW; dice are HP of creatures affected
  { name: "Tasha's Hideous Laughter", level: 1, kind: 'save', saveAbility: 'wis', dice: '', range: 30, concentration: true, applyCondition: 'Prone' },
  { name: 'Entangle', level: 1, kind: 'save', saveAbility: 'str', dice: '', range: 90, aoeFt: 10, concentration: true, applyCondition: 'Restrained' },
  { name: 'Mage Armor', level: 1, kind: 'buff', dice: '', range: 5, concentration: false },

  // ---- Level 2 ----
  { name: 'Scorching Ray', level: 2, kind: 'attack', dice: '6d6', upcastDice: '2d6', damageType: 'fire', range: 120, concentration: false }, // 3 rays of 2d6, +1 ray per slot
  { name: 'Shatter', level: 2, kind: 'save', saveAbility: 'con', dice: '3d8', upcastDice: '1d8', damageType: 'thunder', range: 60, aoeFt: 10, concentration: false },
  { name: 'Acid Arrow', level: 2, kind: 'attack', dice: '4d4', upcastDice: '1d4', damageType: 'acid', range: 90, concentration: false }, // plus 2d4 at end of target's next turn
  { name: 'Moonbeam', level: 2, kind: 'save', saveAbility: 'con', dice: '2d10', upcastDice: '1d10', damageType: 'radiant', range: 120, aoeFt: 5, concentration: true },
  { name: 'Spiritual Weapon', level: 2, kind: 'attack', dice: '1d8', damageType: 'force', range: 60, concentration: false }, // +1d8 per two slot levels above 2nd
  { name: 'Hold Person', level: 2, kind: 'save', saveAbility: 'wis', dice: '', range: 60, concentration: true, applyCondition: 'Paralyzed' },
  { name: 'Web', level: 2, kind: 'save', saveAbility: 'dex', dice: '', range: 60, aoeFt: 10, concentration: true, applyCondition: 'Restrained' },
  { name: 'Blindness/Deafness', level: 2, kind: 'save', saveAbility: 'con', dice: '', range: 30, concentration: false, applyCondition: 'Blinded' },
  { name: 'Invisibility', level: 2, kind: 'buff', dice: '', range: 5, concentration: true, applyCondition: 'Invisible' },
  { name: 'Spike Growth', level: 2, kind: 'save', saveAbility: 'dex', dice: '2d4', damageType: 'piercing', range: 150, aoeFt: 20, concentration: true }, // 2d4 per 5 ft moved, no save in RAW
  { name: 'Prayer of Healing', level: 2, kind: 'heal', dice: '2d8', upcastDice: '1d8', range: 30, concentration: false },
  { name: 'Flaming Sphere', level: 2, kind: 'save', saveAbility: 'dex', dice: '2d6', upcastDice: '1d6', damageType: 'fire', range: 60, aoeFt: 5, concentration: true },
  { name: 'Cloud of Daggers', level: 2, kind: 'save', saveAbility: 'dex', dice: '4d6', upcastDice: '2d6', damageType: 'slashing', range: 60, aoeFt: 5, concentration: true }, // automatic damage in RAW

  // ---- Level 3 ----
  { name: 'Fireball', level: 3, kind: 'save', saveAbility: 'dex', dice: '8d6', upcastDice: '1d6', damageType: 'fire', range: 150, aoeFt: 20, concentration: false },
  { name: 'Lightning Bolt', level: 3, kind: 'save', saveAbility: 'dex', dice: '8d6', upcastDice: '1d6', damageType: 'lightning', range: 0, aoeFt: 30, concentration: false }, // 100-ft line
  { name: 'Call Lightning', level: 3, kind: 'save', saveAbility: 'dex', dice: '3d10', upcastDice: '1d10', damageType: 'lightning', range: 120, aoeFt: 5, concentration: true },
  { name: 'Spirit Guardians', level: 3, kind: 'save', saveAbility: 'wis', dice: '3d8', upcastDice: '1d8', damageType: 'radiant', range: 0, aoeFt: 15, concentration: true },
  { name: 'Vampiric Touch', level: 3, kind: 'attack', dice: '3d6', upcastDice: '1d6', damageType: 'necrotic', range: 5, concentration: true },
  { name: 'Fear', level: 3, kind: 'save', saveAbility: 'wis', dice: '', range: 0, aoeFt: 30, concentration: true, applyCondition: 'Frightened' }, // 30-ft cone
  { name: 'Hypnotic Pattern', level: 3, kind: 'save', saveAbility: 'wis', dice: '', range: 120, aoeFt: 15, concentration: true, applyCondition: 'Incapacitated' }, // 30-ft cube
  { name: 'Haste', level: 3, kind: 'buff', dice: '', range: 30, concentration: true, applyCondition: 'Hastened' },
  { name: 'Slow', level: 3, kind: 'save', saveAbility: 'wis', dice: '', range: 120, aoeFt: 20, concentration: true }, // 40-ft cube
  { name: 'Mass Healing Word', level: 3, kind: 'heal', dice: '1d4', upcastDice: '1d4', range: 60, concentration: false },
  { name: 'Revivify', level: 3, kind: 'heal', dice: '1d1', range: 5, concentration: false }, // returns to life with 1 hit point
  { name: 'Sleet Storm', level: 3, kind: 'save', saveAbility: 'dex', dice: '', range: 150, aoeFt: 40, concentration: true, applyCondition: 'Prone' },
  { name: 'Stinking Cloud', level: 3, kind: 'save', saveAbility: 'con', dice: '', range: 90, aoeFt: 20, concentration: true, applyCondition: 'Poisoned' }, // fail = spend action retching

  // ---- Level 4 ----
  { name: 'Blight', level: 4, kind: 'save', saveAbility: 'con', dice: '8d8', upcastDice: '1d8', damageType: 'necrotic', range: 30, concentration: false },
  { name: 'Ice Storm', level: 4, kind: 'save', saveAbility: 'dex', dice: '2d8', upcastDice: '1d8', damageType: 'bludgeoning', range: 300, aoeFt: 20, concentration: false }, // plus 4d6 cold
  { name: 'Wall of Fire', level: 4, kind: 'save', saveAbility: 'dex', dice: '5d8', upcastDice: '1d8', damageType: 'fire', range: 120, concentration: true },
  { name: 'Phantasmal Killer', level: 4, kind: 'save', saveAbility: 'wis', dice: '4d10', upcastDice: '1d10', damageType: 'psychic', range: 120, concentration: true, applyCondition: 'Frightened' },
  { name: 'Guardian of Faith', level: 4, kind: 'save', saveAbility: 'dex', dice: '20d1', damageType: 'radiant', range: 30, aoeFt: 10, concentration: false }, // flat 20 radiant
  { name: 'Polymorph', level: 4, kind: 'save', saveAbility: 'wis', dice: '', range: 60, concentration: true },
  { name: 'Banishment', level: 4, kind: 'save', saveAbility: 'cha', dice: '', range: 60, concentration: true },

  // ---- Level 5 ----
  { name: 'Cone of Cold', level: 5, kind: 'save', saveAbility: 'con', dice: '8d8', upcastDice: '1d8', damageType: 'cold', range: 0, aoeFt: 30, concentration: false }, // 60-ft cone
  { name: 'Flame Strike', level: 5, kind: 'save', saveAbility: 'dex', dice: '8d6', upcastDice: '1d6', damageType: 'fire', range: 60, aoeFt: 10, concentration: false }, // 4d6 fire + 4d6 radiant
  { name: 'Cloudkill', level: 5, kind: 'save', saveAbility: 'con', dice: '5d8', upcastDice: '1d8', damageType: 'poison', range: 120, aoeFt: 20, concentration: true },
  { name: 'Destructive Wave', level: 5, kind: 'save', saveAbility: 'con', dice: '10d6', damageType: 'thunder', range: 0, aoeFt: 30, concentration: false, applyCondition: 'Prone' }, // 5d6 thunder + 5d6 radiant/necrotic
  { name: 'Mass Cure Wounds', level: 5, kind: 'heal', dice: '3d8', upcastDice: '1d8', range: 60, concentration: false },
  { name: 'Hold Monster', level: 5, kind: 'save', saveAbility: 'wis', dice: '', range: 90, concentration: true, applyCondition: 'Paralyzed' },
  { name: 'Synaptic Static', level: 5, kind: 'save', saveAbility: 'int', dice: '8d6', damageType: 'psychic', range: 120, aoeFt: 20, concentration: false },

  // ---- Level 6 ----
  { name: 'Chain Lightning', level: 6, kind: 'save', saveAbility: 'dex', dice: '10d8', damageType: 'lightning', range: 150, concentration: false }, // +1 target per slot above 6th
  { name: 'Disintegrate', level: 6, kind: 'save', saveAbility: 'dex', dice: '10d6', upcastDice: '3d6', damageType: 'force', range: 60, concentration: false }, // 10d6+40 in RAW
  { name: 'Sunbeam', level: 6, kind: 'save', saveAbility: 'con', dice: '6d8', damageType: 'radiant', range: 0, aoeFt: 30, concentration: true, applyCondition: 'Blinded' }, // 60-ft line
  { name: 'Circle of Death', level: 6, kind: 'save', saveAbility: 'con', dice: '8d6', upcastDice: '2d6', damageType: 'necrotic', range: 150, aoeFt: 60, concentration: false },
  { name: 'Heal', level: 6, kind: 'heal', dice: '70d1', upcastDice: '10d1', range: 5, concentration: false }, // flat 70 hp, +10 per slot
  { name: 'Harm', level: 6, kind: 'save', saveAbility: 'con', dice: '14d6', damageType: 'necrotic', range: 60, concentration: false },

  // ---- Level 7 ----
  { name: 'Finger of Death', level: 7, kind: 'save', saveAbility: 'con', dice: '7d8', damageType: 'necrotic', range: 60, concentration: false }, // 7d8+30 in RAW
  { name: 'Fire Storm', level: 7, kind: 'save', saveAbility: 'dex', dice: '7d10', damageType: 'fire', range: 150, aoeFt: 20, concentration: false }, // ten 10-ft cubes
  { name: 'Prismatic Spray', level: 7, kind: 'save', saveAbility: 'dex', dice: '10d6', damageType: 'radiant', range: 0, aoeFt: 30, concentration: false }, // 60-ft cone, damage type rolled randomly
  { name: 'Delayed Blast Fireball', level: 7, kind: 'save', saveAbility: 'dex', dice: '12d6', upcastDice: '1d6', damageType: 'fire', range: 150, aoeFt: 20, concentration: true },

  // ---- Level 8 ----
  { name: 'Sunburst', level: 8, kind: 'save', saveAbility: 'con', dice: '12d6', damageType: 'radiant', range: 150, aoeFt: 60, concentration: false, applyCondition: 'Blinded' },
  { name: 'Incendiary Cloud', level: 8, kind: 'save', saveAbility: 'dex', dice: '10d8', damageType: 'fire', range: 150, aoeFt: 20, concentration: true },

  // ---- Level 9 ----
  { name: 'Meteor Swarm', level: 9, kind: 'save', saveAbility: 'dex', dice: '40d6', damageType: 'fire', range: 5280, aoeFt: 40, concentration: false }, // 20d6 fire + 20d6 bludgeoning
  { name: 'Power Word Kill', level: 9, kind: 'save', saveAbility: 'con', dice: '', range: 60, concentration: false }, // no save in RAW; kills a creature with 100 hp or fewer
  { name: 'Mass Heal', level: 9, kind: 'heal', dice: '700d1', range: 60, concentration: false } // flat 700 hp divided among targets
];

function findSpell(name) {
  var n = String(name || '').trim().toLowerCase();
  return SPELL_DB.find(function(s) { return s.name.toLowerCase() === n; }) || null;
}
