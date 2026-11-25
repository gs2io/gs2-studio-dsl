# gs2-studio-dsl for LLM coding agents

Instructions for an agent that writes or edits a GS2 Studio package DSL. Follow them literally. Section names in
[REFERENCE.md](REFERENCE.md) are linked where an API is involved.

## 1. What the DSL is

- A package DSL is a TypeScript module that calls `definePackage({ ... })` and exports the package definition (or the
  result of `.build()`). GS2 Studio's `dsl build` command evaluates it, validates the package, and saves it into a GS2
  Studio project.
- This npm package (`gs2-studio-dsl`) contains type declarations only. It has no runtime; never try to run a DSL with
  Node, `ts-node`, a bundler or a test runner. Only `dsl build` evaluates it.
- `dsl build` does not type-check. It removes types with Node's type stripping and runs the result. Type errors you do
  not catch with `tsc --noEmit` become run-time failures or wrong packages.
- The generated package files in the project (`packages/<id>/**`, `project.json`) are output. Never edit them; change
  the DSL and rebuild.

## 2. Project layout

```text
<project>/                  GS2 Studio project (project.json, packages/)
<dsl>/
  index.ts                  the entry: exports exactly one definePackage({...}) or .build() result
  id-ledger.json            ids of the package; created by dsl build --write-ledger; commit it
  dependency-surface.json   written by dsl build: what this package publishes to packages that depend on it
  surfaces/<packageId>.json written by dsl surfaces: what each package of the project publishes
  tsconfig.json             the tsconfig from the README
  package.json              devDependencies: gs2-studio-dsl, typescript
```

