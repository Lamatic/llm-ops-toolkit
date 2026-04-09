# Contributing to LLM Ops Toolkit

Thank you for taking the time to contribute! 🎉

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/Lamatic/llm-ops-toolkit/issues) before opening a new one.
2. Include a clear title, steps to reproduce, expected behaviour, and actual behaviour.
3. Add browser/OS information if it's a visual or interaction bug.

### Suggesting Features

Open an issue with the `enhancement` label and describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

### Submitting Pull Requests

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** — the entire toolkit lives in three files:
   - `index.html` — HTML structure
   - `app.js` — Application logic
   - `style.css` — Styles (dark + light themes)

3. **Test locally** by opening `index.html` in a browser. Check:
   - Both dark and light modes
   - All four tabs (Status, Simulator, Calculator, Audit)
   - Mobile layout (≤ 768 px viewport)

4. **Commit** with a clear message:
   ```bash
   git commit -m "feat: add <short description>"
   ```

5. **Open a pull request** against `main` with a description of what changed and why.

## Code Style

- No external build tools — keep it vanilla HTML/CSS/JS.
- Follow the existing comment structure (`// === Section ===`).
- CSS variables are defined in `:root`; add new ones there if needed.
- Use `var(--token)` for colours; do not hard-code hex values.

## Commit Message Convention

```
feat:     New feature
fix:      Bug fix
style:    CSS/UI changes with no logic change
refactor: Code restructure without feature change
docs:     Documentation only
chore:    Dependency or config updates
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
