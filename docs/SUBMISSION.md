# Submission checklist

Use links to YOUR public repository after pushing. GitHub file links have this form:
https://github.com/USERNAME/REPOSITORY/blob/main/PATH

| Question | What to submit |
| --- | --- |
| 1 | File URL: user-story.md |
| 2 | Actual GitHub Issues screenshot named userstories.png, showing at least eight issues and their labels |
| 3 | Contents of evidence/inserted_items |
| 4 | File URL: secondChance-backend/models/db.js |
| 5 | File URL: secondChance-backend/routes/secondChanceItemsRoutes.js |
| 6 | File URL: secondChance-backend/routes/searchRoutes.js |
| 7 | File URL: secondChance-backend/app.js |
| 8 | File URL: sentiment/index.js |
| 9 | File URL: secondChance-backend/routes/authRoutes.js |
| 10 | Actual deployed_landingpage.png: deployed URL in the browser address bar, title, tagline, and Get Started visible together |
| 11 | Contents of evidence/mainpage |
| 12 | Contents of evidence/register |
| 13 | Contents of evidence/login |
| 14 | Contents of evidence/item_detail |
| 15 | Contents of evidence/search_item |
| 16 | Real successful GitHub Actions log in evidence/CICD, after the workflow has run |

## Issues

Eight complete story drafts are in docs/user-stories/. Titles and labels are in docs/user-stories.json.
Create them manually in GitHub Issues, or use the script after installing the official GitHub CLI and signing in:

```text
gh auth login
npm run issues -- USERNAME/REPOSITORY
```

The script creates missing labels and skips existing issues with matching titles.

## Actions

Push code, open the repository's Actions tab, and wait for SecondChance CI to succeed.
Then, with GitHub CLI:

```text
node scripts/collect-cicd.cjs USERNAME/REPOSITORY
```

This checks the actual workflow status and current commit before saving evidence/CICD. A local test report is not a GitHub Actions log.

## Refresh API evidence

Keep the API and MongoDB running, then:

```text
node scripts/evidence.cjs --seed
npm run evidence
```

For a deployed API, set EVIDENCE_BASE_URL to its HTTPS URL before running npm run evidence.
This registers a disposable example.invalid demonstration account. Token values are redacted in the saved responses; other results are unchanged.
