# Contributing

## Workflow
1. Create a branch from `main`.
2. Keep commits focused and use Conventional Commits when possible:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `refactor:` structural changes without behavior changes
   - `test:` tests
   - `chore:` maintenance
3. Open a pull request with clear context and testing notes.

## Local Quality Gate
Before pushing:
```bash
make lint
make typecheck
make test
make build
```

## Coding Rules
- Keep files small and focused by responsibility.
- Comments must be in English and explain **why**.
- Reuse shared schemas from `packages/shared-types`.
- Keep user-facing copy localized in `packages/content/data/translations.*.json`.
- Keep legal content updates synchronized in both EN and FR files.

## Content Updates
- Artists: `packages/content/data/artists.json`
- Releases: `packages/content/data/releases.json`
- Label metadata: `packages/content/data/label.json`
- Translations: `packages/content/data/translations.en.json` and `translations.fr.json`
- Legal pages: `packages/content/data/legal.en.json` and `legal.fr.json`

## Environment and Secrets
- Never commit real secrets.
- Use `.env.example` as template.
- Use `make check-env` before local runs.

## Pull Request Checklist
- [ ] Scope is clear and minimal.
- [ ] Tests updated or added for behavioral changes.
- [ ] README/CONTRIBUTING updated if workflow changed.
- [ ] No sensitive data committed.
