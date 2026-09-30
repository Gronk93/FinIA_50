<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Lovable Cloud is the single source of truth for finances (Dashboard, Mis Finanzas, profile); finia-data.ts only feeds still-demo modules, because PRD-02 requires real, per-user persisted data.
- Keep 50/30/20 calculations in the pure src/lib/budget-engine.ts (tested with vitest); month close/reopen runs as DB functions, because results must be deterministic and traceable.
- Protect private FinIA screens under the authenticated route layout and keep access/recovery public, because private screens require a verified session.
- Use semantic theme tokens for dark and light appearances, because financial status colors must remain meaningful in either mode.
