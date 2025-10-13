const fs = require('fs');
const path = require('path');

function normalize(s) {
  if (!s) return '';
  let r = String(s).toLowerCase();
  r = r.replace(/<[^>]+>/g, ' ');
  r = r.replace(/^pn\s+/i, '');
  r = r.replace(/^núcleo\s+/u, '');
  r = r.replace(/\([^)]*\)/g, '');
  r = r.replace(/\b(parque nacional|parque nacional marino|reserva nacional|sector|núcleo|área protegida|provincia)\b/gu, '');
  r = r.replace(/[\/\|]/g, ' ');
  r = r.replace(/[^a-z0-9\s]/gu, ' ');
  r = r.replace(/\s+/g, ' ').trim();
  // remove diacritics
  r = r.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return r;
}

// Canonical lists provided by the user
const mapping = {
  'noa': [
    'pn baritu','el rey','los cardones','aconquija','calilegua','copo'
  ],
  'nea': [
    'iguazu','chaco','el impenetrable','laguna el palmar','ibera','mburucuya','rio pilcomayo'
  ],
  'centro': [
    'quebrada del condorito','traslasierra','ansenuza','el leoncito','san guillermo','sierra de las quijadas','talampaya','islas santa de fe','pre-delta','el palmar','ciervo de los pantanos','campos del tuyu'
  ],
  'patagonia': [
    'lanin','laguna blanca','los arrayanes','nahuel huapi','islote lobos','lihue calel','los alerces','lago puelo'
  ],
  'patagonia-austral': [
    'los glaciares','perito moreno','patagonia','bosques petrificados del jaramillo','monte leon','tierra del fuego'
  ],
  'mar-argentino': []
};

// invert mapping for quick lookup
const lookup = {};
Object.keys(mapping).forEach(rid => {
  mapping[rid].forEach(n => {
    lookup[normalize(n)] = rid;
  });
});

const filePath = path.join(__dirname, '..', 'public', 'parques-argentina.geojson');
const backupPath = filePath + '.bak';
if (!fs.existsSync(filePath)) {
  console.error('GeoJSON not found at', filePath);
  process.exit(1);
}

const raw = fs.readFileSync(filePath, 'utf8');
let geo = null;
try {
  geo = JSON.parse(raw);
} catch (e) {
  console.error('Error parsing GeoJSON:', e);
  process.exit(1);
}

// backup
fs.writeFileSync(backupPath, JSON.stringify(geo, null, 2), 'utf8');

let changed = 0;
(geo.features || []).forEach(f => {
  const name = f.properties?.name || f.properties?.ROTULO || f.properties?.Name || '';
  const key = normalize(name);
  if (lookup[key]) {
    const region = lookup[key];
    if (f.properties.region !== region) {
      f.properties.region = region;
      // do not override existing category; but if missing, set it to region
      if (!f.properties.category) f.properties.category = region;
      f.properties.__region_assigned = true;
      changed++;
    }
  }
});

if (changed === 0) console.log('No features modified (no matches found).');
else console.log('Modified features:', changed);

fs.writeFileSync(filePath, JSON.stringify(geo, null, 2), 'utf8');
console.log('Wrote updated GeoJSON and backup at', backupPath);

process.exit(0);