Besides `gs2-studio-dsl` and `gs2-studio-dsl/gs2`, a module may import only by relative path (`./...` or `../...`,
anywhere on disk): `.ts` files (the extension may be left out), `.json` files, and any file as text with `?raw`. Nothing
else (see [Modules and imports](REFERENCE.md#modules-and-imports)).

## 3. Workflow

`<GS2 Studio>` is the GS2 Studio executable (the README gives its path per platform).

To start a new `<dsl>`, run `"<GS2 Studio>" dsl init --dir <project> --out <dsl> --package-id <id>`, then
`npm install` in `<dsl>` (without `--package-id`, the package id is the name of `<dsl>`). It writes `package.json`,
`tsconfig.json`, a starter `index.ts`, `surfaces/`, these documents under `docs/`, and an `AGENTS.md` that lists the
commands below with the executable's path; the first build writes the ledger. It refuses when one of its files exists.

1. Put every dependency in the project first: install it in GS2 Studio ("Add dependency", under any package of the
   project), or, for a package you author too, build it into the project with `dsl build`. The DSL cannot install
   packages.
2. If the package depends on other packages, write their surfaces (one file per package of the project):
   `"<GS2 Studio>" dsl surfaces --dir <project> --out <dsl>/surfaces`
3. Write or edit `<dsl>/index.ts`. When the package depends on other packages, declare the dependencies first and build
   (steps 4 to 7): the build then names the types of the dependencies that need rows from this package.
4. Type-check: `npx tsc --noEmit -p <dsl>`. Fix every error before building.
5. First build of a new package:
   `"<GS2 Studio>" dsl build --dir <project> --entry <dsl>/index.ts --write-ledger`
   It adds the package with the id `definePackage({ id })` declares beside the project's other packages, which stay as
   they are; later builds replace that package. Only a DSL that declares the id `local-project` replaces `local-project`.
6. Later builds: the same command without `--write-ledger`. Add `--write-ledger` only when the build reports missing
   ledger tokens for things you added (a type, property, row or transform) and reports no token as "not current".
   A "not current" token means a rename or removal: handle it as in section 4 first.
7. Read what a build that saved the package prints on stderr: the `[error]` and `[warning]` lines `project check`
   reports for the project. The build exits with 0 because it saved the package, but each line says what deploy or code
   generation will do wrong or leave out. Fix each one the DSL can fix (section 6) and build again; tell the user about a
   line on another package that the DSL does not change. Then open the project in GS2 Studio and fix what it reports:
   what Unity code generation alone refuses is not printed (see
   [Building with dsl build](REFERENCE.md#building-with-dsl-build)). A build with no such line prints
   `project check (without Unity code generation): no errors or warnings` last.
8. Keep `id-ledger.json` and `dependency-surface.json` with `index.ts`; commit them together.

A build that fails a check writes nothing. On failure, read every listed problem, fix the DSL, and rerun.

## 4. Hard rules

MUST:

- Export exactly one `definePackage({ ... })` (or `.build()`) result from the entry.
- Register every domain type definition you reference in `definePackage({ domainTypes: [...] })`. Refer to types,
  resources and action transforms by their definition handles (never by raw type name strings).
- Use thunks (`() => Type` or `() => resource`) when two definitions refer to each other or when a definition refers to
  one declared later in the file.
- Import types with `import type` or `type` specifiers (`import { type LocalizedDisplay, PT } from "gs2-studio-dsl"`).
- Name domain types in PascalCase and properties in camelCase. Never declare a property named `id`.
- Bind every `.masterData()` property in some master data resource and every `.userData()` property in some user data
  resource, or remove the hint.
- Put a `defineUiComponent`, and the type of a `UiSource.rowProp`, only on a type that gets a Handler; `dsl build`
  refuses either on a type without one and says why. A dependency's type gets one when `types.<Type>.generatedHandlers`
  of its surface is not `[]` (`mountedBy` names the dependency's resources that mount it), or when your package mounts
  its overlay of the type itself. A type gets one only when a user data resource, or a master data resource of a model
  other than a namespace, mounts it.
- To use what a dependency does as it is (for example "make the wallet usable" with `foundation-economy-currency`),
  declare the dependency and call its transforms; add rows, resources or UI only for what the surface or a build asks
  for. The dependency's own UI components (`types.<Type>.uiComponents`) are generated with it, and the game places
  the Handler that holds the row they show, such as a `WalletHandler` set to the slot (`"0"`). See
  [Rows in the game](REFERENCE.md#rows-in-the-game).
- Before adding UI to a dependency's type, read `types.<Type>.uiComponents` of its surface. Reuse a listed item instead
  of adding one that shows the same, and give new items unlisted class names: a listed one replaces that item.
- Give a single-entry type's row the type name in lower case as its id (`GameSettings` → `gamesettings`).
- Refer to anything of another package only through `dependencyPackage(surface)` built from a surface file that
  `dsl surfaces` wrote (or, for a package you build yourself, the `dependency-surface.json` beside its ledger, which
  has the same content): `dep.type(...)`, `dep.overlay(...)`, `dep.typeId(...)`, `dep.propertyId(...)`,
  `dep.transformId(...)`, `dep.transformCall(...)`, `dep.transformProgram(...)`, `dep.resourceId(...)`. Declare the
  dependency in `definePackage({ dependencies: { [dep.packageId]: spec } })`. The spec of a package authored in the same
  project is `"*"`. An installed package has the spec of its source, as the `dependencies` of
  `<project>/packages/<packageId>/package.json` of the package that installed it declare it: a package installed from
  GitHub is `github:<owner>/<repo>[@<range>]` without its subdirectory, and every package of the GS2 Studio package
  repository is `github:gs2io/gs2-studio-package`. A package that came in as a dependency of another one appears in no
  `package.json` there: take the spec from its entry in `<project>/project-lock.json` (`github:<owner>/<repo>` for
  `"sourceKind": "github"`). Never give an installed package `"*"`; `dsl build` refuses it and prints the spec to
  declare (see [Dependencies](REFERENCE.md#dependencies)).
- Learn what a dependency needs from its surface file, not from its package files: `types.<Type>.propertyDetails`
  gives each property's `type`, `requirement`, `bindingHint` and, when it has one, its `display` (label and description
  per locale); `actionTransformSignatures.<Name>` gives each transform's category and parameters (name, type,
  required and, when it has one, description); `types.<Type>.delegatedActions.<Method>.parameters` gives what a
  `UiItem.buttonAction` on that method takes as `args`; `types.<Type>.sort` gives the order of its rows, which an overlay of
  the type keeps unless it sets a `sort` other than id ascending. A `ref<T>` parameter or property takes a row id of `T`.
- Call a dependency's transform with `dep.transformCall(name, { <parameter>: source })` (spread into an
  `actionPropertyTransforms` entry) or `dep.transformProgram(name, { <parameter>: source })` (in `actionProgram`),
  not with `dep.transformId(...)` and hand-written arguments, so `tsc` and `dsl build` check the parameter names. The
  two name a property differently: `transformCall` takes `{ kind: "domainProperty", propertyName: "<property of the
  row>" }`, `transformProgram` takes `{ kind: "domainProperty", source: Source.direct(...) }`. See the examples in
  [Overlay types](REFERENCE.md#overlay-types) and [Action programs](REFERENCE.md#action-programs-and-arguments).
- Add the rows a dependency's type needs from the project with `instance(dep.type("<Type>"), id, values)` in
  `definePackage({ instances: [...] })`: every type a build names in `No master data is registered for domain model
  "<Type>"`. Never author a row whose id a surface lists for the same type (`shippedRowIds`,
  `shippedRowsOfDependencyTypes`): a package ships it, and a row with its id replaces it (use `overlayInstance`). Take
  the values from `types.<Type>.propertyDetails` of the surface. Give a value to every `requirement: "always"` property
  except `id` (the row id), `userData` properties and action lists
  (`list<consumeAction>` and the other action kinds): a missing one fails the build. An action list you leave out
  deploys as what `actionPropertyTransforms` add to it, or empty.
- Choose each property's binding hint by what reads its value, also for a property an overlay adds: the client, from
  the rows you author (a UI component shows it) → `.assetDelivery()`; only an `actionPropertyTransforms` argument → no
  hint; a field a master data resource of this package binds → `.masterData()`. See the table in
  [Property modifiers](REFERENCE.md#property-modifiers).
- Check the value keys of rows written with a dependency type (`instance(dep.type("Energy"), ...)`) against the
  published property names yourself: `tsc` does not check them, and `dsl build` refuses an unknown one
  (`unresolvedPropertySlot`).
- Regenerate surface files after a dependency changes. Never edit them by hand.
- In master data, use `Bind.domainProperty` only in a resource mounted on a domain type, and never use
  `Bind.domainProperties` (user data only). `dsl build` accepts both mistakes; the editor and code generation refuse
  them.
- When you edit `id-ledger.json`, keep the key order `schemaVersion`, `retired`, `random`, `deterministicOverrides` and
  keep the entries of each section sorted by token.

MUST NOT:

- Edit generated package JSON in the project.
- Change, swap or reuse an existing id in `id-ledger.json`. Other packages and projects refer to these ids.
- Delete ledger entries. Move the entry of a removed thing from `random` to `retired`; move the id of a renamed thing to
  its new token.
- Hand-write ids (`dt_...`, `prop_...`, `at_...`, `mdr_...`) in the DSL. Take them from a surface or let the build
  generate them.
- Use `enum`, `namespace` with values, parameter properties, top-level `await`, dynamic `import()` of the DSL modules,
  `node:*` modules or npm packages other than `gs2-studio-dsl`.
- Attach one `defineMasterDataResource` / `defineUserDataResource` definition in two places.
- Use one `defineInlineElement` schema for two list properties.

Names and ids:

- You write names; GS2 Studio stores ids. The ledger maps names (tokens such as `property:Item.count`) to ids.
- Renaming a type, property, row or transform: the build reports the old token as "not current" and the new one as
  missing, in one line that says it looks like a rename and names the id to move when it can pair them. In
  `id-ledger.json`, move the old token's id to the new token in `random`, then build without `--write-ledger`. Never let
  `--write-ledger` record a new id for a renamed thing. Renaming a type also renames its `property:<Type>.<name>` and
  row tokens; move each of them, all before the next build. It also changes, without a message, the ids of the
  type's UI component and its items and of user data resources mounted on the type; keep them with
  `deterministicOverrides`. See [The id ledger](REFERENCE.md#the-id-ledger).
- A row id is letters, digits, `_`, `.` and `-`, at most 128 characters; a resource that binds `id` to a GS2 name sends
  it as that name (a `micro-economy-quest` `Quest` row id is the quest model name), and some GS2 fields take fewer.
- A row token contains the row id. Before you treat a "not current" + "missing" row token pair as a rename of a
  composite-key row, check the new row id against the composite key rule below; a wrong id must be fixed in the DSL,
  not moved in the ledger.
- A composite-key row id is its key values joined with `.` in ascending order of the key members' property ids in the
  ledger, not in the order passed to `compositeKey`. Build the type with `--write-ledger` before adding its rows,
  read the ids, then add the rows. See [Keys and identity](REFERENCE.md#keys-and-identity).

## 5. API cheat sheet

| Task | API | Reference |
| --- | --- | --- |
| Declare a package | `definePackage({ id, version, display?, dependencies?, domainTypes?, instances?, ... }).build()` | [Packages](REFERENCE.md#packages) |
| Label a package or type | `display` on `definePackage`; `localizedDisplay` on `defineDomainType` / `defineOverlayDomainType` / `defineInlineElement` | [Packages](REFERENCE.md#packages), [Domain types](REFERENCE.md#domain-types) |
| Declare a type | `defineDomainType(name, { properties, localizedDisplay?, localizedProperties?, singleEntry?, compositeKey?, sort?, delegatedActions? })` | [Domain types](REFERENCE.md#domain-types) |
| Declare a property | `PT.int32().masterData().required()`, `PT.ref(Item)`, `PT.enum("a", "b")` in `properties: { name: ... }` | [Properties](REFERENCE.md#properties) |
| Choose a binding hint | `.assetDelivery()` (the client shows it), none (only a transform argument), `.masterData()` (a resource binds it) | [Property modifiers](REFERENCE.md#property-modifiers) |
| Text shown in the player's language (a display name) | One `displayName: PT.localizedString().assetDelivery()`, rows `{ ja: "...", en: "..." }`, a `UiItem.label` on it; not one property per language | [Localized text](REFERENCE.md#localized-text) |
| Localized text in a template or a condition | `templateLabel` placeholder and `UiCond.truthy` / `eq` / `neq` read the player's locale's translation; never `gt`/`lt`, never against a number | [Localized text](REFERENCE.md#localized-text) |
| Conditional requirement | `.requiredWhen(Cond.eq("limited", true))` | [Conditions](REFERENCE.md#conditions) |
| Identity and order | `singleEntry: true`, `compositeKey: [...]`, `sort: { key, direction? }` | [Keys and identity](REFERENCE.md#keys-and-identity) |
| Author rows | `instance(definition, id, values)` in `instances: [...]` | [Instances](REFERENCE.md#instances) |
| Rows a dependency's type needs from the project | `instance(dep.type("Energy"), id, values)` in `instances: [...]` | [Instances](REFERENCE.md#instances) |
| Change a row a dependency ships | `overlayInstance(type, sourceInstanceId, { overrides?, suppressed? })` in `overlayInstances: [...]` | [Instances](REFERENCE.md#instances) |
| Extend a dependency's type | `defineOverlayDomainType(name, dep.overlay(name), { properties?, actionPropertyTransforms?, ... })` | [Overlay types](REFERENCE.md#overlay-types) |
| List of structured elements | `defineInlineElement(name, { properties, elementKey?, ... })`, `PT.listOf(PT.inlineElement(schema))`, `inlineElementOf(Host, "listProp")` | [Inline elements](REFERENCE.md#inline-elements) |
| Configure a GS2 master data model | `defineMasterDataResource({ model: GS2.svc.Model, mount: T, bindings: {...}, children?, arrayChildren? })` | [Master data resources](REFERENCE.md#master-data-resources) |
| Map GS2 user data to properties | `defineUserDataResource({ model: GS2.svc.Model, linkedMaster?, mount?, bindings: {...}, children? })` | [User data resources](REFERENCE.md#user-data-resources) |
| Field values | `Bind.*`, `Source.direct(T, "prop")`, `Source.parent(...)`, `transactionSettingV2()` | [Bindings](REFERENCE.md#bindings) |
| Actions of an action entry | `ActionProgram.transform(transform, [Arg...])`; a dependency's: `dep.transformProgram(name, { count: { kind: "domainProperty", source: Source.parent(Source.direct(T, "count")) } })` | [Action programs and arguments](REFERENCE.md#action-programs-and-arguments) |
| Add a dependency's transform to an inherited action property | `actionPropertyTransforms: [{ targetProperty, mode: "append", ...dep.transformCall(name, { count: { kind: "domainProperty", propertyName: "price" } }) }]` | [Overlay types](REFERENCE.md#overlay-types) |
| Produce GS2 actions from parameters | `defineActionTransform(name, { category, parameters, outputs })` + `OutputMap.*` | [Action transforms](REFERENCE.md#action-transforms) |
| A method that runs a GS2 action | `delegatedActions: { Method: { targetActionKey, targetResource } }` on the type, or `definePackage({ delegatedActions: [{ target, methodName, action: { targetActionKey, targetResource } }] })` | [Delegated actions](REFERENCE.md#delegated-actions) |
| Generated UI | `defineUiComponent(T, { items: [UiItem.label(...), UiItem.buttonAction(...)] })`, `UiSource.*`, `UiCond.*` | [UI components](REFERENCE.md#ui-components) |
| Enable a button by another type's row (stamina, coins) | `UiItem.interactable("StartInteractable", UiCond.gte(UiSource.rowProp(energy.type("Energy"), "stamina", "currentValue"), UiSource.prop("staminaCost")))` | [Another type's row](REFERENCE.md#another-types-row) |
| Choose a UI item and its options | `label` shows text, `templateLabel` text around values, `value` sends a typed value the game formats; a button never disables itself (add `interactable`). `{ name, description }` only label the item in GS2 Studio's editor; leave them out | [UI components](REFERENCE.md#ui-components), [Item options](REFERENCE.md#item-options) |
| Show every row in the game, in order | A UI component describes one row; the generated `<T>ListHandler` makes one instance of a prefab per row, in the order of `sort` (an overlay: the dependency's order unless it sets a `sort` other than id ascending) | [Rows in the game](REFERENCE.md#rows-in-the-game) |
| A button on a dependency's delegated action | `UiItem.buttonAction("StartButton", "Start", args, options)`; `args` takes only the names under `types.<T>.delegatedActions.Start.parameters` of the surface and needs each `required: true` one; with none required it may be `undefined` | [Dependencies](REFERENCE.md#dependencies) |
| Code template | `codeTemplates: [{ outputFileName: "File.cs", templateSource: text }]` with a `?raw` import | [Code templates](REFERENCE.md#code-templates) |
| Use another package of the project | `dependencyPackage(surface)`, `dependencies: { [dep.packageId]: spec }`; spec `"*"` (authored in the project), or for an installed package the spec the package that installed it declares (`"github:gs2io/gs2-studio-package"` for an official package) | [Dependencies](REFERENCE.md#dependencies) |

## 6. Common mistakes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `CLI_DSL_LOAD_FAILED` ... `imports X from "gs2-studio-dsl", which exports no value with that name` | A type imported as a value. | Use `import type` / `type X`. |
| `CLI_DSL_LOAD_FAILED` ... `which a DSL cannot import` | An import other than the published modules, relative `.ts`, `.json` or `?raw` files. | Remove it; inline the code or copy the file into the DSL directory. |
| `CLI_DSL_LOAD_FAILED` ... `dependency surface: no type named "X"` (or `no property`, `no ActionTransform`) | The name is not in the surface file, or the surface is stale. | Rerun `dsl surfaces`; use a published name. |
| `tsc`: `... is not assignable to parameter of type 'never'` on `dep.transformCall` / `dep.transformProgram`, or `CLI_DSL_LOAD_FAILED` ... `publishes no parameters of ActionTransform` | The surface file was written by a GS2 Studio that did not publish transform signatures. | Rerun `dsl surfaces` (and `dsl build` of a dependency you author). |
| `tsc`: `Object literal may only specify known properties` in a `transformCall` argument, or `ActionTransform "X" has no parameter "y"` / `needs the required parameter "z"` | A wrong or missing parameter name. The message lists the parameters. | Use the names under `actionTransformSignatures.X.parameters` of the surface. |
| `CLI_DSL_EXPORT_INVALID` | Zero or several built packages exported. | Export exactly one `definePackage({...})` or `.build()` result. |
| `{"kind":"domainTypeDefinitionNotRegistered",...}`, `{"kind":"invalidInstanceType",...}`, `{"kind":"uiComponentTargetTypeUnknown",...}` | A definition used (in a mount or binding, a row, a UI component) without being listed in `domainTypes: [...]`. | Include it in `definePackage({ domainTypes: [...] })`. |
| `{"kind":"reservedPropertyName",...}` | A property named `id`. | Rename it; `id` exists already. |
| `{"kind":"unresolvedPropertySlot",...}` | A misspelled or undeclared property name in values, overlay options or UI. | Use a declared or published name; the error lists both. |
| `{"kind":"uiComponentUnknownProperty",...}` / `{"kind":"uiComponentUnknownDelegatedAction",...}` | `UiSource.prop` or `UiItem.buttonAction` names something the target lacks. | Declare the property or register the delegated action on that type. |
| `{"kind":"duplicateUiComponentClassName",...}` | Two items of the same type share a class name. | Make class names unique per type. |
| `{"kind":"uiComponentTemplateLabelKeyMismatch",...}` | `{key}` placeholders and `sources` keys differ. | Make them match one to one. |
| `{"kind":"singleEntryInstanceIdMismatch",...,"expectedId":"..."}` | Wrong row id on a single-entry type. | Use `expectedId`. |
| `{"kind":"invalidCompositeKey","reason":"unsupportedMemberBindingHint",...}` | A key member without `masterData` / `assetDelivery`. | Add the hint. |
| `{"kind":"invalidSortKey","reason":"notRequired",...}` | Sorting by an optional property. | Make it `.required()` or sort by `"id"`. |
| `{"kind":"invalidBindingValue",...}` | A binding kind the resource does not accept (for example `Bind.resourceKey()` on user data), a malformed directive, or an inline schema used twice. | Read `context`; use an accepted kind. |
| `{"kind":"unresolvedResourceRef",...}` | A `resource`, `linkedMaster`, `resourceLink` or `mountedResource` handle names a resource never included in the package's `masterDataResources` / `userDataResources` trees. | Include the resource in `masterDataResources`, `userDataResources`, `children`, or `arrayChildren`. |
| `{"kind":"resourceDefinitionAttachedTwice",...}` | One resource definition included in two places (two `children` lists, or a root and a child). | Make a second definition with its own `defineMasterDataResource` / `defineUserDataResource`. |
| `{"kind":"unresolvedParentBinding",...}` | `Source.parent(...)` on a root resource. | Use `Source.direct(...)`, or move the resource under a parent. |
| `CLI_DSL_LEDGER_MISSING` | First build without `--write-ledger`. | Add `--write-ledger`. |
| `CLI_DSL_LEDGER_MISMATCH` ... `random token ... is missing from the ledger`, and no token is "not current" | You added something. | Check the tokens, then rebuild with `--write-ledger`. |
| `CLI_DSL_LEDGER_MISMATCH` ... `looks like a rename: ... move its id "<id>" from "<old>" to "<new>"` | You renamed something, or changed a row id. | If you renamed it, move the id as the line says (a changed composite-key row id: first check it against the composite key rule). If you removed it and added another, do what the line's last sentence says. Then rebuild without `--write-ledger`. |
| `CLI_DSL_LEDGER_MISMATCH` ... `is not current; move it to retired` | You renamed or removed something, or changed a row id. | A changed composite-key row id: first check it against the composite key rule. Renamed: move the old token's id to the new token. Removed: move token and id to `retired`. Then rebuild without `--write-ledger`. |
| `CLI_DSL_LEDGER_INVALID` ... `not canonical` | The ledger's key order, entry order, indentation or final newline differs from what GS2 Studio writes. | Restore that form (section 4). |
| `CLI_DSL_VALIDATION_FAILED` ... `No master data resource binds this property.` | A `.masterData()` property no resource binds. | Bind it with `Bind.domainProperty(Source.direct(T, "prop"))` in a resource mounted on `T`, or remove the hint. |
| `CLI_DSL_VALIDATION_FAILED` ... `No user data resource binds this property.` | A `.userData()` property no resource binds. | Bind it in a user data resource (`Bind.domainProperty` / `Bind.domainProperties` with `Source.direct(T, "prop")`), or remove the hint. |
| `CLI_DSL_VALIDATION_FAILED` ... `No Handler is generated for the target domain model` | A UI component on a type that gets no Handler (`generatedHandlers: []` in its surface). | Mount the type with a user data resource or a master data resource of a model other than a namespace, or remove the component. |
| `CLI_DSL_VALIDATION_FAILED` ... `the condition cannot read a value of another domain model's row` | A `UiSource.rowProp` of a type that gets no Handler. | Read a type whose `generatedHandlers` is not `[]`, or remove the item. |
| `CLI_DSL_VALIDATION_FAILED` ... `instance ids that no longer match their composite-key values` | Row ids not composed from key values in property-id order. | Recompose ids per [Keys and identity](REFERENCE.md#keys-and-identity). |
| `CLI_DSL_DEPENDENCY_NOT_INSTALLED` | `dependencies` names a package the project lacks. | A package authored in the project: build it with `dsl build` first. Another package: add it in GS2 Studio. |
| `CLI_DSL_PACKAGE_INVALID` ... `Invalid GitHub dependency spec: github:<owner>/<repo>/<dir>` | A subdirectory in a GitHub spec. | Use `github:<owner>/<repo>`; the project's lock records the directory. |
| `CLI_DSL_DEPENDENCY_SPEC_MISMATCH` | `dependencies` gives an installed package a spec that names another source than the one the project installed it from, such as `"*"`. | Declare it with the spec the message prints, then build again. |
| `CLI_DSL_VALIDATION_FAILED` ... `the parent <resource> resource has no row` ... `Add a row of "T"` | Rows of a dependency's type sit under a GS2 resource made from rows of `T`, which nobody authored. | Add a row of `T` with `instance(dep.type("T"), id, values)` and point your rows at it (for example the `collection` of a quest row). |
| `... is a dependency the DSL cannot change, so these are fixed through the dependency that brings it in: ...` | A defect of the dependency itself, not of this DSL. | If the message says to remove the dependency `"X"` from the DSL and the package does not need X, remove it and what refers to it. Otherwise tell the user: the project's owner updates or removes the dependency in GS2 Studio, as the message says. |
| A successful build prints `[warning] ... No master data is registered for domain model "T"` | A dependency's GS2 resource needs rows of `T` from the project; it is not deployed without them. | Add the row the message names, `instance(dep.type("T"), id, values)`, with the values it names, and build again. `dep.type("<Type>")` means the message names no type `dep.type()` takes: for an inline schema, add elements to the host type's list property with `dep.inlineElements(...)`; for an unresolved type, find it in the surfaces. |
| A successful build prints `[error] ... the required arguments (...) of action transform ... have no value for row "r"` | An `actionPropertyTransforms` argument reads a property row `r` has no value for. | Give the row the value; for a row a dependency ships, use `overlayInstance(type, "r", { overrides })`. |
| `CLI_DSL_VALIDATION_FAILED` ... `is not a UTC ISO 8601 timestamp` | A `PT.timestamp()` value in another form, such as with an offset (`+09:00`). The message says `In package "<your package>"` when the row is yours, even of a dependency's type. | Write it in UTC with `Z`, such as `"2026-11-30T15:00:00Z"`, in that `instance(...)` (see [Property types](REFERENCE.md#property-types)). |
| A UI item of a property you added shows nothing (or `0`) in the game | The property has no binding hint, so the client never gets its value. | Give it `.assetDelivery()`. |

## 7. Minimal complete example

A package with one type, a master data resource tree, a user data resource, a UI component and two action transforms.
It builds with `dsl build` as shown in the workflow.

```ts
import {
  Bind,
  defineActionTransform,
  defineDomainType,
  defineMasterDataResource,
  definePackage,
  defineUiComponent,
  defineUserDataResource,
  type LocalizedDisplay,
  OutputMap,
  PT,
  Source,
  UiCond,
  UiItem,
  UiSource,
} from "gs2-studio-dsl";
import { GS2 } from "gs2-studio-dsl/gs2";

function text(label: string, description: string): LocalizedDisplay {
  return { en: { label, description } };
}

const Item = defineDomainType("Item", {
  properties: {
    count: PT.int64().userData().required(),
  },
  localizedDisplay: text("Item", "An item a player can own."),
  localizedProperties: {
    id: text("ID", "Identifies the item."),
    count: text("Owned quantity", "How many of the item the player owns."),
  },
});

const SimpleItemModel = defineMasterDataResource({
  model: GS2.inventory.SimpleItemModel,
  mount: Item,
  bindings: {
    name: Bind.domainProperty(Source.direct(Item, "id")),
  },
});

const AcquireItem = defineActionTransform("AcquireItem", {
  category: "acquire",
  parameters: {
    itemName: { type: PT.ref(Item) },
    count: { type: PT.int32() },
  },
  outputs: [
    {
      kind: "direct",
      actionName: "Gs2Inventory:AcquireSimpleItemsByUserId",
      resource: SimpleItemModel,
      parameterMappings: {
        namespaceName: OutputMap.resourceKey(),
        inventoryName: OutputMap.resourceKey(),
        userId: OutputMap.placeholder("#{userId}"),
        "acquireCounts[0].itemName": OutputMap.parameter("itemName"),
        "acquireCounts[0].count": OutputMap.parameter("count"),
      },
    },
  ],
});

const ConsumeItem = defineActionTransform("ConsumeItem", {
  category: "consume",
  parameters: {
    itemName: { type: PT.ref(Item) },
    count: { type: PT.int32() },
  },
  outputs: [
    {
      kind: "direct",
      actionName: "Gs2Inventory:ConsumeSimpleItemsByUserId",
      resource: SimpleItemModel,
      parameterMappings: {
        namespaceName: OutputMap.resourceKey(),
        inventoryName: OutputMap.resourceKey(),
        userId: OutputMap.placeholder("#{userId}"),
        "consumeCounts[0].itemName": OutputMap.parameter("itemName"),
        "consumeCounts[0].count": OutputMap.parameter("count"),
      },
    },
  ],
});

export const exampleInventory = definePackage({
  id: "example-inventory",
  version: "0.0.1",
  display: text("Items", "Tracks the items a player owns."),
  domainTypes: [Item],
  masterDataResources: [
    defineMasterDataResource({
      model: GS2.inventory.Namespace,
      bindings: {
        name: Bind.static("Inventory"),
      },
      children: [
        defineMasterDataResource({
          model: GS2.inventory.SimpleInventoryModel,
          bindings: {
            name: Bind.static("Inventory"),
          },
          arrayChildren: {
            simpleItemModels: [SimpleItemModel],
          },
        }),
      ],
    }),
  ],
  userDataResources: [
    defineUserDataResource({
      model: GS2.inventory.SimpleItem,
      linkedMaster: SimpleItemModel,
      bindings: {
        count: Bind.domainProperties([Source.direct(Item, "count")]),
        itemName: Bind.skip(),
        userId: Bind.skip(),
      },
    }),
  ],
  uiComponents: [
    defineUiComponent(Item, {
      items: [
        UiItem.templateLabel("StockLabel", "{id} x{count}", {
          id: UiSource.prop("id"),
          count: UiSource.prop("count"),
        }),
        UiItem.value("CountValue", UiSource.prop("count")),
        UiItem.interactable(
          "OwnedInteractable",
          UiCond.gt(UiSource.prop("count"), UiSource.lit(0))
        ),
      ],
    }),
  ],
  actionTransforms: [AcquireItem, ConsumeItem],
});
```

Its `id-ledger.json` after the first `dsl build --write-ledger`:

```json
{
  "schemaVersion": 1,
  "retired": {},
  "random": {
    "property:Item.count": "prop_1DQWSQS8AC837BT0EWF1439PFW",
    "transform:AcquireItem": "at_0XAMJJD9WX8S0TR71Z8KMQ8V80",
    "transform:ConsumeItem": "at_1YA7MG1XJH88XT3P4Z6JF09ZVW",
    "type:Item": "dt_20QRK0BTMW89TAWPHGNYFXNYJ5"
  },
  "deterministicOverrides": {}
}
```

For dependencies, overlays, delegated actions and code templates, read the `example-gift-shop` sections of
[REFERENCE.md](REFERENCE.md#dependencies). For an overlay that appends a dependency's transform to an inherited action
property with `dep.transformCall`, read `example-gift-sale` in [Overlay types](REFERENCE.md#overlay-types).
