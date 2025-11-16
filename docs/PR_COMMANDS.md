# Create PR for branch `tw-mig` (commands)

This file contains exact commands you can run locally to create the PR. References to files are provided so you can copy/paste the PR body from the prepared template.

- PR body template: [`docs/PR_TW_MIG_TEMPLATE.md`](docs/PR_TW_MIG_TEMPLATE.md:1)  
- Changes to review: [`assets/js/modules/modals.js`](assets/js/modules/modals.js:1), [`assets/css/tailwind-compat.css`](assets/css/tailwind-compat.css:1)  
- Local baseline screenshots: `./screens/baseline/` (not committed by default because `screens` is ignored)

---

Prerequisites
- Git configured with remote `origin` pointing to the repository (e.g. `https://github.com/Kyuzan0/Filemanager.git`)
- (Optional) GitHub CLI (`gh`) if you want to create the PR from the terminal

Verify remote:
```
git remote get-url origin
```

1) (Optional) Force-add screenshots into the branch (only if you want images inside the PR)
- Note: `screens/` is ignored by .gitignore. Use `-f` to add.
```
git checkout tw-mig
git add -f screens/baseline
git commit -m "chore: add visual baseline screenshots"
git push origin tw-mig
```

2) Ensure branch is up-to-date and pushed
```
git checkout tw-mig
git pull --rebase origin tw-mig
git push origin tw-mig
```

3) Create the PR using GitHub CLI (recommended if `gh` is installed)
- This will create a PR with the body taken from the template file:
```
gh pr create --base main --head tw-mig --title "chore(tw-mig): modal fixes + tailwind compat tweaks (visual baseline captured)" --body-file docs/PR_TW_MIG_TEMPLATE.md
```
- If you prefer the interactive flow:
```
gh pr create --base main --head tw-mig --fill
```
(Using `--fill` will use commit messages / PR template if present.)

4) If `gh` is not available, open the PR in GitHub web UI:
- Open this compare URL in your browser and click "Create pull request":
  https://github.com/Kyuzan0/Filemanager/compare/main...tw-mig?expand=1
- Copy/paste the PR body from:
  [`docs/PR_TW_MIG_TEMPLATE.md`](docs/PR_TW_MIG_TEMPLATE.md:1)

5) Suggested reviewers / labels (optional)
- Add reviewers who worked on the Tailwind migration
- Tag with labels: "chore", "visual-regression", "accessibility"

6) Post-PR checklist
- Link baseline screenshots (or state their local path) in PR description
- Add short before/after notes if you later attach "after" screenshots
- Request a visual review and accessibility check (tab navigation, focus trapping)

Troubleshooting notes
- If `gh` returns `'gh' is not recognized`, install GitHub CLI (https://cli.github.com/) or create the PR via web UI.
- If `git add -f screens/baseline` fails, double-check `.gitignore` entries and confirm you want to override them.
- If your remote is different from `https://github.com/Kyuzan0/Filemanager.git`, replace the compare URL host/owner/repo accordingly.

---

If you want, I can now:
- Propose 2–3 targeted apply_diff patches (modal spacing, focus contrast, backdrop timing) and apply them here; or
- Prepare the exact PR body text with a checklist expanded (I already wrote the template at [`docs/PR_TW_MIG_TEMPLATE.md`](docs/PR_TW_MIG_TEMPLATE.md:1)).