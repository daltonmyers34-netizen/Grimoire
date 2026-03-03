// ============================================================
// NAME DATA & GENERATORS
// ============================================================
const NAME_PARTS = {
  human: {
    male:   ['Aldric','Brennan','Cade','Doren','Fynn','Gareth','Hadley','Ivor','Kael','Lyle','Maren','Nolan','Oryn','Quinn','Rael','Tomas','Vane','Wren','Zane','Edmund','Harald','Leoric','Oswin','Percival','Roland','Severin','Theron','Ulric'],
    female: ['Alara','Brynn','Cara','Elara','Gwen','Isadora','Jana','Kira','Lyra','Mira','Nessa','Petra','Rowan','Sable','Tara','Ursa','Vesna','Willa','Yara','Zara','Aelith','Brienna','Celeste','Daphne','Emara','Fiona','Helena','Ilena','Lireth'],
    last:   ['Ashford','Blackwood','Coldwell','Drake','Ember','Frost','Gale','Holt','Ironside','Lake','Marsh','Nightshade','Oakheart','Pyre','Reed','Storm','Thornwood','Ulrick','Vale','Ward','Cross','Yarrow']
  },
  elf: {
    male:   ['Aelar','Caelum','Dalwyn','Faeron','Galadwen','Heliodor','Jareth','Kael','Laucian','Nailo','Opavin','Raevin','Thalion','Uelindra','Vaelindra','Xanathos','Zylvaris','Aramil','Berrian','Carric','Edhelmir','Galinndan','Ivellios','Mindartis','Paelias','Quarion','Riardon','Soveliss'],
    female: ['Adrie','Briavel','Elariel','Liriel','Maeven','Mialee','Naivara','Quelenna','Sariel','Sylvara','Thiala','Vaenna','Wyllow','Ylva','Zalaveth','Anastrianna','Caelynn','Drusilia','Enna','Felosial','Iefyr','Keyleth','Leshanna','Miyafusei','Naeris','Peregrine','Rhoanne','Shava'],
    last:   ['Amakiir','Brightcloak','Caelamont','Dawnglow','Faernlight','Galanodel','Holimion','Ilphelkiir','Liadon','Meliamne','Nailo','Rowanmantle','Siannodel','Taurentius','Xiloscient','Yeshyrir']
  },
  dwarf: {
    male:   ['Adrik','Baern','Darrak','Eberk','Fargrim','Gardain','Harbek','Kildrak','Morgran','Orsik','Oskar','Rangrim','Rurik','Taklinn','Thordin','Tordek','Ulfgar','Veit','Brottor','Bromm','Dolgrin','Gromnir','Hulfgar','Nordak','Thordak'],
    female: ['Ilde','Kathra','Kristryd','Mardred','Riswynn','Sannl','Torbera','Vistra','Gurdis','Liftrasa','Bardryn','Diesa','Eldeth','Finellen','Gunnloda','Hlin','Katra','Liwyl','Nora','Ruqonel','Shawna','Tithmel'],
    last:   ['Balderk','Dankil','Gorunn','Holderhek','Loderr','Lutgehr','Rumnaheim','Strakeln','Torunn','Ungart','Brawnanvil','Fireforge','Frostbeard','Hammerfall','Battlehammer','Ironfist','Shieldbreaker','Stoneshaper','Stormaxe']
  },
  halfling: {
    male:   ['Andry','Beau','Cade','Eldon','Garret','Lyle','Merric','Osborn','Roscoe','Wellby','Alain','Corrin','Dannad','Errich','Finnan','Harol','Lyle','Milo','Perrin','Reed','Wendel'],
    female: ['Callie','Kithri','Lavinia','Lidda','Nedda','Jessamine','Vani','Portia','Amaryllis','Chenna','Cora','Euphemia','Jillian','Lila','Mereille','Paela','Seraphina','Shaena','Trym','Winta'],
    last:   ['Brushgather','Goodbarrel','Greenbottle','High-hill','Hilltopple','Leagallow','Quarrypeak','Sandybanks','Tossaway','Underbough','Warmwater','Woolbridge']
  },
  tiefling: {
    male:   ['Akmenos','Amnon','Barakas','Damakos','Ekemon','Iados','Kairon','Leucis','Melech','Mortlach','Pelaios','Skamos','Therai','Zagernath','Xaran','Zovath','Crius','Pheleus','Riven','Thymos'],
    female: ['Akta','Bryseis','Criella','Damaia','Ea','Kallista','Lerissa','Makaria','Nemeia','Orianna','Phelaia','Rieta','Talanthe','Ulkira','Vivex','Zelaia','Chana','Farideh','Havilar','Lorcan'],
    last:   ['Art','Carrion','Chant','Craft','Death','Despair','Doom','Fate','Fear','Glory','Hope','Mourn','Pyre','Ruin','Scorn','Storm','Torment','Valor','Vengeance','Vice','Virtue','Void','Zeal']
  },
  orc: {
    male:   ['Grom','Thrall','Garrosh','Orgrim','Durotan','Kilrogg','Fenris','Grummsh','Nazgrel','Rend','Maim','Varok','Kargath','Tagar','Ulfgar','Grun','Hakkar','Morg','Ragash','Skullcleave','Throgg','Zug'],
    female: ['Baggi','Emen','Engong','Kansif','Myev','Neega','Ovak','Ownka','Shautha','Sutha','Vola','Volen','Yevelda','Zutha','Denda','Grula','Hegga','Keth','Nulara','Ovak'],
    last:   ['Bloodfist','Darkspear','Doomhammer','Frostwolf','Hellscream','Ironforge','Necksnapper','Skullcrusher','Warcry','Warsong','Blacktooth','Bonechewer','Dragonmaw','Thunderlord']
  },
  gnome: {
    male:   ['Alston','Alvyn','Boddynock','Brocc','Burgell','Dimble','Eldon','Erky','Fonkin','Frug','Gerbo','Gimble','Glim','Jebeddo','Kellen','Namfoodle','Orryn','Roondar','Seebo','Sindri','Warryn','Zook'],
    female: ['Bimpnottin','Breena','Caramip','Carlin','Donella','Duvamil','Ella','Ellyjobell','Ellywick','Lilli','Loopmottin','Lorilla','Mardnab','Nissa','Nyx','Oda','Orla','Roywyn','Shamil','Tana','Waywocket','Zanna'],
    last:   ['Beren','Daergel','Folkor','Garrick','Nackle','Murnig','Ningel','Raulnor','Scheppen','Timbers','Turen']
  },
  dragonborn: {
    male:   ['Arjhan','Balasar','Bharash','Donaar','Ghesh','Heskan','Kriv','Medrash','Mehen','Nadarr','Pandjed','Patrin','Rhogar','Shamash','Shedinn','Tarhun','Torinn'],
    female: ['Akra','Biri','Daar','Farideh','Harann','Havilar','Jheri','Kava','Korinn','Mishann','Nala','Perra','Raiann','Sora','Surina','Thava','Uadjit'],
    last:   ['Daardendrian','Delmirev','Fenkenkabradon','Kepeshkmolik','Kerrhylon','Myastan','Nemmonis','Norixius','Prexijandilin','Shestendeliath','Yarjerit']
  },
  aasimar: {
    male:   ['Adrie','Anomen','Edalar','Faenor','Heilig','Ilmar','Jaryn','Lheris','Oghren','Pelio','Respen','Toras','Uriah','Veladiel'],
    female: ['Celestine','Dawnbringer','Gloriel','Ilmara','Kira','Muriel','Nairi','Seraphina','Tora','Wren','Xandria','Yariel','Zea','Aeryn','Brielle'],
    last:   ['Brightmantle','Celestar','Dawnfire','Goldenwing','Holyhammer','Lightborn','Morningstar','Oathkeeper','Radiantblade','Silvercloak','Truelight']
  },
  yuan_ti: {
    male:   ['Sseth','Zehir','Merrshaulk','Thessalar','Sythiss','Zaltys','Vaerix','Xerindas'],
    female: ['Varae','Sibyl','Ssevaari','Yasstri','Zassath','Ssava','Vireth','Xaviress'],
    last:   ["of the Fang","the Malison","Pureblooded","Sseth-Touched","of Seven Fangs","Viper-Crowned","the Coiled"]
  }
};

