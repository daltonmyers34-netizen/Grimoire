# The Dungeon Master's Grimoire

A D&D 5e companion web app: DM screen + live player views on phones. Vanilla JS, no build step, no framework.

- **Live site:** https://daltonmyers34-netizen.github.io/Grimoire/ (GitHub Pages serves `main`)
- **Player view:** `player-view.html?dm=<uid>` (share link from the app); `&table=1` = shared table screen that follows the current turn
- **Firebase project:** `dm-grimoire-20df0` (Firestore for sync; Storage optional — falls back to inline dataURLs if not enabled)

## Product philosophy (do not violate)

- **Players roll REAL dice** and type the raw d20 into their phone. The app adds modifiers with a visible +X animation. Never auto-roll a player's d20 for them.
- **The DM has ultimate authority**: players *request* actions; the DM app validates and resolves them. DM gets overrides everywhere (undo, act-as, +1 action, refresh turn, economy is advisory for DM-sourced actions).
- **DM rolls via the roll modal** (`requestRolls`) — manual entry per row, per-row 🎲 auto, auto-all, skippable rows. No forced auto-rolls.
- House rule: drinking a potion is a bonus action **only in combat**.
- Rejections must reach the player's phone (`rejectPlayer(c, msg)` → `lastRejection` in pvSnap → popup), never just a DM toast.

## Architecture

Classic `<script>` tags in `Index.html` (order matters — see bottom of Index.html). All top-level `let`/`var` in `js/app.js` are shared globals visible to every later script (NOT on `window`); function declarations ARE on `window`. `player-view.html` is a single self-contained file with one `<script type="module">`.

Key globals (js/app.js): `party`, `combatants`, `currentTurn`, `round` (NOT `currentRound` — that name only exists in the pvSnap), `combatActive`, `mapState`, `worldMap`, `partyInventory`, `quests`, `savedMaps`, `homebrewSpells`, `battlefieldLoot` (combat-view.js).

### File map

| File | Owns |
|---|---|
| `Index.html` | All DM tabs/markup, modals, script load order |
| `js/app.js` | Globals, `switchTab`, `esc()`, toasts, modals |
| `js/initiative.js` | Turn order, `startCombat`/`nextTurn`/`endCombat`, death saves, concentration checks, rests, condition modal, `renderCombatants` |
| `js/player-actions.js` | **The rules engine** (~2000 lines): action economy, `resolveCombatAction`, attack context (adv/dis, cover, Bless/Bane), saves + proficiencies, conditions (`CONDITION_EFFECTS`), reactions/smite/inspire, `processPlayerAction` dispatcher, `requestRolls` modal, AoE targeting, opportunity attacks, inventory presets (`ITEM_PRESETS`, `itemPresetFor`, `recomputePcCombat`), monster knowledge, `dmGrantAction`/`dmResetEconomy` |
| `js/party.js` | Character CRUD, tabbed character modal (`pmSwitchTab`: basics/combat/skills), FEAT_IDS checkbox↔feature mapping (in TWO places + reset list — keep all three in sync), inventory modal, spell rows |
| `js/map.js` | Battle map engine (tokens, fog, walls, generators, AoE ghosts, uploads), world/town map tab (`renderWorldMapTab`, `generateWorldMap`, `deleteWorldMap`) |
| `js/combat-view.js` | 🎬 full-screen DM combat mode (adopts `#tab-initiative`/`#tab-map` via DOM move, restores on exit), enemy drop-loot system (`generateDropLoot` by CR + name theme, death → `battlefieldLoot` → give/split UI), and auto-XP banking on enemy death (`cvCheckEnemyXP` → `bankMonsterXP` in world.js). Wraps `renderCombatants` and `endCombat` at load. |
| `js/sound.js` | Ambient auto-sound: WebAudio stings (`dmSound(kind)` — combatStart/bossLow/bossPhase/victory/combatEnd) synthesized live. Auto-fired from startCombat/endCombat (initiative.js), the renderCombatants wrapper (`checkBossLowSound`), and checkBossPhases (boss.js). Toggle `dmAmbientOn` (localStorage) + previews on the Sound tab. |
| `js/boss.js` | Boss mechanics: `maybeLegendaryResist` (spend to turn a failed enemy save into a success — hooked in player-actions.js save sites), `checkLairActions` (initiative-20 modal on round start, from initiative.js), `checkBossPhases` (HP-threshold banners, from the renderCombatants wrapper), `resetBossState` (startCombat). Config on the combatant: `legendaryResist{max,left}`, `lairActions[]`, `phases[{pct,note,fired}]` — set in the monster action editor (`dmEditActions`/`dmSaveActions`). |
| `js/firebase.js` | Module: auth, `cloudSave` (800ms debounce) / `cloudSaveNow`, `doCloudWrite` builds the **pvSnap**, `listenForPlayerActions`, `uploadToStorage`, homebrew save/load |
| `js/session.js` | `collectState`/`applyState` (every persisted field lives here — add new globals to BOTH), `newCampaign` |
| `js/data/spell-db.js` | 329 spells (SRD 5.1 CC-BY + curated); `findSpell` checks `homebrewSpells` first |
| `js/loot.js`, `js/quests.js`, `js/ai.js` | Loot generator/party inventory, quests, AI sheet import + encounter gen (needs API key) |
| `player-view.html` | Entire player phone UI: `renderRoot(d)` renders from pvSnap, `sendPlayerRequest(payload)` → Firestore queue, map tap-to-move/attack, cast ghosts, reaction/smite/death popups |

