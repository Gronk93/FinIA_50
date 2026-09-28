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

- Keep FinIA 50 financial data in a standalone mock module, not browser storage or Cloud, because PRD-01 validates layout before financial persistence.
- Protect private FinIA screens under the authenticated route layout and keep access/recovery public, because private screens require a verified session.
- Use semantic theme tokens for dark and light appearances, because financial status colors must remain meaningful in either mode.
