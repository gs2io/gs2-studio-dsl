# gs2-studio-dsl

Type definitions for the GS2 Studio package DSL. This package contains declarations only.
GS2 Studio evaluates the DSL itself: it strips the TypeScript types with Node's built-in type
stripping and runs the result against the DSL runtime bundled in the app. The app does not
type-check; use these declarations in your editor and with `tsc --noEmit`.

- Syntax reference: [REFERENCE.md](REFERENCE.md)
- For LLM coding agents: [LLM.md](LLM.md)

```sh
npm install --save-dev gs2-studio-dsl@2026.11.10
```

The version is the GS2 Studio version whose DSL these declarations describe: a DSL written
against gs2-studio-dsl 2026.11.10 builds with GS2 Studio 2026.11.10 and later. Install the version that
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
    "types": ["gs2-studio-dsl/raw"]
  }
}
```

`resolveJsonModule` lets a package read a dependency's `dependency-surface.json` and pass it to
`dependencyPackage(...)`.

## Building with GS2 Studio

The GS2 Studio executable runs the `dsl` commands headless and exits with their exit code:

```sh
# write <out>/<packageId>.json for each package of the project (installed or authored in it)
"<GS2 Studio>" dsl surfaces --dir <project> --out <out>
# evaluate the DSL, check it, and save the package into the project (--write-ledger the first time)
"<GS2 Studio>" dsl build --dir <project> --entry <dsl/index.ts> --write-ledger
```

`<GS2 Studio>` is `/Applications/GS2 Studio.app/Contents/MacOS/GS2 Studio` on macOS and the
`GS2-Studio-<version>-linux-<arch>.AppImage` file on Linux. On Windows the executable does not write to the console, so the commands cannot
be run from a terminal yet. `--help` after `dsl` lists every option.

## License

Apache-2.0
