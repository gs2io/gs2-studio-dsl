---
name: gs2-studio
description: Sets up and builds a GS2 game backend with the GS2 Studio app installed on this machine - creating a GS2 Studio project, choosing and adding its packages (stamina, currency, quests, ...), starting the package DSL, and building it. Use when the user mentions GS2 Studio or GS2, or asks to create a game backend, a GS2 project, or a GS2 Studio package DSL. Not needed inside a DSL directory that already has AGENTS.md; follow that file instead.
compatibility: Needs GS2 Studio 2026.11.17 or later installed and launched once, Node.js with npm, and a shell.
---

# GS2 Studio

This skill only finds GS2 Studio. GS2 Studio itself prints the workflow for the version installed,
so follow its output, not your memory of earlier versions.

## 1. Find the GS2 Studio command

Try these in order and use the first that works:

1. `gs2studio --version`: the command GS2 Studio puts on PATH. The Windows installer adds it;
   on macOS and Linux the app's menu offers to install it.
2. The install record GS2 Studio writes each time it starts: `~/.gs2studio/install.json`
   (on Windows `%USERPROFILE%\.gs2studio\install.json`). It names the executable a terminal
   should run. Quote the path; it usually contains spaces. Read only this file in `~/.gs2studio`:
   the other files there hold the user's GS2 credentials.
3. Neither: ask the user to install GS2 Studio and launch it once, then try again. Do not
   search the disk for it.

Call the command found `<GS2 Studio>` below.

## 2. Follow GS2 Studio's guide

Run `<GS2 Studio> guide` and follow what it prints: how to create a project, find and add the
packages the game needs, start the package DSL with `dsl init`, and install its type definitions.

If `guide` is not a command, the installed GS2 Studio is older than 2026.11.17. Tell the user to
update it; until then only `<GS2 Studio> dsl --help` is available.

## 3. Hand over to the DSL directory

After `dsl init`, the DSL directory holds `AGENTS.md`. From there on, read and follow that file
and the `docs/LLM.md` it points to. They are written for the installed version and take
precedence over this skill.
