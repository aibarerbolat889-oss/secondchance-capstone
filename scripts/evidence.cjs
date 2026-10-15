const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const root = path.join(__dirname, '..');
const folder = path.join(root, 'evidence');
fs.mkdirSync(folder, { recursive: true });
const base = (process.env.EVIDENCE_BASE_URL || 'http://localhost:3060').replace(/\/$/, '');
if (!/^https?:\/\//.test(base)) throw new Error('EVIDENCE_BASE_URL must be an HTTP(S) URL.');
function save(name, content) { fs.writeFileSync(path.join(folder, name), content + '\n'); console.log('Saved evidence/' + name); }
function curl(name, route, data, expected = 200) {
  const args = ['--silent', '--show-error', '--include', '--max-time', '20'];
  if (data) args.push('--header', 'Content-Type: application/json', '--data-binary', '@-');
  args.push(base + route);
  const result = spawnSync(process.platform === 'win32' ? 'curl.exe' : 'curl', args, { encoding: 'utf8', input: data ? JSON.stringify(data) : undefined, windowsHide: true });
  if (result.error || result.status !== 0) throw result.error || new Error(result.stderr);
  const status = Number(result.stdout.match(/^HTTP\/\S+ (\d+)/)?.[1]);
  if (status !== expected) throw new Error(name + ' returned HTTP ' + status + ': ' + result.stdout);
  const safe = result.stdout.replace(/("authtoken"\s*:\s*")[^"]+("\s*[,}])/g, '$1[REDACTED: session token]$2');
  // Display the actual curl operation in a portable, readable shell form.
  const command = 'curl -i ' + (data ? "--json '" + JSON.stringify(data) + "' " : '') + '"' + base + route + '"';
  save(name, command + '\n\n' + safe + '\nCaptured at: ' + new Date().toISOString() + '\nJWT values are redacted; other response data is unchanged.');
}
if (process.argv.includes('--seed')) {
  const seeded = spawnSync(process.execPath, ['secondChance-backend/util/import-mongo/index.js'], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (seeded.status !== 0) throw new Error(seeded.stderr);
  const report = JSON.parse(seeded.stdout);
  if (report.insertedCount === 16 || !fs.existsSync(path.join(folder, 'inserted_items'))) {
    save('inserted_items', 'Command: npm run seed\n\n' + seeded.stdout + '\nCaptured at: ' + new Date().toISOString());
  }
  console.log('MongoDB seed documents: ' + report.totalSeedDocuments);
  process.exit(0);
}
const demo = { firstName: 'Demo', lastName: 'Learner', email: 'evidence-' + Date.now() + '@example.invalid', password: 'Demo-' + randomUUID() };
curl('mainpage', '/api/secondchance/items');
curl('register', '/api/auth/register', demo, 201);
curl('login', '/api/auth/login', { email: demo.email, password: demo.password });
curl('item_detail', '/api/secondchance/items/875');
curl('search_item', '/api/secondchance/search?category=Office&name=desk&age_years=3');
console.log('Only local API evidence was generated. GitHub Actions and deployed-site evidence are separate.');
