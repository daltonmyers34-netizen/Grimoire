// ── Magic Item Library ───────────────────────────────────────────────────────
// A starter set of iconic items that double as living examples of every field the
// item builder supports. Pick one in the ✨ effects editor ("📚 Load from library")
// to stamp all of its properties onto an item, then tweak freely.
//
// Field reference (all optional — an item uses only what it needs):
//   slot         'weapon'|'armor'|'shield'|'wearable'|'potion'|'light'|'ammo'|'gear'
//   WEAPON
//     dice          base damage, e.g. '1d8'
//     damageType    'slashing'|'fire'|'poison'|...
//     magicBonus    +X to BOTH attack and damage (1/2/3)
//     toHitBonus    extra to-hit for THIS weapon only
//     damageBonus   extra flat damage for THIS weapon only
//     critRange     crit on this number or higher (19 = crit on 19–20)
//     riderDamage   [{dice:'2d6', type:'fire', onCrit:false}]  extra typed dice every hit
//     vsType        {undead:'2d6'}  bonus dice vs a tagged creatureType
//     onHitSave     {ability:'con', dc:13, condition:'Poisoned', duration:2}
//   PASSIVE (while equipped)
//     acBonus, speedBonus, lightFt
//     statBonuses   {str:2}   set an ability (Belt of Giant Strength uses statSet, see note)
//     allAttackBonus, allDamageBonus   every attack (Ring of Protection = saves+AC)
//     saveBonus     +X to all saving throws
//     grantsExtraAttack  true → 2 attacks per Action
//   DEFENSES
//     grantResist   ['fire']   grantImmune ['poison']   grantVuln ['cold']
//     conditionImmune ['Frightened','Poisoned']
//   GRANTED
//     grantAction   {name, dice, range, bonus, damageType}  extra usable attack
//     charges       {max:3, per:'long'}   limited-use (per short|long|dawn)
var ITEM_LIBRARY = [
  { name: 'Flame Tongue Longsword', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 0,
    riderDamage: [{ dice: '2d6', type: 'fire' }], desc: 'A blade wreathed in fire — +2d6 fire on every hit.' },
  { name: 'Frost Brand Sword', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 0,
    riderDamage: [{ dice: '1d6', type: 'cold' }], grantResist: ['fire'], desc: '+1d6 cold per hit; resist fire.' },
  { name: 'Vorpal Sword', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 3, critRange: 19,
    desc: '+3, crits on 19–20 (narrate the beheading on a nat 20).' },
  { name: 'Dagger of Venom', slot: 'weapon', dice: '1d4', damageType: 'piercing', magicBonus: 1, range: 20,
    riderDamage: [{ dice: '2d10', type: 'poison', onCrit: false }], onHitSave: { ability: 'con', dc: 15, condition: 'Poisoned', duration: 2 },
    charges: { max: 1, per: 'dawn' }, desc: '+1 dagger; coat it (1/dawn) for +2d10 poison and a DC15 CON save vs Poisoned.' },
  { name: 'Oozy Poison Hatchet of Death', slot: 'weapon', dice: '1d6', damageType: 'slashing', magicBonus: 1, range: 20,
    riderDamage: [{ dice: '2d10', type: 'poison' }], onHitSave: { ability: 'con', dc: 13, condition: 'Poisoned', duration: 2 },
    desc: 'Your example: hatchet +1, +2d10 poison per hit, DC13 CON save or Poisoned 2 rounds.' },
  { name: 'Warhammer of Thunderbolts', slot: 'weapon', dice: '1d8', damageType: 'bludgeoning', magicBonus: 1,
    riderDamage: [{ dice: '2d6', type: 'thunder' }], onHitSave: { ability: 'con', dc: 15, condition: 'Stunned', duration: 1 },
    statBonuses: { str: 2 }, desc: '+1 hammer, +2d6 thunder, DC15 CON or Stunned; +2 STR while held.' },
  { name: 'Sun Blade', slot: 'weapon', dice: '1d8', damageType: 'radiant', magicBonus: 2, range: 5,
    vsType: { undead: '1d8' }, desc: '+2 radiant blade; +1d8 vs undead. Sheds sunlight.' },
  { name: 'Scimitar of Speed', slot: 'weapon', dice: '1d6', damageType: 'slashing', magicBonus: 2,
    grantsExtraAttack: true, desc: '+2 scimitar that grants an extra attack.' },
  { name: '+1 Plate Armor', slot: 'armor', acBonus: 9, desc: 'Plate (+8 AC) with a +1 enchantment (9 total).' },
  { name: 'Ring of Protection', slot: 'wearable', acBonus: 1, saveBonus: 1, desc: '+1 AC and +1 to all saving throws.' },
  { name: 'Cloak of Elvenkind', slot: 'wearable', skillBonus: { stealth: 2 }, desc: 'Advantage-flavored +2 Stealth.' },
  { name: 'Belt of Hill Giant Strength', slot: 'wearable', statBonuses: { str: 4 }, desc: 'Sets a mighty STR (modeled as +4 here — adjust to taste).' },
  { name: 'Boots of Speed', slot: 'wearable', speedBonus: 30, desc: 'Doubles your run (adds +30 ft here).' },
  { name: 'Amulet of Health', slot: 'wearable', statBonuses: { con: 4 }, desc: 'Bolsters Constitution.' },
  { name: 'Dragon Scale Mail (Red)', slot: 'armor', acBonus: 9, grantResist: ['fire'], saveBonus: 1, desc: '+1 scale mail; resist fire; +1 saves.' },
  { name: 'Cloak of Displacement', slot: 'wearable', acBonus: 2, desc: 'Attackers struggle to place you (+2 AC here).' },
  { name: 'Periapt of Wound Closure', slot: 'wearable', conditionImmune: ['Unconscious'], desc: 'Stabilizes you — flavored as condition immunity.' },
  { name: 'Staff of Fire', slot: 'weapon', dice: '1d6', damageType: 'bludgeoning',
    grantAction: { name: 'Fireball (staff)', kind: 'attack', dice: '8d6', range: 150, damageType: 'fire', bonus: 0 },
    charges: { max: 10, per: 'dawn' }, grantResist: ['fire'], desc: 'Quarterstaff that can unleash Fireball; 10 charges/dawn; resist fire.' }
];

if (typeof window !== 'undefined') window.ITEM_LIBRARY = ITEM_LIBRARY;
