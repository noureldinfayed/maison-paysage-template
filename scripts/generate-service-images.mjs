import fs from 'fs';
import path from 'path';
import https from 'https';

const TOKEN = process.env.REPLICATE_API_TOKEN;

const CARDS = [
  {
    file: 'service-01.jpg',
    prompt:
      'Luxury French villa limestone terrace, calcaire stone paving, hand-cut natural stone steps, Mediterranean garden backdrop, warm golden hour sunlight, high-end architectural photography, no people',
  },
  {
    file: 'service-02.jpg',
    prompt:
      'Lush French landscape garden design, curated Mediterranean plantations, sculptural olive trees, lavender massifs, manicured hedges, soft diffused daylight, editorial garden photography, no people',
  },
  {
    file: 'service-03.jpg',
    prompt:
      'Luxury outdoor garden lighting at night, low-voltage warm amber spotlights on trees and stone walls, French villa exterior, moody atmospheric glow, architectural photography, no people',
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
      aspect_ratio: '16:9',
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

console.log('Generating 3 service images via Replicate Flux Schnell…\n');
await Promise.all(CARDS.map(generateOne));
console.log('\nAll done.');
