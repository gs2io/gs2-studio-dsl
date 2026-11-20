# gs2-studio-dsl for LLM coding agents

Instructions for an agent that writes or edits a GS2 Studio package DSL. Follow them literally. Section names in
[REFERENCE.md](REFERENCE.md) are linked where an API is involved.

## 1. What the DSL is

- A package DSL is a TypeScript module that calls `definePackage(...)` and exports the result of `.build()`.
  GS2 Studio's `dsl build` command evaluates it, validates the package, and saves it into a GS2 Studio project.
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
  index.ts                  the entry: exports exactly one definePackage(...).build() result
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

1. Put every dependency in the project first: install it in GS2 Studio ("Add dependency"), or, for a package you
   author too, build it into the project with `dsl build`. The DSL cannot install packages.
2. If the package depends on other packages, write their surfaces (one file per package of the project):
   `"<GS2 Studio>" dsl surfaces --dir <project> --out <dsl>/surfaces`
3. Write or edit `<dsl>/index.ts`.
4. Type-check: `npx tsc --noEmit -p <dsl>`. Fix every error before building.
5. First build of a new package:
   `"<GS2 Studio>" dsl build --dir <project> --entry <dsl>/index.ts --write-ledger`
6. Later builds: the same command without `--write-ledger`. Add `--write-ledger` only when the build reports missing
   ledger tokens for things you added (a type, property, row or transform) and reports no token as "not current".
   A "not current" token means a rename or removal: handle it as in section 4 first.
