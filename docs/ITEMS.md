# Crafting Magic Items — Field Reference

Everything an item can do lives as optional fields on the item object. The **✨ effects
editor** in a character's bag (🎒 → ✨ on any item) is a visual builder for all of them —
you never have to write JSON. This doc is the map of what each field does, so you can dream
up items and know they'll work.

> **Fastest path:** open a character's bag → **📚 Add from magic item library** → pick
> something close → **✨** → tweak. The library (`js/data/item-library.js`) is also a set of
> worked examples of every field below.

Everything here **applies automatically while the item is equipped** (weapons: while the
weapon's attack is used). The DM can change anything at any time; players only ever *use* what
you give them.

---

## The worked example

> *"An oozy poison hatchet of death that does normal hatchet damage, but also 2d10 poison, and
> a save to avoid being poisoned."*

```js
{
  name: "Oozy Poison Hatchet of Death", slot: "weapon",
  dice: "1d6", damageType: "slashing", magicBonus: 1,     // a hatchet, +1
  riderDamage: [{ dice: "2d10", type: "poison" }],         // +2d10 poison every hit
  onHitSave: { ability: "con", dc: 13, condition: "Poisoned", duration: 2 }
}
```

On a hit it rolls `1d6 + STR + 1` slashing **and** `2d10` poison, then auto-prompts the
target's **DC 13 CON save** (player rolls on their phone / in person / 🎲 auto) → **Poisoned for
2 rounds** on a fail. In the library as *"Oozy Poison Hatchet of Death."*

---

## Weapon fields

| Field | Type | What it does |
|---|---|---|
| `dice` | `"1d8"` | Base damage dice. Auto-filled for known weapon names (even `"+1 Longsword"` → 1d8). |
| `damageType` | `"slashing"` | Base damage type. |
| `magicBonus` | `1`–`3` | **+X to both the attack roll and damage** (5e RAW). Also parsed from a `+N` in the name. |
| `toHitBonus` | number | Extra to-hit for **this weapon only** (on top of magic). |
| `damageBonus` | number | Extra flat damage for **this weapon only**. |
| `critRange` | `19` | Crit on this number or higher (`19` = crit on 19–20). |
| `riderDamage` | array | Extra typed dice on every hit — see below. |
| `onHitSave` | object | Save-or-suffer-a-condition — see below. |
| `vsType` | `{undead:"2d6"}` | Bonus dice vs a tagged creature type (needs the monster's `creatureType` set). |

### `riderDamage` — extra damage of another type
```js
riderDamage: [
  { dice: "2d6", type: "fire" },                 // +2d6 fire every hit
  { dice: "1d10", type: "necrotic", onCrit: true } // +1d10 necrotic ONLY on a crit
]
```
- Each rider is typed **separately**, so the target's own resistance/immunity to that type
  applies independently (a fire-immune creature shrugs off the fire rider but still takes the rest).
- Weapon dice **double on a crit** (a trailing flat `+N` does not).
- `onCrit: true` makes that rider land only on critical hits.

### `onHitSave` — save or suffer a condition
```js
onHitSave: { ability: "con", dc: 13, condition: "Poisoned", duration: 2 }
```
- `ability`: `str|dex|con|int|wis|cha` · `dc`: the save DC · `condition`: any condition name
  (Poisoned, Prone, Frightened, Restrained, Stunned, Blinded, Grappled, …).
- `duration` (optional): rounds the condition lasts (ticks down automatically). Blank = until removed.
- The save auto-routes to whoever owns the target — the player rolls on their phone (or in
  person, or the DM auto-rolls); a monster target rolls at the DM's table. Condition immunity is respected.

---

## Passive fields (while equipped)

| Field | Type | What it does |
|---|---|---|
| `acBonus` | number | + AC (armor, shields, rings, cloaks). |
| `speedBonus` | number (ft) | Added to walking speed. |
| `statBonuses` | `{str:2}` | Raises ability scores (affects mods, attacks, saves, everything). |
| `allAttackBonus` | number | + to-hit on **every** attack (e.g. a Ring of Protection is `acBonus:1` + `saveBonus:1`). |
| `allDamageBonus` | number | + damage on **every** attack. |
| `saveBonus` | number | + to **all** saving throws. |
| `skillBonus` | `{stealth:2}` | + to a skill (shown; adjudicate checks at the table). |
| `grantsExtraAttack` | `true` | Grants a second attack per Action. |
| `lightFt` | number | Emits light (torch/lantern). |

> Weapon-only bonuses (`toHitBonus`/`damageBonus`) ride just that weapon. The "all" versions
> come from **non-weapon** gear and buff every attack — so a sword's own +damage and a ring's
> +damage stack correctly without double-counting.

---

## Defense fields

| Field | Type | What it does |
|---|---|---|
| `grantResist` | `["fire"]` | Half damage from these types. |
| `grantImmune` | `["poison"]` | No damage from these types. |
| `grantVuln` | `["cold"]` | Double damage — great for **cursed** items. |
| `conditionImmune` | `["Frightened"]` | Can't suffer these conditions (on-hit saves against them auto-fizzle). |

---

## Granted action & charges

Give an item its own usable attack/blast, optionally limited by charges.

```js
grantAction: { name: "Fireball (staff)", dice: "8d6", range: 150, damageType: "fire", bonus: 0 },
charges: { max: 10, per: "dawn" }   // per: "short" | "long" | "dawn"
```
- The granted action appears in the character's action list while the item is equipped.
- `charges.left` is shown as 🔋 `left/max` and refills on rest: a **short rest** refills
  `per:"short"` items; a **long rest** refills everything (short, long, dawn).

---

## How to add a new item, three ways

1. **From the library (easiest):** 🎒 → **📚 Add from magic item library** → pick → **✨** → tweak → 💾.
2. **From scratch:** 🎒 → type a name + slot → **+ Add** → **✨** to open the builder → fill the
   sections you want → 💾.
3. **Rename a base weapon:** type `"+2 Greatsword"` or `"Flame Tongue Longsword"` and the engine
   resolves the base dice and magic bonus for you; add extras in **✨**.

### Adding to the permanent library
Append an object to `ITEM_LIBRARY` in `js/data/item-library.js` using any of the fields above,
plus a short `desc`. It shows up in the 📚 picker for every character.

```js
{ name: "Dagger of Venom", slot: "weapon", dice: "1d4", damageType: "piercing", magicBonus: 1, range: 20,
  riderDamage: [{ dice: "2d10", type: "poison", onCrit: false }],
  onHitSave: { ability: "con", dc: 15, condition: "Poisoned", duration: 2 },
  charges: { max: 1, per: "dawn" },
  desc: "Coat the blade once per dawn for a burst of poison." }
```

Everything syncs to players automatically — they see the item's effects in their bag, and when
they attack with it, the riders and saves resolve on the DM screen.
