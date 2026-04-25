import fs from 'fs';
import path from 'path';
import https from 'https';

const TOKEN = process.env.REPLICATE_API_TOKEN;

const CARDS = [
  {
    file: 'project-01.jpg',
    prompt:
      'Luxury French villa private terrace, limestone calcaire paving, Mediterranean garden, olive trees, lavender, stone steps, warm golden hour light, high-end architectural photography, no people',
  },
  {
    file: 'project-02.jpg',
    prompt:
      'Contemporary French maison patio, clean minimalist lines, curated plantations, soft accent lighting at dusk, luxury outdoor space, editorial real-estate photography, no people',
  },
  {
    file: 'project-03.jpg',
    prompt:
      'French wine domain estate, gravel allées lined with clipped boxwood hedges, ornamental reflective basin, château in background, overcast diffused light, landscape photography, no people',
  },
  {
    file: 'project-04.jpg',
    prompt:
      'French Riviera seaside luxury residence, exotic hardwood deck, coastal dune vegetation, private beach view, Mediterranean blue water, warm afternoon light, architectural photography, no people',
  },
  {
    file: 'project-05.jpg',
    prompt:
      'Parisian penthouse rooftop terrace, mineral slate design, elegant container gardens, Paris city skyline at golden hour, luxury outdoor furniture, aerial close-up photography, no people',
  },
];

const OUT_DIR = path.resolve('public/images');

async function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Token ${TOKEN}` } }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve(JSON.parse(raw)));
    }).on('error', reject);
  });
}

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

async function poll(id) {
  while (true) {
    const result = await get(`https://api.replicate.com/v1/predictions/${id}`);
    if (result.status === 'succeeded') return result.output[0];
    if (result.status === 'failed') throw new Error(`Prediction ${id} failed: ${result.error}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function generateOne(card) {
  console.log(`▶ Starting: ${card.file}`);
  const pred = await post('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    input: {
      prompt: card.prompt,
      aspect_ratio: '3:2',
      output_format: 'jpg',
      output_quality: 90,
      num_outputs: 1,
    },
  });
  const imageUrl = await poll(pred.id);
  const dest = path.join(OUT_DIR, card.file);
  await download(imageUrl, dest);
  console.log(`✓ Saved: ${dest}`);
}

console.log('Generating 5 project images via Replicate Flux Schnell…\n');
await Promise.all(CARDS.map(generateOne));
console.log('\nAll done.');
