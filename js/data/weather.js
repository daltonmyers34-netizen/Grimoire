let worldTotalHours = 6; // start at dawn, day 1
let worldSeason = 0; // 0=spring,1=summer,2=autumn,3=winter

const TIME_OF_DAY = [
  { label:'Deep Night', hours:[0,4],   icon:'🌑' },
  { label:'Pre-Dawn',   hours:[4,6],   icon:'🌒' },
  { label:'Dawn',       hours:[6,8],   icon:'🌅' },
  { label:'Morning',    hours:[8,12],  icon:'🌤' },
  { label:'Midday',     hours:[12,14], icon:'☀️' },
  { label:'Afternoon',  hours:[14,18], icon:'🌤' },
  { label:'Evening',    hours:[18,20], icon:'🌇' },
  { label:'Dusk',       hours:[20,22], icon:'🌆' },
  { label:'Night',      hours:[22,24], icon:'🌃' },
];

const MOON_PHASES = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
const MOON_NAMES  = ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
const SEASONS = ['Spring','Summer','Autumn','Winter'];

// Weather tables
const WEATHER_TABLES = window.WEATHER_TABLES = {
  temperate: [
    { icon:'☀️', desc:'Clear and Sunny',       temp:[60,80],  wind:'Calm',                visibility:'Crystal clear skies, perfect for travel and navigation.',                  effects:'' },
    { icon:'⛅', desc:'Partly Cloudy',          temp:[55,75],  wind:'Light breeze',         visibility:'Good visibility with comfortable travelling conditions.',                   effects:'' },
    { icon:'🌥', desc:'Overcast',               temp:[50,65],  wind:'Moderate wind',        visibility:'Grey skies. No rain yet, but feels heavy.',                               effects:'' },
    { icon:'🌧', desc:'Light Rain',             temp:[45,60],  wind:'Steady wind',          visibility:'Drizzle reduces visibility to 300ft. Roads become muddy.',                effects:'Disadvantage on Perception (sight). Torches extinguish in wind.' },
    { icon:'⛈', desc:'Thunderstorm',           temp:[45,60],  wind:'Strong gusts',         visibility:'Lightning illuminates the sky every 1d6 minutes.',                       effects:'Ranged attacks at disadvantage. Flying is dangerous (DC 12 Str save). Risk of lightning (rare).' },
    { icon:'❄️', desc:'Snow Flurries',          temp:[25,35],  wind:'Biting wind',          visibility:'Light snow reduces visibility to 150ft.',                                 effects:'Difficult terrain on paths. Constitution saves vs cold if exposed without gear.' },
  ],
  arctic: [
    { icon:'🌨', desc:'Heavy Snowfall',         temp:[-10,20], wind:'Howling blizzard',     visibility:'Visibility reduced to 30ft. All terrain is difficult.',                    effects:'DC 15 Con save each hour or gain 1 level of exhaustion. Fires require shelter.' },
    { icon:'❄️', desc:'Frozen and Clear',       temp:[-20,0],  wind:'Bitter cold',          visibility:'Eerily clear, every sound carries.',                                      effects:'Unprotected creatures must save vs cold each hour. Ice terrain — difficult and dangerous.' },
    { icon:'🌬', desc:'Whiteout Blizzard',      temp:[-30,-5], wind:'Violent storm',        visibility:'Zero visibility beyond 10ft. Navigation impossible without magic.',       effects:'DC 18 Con save each hour, heavy difficult terrain, ranged attacks impossible.' },
  ],
  desert: [
    { icon:'☀️', desc:'Blazing and Arid',       temp:[95,120], wind:'Scorching wind',       visibility:'Heat shimmer causes mirages past 100ft.',                                 effects:'DC 13 Con save each hour in full sun or take 1d4 fire damage. Water consumption doubled.' },
    { icon:'💨', desc:'Sandstorm',              temp:[80,100], wind:'Howling sand',         visibility:'Reduced to 15ft. Exposed skin is abraded.',                              effects:'Disadvantage on all attacks, Perception. 1d4 slashing damage each minute unprotected.' },
    { icon:'🌅', desc:'Cool Desert Morning',   temp:[55,75],  wind:'Light breeze',         visibility:'Perfect clarity before the heat builds.',                                 effects:'Best travel window before midday heat.' },
  ],
  tropical: [
    { icon:'🌦', desc:'Tropical Shower',       temp:[75,90],  wind:'Warm breeze',          visibility:'Short intense rain, over in minutes.',                                    effects:'Briefly difficult terrain on stone or wood. Stealth checks improved in rain.' },
    { icon:'🌧', desc:'Monsoon Rain',          temp:[70,85],  wind:'Gusting',              visibility:'Heavy rain to 100ft. Flash flood risk in valleys.',                      effects:'Disadvantage on fire attacks. Flying creatures grounded. Survival DC 14 to navigate.' },
    { icon:'☀️', desc:'Humid and Sweltering', temp:[85,100], wind:'Oppressive stillness', visibility:'Clear but haze in the distance.',                                         effects:'Exhaustion saves after strenuous activity (DC 12 Con after 1hr combat/travel).' },
  ],
  mountain: [
    { icon:'💨', desc:'Bitter Mountain Wind', temp:[30,50],  wind:'Howling alpine gust',  visibility:'Gusts can knock creatures prone (DC 12 Str).',                            effects:'Ranged attacks have disadvantage. Flying creatures must succeed DC 14 Str saves.' },
    { icon:'🌩', desc:'Mountain Thunderstorm',temp:[35,50],  wind:'Rolling thunder',      visibility:'Storm wraps around peaks, lightning strikes ridgelines.',                 effects:'Metal armor wearers attract lightning (DM discretion). DC 10 Athletics to climb.' },
    { icon:'🌨', desc:'Snow Above the Pass',  temp:[20,35],  wind:'Cutting wind',         visibility:'Pass snow reduces visibility to 60ft.',                                   effects:'Mountain passage may be blocked. Snow bridges are treacherous.' },
    { icon:'☀️', desc:'Crystal Alpine Day',  temp:[40,60],  wind:'Thin calm air',        visibility:'Extraordinary visibility — can see 20 miles on clear peaks.',             effects:'Bright sun on snow: unprotected eyes risk snow blindness (DC 12 save).' },
  ],
  coast: [
    { icon:'🌊', desc:'Stormy Seas',           temp:[50,65],  wind:'Force 8 gale',         visibility:'Waves crash the shore, salt spray everywhere.',                           effects:'Sea travel impossible for small vessels. Coastal roads slippery — half speed.' },
    { icon:'🌫', desc:'Thick Sea Fog',         temp:[50,65],  wind:'Near calm',            visibility:'Reduced to 20ft. Ships risk grounding. Very eerie.',                     effects:'Disadvantage on sight-based Perception. Navigation by sight impossible.' },
    { icon:'🌤', desc:'Fair Sailing Wind',     temp:[60,75],  wind:'Fresh westerly',       visibility:'Good. Perfect for sailing travel.',                                       effects:'Sailing ships double speed downwind. A perfect day on the water.' },
  ]
};
