const { spawnSync } = require('node:child_process');
const path = require('node:path');
const stories = require('../docs/user-stories.json');
const repo = process.argv[2];
if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Usage: npm run issues -- USERNAME/REPOSITORY');
function gh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true });
  if (result.error) throw new Error('GitHub CLI (gh) is required. Install it from cli.github.com, sign in, then retry.');
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
const actual = JSON.parse(gh(['repo', 'view', repo, '--json', 'nameWithOwner,isPrivate']));
if (actual.isPrivate) throw new Error('The assignment requires a public repository.');
const labels = JSON.parse(gh(['label', 'list', '--repo', repo, '--limit', '100', '--json', 'name']));
for (const [name, color] of [['new','0E8A16'],['icebox','BFDADC'],['technical debt','D4C5F9'],['backlog','FBCA04']]) {
  if (!labels.some(label => label.name === name)) gh(['label','create',name,'--color',color,'--repo',repo]);
}
const existing = JSON.parse(gh(['issue','list','--repo',repo,'--state','all','--limit','1000','--json','title,url']));
for (const story of stories) {
  const found = existing.find(issue => issue.title === story.title);
  if (found) { console.log('Already exists: ' + found.url); continue; }
  console.log(gh(['issue','create','--repo',repo,'--title',story.title,'--label',story.label,
    '--body-file',path.join(__dirname,'..',story.file)]));
}
console.log('Open https://github.com/' + repo + '/issues and capture userstories.png with at least 8 labeled issues visible.');