### Sync model

- Campaign state: `users/{uid}/data/state` (all of `collectState`), localStorage backup `dm_grimoire_session`, onSnapshot echo guard (`lastWriteTime`, 5s window).
- Player snapshot: `playerView/{uid}` — written by `doCloudWrite` with the **pvSnap**: `party`, `combatants`, `currentRound/currentTurn/combatActive`, `mapState` (null when `hiddenFromPlayers`), `worldMap`, `partyInventory`, `pvMessages`, `pvPartyMessage`, `actionFeed`, `pendingReaction`, `pendingSmite`, `pendingSave`, `lastRejection`, `recentLog` (25).
- Player requests: `playerActions/{uid}/requests` docs → `processPlayerAction(req)` dispatcher. Types: `move, action, castSpell, endTurn, addCharacter, deathSave, toggleFeature, equipItem, journal, useItem, reaction, smite, inspire, standUp, help, ready, saveRoll`. After processing a batch, `cloudSaveNow()` flushes so player latency stays ~1s.
- Saving throws route to whoever rolls: `promptSave(target, ability, dc, meta)` sets `pendingSave` for a player ally (they roll on their phone → `saveRoll` → `processPlayerSaveRoll` → `resolveSaveOutcome`) or opens the DM roll modal for a monster. DM fallback bar: `dmRollPendingSave`.
- DM monster attacks are two-step: `dmExecuteAction` → to-hit modal → `dmShowHitReveal` (neutral then HIT/MISS) → `dmShowDamageStep` (manual or `dmDamageAuto` animated) → `resolveCombatAction(..., {damageRoll})`. `resolveCombatAction` uses `opts.damageRoll` verbatim (crit dice already folded in).
- Account-level homebrew spellbook: `users/{uid}/data/homebrew` (survives `newCampaign`).

### Rules engine cheat sheet

- Economy per turn: `c.turnUsed = { actions: <count>, bonus: bool, movedFt, attacksMade, sneakUsed }`; `maxActionsFor(c) = 1 + c._surgeExtra + condition extraAction`; `attacksPerActionFor(c)` = 2 with the `Extra Attack` feature, or `c.multiattack` for mobs. An Action is only *spent* when `attacksMade` reaches the per-action count.
- `FEATURE_TOGGLES` (Rage/Reckless/Dodge/Action Surge/Second Wind/Disengage) — stances add a condition; costs go through `actionAvailable`/`spendActionFor` (never set `turnUsed` flags directly).
- `CONDITION_EFFECTS` drives everything (attackersAdv, selfDis, autoCritMelee, cantAct, speed mods, acMod, saveMod, resistAll, extraAction, ...). Add new mechanics as conditions where possible. Includes `Hidden`/`Helped` (selfAdv, consumed on attack in resolveCombatAction).
- **All combat damage flows through `applyHpDamage(target, taken, opts)`** (player-actions.js) — temp HP soak (`target.tempHp`), downed-target auto death-save fails (crit → 2), and massive-damage instant death. Call it at every new damage site; pass `{crit}` from attacks, `{riderDamage:true}` for same-hit add-ons (Smite). `grantTempHp` for temp HP (no stack).
- Exhaustion: `c.exhaustion` 0–6 via `exhaustionLevel(c)` (L2 half speed, L3 attack+save disadvantage, L4 `effectiveMaxHp` halved, L5 speed 0, L6 death). Long rest removes one level. Timed conditions: `condMeta[cond].rounds` ticks down in `endTurnProcessing`. Surprise: `c.surprised` (skipped round 1 in `skipInTurnOrder`/startCombat).
- Movement: 5-10-5 diagonals. AoE: sphere/cone(~28° half-angle)/line(5ft wide) via `aoeTargetsFor`/`pvShapeHits` (duplicated logic in player-view.html — change both).
- DM act menu z-indexes: base modals 1000, combat view 950, act menus 2600–2700, roll modal 2700, toasts 9999. New DM popups that must appear over the combat view: use ≥2600.

