const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const repo = process.argv[2];
if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Usage: node scripts/collect-cicd.cjs USERNAME/REPOSITORY');
function command(exe,args) {
  const result = spawnSync(exe,args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024});
  if (result.error || result.status !== 0) throw result.error || new Error(result.stderr);
  return result.stdout.trim();
}
const sha = command('git',['-C',root,'rev-parse','HEAD']);
const runs = JSON.parse(command('gh',['run','list','--repo',repo,'--workflow','ci.yml','--commit',sha,'--limit','1','--json','databaseId,status,conclusion,headSha,url']));
if (!runs.length) throw new Error('No workflow run exists for the current commit. Push it to GitHub first.');
const run = runs[0];
if (run.status !== 'completed' || run.conclusion !== 'success') throw new Error('Workflow is not successful yet: ' + run.url);
const log = command('gh',['run','view',String(run.databaseId),'--repo',repo,'--log']);
fs.mkdirSync(path.join(root,'evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'evidence','CICD'),'Run: '+run.url+'\nCommit: '+sha+'\nStatus: success\n\n'+log+'\n');
console.log('Saved verified GitHub Actions output to evidence/CICD');
