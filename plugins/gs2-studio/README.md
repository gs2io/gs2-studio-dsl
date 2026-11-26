# gs2-studio agent skill

An Agent Skill that lets a coding agent find the GS2 Studio app installed on the machine and
follow GS2 Studio's own `guide` to create a project, add packages and start the package DSL.
The workflow itself comes from the installed GS2 Studio, so the skill does not change with each
release.

Requires GS2 Studio 2026.11.17 or later, launched once after installing.

## Claude Code

```
/plugin marketplace add gs2io/gs2-studio-dsl
/plugin install gs2-studio@gs2-studio-dsl
```

## Other agents

Copy `skills/gs2-studio/` into the agent's skills directory (for example `.agents/skills/gs2-studio/`).
The `SKILL.md` follows the Agent Skills format.
