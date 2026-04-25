import fs from 'fs';
import path from 'path';
import https from 'https';

const TOKEN = process.env.REPLICATE_API_TOKEN;

const CARDS = [
  {
    file: 'process-01.jpg',
    prompt: 'Landscape architect studying outdoor terrain, measuring land slope, taking notes on clipboard, French villa garden, golden hour, documentary photography, no faces visible',
  },
  {
    file: 'process-02.jpg',
    prompt: 'Luxury natural stone material selection, samples of limestone calcaire granite travertine arranged on table, warm studio light, close-up architectural detail photography',
  },
  {
    file: 'process-03.jpg',
    prompt: 'Skilled craftsmen laying natural stone paving on a luxury French villa terrace, precise handwork, construction in progress, warm sunlight, documentary photography, no faces visible',
  },
  {
    file: 'process-04.jpg',
    prompt: 'Seasonal garden maintenance, careful pruning of Mediterranean plants and hedges in a luxury French estate garden, lush green, soft morning light, documentary photography, no faces',
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
      if (res.statusCode === 301 || res.statusCode === 302) {
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
    if (result.status === 'failed') throw new Error(`Failed: ${result.error}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function generateOne(card) {
  console.log(`▶ Starting: ${card.file}`);
  const pred = await post('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    input: {
      prompt: card.prompt,
      aspect_ratio: '4:3',
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

console.log('Generating 4 process images via Replicate Flux Schnell…\n');
await Promise.all(CARDS.map(generateOne));
console.log('\nAll done.');
