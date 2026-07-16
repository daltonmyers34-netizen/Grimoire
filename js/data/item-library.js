// ── Magic Item Library ───────────────────────────────────────────────────────
// A big set of iconic SRD 5.1 (CC-BY) items, each fully specified so it drops into
// a character and automates into their stats and combat. Pick one in the ✨ effects
// editor ("📚 Load from library") to stamp its properties onto an item, then tweak.
//
// See docs/ITEMS.md for the complete field reference. Quick map:
//   WEAPON:  dice, damageType, magicBonus(+X hit&dmg), toHitBonus, damageBonus,
//            critRange(19=crit on 19-20), riderDamage[{dice,type,onCrit}],
//            vsType{undead:'2d6'} (needs monster.creatureType), onHitSave{ability,dc,condition,duration}
//   PASSIVE: acBonus, speedBonus, statBonuses{str:2} (adds), statSet{str:19} (sets, higher wins),
//            saveBonus, allAttackBonus, allDamageBonus, grantsExtraAttack, skillBonus{stealth:2},
//            lightFt
//   DEFENSE: grantResist[], grantImmune[], grantVuln[], conditionImmune[]
//   GRANTED: grantAction{name,dice,range,bonus,damageType}, grantSpell{name,dice,range,damageType,saveAbility,saveDC,condition,duration},
//            charges{max,per:'short'|'long'|'dawn'}
var ITEM_LIBRARY = [
  // ─────────── WEAPONS: generic plusses ───────────
  { name: '+1 Longsword', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 1, desc: '+1 to attack and damage.' },
  { name: '+2 Longsword', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 2, desc: '+2 to attack and damage.' },
  { name: '+3 Longsword', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 3, desc: '+3 to attack and damage.' },
  { name: '+1 Greatsword', slot: 'weapon', dice: '2d6', damageType: 'slashing', magicBonus: 1, desc: '+1 heavy blade.' },
  { name: '+1 Dagger', slot: 'weapon', dice: '1d4', damageType: 'piercing', magicBonus: 1, range: 20, desc: '+1 finesse/thrown dagger.' },
  { name: '+1 Longbow', slot: 'weapon', dice: '1d8', damageType: 'piercing', magicBonus: 1, range: 150, desc: '+1 to ranged attack and damage.' },
  { name: '+2 Shortbow', slot: 'weapon', dice: '1d6', damageType: 'piercing', magicBonus: 2, range: 80, desc: '+2 ranged.' },

  // ─────────── WEAPONS: elemental / rider ───────────
  { name: 'Flame Tongue Longsword', slot: 'weapon', dice: '1d8', damageType: 'slashing',
    riderDamage: [{ dice: '2d6', type: 'fire' }], lightFt: 40, desc: 'Speak the command word — +2d6 fire on every hit; sheds light.' },
  { name: 'Frost Brand Sword', slot: 'weapon', dice: '1d8', damageType: 'slashing',
    riderDamage: [{ dice: '1d6', type: 'cold' }], grantResist: ['fire'], desc: '+1d6 cold per hit; resistance to fire.' },
  { name: 'Flame Tongue Scimitar', slot: 'weapon', dice: '1d6', damageType: 'slashing',
    riderDamage: [{ dice: '2d6', type: 'fire' }], lightFt: 40, desc: 'A curved blade of fire.' },
  { name: 'Sun Blade', slot: 'weapon', dice: '1d8', damageType: 'radiant', magicBonus: 2, range: 5,
    vsType: { undead: '1d8' }, lightFt: 30, desc: '+2 radiant blade; +1d8 vs undead; sheds sunlight.' },
  { name: 'Mace of Smiting', slot: 'weapon', dice: '1d6', damageType: 'bludgeoning', magicBonus: 1,
    vsType: { construct: '2d6' }, desc: '+1 (+3 vs constructs); crits can shatter constructs.' },
  { name: 'Mace of Disruption', slot: 'weapon', dice: '1d6', damageType: 'bludgeoning', magicBonus: 1,
    riderDamage: [{ dice: '2d6', type: 'radiant', onCrit: false }], vsType: { undead: '2d6', fiend: '2d6' },
    onHitSave: { ability: 'wis', dc: 15, condition: 'Frightened', duration: 1 }, desc: '+2d6 radiant vs undead/fiends; may frighten them.' },
  { name: 'Mace of Terror', slot: 'weapon', dice: '1d6', damageType: 'bludgeoning',
    onHitSave: { ability: 'wis', dc: 15, condition: 'Frightened', duration: 2 }, charges: { max: 3, per: 'dawn' }, desc: 'Radiate fear (3 charges/dawn).' },
  { name: 'Warhammer of Thunderbolts', slot: 'weapon', dice: '1d8', damageType: 'bludgeoning', magicBonus: 1,
    riderDamage: [{ dice: '2d6', type: 'thunder' }], onHitSave: { ability: 'con', dc: 15, condition: 'Stunned', duration: 1 },
    statSet: { str: 20 }, desc: '+1 hammer, +2d6 thunder, DC15 CON or Stunned; STR becomes 20.' },
  { name: 'Sword of Wounding', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 1,
    riderDamage: [{ dice: '1d4', type: 'necrotic' }], onHitSave: { ability: 'con', dc: 15, condition: 'Poisoned', duration: 2 }, desc: 'Wounds that refuse to close.' },
  { name: 'Sword of Life Stealing', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 1,
    riderDamage: [{ dice: '3d6', type: 'necrotic', onCrit: true }], desc: 'On a crit, +3d6 necrotic and you gain temp HP.' },
  { name: 'Javelin of Lightning', slot: 'weapon', dice: '1d6', damageType: 'piercing', range: 30,
    riderDamage: [{ dice: '4d6', type: 'lightning' }], charges: { max: 1, per: 'dawn' }, desc: 'Hurl it to strike as a 4d6 lightning bolt.' },
  { name: 'Trident of Fish Command', slot: 'weapon', dice: '1d6', damageType: 'piercing', magicBonus: 1, range: 20, desc: '+1 trident; command aquatic beasts.' },

  // ─────────── WEAPONS: slayers & special ───────────
  { name: 'Dragon Slayer Sword', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 1,
    vsType: { dragon: '3d6' }, desc: '+1 sword; +3d6 vs dragons.' },
  { name: 'Giant Slayer Greataxe', slot: 'weapon', dice: '1d12', damageType: 'slashing', magicBonus: 1,
    vsType: { giant: '2d6' }, onHitSave: { ability: 'str', dc: 15, condition: 'Prone', duration: 0 }, desc: '+2d6 vs giants; may knock them prone.' },
  { name: 'Dwarven Thrower', slot: 'weapon', dice: '1d8', damageType: 'bludgeoning', magicBonus: 3, range: 20,
    vsType: { giant: '2d8' }, desc: '+3 warhammer (returns when thrown); +2d8 vs giants.' },
  { name: 'Vorpal Sword', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 3, critRange: 19,
    desc: '+3, crits on 19–20 — narrate the beheading on a nat 20.' },
  { name: 'Sword of Sharpness', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 1, critRange: 19,
    riderDamage: [{ dice: '4d6', type: 'slashing', onCrit: true }], desc: 'Crits on 19–20 for a brutal extra 4d6.' },
  { name: 'Nine Lives Stealer', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 2, critRange: 19,
    desc: '+2; a crit can force a DC15 CON save or the victim dies (adjudicate).' },
  { name: 'Berserker Axe', slot: 'weapon', dice: '1d12', damageType: 'slashing', magicBonus: 1, damageBonus: 2, desc: '+1 axe; cursed rage grants extra damage.' },
  { name: 'Oozy Poison Hatchet of Death', slot: 'weapon', dice: '1d6', damageType: 'slashing', magicBonus: 1, range: 20,
    riderDamage: [{ dice: '2d10', type: 'poison' }], onHitSave: { ability: 'con', dc: 13, condition: 'Poisoned', duration: 2 },
    desc: 'The worked example: +2d10 poison per hit, DC13 CON or Poisoned 2 rounds.' },
  { name: 'Dagger of Venom', slot: 'weapon', dice: '1d4', damageType: 'piercing', magicBonus: 1, range: 20,
    riderDamage: [{ dice: '2d10', type: 'poison', onCrit: false }], onHitSave: { ability: 'con', dc: 15, condition: 'Poisoned', duration: 2 },
    charges: { max: 1, per: 'dawn' }, desc: '+1 dagger; coat it (1/dawn) for +2d10 poison and DC15 CON vs Poisoned.' },
  { name: 'Scimitar of Speed', slot: 'weapon', dice: '1d6', damageType: 'slashing', magicBonus: 2,
    grantsExtraAttack: true, desc: '+2 scimitar granting an extra attack.' },
  { name: 'Luck Blade', slot: 'weapon', dice: '1d8', damageType: 'slashing', magicBonus: 1, saveBonus: 1, desc: '+1 blade; +1 to all saves; grants luck rerolls (adjudicate).' },

  // ─────────── ARMOR & SHIELDS ───────────
  { name: '+1 Leather Armor', slot: 'armor', acBonus: 2, desc: 'Leather (+1 AC) enchanted +1 (2 total).' },
  { name: '+1 Studded Leather', slot: 'armor', acBonus: 3, desc: 'Studded leather +1.' },
  { name: '+1 Chain Mail', slot: 'armor', acBonus: 7, desc: 'Chain mail (+6) +1.' },
  { name: '+1 Half Plate', slot: 'armor', acBonus: 6, desc: 'Half plate (+5) +1.' },
  { name: '+1 Plate Armor', slot: 'armor', acBonus: 9, desc: 'Plate (+8) +1 (9 total).' },
  { name: '+2 Plate Armor', slot: 'armor', acBonus: 10, desc: 'Plate +2.' },
  { name: '+3 Plate Armor', slot: 'armor', acBonus: 11, desc: 'Plate +3 — legendary protection.' },
  { name: '+1 Shield', slot: 'shield', acBonus: 3, desc: 'Shield (+2) enchanted +1.' },
  { name: '+2 Shield', slot: 'shield', acBonus: 4, desc: 'Shield +2.' },
  { name: 'Armor of Fire Resistance (Plate)', slot: 'armor', acBonus: 8, grantResist: ['fire'], desc: 'Plate that resists fire.' },
  { name: 'Armor of Cold Resistance (Half Plate)', slot: 'armor', acBonus: 5, grantResist: ['cold'], desc: 'Half plate that resists cold.' },
  { name: 'Dragon Scale Mail (Red)', slot: 'armor', acBonus: 9, grantResist: ['fire'], saveBonus: 1, desc: '+1 scale mail; resist fire; +1 saves.' },
  { name: 'Dragon Scale Mail (White)', slot: 'armor', acBonus: 9, grantResist: ['cold'], saveBonus: 1, desc: '+1 scale mail; resist cold; +1 saves.' },
  { name: 'Dragon Scale Mail (Black)', slot: 'armor', acBonus: 9, grantResist: ['acid'], saveBonus: 1, desc: '+1 scale mail; resist acid; +1 saves.' },
  { name: 'Dwarven Plate', slot: 'armor', acBonus: 9, speedBonus: 0, desc: 'Plate +1; resist being shoved/knocked prone.' },
  { name: 'Elven Chain', slot: 'armor', acBonus: 6, desc: 'Chain shirt +1 you can wear without proficiency.' },
  { name: 'Glamoured Studded Leather', slot: 'armor', acBonus: 3, desc: 'Studded leather +1 you can disguise at will.' },
  { name: 'Spellguard Shield', slot: 'shield', acBonus: 2, saveBonus: 2, desc: 'Advantage/+2 on saves vs spells; foes have disadvantage on spell attacks against you.' },
  { name: 'Mariner’s Armor (Scale)', slot: 'armor', acBonus: 4, desc: 'Swim speed; won’t drag you underwater.' },

  // ─────────── RINGS ───────────
  { name: 'Ring of Protection', slot: 'wearable', acBonus: 1, saveBonus: 1, desc: '+1 AC and +1 to all saving throws.' },
  { name: 'Ring of Fire Resistance', slot: 'wearable', grantResist: ['fire'], desc: 'Resistance to fire.' },
  { name: 'Ring of Cold Resistance', slot: 'wearable', grantResist: ['cold'], desc: 'Resistance to cold.' },
  { name: 'Ring of Lightning Resistance', slot: 'wearable', grantResist: ['lightning'], desc: 'Resistance to lightning.' },
  { name: 'Ring of Poison Resistance', slot: 'wearable', grantResist: ['poison'], desc: 'Resistance to poison.' },
  { name: 'Ring of Free Action', slot: 'wearable', conditionImmune: ['Grappled', 'Restrained', 'Paralyzed'], desc: 'Difficult terrain and grapples/restraints can’t stop you.' },
  { name: 'Ring of the Ram', slot: 'wearable', grantAction: { name: 'Ram (ring)', kind: 'attack', dice: '2d10', range: 60, damageType: 'force', bonus: 7 }, charges: { max: 3, per: 'dawn' }, desc: 'Blast a force ram (3 charges/dawn).' },
  { name: 'Ring of Feather Falling', slot: 'wearable', desc: 'Never take falling damage.' },
  { name: 'Ring of Jumping', slot: 'wearable', skillBonus: { athletics: 2 }, desc: 'Leap great distances.' },
  { name: 'Ring of Swimming', slot: 'wearable', skillBonus: { athletics: 2 }, desc: 'Swim speed 40 ft.' },
  { name: 'Ring of Warmth', slot: 'wearable', grantResist: ['cold'], desc: 'Comfortable in freezing cold; resist cold.' },
  { name: 'Ring of Regeneration', slot: 'wearable', desc: 'Regain HP over time; regrow limbs (adjudicate healing).' },

  // ─────────── CLOAKS & CAPES (back slot) ───────────
  { name: 'Cloak of Protection', slot: 'wearable', acBonus: 1, saveBonus: 1, desc: '+1 AC and +1 to all saves.' },
  { name: 'Cloak of Displacement', slot: 'wearable', acBonus: 2, desc: 'You appear to be somewhere you’re not (+2 AC here).' },
  { name: 'Cloak of Elvenkind', slot: 'wearable', skillBonus: { stealth: 2 }, desc: 'Advantage-flavored +2 Stealth; hard to see.' },
  { name: 'Cloak of the Bat', slot: 'wearable', skillBonus: { stealth: 2 }, desc: 'Glide, climb, and hide in dim light.' },
  { name: 'Cloak of the Manta Ray', slot: 'wearable', desc: 'Breathe underwater; swim speed 60 ft.' },
  { name: 'Mantle of Spell Resistance', slot: 'wearable', saveBonus: 2, desc: 'Advantage/+2 on saving throws against spells.' },

  // ─────────── AMULETS & NECKLACES (neck slot) ───────────
  { name: 'Amulet of Health', slot: 'wearable', statSet: { con: 19 }, desc: 'Your Constitution becomes 19.' },
  { name: 'Periapt of Health', slot: 'wearable', grantImmune: ['poison'], desc: 'Immune to disease.' },
  { name: 'Periapt of Proof against Poison', slot: 'wearable', grantImmune: ['poison'], conditionImmune: ['Poisoned'], desc: 'Immune to poison damage and the Poisoned condition.' },
  { name: 'Periapt of Wound Closure', slot: 'wearable', conditionImmune: ['Unconscious'], desc: 'Stabilize instantly; double healing dice.' },
  { name: 'Necklace of Adaptation', slot: 'wearable', conditionImmune: ['Poisoned'], desc: 'Breathe anywhere; resist harmful gases.' },
  { name: 'Amulet of Proof against Detection', slot: 'wearable', desc: 'Hidden from divination and scrying.' },
  { name: 'Scarab of Protection', slot: 'wearable', saveBonus: 1, desc: '+1 to saves vs spells; wards against undead.' },
  { name: 'Brooch of Shielding', slot: 'wearable', grantResist: ['force'], desc: 'Resistance to force damage; immune to magic missile.' },
  { name: 'Necklace of Fireballs', slot: 'wearable', grantAction: { name: 'Fireball Bead', kind: 'attack', dice: '8d6', range: 150, damageType: 'fire', bonus: 0 }, charges: { max: 3, per: 'dawn' }, desc: 'Hurl beads that burst as fireballs (DC15 DEX for half).' },

  // ─────────── BELTS (waist slot) ───────────
  { name: 'Belt of Hill Giant Strength', slot: 'wearable', statSet: { str: 21 }, desc: 'Strength becomes 21.' },
  { name: 'Belt of Stone Giant Strength', slot: 'wearable', statSet: { str: 23 }, desc: 'Strength becomes 23.' },
  { name: 'Belt of Frost Giant Strength', slot: 'wearable', statSet: { str: 23 }, desc: 'Strength becomes 23.' },
  { name: 'Belt of Fire Giant Strength', slot: 'wearable', statSet: { str: 25 }, desc: 'Strength becomes 25.' },
  { name: 'Belt of Cloud Giant Strength', slot: 'wearable', statSet: { str: 27 }, desc: 'Strength becomes 27.' },
  { name: 'Belt of Storm Giant Strength', slot: 'wearable', statSet: { str: 29 }, desc: 'Strength becomes 29 — earth-shaking might.' },
  { name: 'Belt of Dwarvenkind', slot: 'wearable', statBonuses: { con: 2 }, grantResist: ['poison'], saveBonus: 2, desc: '+2 CON, advantage/+2 on poison saves, resist poison.' },

  // ─────────── GLOVES / BRACERS (hands / arms) ───────────
  { name: 'Gauntlets of Ogre Power', slot: 'wearable', statSet: { str: 19 }, desc: 'Strength becomes 19.' },
  { name: 'Bracers of Defense', slot: 'wearable', acBonus: 2, desc: '+2 AC when wearing no armor or shield.' },
  { name: 'Bracers of Archery', slot: 'wearable', allDamageBonus: 2, desc: '+2 damage with longbows and shortbows (applies to all ranged here).' },
  { name: 'Gloves of Missile Snaring', slot: 'wearable', desc: 'Catch or deflect ranged weapon attacks.' },
  { name: 'Gloves of Swimming and Climbing', slot: 'wearable', skillBonus: { athletics: 2 }, desc: 'Climb/swim speed; +2 Athletics.' },

  // ─────────── HEADWEAR (head / eyes) ───────────
  { name: 'Headband of Intellect', slot: 'wearable', statSet: { int: 19 }, desc: 'Intelligence becomes 19.' },
  { name: 'Circlet of Blasting', slot: 'wearable', grantAction: { name: 'Scorching Ray (circlet)', kind: 'attack', dice: '2d6', range: 120, damageType: 'fire', bonus: 5 }, charges: { max: 1, per: 'dawn' }, desc: 'Cast Scorching Ray once/dawn.' },
  { name: 'Helm of Brilliance', slot: 'wearable', grantResist: ['fire'], grantAction: { name: 'Fire Blast (helm)', kind: 'attack', dice: '4d6', range: 120, damageType: 'fire', bonus: 5 }, charges: { max: 3, per: 'dawn' }, desc: 'Radiant gems power fiery magic; resist fire.' },
  { name: 'Eyes of the Eagle', slot: 'wearable', skillBonus: { perception: 2 }, desc: '+2 Perception (sight); see great distances.' },
  { name: 'Goggles of Night', slot: 'wearable', desc: 'Darkvision 60 ft.' },
  { name: 'Cap of Water Breathing', slot: 'wearable', desc: 'Breathe underwater.' },

  // ─────────── BOOTS (feet) ───────────
  { name: 'Boots of Speed', slot: 'wearable', speedBonus: 30, desc: 'Click your heels — doubled speed (+30 ft here).' },
  { name: 'Boots of Striding and Springing', slot: 'wearable', speedBonus: 0, desc: 'Speed fixed at 30 regardless of load; triple jump.' },
  { name: 'Boots of Elvenkind', slot: 'wearable', skillBonus: { stealth: 2 }, desc: 'Move silently; +2 Stealth.' },
  { name: 'Winged Boots', slot: 'wearable', speedBonus: 0, desc: 'Fly speed equal to your walking speed.' },
  { name: 'Boots of the Winterlands', slot: 'wearable', grantResist: ['cold'], desc: 'Resist cold; ignore icy terrain.' },

  // ─────────── WANDS / STAVES / RODS (weapon slot for granted actions) ───────────
  { name: 'Wand of Magic Missiles', slot: 'weapon', dice: '', grantAction: { name: 'Magic Missiles', kind: 'attack', dice: '3d4+3', range: 120, damageType: 'force', bonus: 20 }, charges: { max: 7, per: 'dawn' }, desc: 'Auto-hitting force darts (3×[1d4+1]); 7 charges/dawn.' },
  { name: 'Wand of Fireballs', slot: 'weapon', dice: '', grantSpell: { name: 'Fireball (wand)', dice: '8d6', range: 150, damageType: 'fire', saveAbility: 'dex', saveDC: 15 }, charges: { max: 7, per: 'dawn' }, desc: 'Cast Fireball (DC15 DEX half); 7 charges/dawn.' },
  { name: 'Wand of Lightning Bolts', slot: 'weapon', dice: '', grantSpell: { name: 'Lightning Bolt (wand)', dice: '8d6', range: 100, damageType: 'lightning', saveAbility: 'dex', saveDC: 15 }, charges: { max: 7, per: 'dawn' }, desc: 'A 100-ft lightning line (DC15 DEX half); 7 charges/dawn.' },
  { name: 'Wand of Paralysis', slot: 'weapon', dice: '', grantSpell: { name: 'Paralyze (wand)', dice: '', range: 60, saveAbility: 'con', saveDC: 15, condition: 'Paralyzed', duration: 2 }, charges: { max: 7, per: 'dawn' }, desc: 'DC15 CON or Paralyzed; 7 charges/dawn.' },
  { name: 'Wand of Fear', slot: 'weapon', dice: '', grantSpell: { name: 'Fear (wand)', dice: '', range: 30, saveAbility: 'wis', saveDC: 15, condition: 'Frightened', duration: 2 }, charges: { max: 7, per: 'dawn' }, desc: 'DC15 WIS or Frightened; 7 charges/dawn.' },
  { name: 'Staff of Fire', slot: 'weapon', dice: '1d6', damageType: 'bludgeoning', grantSpell: { name: 'Fireball (staff)', dice: '8d6', range: 150, damageType: 'fire', saveAbility: 'dex', saveDC: 15 }, charges: { max: 10, per: 'dawn' }, grantResist: ['fire'], desc: 'Quarterstaff that unleashes Fireball; resist fire; 10 charges/dawn.' },
  { name: 'Staff of Frost', slot: 'weapon', dice: '1d6', damageType: 'bludgeoning', grantSpell: { name: 'Cone of Cold (staff)', dice: '8d8', range: 60, damageType: 'cold', saveAbility: 'con', saveDC: 15 }, charges: { max: 10, per: 'dawn' }, grantResist: ['cold'], desc: 'Cone of Cold; resist cold; 10 charges/dawn.' },
  { name: 'Staff of Lightning', slot: 'weapon', dice: '1d6', damageType: 'bludgeoning', grantSpell: { name: 'Lightning Bolt (staff)', dice: '8d6', range: 100, damageType: 'lightning', saveAbility: 'dex', saveDC: 15 }, charges: { max: 10, per: 'dawn' }, grantResist: ['lightning'], desc: 'Lightning Bolt; resist lightning; 10 charges/dawn.' },
  { name: 'Staff of Striking', slot: 'weapon', dice: '1d6', damageType: 'bludgeoning', magicBonus: 3, damageBonus: 9, charges: { max: 10, per: 'dawn' }, desc: '+3 quarterstaff; spend charges for +1d6 force each (modeled as flat here).' },
  { name: 'Rod of the Pact Keeper +2', slot: 'wearable', allAttackBonus: 2, saveBonus: 2, desc: '+2 to spell attack rolls and spell save DCs (modeled as attack + save bonus).' },

  // ─────────── POTIONS ───────────
  { name: 'Potion of Healing', slot: 'potion', healDice: '2d4+2', desc: 'Heals 2d4+2 HP.' },
  { name: 'Potion of Greater Healing', slot: 'potion', healDice: '4d4+4', desc: 'Heals 4d4+4 HP.' },
  { name: 'Potion of Superior Healing', slot: 'potion', healDice: '8d4+8', desc: 'Heals 8d4+8 HP.' },
  { name: 'Potion of Supreme Healing', slot: 'potion', healDice: '10d4+20', desc: 'Heals 10d4+20 HP.' },
  { name: 'Potion of Fire Resistance', slot: 'potion', desc: 'Resistance to fire for 1 hour (apply grantResist on the drinker while active).' },
  { name: 'Potion of Giant Strength (Hill)', slot: 'potion', desc: 'STR becomes 21 for 1 hour.' },
  { name: 'Potion of Heroism', slot: 'potion', desc: '10 temp HP + Bless for 1 hour.' },
  { name: 'Potion of Speed', slot: 'potion', desc: 'Hasted for 1 minute (double speed, +2 AC, extra action).' },
  { name: 'Potion of Invisibility', slot: 'potion', desc: 'Invisible for 1 hour or until you attack/cast.' },
  { name: 'Potion of Flying', slot: 'potion', desc: 'Fly speed equal to walking speed for 1 hour.' }
];

if (typeof window !== 'undefined') window.ITEM_LIBRARY = ITEM_LIBRARY;