## Dev workflow

No build. Test with Playwright against a static server:

```bash
(python3 -m http.server 8811 >/dev/null 2>&1 &)   # repo root
node sometest.mjs                                  # chromium at /opt/pw-browsers/chromium
```

Test pattern (see git history for examples named `p*test.mjs`): goto `Index.html`, then in `page.evaluate` — remove `#login-screen`, stub `window.cloudSave/cloudSaveNow`, set `window.uploadToStorage = null`, seed `party`/`combatants`/`mapState.tokens` directly, call engine functions, return an assertions object. `page.on('dialog', d => d.accept())` for confirms. Keep tests OUT of the repo (scratchpad).

**Player-view tests:** generate a `pv-test.html` copy with Firebase stubbed (replace the two firebase imports with no-op consts + `addDoc` pushing to `window.__sentRequests`; neutralize `initializeApp({...})`; append `window.__renderRoot = renderRoot;` before the final `</script>`). Drive it with `window.__renderRoot(pvSnapObject)`. Delete `pv-test.html` before committing.

Verify visually too: `.screenshot()` and read the PNG — CSS bugs (e.g. `.modal label` has `!important` uppercase Cinzel styling that mangles nested labels; give custom labels a class that overrides with `!important`) don't show up in logic asserts.

### Ship

Work on the designated `claude/...` branch, then fast-forward main (Pages serves main):

```bash
git add -A && git commit -m "..." && git push -u origin <branch>
git checkout main && git merge <branch> --no-edit && git push origin main
git checkout <branch>
```

`gh`/GitHub API are typically unavailable — pushing to main IS the deploy.

## Gotchas

- `Date.now()` for IDs collides in loops — use `uniqueId()`.
- New persistent globals must be added to `collectState` AND `applyState` in js/session.js, and to the pvSnap in js/firebase.js if players need them.
- When patching files with python heredocs, the script writes at the END — a failed `assert` anchor means NO patches landed. Prefer the Edit tool.
- `switchTab` matches nav tabs by the quoted name (`switchTab('world')` ≠ `worldmap`).
- PC `speed`/numbers from inputs may be stale strings in old saves — `parseInt` with fallback (see `pvSpeedFt`).
- Take undo snapshots BEFORE mutating (spell slots burned before snapshot = unrestorable).
- Don't scrape D&D Beyond (ToS) — SRD 5.1 content via 5e-bits/5e-database is CC-BY and fine.
- Firebase Storage may not be enabled (Blaze plan) — always keep the inline dataURL fallback path.

## Approved roadmap (user said yes — build these next)

1. ~~**XP auto-award on kill**~~ ✅ DONE — CR-based XP (`XP_BY_CR`, world.js) banks to `pendingXP` on enemy death; one button (`awardPendingXP`) splits to party. Shown in the XP tab and the Combat View loot panel.
2. ~~**Boss mechanics**~~ ✅ DONE — legendary resistances, lair actions on initiative 20, HP-threshold phase prompts. See `js/boss.js`.
3. **Session recap generator** — combat log + loot log + quest updates → "Previously on..." paragraph, shown on player phones next session.
4. ~~**Ambient auto-sound**~~ ✅ DONE — `js/sound.js`: WebAudio-synthesized stings (`dmSound`) auto-fire on combat start / boss <25% HP (`checkBossLowSound`) / phase change / victory. Toggle + previews on the Sound tab.
5. **Clickable towns on generated world map** — tap a town → create/open Location entry; generate its battle map on demand.
6. ~~**Death-save drama on Table Mode**~~ ✅ DONE — `renderTableDeathDrama(d)` in player-view.html shows dying allies' portraits + ●●○ save/fail pips on the shared table screen (`?table=1`); private per-phone death card suppressed in table mode.
7. ~~**Monster tactics hint**~~ ✅ DONE — `dmSuggestTactics` (player-actions.js): "🧠 Suggest" in the enemy act menu scores actions×targets (focus-fire lowest-HP in reach, finish kills, stay ranged when kited, heal a hurt ally) and offers a one-click "Do it" that still routes through the DM roll modal.

Test each with the Playwright pattern above and ship via branch → main.
