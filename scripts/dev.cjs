const { spawn } = require('node:child_process');
const { existsSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const root = path.join(__dirname, '..');
const children = [];
let stopping = false;
function run(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', windowsHide: true, ...options });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  return child;
}
function waitProcess(child) {
  return new Promise((resolve, reject) => child.once('exit', code => code === 0 ? resolve() : reject(new Error('Command failed with code ' + code))));
}
function portReady(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exitCode = code;
}
async function main() {
  if (!process.env.MONGO_URL && !(await portReady(27027))) {
    const binary = process.env.MONGOD_PATH || (process.platform === 'win32' ? 'C:/Program Files/MongoDB/Server/8.0/bin/mongod.exe' : 'mongod');
    if (process.platform === 'win32' && !existsSync(binary)) throw new Error('MongoDB not found. Set MONGO_URL to your database or MONGOD_PATH to mongod.');
    const runtime = path.resolve(process.env.SECONDCHANCE_RUNTIME || path.join(root, '.runtime'));
    mkdirSync(path.join(runtime, 'mongo'), { recursive: true });
    const mongo = run(binary, ['--dbpath', path.join(runtime, 'mongo'), '--bind_ip', '127.0.0.1', '--port', '27027', '--logpath', path.join(runtime, 'mongo.log')]);
    let ready = false;
    for (let i = 0; i < 40; i++) {
      if (mongo.exitCode !== null) throw new Error('MongoDB stopped; inspect .runtime/mongo.log.');
      if (await portReady(27027)) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error('MongoDB did not start.');
  }
  if (process.argv.includes('--database-only')) { console.log('Local MongoDB is ready on port 27027.'); return; }
  await waitProcess(run(process.execPath, ['secondChance-backend/util/import-mongo/index.js']));
  if (!existsSync(path.join(root, 'secondChance-frontend/dist/index.html'))) {
    await waitProcess(run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', 'secondChance-frontend']));
  }
  const server = run(process.execPath, ['secondChance-backend/app.js']);
  server.once('exit', code => stop(code || 0));
}
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
main().catch(error => { console.error(error.message); stop(1); });