function generateRandomName(race, customType, gender) {
  if (customType) return generateCreatureName(customType);
  const allRaces = Object.keys(NAME_PARTS);
  race = (race && race !== 'random') ? race : allRaces[Math.floor(Math.random()*5)];
  const parts = NAME_PARTS[race] || NAME_PARTS.human;

  // Pick first name based on gender
  let firstPool;
  if (gender === 'male' && parts.male)        firstPool = parts.male;
  else if (gender === 'female' && parts.female) firstPool = parts.female;
  else if (parts.male && parts.female)
    firstPool = Math.random() < 0.5 ? parts.male : parts.female;
  else firstPool = parts.first || parts.male || parts.female || ['Unknown'];

  const first = firstPool[Math.floor(Math.random()*firstPool.length)];
  const last  = parts.last[Math.floor(Math.random()*parts.last.length)];
  return first + ' ' + last;
}

function generateCreatureName(type) {
  const key = (type||'').toLowerCase().replace(/[^a-z]/g,'');
  const pools = {
    naga:      {v:['aa','ii','uu','ae','ei','ia'],c:['ss','sh','zz','kh','th','v','n','r'],p:['CVCV','VCVC','CVVCV']},
    dragon:    {v:['ar','or','ur','ix','ax'],c:['dr','kr','vr','thr','gr','xr','zr'],p:['CVCV','CVCVC','CVVCV']},
    demon:     {v:['az','oz','ix','ux','ek'],c:['g','k','z','x','gh','kh','tz'],p:['CVCVC','VCVCV','CVVCVC']},
    fey:       {v:['ae','ei','ia','iu','eo'],c:['l','r','n','s','f','v','ly','ny'],p:['VCVCV','CVCVC','VCVC']},
    undead:    {v:['a','e','i','o'],c:['m','r','th','sh','sk','kh','gr'],p:['CVCVC','VCVC','CVCV']},
    beholder:  {v:['az','ix','or','uu'],c:['xar','gaz','kth','bzz','rr'],p:['CVCVC','VCVC']},
    illithid:  {v:['il','ul','er','in'],c:['th','gr','mn','xl','zr','ng'],p:['VCVCV','CVCVC','VCVC']},
    kobold:    {v:['ik','ak','ok','uk'],c:['kr','sk','tz','xt','kk'],p:['CVCV','CVCVC']},
    githyanki: {v:['ith','ath','ur','ar'],c:['zr','kh','gh','th','mr'],p:['CVCVC','CVVCV','VCVC']},
    celestial: {v:['ia','ae','eu','ei'],c:['l','r','s','th','v','f','m'],p:['VCVCV','CVCVCV','VCVC']},
  };
  const pool = pools[key] || {
    v:['a','e','i','o','u','aa','ee'],
    c:['r','n','s','k','z','th','sh','kh','gr','vr'],
    p:['CVCVC','VCVCV','CVCV','CVVCV']
  };
  const pat = pool.p[Math.floor(Math.random()*pool.p.length)];
  const name = pat.split('').map(ch => {
    if(ch==='C') return pool.c[Math.floor(Math.random()*pool.c.length)];
    if(ch==='V') return pool.v[Math.floor(Math.random()*pool.v.length)];
    return ch;
  }).join('');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function showNameGenerator() {
  const existing = document.getElementById('namegen-modal');
  if (existing) { existing.remove(); return; }
  const races = ['human','elf','dwarf','halfling','tiefling','orc'];
  const m = document.createElement('div');
  m.id = 'namegen-modal';
  m.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:3000;background:linear-gradient(135deg,#2a1608,#1a0f06);border:1px solid rgba(212,175,55,0.4);border-radius:10px;padding:16px;max-width:340px;width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.8);max-height:70vh;overflow-y:auto;-webkit-overflow-scrolling:touch;';

  function buildContent() {
    let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
      '<div style="font-family:Cinzel,serif;font-size:13px;color:var(--gold);letter-spacing:0.1em;">🎲 NAME GENERATOR</div>' +
      '<button id="ng-close" style="background:none;border:none;color:var(--text-dim);font-size:18px;cursor:pointer;padding:0 4px;">✕</button>' +
    '</div>';
    races.forEach(race => {
      const names = Array.from({length:4}, () => generateRandomName(race));
      html += '<div style="margin-bottom:10px;">' +
        '<div style="font-size:10px;font-family:Cinzel,serif;letter-spacing:0.15em;color:var(--text-dim);text-transform:uppercase;margin-bottom:5px;">' + race + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
      names.forEach(n => {
        const btn = document.createElement('button');
        btn.textContent = n;
        btn.style.cssText = 'background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:4px;padding:4px 8px;color:var(--parchment);font-size:12px;cursor:pointer;';
        btn.addEventListener('click', () => {
          if (navigator.clipboard) navigator.clipboard.writeText(n).catch(()=>{});
          showToast('📋 Copied: ' + n, 'success');
        });
        html += btn.outerHTML;
      });
      html += '</div></div>';
    });
    html += '<button id="ng-regen" style="width:100%;padding:8px;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:4px;color:var(--gold);font-family:Cinzel,serif;font-size:11px;cursor:pointer;margin-top:4px;letter-spacing:0.08em;">🎲 REGENERATE ALL</button>';
    return html;
  }

  m.innerHTML = buildContent();
  document.body.appendChild(m);

  m.querySelector('#ng-close').addEventListener('click', () => m.remove());
  m.querySelector('#ng-regen').addEventListener('click', () => { m.innerHTML = buildContent(); m.querySelector('#ng-close').addEventListener('click',()=>m.remove()); m.querySelector('#ng-regen').addEventListener('click',()=>{ m.remove(); showNameGenerator(); }); });

  // Re-attach copy buttons
  m.querySelectorAll('button:not(#ng-close):not(#ng-regen)').forEach(btn => {
    btn.addEventListener('click', () => {
      if (navigator.clipboard) navigator.clipboard.writeText(btn.textContent).catch(()=>{});
      showToast('📋 Copied: ' + btn.textContent, 'success');
    });
  });
}

function refreshNamePanel() {
  // Show/hide custom input based on race selection
  const raceEl = document.getElementById('namegen-race');
  const customRow = document.getElementById('namegen-custom-row');
  if (!raceEl) return;
  if (customRow) customRow.style.display = raceEl.value === 'other' ? 'block' : 'none';
}

function rollOneName() {
  const raceEl   = document.getElementById('namegen-race');
  const genderEl = document.getElementById('namegen-gender');
  const alignEl  = document.getElementById('namegen-align');
  const customInput = document.getElementById('namegen-custom-type');
  const display  = document.getElementById('namegen-result-name');
  const sub      = document.getElementById('namegen-result-sub');
  if (!display) return;

  const isCustom  = raceEl && raceEl.value === 'other';
  const customType = isCustom ? (customInput ? customInput.value.trim() || 'other' : 'other') : null;
  const race  = (!isCustom && raceEl && raceEl.value !== 'random') ? raceEl.value : null;
  const gender = genderEl ? genderEl.value : 'any';
  const align  = alignEl  ? alignEl.value  : 'any';

  const name = generateRandomName(race, customType, gender);

  // Build subtitle: race · gender · alignment
  const raceLbl   = race ? race.replace('_','-') : (isCustom ? (customType||'creature') : 'random');
  const genderLbl = gender === 'any' ? '' : gender;
  const alignLbl  = align  === 'any' ? '' : align;
  const subParts  = [raceLbl, genderLbl, alignLbl].filter(Boolean);

  display.textContent = name;
  display.style.animation = 'none';
  void display.offsetWidth;
  display.style.animation = 'fadeIn 0.25s ease';
  if (sub) sub.textContent = subParts.join(' · ');

  // Copy to clipboard silently
  if (navigator.clipboard) navigator.clipboard.writeText(name).catch(()=>{});
}

function copyName(name) {
  if (navigator.clipboard) navigator.clipboard.writeText(name).catch(()=>{});
  // Also fill the NPC story hook with the name as a hint
  const hook = document.getElementById('npc-gen-hook');
  showToast('📋 ' + name, 'success');
}
