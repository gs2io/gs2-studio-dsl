# gs2-studio-dsl

Type definitions for the GS2 Studio package DSL. This package contains declarations only.
GS2 Studio evaluates the DSL itself: it strips the TypeScript types with Node's built-in type
stripping and runs the result against the DSL runtime bundled in the app. The app does not
type-check; use these declarations in your editor and with `tsc --noEmit`.

- Syntax reference: [REFERENCE.md](REFERENCE.md)
- For LLM coding agents: [LLM.md](LLM.md)

```sh
npm install --save-dev gs2-studio-dsl@2026.11.17
```

The version is the GS2 Studio version whose DSL these declarations describe: a DSL written
against gs2-studio-dsl 2026.11.17 builds with GS2 Studio 2026.11.17 and later. Install the version that
matches the oldest GS2 Studio you build with.

```ts
import { definePackage, defineDomainType, PT, Bind, Source } from "gs2-studio-dsl";
import { GS2 } from "gs2-studio-dsl/gs2";
```

GS2 Studio also loads a file's text through a `?raw` import (for example a script passed to an
action). Its declaration is opt-in, because projects that also use Vite already get the same
`*?raw` module from `vite/client`. Enable it with `"types": ["gs2-studio-dsl/raw"]` in
tsconfig, or with `/// <reference types="gs2-studio-dsl/raw" />` in one source file:

```ts
import updateScript from "./scripts/update.lua?raw";
```

## tsconfig

Only syntax that Node can strip is supported (no `enum`, `namespace` with values, or
parameter properties), and type-only imports must be marked with `import type`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "types": [
      "gs2-studio-dsl/raw"
    ]
  }
}
```

`resolveJsonModule` lets a package read a dependency's `dependency-surface.json` and pass it to
`dependencyPackage(...)`.

## Building with GS2 Studio

The GS2 Studio executable runs the `dsl` commands headless and exits with their exit code:

```sh
# start a DSL directory for the project: package.json, this tsconfig, a starter index.ts, docs/LLM.md,
# docs/REFERENCE.md, AGENTS.md (CLAUDE.md) with these commands, and surfaces/; then run npm install in it
"<GS2 Studio>" dsl init --dir <project> --out <dsl> --package-id <id>
# write <out>/<packageId>.json for each package of the project (installed or authored in it)
"<GS2 Studio>" dsl surfaces --dir <project> --out <out>
# evaluate the DSL, check it, and save the package it declares into the project beside the project's other packages
# (--write-ledger the first time); after saving it prints the [error] and [warning] lines project check reports and a
# line counting them, and exits with 0
"<GS2 Studio>" dsl build --dir <project> --entry <dsl/index.ts> --write-ledger
```

`<GS2 Studio>` is `/Applications/GS2 Studio.app/Contents/MacOS/GS2 Studio` on macOS, the
`GS2-Studio-<version>-linux-<arch>.AppImage` file on Linux, and `bin\gs2studio.cmd` in the install directory on Windows. `gs2studio`
runs it when it is on PATH (the installer puts it there on Windows; on macOS and Linux, "Install 'gs2studio' Command in PATH"
in the app's menu). `"<GS2 Studio>" guide` prints every step from creating a project and adding packages, through
`dsl init`, to deploying to GS2 and generating the Unity code.
`--help` lists every command and option.

## License

Apache-2.0