7. Open the project in GS2 Studio and fix what it reports. `dsl build` does not run every check the editor and code
   generation run (for example the binding limits in [Bindings](REFERENCE.md#bindings)).
8. Keep `id-ledger.json` and `dependency-surface.json` with `index.ts`; commit them together.

A build that fails a check writes nothing. On failure, read every listed problem, fix the DSL, and rerun.

## 4. Hard rules

MUST:

- Export exactly one `definePackage(...).build()` result from the entry.
- Register every domain type definition you use with `.domainType(definition)` on the same package. The order of the
  calls does not matter.
- Return the builder from `defineDomainType`, `defineOverlayDomainType` and `defineInlineElement` callbacks by chaining
  (`dt => dt.property(...).property(...)`). Never use a block body that drops the chain.
- Import types with `import type` or `type` specifiers (`import { type LocalizedDisplay, PT } from "gs2-studio-dsl"`).
- Name domain types in PascalCase and properties in camelCase. Never declare a property named `id`.
- Bind every `.masterData()` property in some master data resource and every `.userData()` property in some user data
  resource, or remove the hint.
- Make sure some resource, of this package or of a dependency, mounts the target type of every `uiComponent`.
- Give a single-entry type's row the type name in lower case as its id (`GameSettings` → `gamesettings`).
- Refer to anything of another package only through `dependencyPackage(surface)` built from a surface file that
  `dsl surfaces` wrote (or, for a package you build yourself, the `dependency-surface.json` beside its ledger, which
  has the same content): `dep.type(...)`, `dep.overlay(...)`, `dep.typeId(...)`, `dep.propertyId(...)`,
  `dep.transformId(...)`, `dep.resourceId(...)`. Declare the dependency with `.dependency(dep.packageId, spec)`; the
  spec of a package authored in the same project is `"*"` (see [Dependencies](REFERENCE.md#dependencies)).
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
  missing. In `id-ledger.json`, move the old token's id to the new token in `random`, then build without
  `--write-ledger`. Never let `--write-ledger` record a new id for a renamed thing. Renaming a type also renames its
  `property:<Type>.<name>` and row tokens; move each of them. It also changes, without a message, the ids of the
  type's UI component and its items and of user data resources mounted on the type; keep them with
  `deterministicOverrides`. See [The id ledger](REFERENCE.md#the-id-ledger).
- A row token contains the row id. Before you treat a "not current" + "missing" row token pair as a rename of a
  composite-key row, check the new row id against the composite key rule below; a wrong id must be fixed in the DSL,
  not moved in the ledger.
- A composite-key row id is its key values joined with `.` in ascending order of the key members' property ids in the
  ledger, not in the order passed to `compositeKey(...)`. Build the type with `--write-ledger` before adding its rows,
  read the ids, then add the rows. See [Keys and identity](REFERENCE.md#keys-and-identity).

## 5. API cheat sheet

| Task | API | Reference |
| --- | --- | --- |
| Start a package | `definePackage(id, version)` ... `.build()` | [Packages](REFERENCE.md#packages) |
| Label the package and its types | `.display(entry)`, `.displayType(definition, entry)` | [Packages](REFERENCE.md#packages) |
| Declare a type | `defineDomainType(name, dt => dt...)` + `.domainType(definition)` | [Domain types](REFERENCE.md#domain-types) |
| Declare a property | `PT.int32("count").masterData().required()`, `PT.prop("item", PT.ref("Item"))` | [Properties](REFERENCE.md#properties) |
| Conditional requirement | `.requiredWhen(Cond.eq("limited", true))` | [Conditions](REFERENCE.md#conditions) |
| Identity and order | `.singleEntry()`, `.compositeKey(...)`, `.sortBy(...)` | [Keys and identity](REFERENCE.md#keys-and-identity) |
| Author rows | `.instance(definition, id, values)` | [Instances](REFERENCE.md#instances) |
| Extend a dependency's type | `defineOverlayDomainType(name, dep.overlay(name), dt => ...)` | [Overlay types](REFERENCE.md#overlay-types) |
| List of structured elements | `defineInlineElement`, `PT.listOf(PT.inlineElement(schema))`, `inlineElementOf` | [Inline elements](REFERENCE.md#inline-elements) |
| Configure a GS2 master data model | `.masterDataResource(r => r.model(GS2.svc.Model).mountLocal(T).bindings({...}))` | [Master data resources](REFERENCE.md#master-data-resources) |
| Map GS2 user data to properties | `.userDataResource(r => r.model(...).linkedMasterResourceId(...).bindings({...}))` | [User data resources](REFERENCE.md#user-data-resources) |
| Field values | `Bind.*`, `Source.direct(T, "prop")`, `Source.parent(...)`, `transactionSettingV2()` | [Bindings](REFERENCE.md#bindings) |
| Actions of an action entry | `ActionProgram.transform(packageId, transformId, [Arg...])` | [Action programs and arguments](REFERENCE.md#action-programs-and-arguments) |
| Produce GS2 actions from parameters | `.actionTransform(name, t => t.category(...).parameter(...).output(...))` | [Action transforms](REFERENCE.md#action-transforms) |
| A method that runs a GS2 action | `.delegatedAction(T, "Method", { targetActionKey, targetResource })` | [Delegated actions](REFERENCE.md#delegated-actions) |
| Generated UI | `.uiComponent(T, ui => ui.label(...).buttonAction(...))`, `UiCond` | [UI components](REFERENCE.md#ui-components) |
| Code template | `.codeTemplate("File.cs", text)` with a `?raw` import | [Code templates](REFERENCE.md#code-templates) |
| Use another package of the project | `dependencyPackage(surface)`, `.dependency(dep.packageId, spec)` | [Dependencies](REFERENCE.md#dependencies) |

## 6. Common mistakes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `tsc`: `No overload matches this call` on `.instance(Type, ...)`, property `x` is missing | Typed rows need every `.required()` property, whatever its binding hint. | Give the value; if a user data resource fills `x`, write the row as `.instance("Type", id, values)` instead. |
| `CLI_DSL_LOAD_FAILED` ... `defineDomainType callback must return the builder it receives` | The callback has a block body or returns something else. | Write `dt => dt.property(...)...`. |
| `CLI_DSL_LOAD_FAILED` ... `imports X from "gs2-studio-dsl", which exports no value with that name` | A type imported as a value. | Use `import type` / `type X`. |
| `CLI_DSL_LOAD_FAILED` ... `which a DSL cannot import` | An import other than the published modules, relative `.ts`, `.json` or `?raw` files. | Remove it; inline the code or copy the file into the DSL directory. |
| `CLI_DSL_LOAD_FAILED` ... `dependency surface: no type named "X"` (or `no property`, `no ActionTransform`) | The name is not in the surface file, or the surface is stale. | Rerun `dsl surfaces`; use a published name. |
| `CLI_DSL_LOAD_FAILED` ... `ResourceDefinition can only be attached to one graph location` | One resource definition attached twice. | Make a second definition. |
| `CLI_DSL_EXPORT_INVALID` | Zero or several built packages exported. | Export exactly one `.build()` result. |
| `{"kind":"domainTypeDefinitionNotRegistered",...}` | A definition used without `.domainType(definition)`. | Register it. |
| `{"kind":"reservedPropertyName",...}` | A property named `id`. | Rename it; `id` exists already. |
| `{"kind":"unresolvedPropertySlot",...}` | A misspelled or undeclared property name in values, overlay options or UI. | Use a declared or published name; the error lists both. |
| `{"kind":"uiComponentUnknownProperty",...}` / `{"kind":"uiComponentUnknownDelegatedAction",...}` | `ui.prop` or `buttonAction` names something the target lacks. | Declare the property or register the delegated action on that type. |
| `{"kind":"duplicateUiComponentClassName",...}` | Two items of the same type share a class name. | Make class names unique per type. |
| `{"kind":"uiComponentTemplateLabelKeyMismatch",...}` | `{key}` placeholders and `sources` keys differ. | Make them match one to one. |
| `{"kind":"singleEntryInstanceIdMismatch",...,"expectedId":"..."}` | Wrong row id on a single-entry type. | Use `expectedId`. |
| `{"kind":"invalidCompositeKey","reason":"unsupportedMemberBindingHint",...}` | A key member without `masterData` / `assetDelivery`. | Add the hint. |
| `{"kind":"invalidSortKey","reason":"notRequired",...}` | Sorting by an optional property. | Make it `.required()` or sort by `"id"`. |
| `{"kind":"invalidBindingValue",...}` | A binding kind the resource does not accept (for example `Bind.resourceKey()` on user data), a malformed directive, or an inline schema used twice. | Read `context`; use an accepted kind. |
| `{"kind":"unresolvedResourceRef",...}` | `resourceRef(() => x)` or `linkedMasterResourceId(x)` names a resource never attached to the package. | Attach the resource with `masterDataResource` / `addChild` / `addArrayChild`. |
| `{"kind":"unresolvedParentBinding",...}` | `Source.parent(...)` on a root resource. | Use `Source.direct(...)`, or move the resource under a parent. |
| `CLI_DSL_LEDGER_MISSING` | First build without `--write-ledger`. | Add `--write-ledger`. |
| `CLI_DSL_LEDGER_MISMATCH` ... `random token ... is missing from the ledger`, and no token is "not current" | You added something. | Check the tokens, then rebuild with `--write-ledger`. |
| `CLI_DSL_LEDGER_MISMATCH` ... `is not current; move it to retired` | You renamed or removed something, or changed a row id. | A changed composite-key row id: first check it against the composite key rule. Renamed: move the old token's id to the new token. Removed: move token and id to `retired`. Then rebuild without `--write-ledger`. |
| `CLI_DSL_LEDGER_INVALID` ... `not canonical` | The ledger's key order, entry order, indentation or final newline differs from what GS2 Studio writes. | Restore that form (section 4). |
| `CLI_DSL_VALIDATION_FAILED` ... `No master data resource binds this property.` | A `.masterData()` property no resource binds. | Bind it with `Bind.domainProperty(Source.direct(T, "prop"))` in a resource mounted on `T`, or remove the hint. |
| `CLI_DSL_VALIDATION_FAILED` ... `No user data resource binds this property.` | A `.userData()` property no resource binds. | Bind it in a user data resource (`Bind.domainProperty` / `Bind.domainProperties` with `Source.direct(T, "prop")`), or remove the hint. |
| `CLI_DSL_VALIDATION_FAILED` ... `is not mounted by any resource` | A UI component on a type no resource mounts. | Mount the type with a resource, or remove the component. |
| `CLI_DSL_VALIDATION_FAILED` ... `instance ids that no longer match their composite-key values` | Row ids not composed from key values in property-id order. | Recompose ids per [Keys and identity](REFERENCE.md#keys-and-identity). |
| `CLI_DSL_DEPENDENCY_NOT_INSTALLED` | `.dependency(...)` names a package the project lacks. | A package authored in the project: build it with `dsl build` first. Another package: add it in GS2 Studio. |

## 7. Minimal complete example

A package with one type, a master data resource tree, a user data resource, a UI component and two action transforms.
It builds with `dsl build` as shown in the workflow.

```ts
import {
  Bind,
  defineDomainType,
  defineMasterDataResource,
  definePackage,
  type LocalizedDisplay,
  PT,
  Source,
  UiCond,
} from "gs2-studio-dsl";
import { GS2 } from "gs2-studio-dsl/gs2";

function text(label: string, description: string): LocalizedDisplay {
  return { en: { label, description } };
}

const Item = defineDomainType("Item", dt =>
  dt.property(PT.int64("count").userData().required()).localizedProperties({
    id: text("ID", "Identifies the item."),
    count: text("Owned quantity", "How many of the item the player owns."),
  })
);

const SimpleItemModel = defineMasterDataResource(resource =>
  resource
    .model(GS2.inventory.SimpleItemModel)
    .mountLocal(Item)
    .bindings({
      name: Bind.domainProperty(Source.direct(Item, "id")),
    })
);

export const exampleInventory = definePackage("example-inventory", "0.0.1")
  .display(text("Items", "Tracks the items a player owns."))
  .displayType(Item, text("Item", "An item a player can own."))
  .domainType(Item)
  .masterDataResource(namespace =>
    namespace
      .model(GS2.inventory.Namespace)
      .bindings({
        name: Bind.static("Inventory"),
      })
      .addChild(inventory => {
        inventory
          .model(GS2.inventory.SimpleInventoryModel)
          .bindings({
            name: Bind.static("Inventory"),
          })
          .addArrayChild("simpleItemModels", SimpleItemModel);
      })
  )
  .userDataResource(item =>
    item
      .model(GS2.inventory.SimpleItem)
      .linkedMasterResourceId(SimpleItemModel)
      .bindings({
        count: Bind.domainProperties([Source.direct(Item, "count")]),
        itemName: Bind.skip(),
        userId: Bind.skip(),
      })
  )
  .uiComponent(Item, ui =>
    ui
      .templateLabel(
        "StockLabel",
        "{id} x{count}",
        { id: ui.prop("id"), count: ui.prop("count") },
        { name: "Item" }
      )
      .value("CountValue", ui.prop("count"), { name: "Item" })
      .interactable("OwnedInteractable", UiCond.gt(ui.prop("count"), ui.lit(0)), { name: "Item" })
  )
  .actionTransform("AcquireItem", transform =>
    transform
      .category("acquire")
      .parameter("itemName", { type: PT.ref("Item") })
      .parameter("count", { type: PT.int32() })
      .output("Gs2Inventory:AcquireSimpleItemsByUserId", output =>
        output
          .resourceRef(() => SimpleItemModel)
          .mapResourceKey("namespaceName")
          .mapResourceKey("inventoryName")
          .mapPlaceholder("userId", "#{userId}")
          .mapParameter("acquireCounts[0].itemName", "itemName")
          .mapParameter("acquireCounts[0].count", "count")
      )
  )
  .actionTransform("ConsumeItem", transform =>
    transform
      .category("consume")
      .parameter("itemName", { type: PT.ref("Item") })
      .parameter("count", { type: PT.int32() })
      .output("Gs2Inventory:ConsumeSimpleItemsByUserId", output =>
        output
          .resourceRef(() => SimpleItemModel)
          .mapResourceKey("namespaceName")
          .mapResourceKey("inventoryName")
          .mapPlaceholder("userId", "#{userId}")
          .mapParameter("consumeCounts[0].itemName", "itemName")
          .mapParameter("consumeCounts[0].count", "count")
      )
  )
  .build();
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
[REFERENCE.md](REFERENCE.md#dependencies).
