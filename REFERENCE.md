# gs2-studio-dsl reference

The syntax reference of the GS2 Studio package DSL: every name `gs2-studio-dsl` and `gs2-studio-dsl/gs2` export, what
each member records, and the rules GS2 Studio applies when it builds the package. The code samples are parts of four
example packages (`example-inventory`, `example-heroes`, `example-gift-shop`, `example-gift-sale`). Before this
package is published, each example is type-checked against these declarations and built with `dsl build` into one
project, which then passes `project check`.

If you are an LLM coding agent, read [LLM.md](LLM.md) first.

## Contents

1. [Concepts](#concepts)
2. [Modules and imports](#modules-and-imports)
3. [Packages](#packages)
4. [Domain types](#domain-types)
5. [Properties](#properties)
6. [Keys and identity](#keys-and-identity)
7. [Instances](#instances)
8. [Overlay types](#overlay-types)
9. [Inline elements](#inline-elements)
10. [The GS2 catalog](#the-gs2-catalog)
11. [Master data resources](#master-data-resources)
12. [User data resources](#user-data-resources)
13. [Bindings](#bindings)
14. [Action programs and arguments](#action-programs-and-arguments)
15. [Action transforms](#action-transforms)
16. [Delegated actions](#delegated-actions)
17. [UI components](#ui-components)
18. [Code templates](#code-templates)
19. [Dependencies](#dependencies)
20. [The id ledger](#the-id-ledger)
21. [Building with dsl build](#building-with-dsl-build)
22. [Validation error kinds](#validation-error-kinds)
23. [Exported types](#exported-types)

## Concepts

| Term | Meaning |
| --- | --- |
| Package | What one DSL entry builds: `definePackage({ id, version, ... }).build()`. GS2 Studio writes it into a project as package files. |
| Domain type | A named record type of the game (`Item`, `Hero`), declared with `defineDomainType`. Every domain type has the reserved property `id`. |
| Property | A typed field of a domain type, with a binding hint and a requirement. |
| Instance (row) | One record of a domain type, authored with `instance(...)`. Its `id` is the row id. |
| Binding hint | Where a property's value comes from: GS2 master data, GS2 user data, asset delivery, or none. |
| Master data resource | A GS2 master data model (`GS2.inventory.SimpleItemModel`) declared with `defineMasterDataResource` and how its fields are filled from domain types. |
| User data resource | A GS2 per-player model (`GS2.inventory.SimpleItem`) declared with `defineUserDataResource` and how its fields map to domain type properties. |
| Binding | The value source of one GS2 field: a fixed value, a property, a placeholder, ... (`Bind.*`). |
| Action transform | A named, parameterized recipe declared with `defineActionTransform` that produces GS2 transaction actions (`Gs2Inventory:AcquireSimpleItemsByUserId`). |
| Delegated action | A method on a domain type that calls a GS2 action of one of the package's resources. |
| UI component | Generated Unity UI bindings declared with `defineUiComponent` for a domain type's properties and actions. |
| Overlay type | A local declaration (`defineOverlayDomainType`) that extends a type of a dependency: it adds properties and settings to the dependency's type. |
| Dependency surface | A JSON file that lists what a package publishes (types, property ids, transforms, resources) by name. |
| Id ledger | `id-ledger.json`: the generated ids of the package, kept so they stay the same from one build to the next. |

Names are what you write; ids are what GS2 Studio stores. Domain types, properties and action transforms get ids
(`dt_...`, `prop_...`, `at_...`) the first time they are built, and the ledger keeps them. Renaming something in the DSL
does not keep its id unless you move its ledger entry (see [The id ledger](#the-id-ledger)).

Naming rules the build enforces:

| Name | Rule |
| --- | --- |
| Package id | Segments of letters, digits, `_` and `-` joined by `/`, optionally starting with `@`. |
| Domain type name, inline element name | PascalCase: `^[A-Z][a-zA-Z0-9]*$`, at most 100 characters. |
| Property name | camelCase: `^[a-z][a-zA-Z0-9]*$`, at most 100 characters. `id` is reserved. |
| Instance id | Letters, digits, `_`, `.` and `-`, at most 128 characters (`instanceIdTooLong`), also a composite-key id no resource sends. A resource that binds `id` to a GS2 name sends the row id as that name: a `micro-economy-quest` `Quest` row id is the GS2 quest model name. The GS2 field it is bound to may take fewer characters (a Lottery prize id takes at most 36); deploy reports that. |
| UI component class name | PascalCase. |

## Modules and imports

GS2 Studio evaluates the entry file with Node's own loader after removing the TypeScript types. It does not type-check:
run `tsc --noEmit` yourself (the README gives the tsconfig). A DSL module may import only:

| Import | Resolves to |
| --- | --- |
| `gs2-studio-dsl` | The DSL runtime: `definePackage`, `defineDomainType`, `PT`, `Bind`, ... |
| `gs2-studio-dsl/gs2` | The GS2 catalog object `GS2`. |
| `./x`, `./x.ts`, `./x/index.ts` | A relative TypeScript file; an extensionless import tries these in this order. |
| `./x.json` | A relative JSON file, with or without `with { type: "json" }`. |
| `./x.njk?raw` | The text of a relative file (any extension). The only query an import may carry is `?raw`. |

Relative paths may start with `./` or `../` and reach any file on disk. Any other specifier (`node:fs`, another npm
package, `~/...`) is refused, and the published modules can be imported only
with a static `import`.

Only syntax that type stripping can remove is accepted: no `enum`, no `namespace` with values, no parameter properties.
Import types with `import type` (or `type` on the specifier): a type imported as a value does not exist at run time and
the import fails. Top-level `await` is refused.

```ts
import {
  ActionProgram,
  Bind,
  defineDomainType,
  defineMasterDataResource,
  defineOverlayDomainType,
  definePackage,
  defineUiComponent,
  dependencyPackage,
  instance,
  type LocalizedDisplay,
  PT,
  Source,
  transactionSettingV2,
  UiCond,
  UiItem,
  UiSource,
} from "gs2-studio-dsl";
import { GS2 } from "gs2-studio-dsl/gs2";

import inventorySurface from "./surfaces/example-inventory.json" with { type: "json" };
import giftShopTemplate from "./templates/GiftShop.cs.njk?raw";
```

## Packages

`definePackage(spec: PackageSpec): PackageDefinition` declares a package from plain data. Calling `.build()` compiles
and validates it; an entry module may export either the `PackageDefinition` directly or the result of `.build()`.

```ts
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

| Field | Records |
| --- | --- |
| `id` | The package id. |
| `version` | The package version string. |
| `display?` | The package's `LocalizedDisplay` label and description per locale. |
| `dependencies?` | `Record<string, string>` mapping dependency package ids to their source spec (see [Dependencies](#dependencies)). |
| `domainTypes?` | Local and overlay domain type definitions made with `defineDomainType` or `defineOverlayDomainType`. |
| `delegatedActions?` | Package-level delegated actions `{ target, methodName, action }[]`, where `action` is a `DelegatedActionDef`, including actions hosted on a dependency's type (see [Delegated actions](#delegated-actions)). |
| `instances?` | Rows made with `instance(...)` (see [Instances](#instances)). |
| `overlayInstances?` | Row overrides/suppressions made with `overlayInstance(...)` (see [Instances](#instances)). |
| `masterDataResources?` | Root master data resource definitions made with `defineMasterDataResource` (see [Master data resources](#master-data-resources)). |
| `userDataResources?` | Root user data resource definitions made with `defineUserDataResource` (see [User data resources](#user-data-resources)). |
| `actionTransforms?` | Action transform definitions made with `defineActionTransform` (see [Action transforms](#action-transforms)). |
| `uiComponents?` | UI component definitions made with `defineUiComponent` (see [UI components](#ui-components)). |
| `codeTemplates?` | `{ outputFileName, templateSource }[]` (see [Code templates](#code-templates)). |

`LocalizedDisplay` is `{ [locale: string]: { label?: string; description?: string; unit?: string } }`, for example
`{ en: { label: "Item", description: "An item a player can own." } }`.

A package may not depend on itself (`selfDependencyNotAllowed`).

## Domain types

`defineDomainType(name, spec?)` returns a plain-data `LocalDomainTypeDef` handle that you include in
`definePackage({ domainTypes: [...] })` and pass directly to `PT.ref(...)`, `instance(...)`, `Source.direct(...)`,
`defineMasterDataResource({ mount })`, `defineUiComponent(...)` and `inlineElementOf(...)`.

```ts
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
```

The handle carries its declared property names in its TypeScript type, so `sort`, `compositeKey`,
`localizedProperties`, `Source.direct(definition, ...)` and `instance(definition, ...)` are checked by `tsc`.

| Field | Records |
| --- | --- |
| `properties?` | `{ [propertyName]: PT.<kind>()... }`. The name `id` is refused by the type checker and by the build (`reservedPropertyName`). |
| `localizedDisplay?` | The domain type's `LocalizedDisplay` label and description per locale. |
| `localizedProperties?` | Label, description and unit of `id` and/or declared properties. Takes precedence over `.display(...)` on individual properties. |
| `singleEntry?` | `true` when the type has exactly one row (see [Keys and identity](#keys-and-identity)). |
| `sort?` | `{ key: propertyName \| "id" \| null, direction?: "asc" \| "desc" }`. |
| `compositeKey?` | `[propertyName, ...]` composing row ids from those properties. |
| `delegatedActions?` | `{ [methodName]: DelegatedActionDef }` (see [Delegated actions](#delegated-actions)). |

A definition does nothing until it is registered in `definePackage({ domainTypes: [...] })`: using an unregistered
definition in a resource mount, a binding source or a package-level delegated action fails the build with
`domainTypeDefinitionNotRegistered`, in an instance with `invalidInstanceType`, and as a UI component's target with
`uiComponentTargetTypeUnknown`. Two types with the same name fail with `duplicateDomainTypeName`.

## Properties

### Property types

`PT` builds immutable `PropertySpec` descriptors used inside `properties: { ... }`, `PT.listOf(...)` and action
transform parameters.

| Call | Type | Instance value |
| --- | --- | --- |
| `PT.string()` | string | `string` |
| `PT.int32()`, `PT.int64()` | integer | `number` |
| `PT.float32()`, `PT.float64()` | floating point | `number` |
| `PT.bool()` | boolean | `boolean` |
| `PT.timestamp()` | timestamp | `string` |
| `PT.localizedString()` | text per locale, delivered as an asset (only with `.assetDelivery()`) | `{ [locale]: string }`, such as `{ ja: "森の巡回", en: "Forest Patrol" }` |
| `PT.enum(...values)` | one of `values` | `string` |
| `PT.ref(target)` | a reference to a row of another type (`LocalDomainTypeDef`, `OverlayDomainTypeDef`, `DependencyDomainTypeRef`, or `() => target` for forward/self references) | the row id (`string`) |
| `PT.inline(target)` | a value of another domain type, embedded | an object |
| `PT.listOf(elementType)` | a list | an array |
| `PT.inlineElement(schema)` | an element of a list, from `defineInlineElement` (only inside `PT.listOf`) | an object |
| `PT.verifyAction()`, `PT.consumeAction()`, `PT.acquireAction()` | a GS2 transaction action | an action value |

`PT.ref` takes a domain type handle (`Item`), a thunk (`() => Item`) for circular or forward references, or a
dependency type handle (`dep.type("Item")`; see [Dependencies](#dependencies)). An unregistered target fails with
`invalidRefTarget`.

`example-heroes` delivers its data to the client as assets, so its properties use `.assetDelivery()` and no GS2 resource
binds them:

```ts
const Hero = defineDomainType("Hero", {
  properties: {
    rarity: PT.ref(Rarity).assetDelivery().required(),
    element: PT.enum("Fire", "Water", "Wind").assetDelivery().required(),
    attack: PT.int32().assetDelivery().required(),
    maxAttack: PT.int32().assetDelivery().required(),
    limited: PT.bool().assetDelivery().required(),
    availableUntil: PT.timestamp().assetDelivery().requiredWhen(Cond.eq("limited", true)),
    tags: PT.listOf(PT.string()),
  },
  localizedDisplay: text("Hero", "A hero a player can recruit."),
  localizedProperties: {
    id: text("ID", "Identifies the hero."),
    rarity: text("Rarity", "How rare the hero is."),
    element: text("Element", "The hero's element."),
    attack: text("Attack", "Attack at the first level."),
    maxAttack: text("Max attack", "Attack at the last level."),
    limited: text("Limited", "Whether the hero is offered for a limited time."),
    availableUntil: text("Available until", "When a limited hero stops being offered."),
    tags: text("Tags", "Free-form search tags."),
  },
});
```

### Property modifiers

Each modifier returns a new immutable `PropertySpec`:

| Modifier | Records |
| --- | --- |
| `.required()` | The property must have a value. |
| `.requiredWhen(condition, requiredWhenMet = true)` | Required when `condition` holds (or, with `requiredWhenMet = false`, when it does not). |
| `.optionalWhen(condition)` | Same as `.requiredWhen(condition, false)`. |
| `.masterData()` | Binding hint `masterData`: a master data resource fills the property. |
| `.userData()` | Binding hint `userData`: a user data resource fills the property. |
| `.assetDelivery()` | Binding hint `assetDelivery`: the value is delivered to the client as an asset. |
| `.display(entry)` | The property's `LocalizedDisplay` label, description and unit. |

Without a modifier a property is optional and its binding hint is `none`. The last requirement modifier wins.

`dsl build` refuses a `.masterData()` property that no master data resource binds ("No master data resource binds this
property.") and a `.userData()` property that no user data resource binds ("No user data resource binds this
property."): bind it, or remove the hint.

Choose the hint by what reads the value. This holds for a property an overlay adds as well:

| What reads the value | Hint | Why |
| --- | --- | --- |
| The game client, from the rows the package authors: a UI component shows it, or game code reads it | `.assetDelivery()` | Code generation writes each row's value into an asset the client loads. It needs no resource. |
| Only deploy: an `actionPropertyTransforms` argument (`{ kind: "domainProperty", propertyName }`) turns it into a GS2 action | none, or `.assetDelivery()` when the client shows it too | Deploy reads the row's value whatever the hint. |
| A field of a GS2 master data model, filled by a master data resource of this package (`Bind.domainProperty`, `ActionProgram.domainProperty`) | `.masterData()` | The client reads it from GS2 master data. Only the package's own resources count, so a package cannot fill it through a dependency's resource. |
| Per-player state that a user data resource of this package fills | `.userData()` | Rows hold no value for it, so an argument that reads it gets none. |

A property without a hint is still a member of the generated model, but nothing fills it on the client: a UI item that
shows it shows the member's default (empty or `0`).

Binding hints the build accepts for each shape:

| Property | Accepted hints |
| --- | --- |
| `PT.localizedString()` | `assetDelivery` only |
| `PT.inline(T)` | any but `masterData` |
| `PT.listOf(PT.inline(T))` | `userData`, `none` |
| `PT.listOf(PT.inlineElement(schema))` | `masterData` only |
| a member of `compositeKey` | `masterData`, `assetDelivery` |
| an `elementKey` member of an inline element | `masterData` only |
| any other property of an inline element | `masterData`, `assetDelivery` |

### Localized text

A `PT.localizedString` property holds one text per locale on each row, for text the game shows in the player's
language, such as a quest's display name. Declare one property, not one per language:

```ts
displayName: PT.localizedString().assetDelivery(),
```

A row gives it `displayName: { ja: "エリクサー", en: "Elixir" }` ([Instances](#instances)), and a `label` shows it:

```ts
UiItem.label("NameLabel", UiSource.prop("displayName")),
```

- Locales are BCP 47 tags (`en`, `ja`, `zh-Hant`); a row may hold any set of them. Every text must be non-empty, and
  `.required()` asks for at least one.
- Only `.assetDelivery()` is accepted: no GS2 resource field holds text per locale, so it is neither a binding nor an
  action transform argument. It cannot be a list element, a key or sort member, a transform parameter, or a property of
  an inline element.
- Unity: generated code reads it as `Gs2Bind.Localization.Gs2LocalizedText`, which `io.gs2.bind` releases after
  2026.9.11 provide; a project without localized properties needs no newer `io.gs2.bind`.
  A `label` shows the translation for `Gs2Locale.Current`: the exact locale, then the same language, then `en`, then
  `ja`, then the first one. The locale starts from the device language; with `com.unity.localization` installed it
  follows Unity Localization's selected locale with nothing to set up, and without it the game calls
  `Gs2Locale.Set("ja")`.

A `templateLabel` placeholder and a `UiCond` operand read it too, as the translation a `label` shows:

```ts
UiItem.templateLabel("GiftTagLabel", "{name}: {message}", {
  name: UiSource.prop("displayName"),
  message: UiSource.prop("giftMessage"),
}),
UiItem.activeToggle("NameToggle", UiCond.truthy(UiSource.prop("displayName"))),
```

- A `templateLabel` placeholder is replaced by the translation, or by empty text when the row has none.
- In a condition, a row without a translation reads as empty text `""`. `UiCond.truthy` holds when the row has at least
  one translation; the fallback above finds one for every locale, so the result does not depend on the locale.
  `UiCond.eq` and `UiCond.neq` compare the translation for `Gs2Locale.Current` with a string literal, a `string`
  property or other localized text, exactly (case-sensitive): `UiCond.eq(UiSource.prop("displayName"), UiSource.lit("Elixir"))`
  holds only while the locale resolves to that text.
- Localized text has no order, and comparing it with a number, a boolean, `null` or a property that is not text gives
  the same result for every row, so `gt`, `gte`, `lt`, `lte` and those comparisons leave the item out of code generation
  with a warning that `dsl build` and `project check` report.
- Like a `label`, a `templateLabel`, `activeToggle` or `interactable` that reads localized text applies itself again
  when `Gs2Locale.Changed` fires while it is enabled.

### Conditions

`Cond` builds the conditions of `requiredWhen` and `optionalWhen`. `propertyName` names another property of the same
type.

| Member | Holds when |
| --- | --- |
| `Cond.eq(propertyName, value)`, `Cond.neq(propertyName, value)` | The property equals (does not equal) `value` (`string \| number \| boolean`). |
| `Cond.gt`, `Cond.gte`, `Cond.lt`, `Cond.lte` `(propertyName, value: number)` | The numeric comparison holds. |
| `Cond.isSet(propertyName)`, `Cond.isNotSet(propertyName)` | The property has (has no) value. |
| `Cond.and(first, ...rest)`, `Cond.or(first, ...rest)` | All (any) of at least one condition. |
| `Cond.not(condition)` | `condition` does not hold. |

## Keys and identity

Every type has the reserved property `id`; a row's `id` identifies it within its type. Three settings change how rows
are identified and ordered.

**Single entry.** `singleEntry: true` declares a type with one row. That row's id must be the type name in lower case
(`GameSettings` → `gamesettings`); another id fails with `singleEntryInstanceIdMismatch`, whose `expectedId` names the
id to use. A single-entry type cannot also have a composite key.

```ts
const GameSettings = defineDomainType("GameSettings", {
  singleEntry: true,
  properties: {
    partySize: PT.int32().assetDelivery().required(),
  },
  localizedDisplay: text("Game settings", "Settings shared by the whole game."),
  localizedProperties: {
    id: text("ID", "The one settings row."),
    partySize: text("Party size", "How many heroes a party holds."),
  },
});
```

**Composite key.** `compositeKey: [first, ...rest]` makes each row id the members' values joined with `.`. Members must
be declared properties of type `string`, `int32`, `int64`, `bool`, `enum` or `ref`, with hint `masterData` or
`assetDelivery`; `id`, duplicates and unknown names fail with `invalidCompositeKey`. The parts are joined in the order of
the members' **property ids** (as the ledger records them), not in the order you pass them, and a member value may not
contain `.`. A row id that differs from the composed id fails `dsl build` ("instance ids that no longer match their
composite-key values"), and a failed build writes no ledger. The member ids are random until the ledger records them, so
author a composite-key type in two steps: build it with `--write-ledger` before it has rows, read the members'
`property:<Type>.<name>` ids in `id-ledger.json`, then add the rows with their values in ascending id order and build
again.

```ts
const HeroLevel = defineDomainType("HeroLevel", {
  properties: {
    hero: PT.ref(Hero).assetDelivery().required(),
    level: PT.int32().assetDelivery().required(),
    attack: PT.int32().assetDelivery().required(),
  },
  compositeKey: ["hero", "level"],
  localizedDisplay: text("Hero level", "A hero's stats at one level."),
  localizedProperties: {
    id: text("ID", "Composed from the hero and the level."),
    hero: text("Hero", "The hero this level belongs to."),
    level: text("Level", "The level number."),
    attack: text("Attack", "Attack at this level."),
  },
});
```

**Sort order.** `sort: { key: propertyName, direction? }` orders rows by a property that is required (`.required()`) and
of a primitive or enum type, or by `"id"`; otherwise the build fails with `invalidSortKey`. `{ key: null, direction }`
sorts by the reserved id. Without `sort`, rows sort by id ascending. An overlay orders its rows as the type it overlays
unless it gives a `sort` other than id ascending ([Overlay types](#overlay-types)).

```ts
const Rarity = defineDomainType("Rarity", {
  properties: {
    weight: PT.int32().assetDelivery().required(),
  },
  sort: { key: "weight", direction: "desc" },
  localizedDisplay: text("Rarity", "How rare a hero is."),
  localizedProperties: {
    id: text("ID", "Identifies the rarity."),
    weight: text("Weight", "Higher weights sort first."),
  },
});
```

## Instances

`instance(type, id, values)` creates an `AuthoredInstanceSpec` passed in `definePackage({ instances: [...] })`.

| Target | Value keys |
| --- | --- |
| `LocalDomainTypeDef` | Property names of the definition (checked against declared names by `tsc`). `tsc` asks for every `.required()` property except `.userData()` ones, whose values a user data resource fills per player. |
| `OverlayDomainTypeDef` | Declared property names of the overlay, published names of its source type, or property ids. |
| `DependencyDomainTypeRef` (`dep.type("T")`) | Property names the dependency publishes for the type, or property ids. |

Values are JSON: `string`, `number`, `boolean`, `null`, arrays and objects. A `ref` value is the target row's id; a
list value is an array; an inline element list is an array of objects keyed by the element's property names. A key that
names no property fails with `unresolvedPropertySlot`. A row of an unregistered type fails with `invalidInstanceType`.

```ts
instances: [
  instance(Rarity, "common", { weight: 1 }),
  instance(Rarity, "rare", { weight: 10 }),
  instance(Hero, "blaze", {
    rarity: "rare",
    element: "Fire",
    attack: 12,
    maxAttack: 120,
    limited: false,
    tags: ["starter"],
  }),
  instance(HeroLevel, "blaze.1", { hero: "blaze", level: 1, attack: 12 }),
  instance(HeroLevel, "blaze.2", { hero: "blaze", level: 2, attack: 18 }),
  instance(GameSettings, "gamesettings", { partySize: 4 }),
],
```

`overlayInstance(type, sourceInstanceId, { overrides?, suppressed? })` creates an `OverlayInstanceSpec` passed in
`definePackage({ overlayInstances: [...] })`. It changes a row that a dependency ships without copying it: `overrides`
replaces the listed values (keys resolve like `instance` keys); `suppressed` is a boolean flag on the row. `type` is a
dependency type (`dep.type("T")`) or an `OverlayDomainTypeDef`. An overlay row aimed at a local type fails with
`invalidInstanceDomainTypeKind`.

## Overlay types

An overlay type extends a dependency's type: rows of the overlay are rows of the dependency's type, and the overlay adds
properties and settings. Make one with `defineOverlayDomainType(name, options, spec?)` and include it in
`definePackage({ domainTypes: [...] })`; `options` usually comes from `dep.overlay("TypeName")`, which supplies the
source, `singleEntry` and the published properties, inline schemas and delegated actions.

```ts
const Item = defineOverlayDomainType("Item", inventory.overlay("Item"), {
  properties: {
    giftMessage: PT.string().assetDelivery(),
    displayName: PT.localizedString().assetDelivery(),
  },
  localizedProperties: {
    giftMessage: text("Gift message", "Shown when the item arrives as a gift."),
    displayName: text("Display name", "The item's name in the player's language."),
  },
});
```

Inherited properties are addressed by the names the dependency publishes, for example in `UiSource.prop(...)`,
`Source.direct(...)` and instance values.

| Field in `spec` | Records |
| --- | --- |
| `properties?` | `{ [propertyName]: PT.<kind>()... }` added by this overlay. |
| `localizedDisplay?` | The overlay type's `LocalizedDisplay` label and description per locale. |
| `localizedProperties?` | Display metadata for added properties. |
| `sort?` | `{ key: propertyName \| null, direction?: "asc" \| "desc" }`. Without it, the overlay keeps the dependency's order, as does the overlay that `defineUiComponent`, `delegatedActions`, `UiCond.rowElement` and `UiSource.rowProp` create for a dependency type (`types.<Type>.sort` of the surface). It replaces that order; `{ key: null }` with `"asc"` is the same as no `sort`. |
| `compositeKey?` | `{ kind: "inherit" }`, `{ kind: "suppress" }`, or `{ kind: "override", members: [...names] }`. |
| `actionPropertyTransforms?` | Transform calls attached to an action property of the type: `{ targetProperty, mode?: "replace" \| "append", transform, arguments }` for a transform of this package (its `ActionTransformDef` or `() => transform`), or `{ targetProperty, mode?, transformPackageId, transformId, arguments }` for a dependency's. `mode` defaults to `"replace"`; `"append"` lets several packages add to the same action. `arguments` is `{ parameterName, source }[]`, where `source` is `{ kind: "static", value }`, `{ kind: "domainProperty", propertyName }`, `{ kind: "actionLiteral", value }`, `{ kind: "placeholder", value }` or a nested `{ kind: "actionTransformRef", invocation }`. For a dependency's transform, write `{ targetProperty, mode, ...dep.transformCall(name, { <parameter>: source }) }`. `dsl build` refuses a top-level argument the transform does not declare, one named twice, and a missing required one. |
| `delegatedActions?` | `{ [methodName]: DelegatedActionDef }`, as [delegated actions](#delegated-actions). |
| `renamedInheritedProperties?` | `Record<string, string>`; not covered by this reference. |

Names in `sort`, `compositeKey` and `targetProperty` resolve against the overlay's own properties and the published
ones; a name that resolves to neither fails with `unresolvedPropertySlot`. Two overlays of the same source type fail
with `duplicateOverlaySource`.

`example-gift-sale` overlays `example-gift-shop`'s `GiftBox`, whose published `cost` is a `list<consumeAction>`. It adds
a `price` and appends `example-inventory`'s `ConsumeItem` to `cost`, so every box costs `price` coins. Each row of the type
gets the transform, the gift shop's own rows included; `overlayInstance` gives the gift shop's `starter` row its price:

```ts
import {
  defineOverlayDomainType,
  definePackage,
  defineUiComponent,
  dependencyPackage,
  instance,
  type LocalizedDisplay,
  overlayInstance,
  PT,
  UiCond,
  UiItem,
  UiSource,
} from "gs2-studio-dsl";

import giftShopSurface from "./surfaces/example-gift-shop.json" with { type: "json" };
import inventorySurface from "./surfaces/example-inventory.json" with { type: "json" };

function text(label: string, description: string): LocalizedDisplay {
  return { en: { label, description } };
}

const giftShop = dependencyPackage(giftShopSurface);
const inventory = dependencyPackage(inventorySurface);

// The price is a property this package adds to the gift shop's GiftBox. Inventory's ConsumeItem turns it into an action
// that is appended to the cost of every box, so opening a box consumes that many coins.
const GiftBox = defineOverlayDomainType("GiftBox", giftShop.overlay("GiftBox"), {
  properties: {
    price: PT.int32().assetDelivery().required(),
  },
  // Every generated list of gift boxes shows the cheapest box first.
  sort: { key: "price", direction: "asc" },
  actionPropertyTransforms: [
    {
      targetProperty: "cost",
      mode: "append",
      ...inventory.transformCall("ConsumeItem", {
        itemName: { kind: "static", value: "coin" },
        count: { kind: "domainProperty", propertyName: "price" },
      }),
    },
  ],
  localizedProperties: { price: text("Price", "How many coins opening the box costs.") },
});

export const exampleGiftSale = definePackage({
  id: "example-gift-sale",
  version: "0.0.1",
  display: text("Gift sale", "Gift boxes that cost coins to open."),
  dependencies: {
    [giftShop.packageId]: "*",
    [inventory.packageId]: "*",
  },
  domainTypes: [GiftBox],
  instances: [
    instance(inventory.type("Item"), "coin", {}),
    instance(GiftBox, "premium", { item: "elixir", count: 10, price: 5 }),
  ],
  // The gift shop's own box needs a price too.
  overlayInstances: [overlayInstance(GiftBox, "starter", { overrides: { price: 1 } })],
  uiComponents: [
    defineUiComponent(GiftBox, {
      items: [
        UiItem.templateLabel("PriceLabel", "{price} coins", { price: UiSource.prop("price") }),
        // name and description label the item in GS2 Studio's editor only.
        UiItem.value("PriceValue", UiSource.prop("price"), {
          name: "Price (number)",
          description: "Sends the price as an int for the game to format.",
        }),
        // Disables the box's Open button while the player owns fewer coins than the box costs. The coin row of
        // inventory's Item is read from the Item Handler above this row in the scene.
        UiItem.interactable(
          "AffordableInteractable",
          UiCond.gte(
            UiSource.rowProp(inventory.type("Item"), "coin", "count"),
            UiSource.prop("price")
          )
        ),
      ],
    }),
  ],
});
```

`dep.transformCall(name, args)` takes one source per parameter name:

| Source | Argument value |
| --- | --- |
| `{ kind: "static", value }` | A fixed JSON value. A `ref<T>` parameter takes a row id of `T`. |
| `{ kind: "domainProperty", propertyName }` | The value of the row's property `propertyName`: an added or a published property of the overlay. |
| `{ kind: "placeholder", value }` | `value` passed through unchanged, for example `#{slot}`. |
| `{ kind: "actionLiteral", value }`, `{ kind: "actionTransformRef", ... }` | Signature only; not covered by this reference. |

These are the shapes of an `actionPropertyTransforms` argument, which names a property of the row. `dep.transformProgram`
takes the shapes of an action program argument instead, which name a property through a `Source`
(`{ kind: "domainProperty", source: Source.direct(...) }`; see
[Action programs and arguments](#action-programs-and-arguments)).

## Inline elements

An inline element is the element type of a list property: each row of the host type holds a list of elements, and the
element has no table of its own. `defineInlineElement(name, spec)` makes the element schema, and
`PT.listOf(PT.inlineElement(schema))` declares the list property, which must have the hint `masterData`.

| Field | Records |
| --- | --- |
| `properties` | `{ [propertyName]: PT.<kind>()... }` declared on the element. |
| `elementKey?` | The property names that identify an element within its row. The element id is the row id and the key values joined with `.`. |
| `localizedDisplay?` | The element type's `LocalizedDisplay` label and description. |
| `localizedProperties?` | Display metadata for `id` and/or element properties. |
| `sort?` | `{ key: propertyName \| "id" \| null, direction?: "asc" \| "desc" }`. |
| `delegatedActions?` | `{ [methodName]: DelegatedActionDef }` on the element. |

A schema may back one list property only; attaching it to a second property fails with `invalidBindingValue`.

`inlineElementOf(host, firstPropertyName, ...nestedPropertyNames)` refers to the elements of a list property, for
`mount` of a resource, `Source.direct(...)`, `defineUiComponent(...)` and `UiCond.rowElement(...)`. `host` is a domain
type handle (`LocalDomainTypeDef`, `OverlayDomainTypeDef`, `DependencyDomainTypeRef`) or a thunk `() => host`.

## The GS2 catalog

`GS2` (from `gs2-studio-dsl` or `gs2-studio-dsl/gs2`) lists every GS2 service and model the DSL can configure:
`GS2.<service>.<Model>` is `{ service, modelName }`, for example `GS2.inventory.SimpleItemModel`. Passing it to a
resource's `model` field types the resource's `bindings` with that model's fields. Action names in transforms and
delegated actions are written `Gs2<Service>:<ActionName>` (`Gs2Inventory:AcquireSimpleItemsByUserId`) and
`Gs2<Service>:<Model>.<Method>` (`Gs2Exchange:RateModel.Exchange`).

## Master data resources

A master data resource configures one GS2 master data model. Without a `mount` it is one entry (a namespace, a settings
model); mounted on a domain type it is one entry per row of that type, with field values taken from the row. Only a
mounted resource can read properties (`Bind.domainProperty`); see [Bindings](#bindings) for what each kind accepts.

Declare one with `defineMasterDataResource({ model, ... })` and include it in `definePackage({ masterDataResources })`
(or in a parent's `children` / `arrayChildren`). Include each definition in one place; a definition included twice fails with
`resourceDefinitionAttachedTwice`, so make a second definition for a second resource. Each resource definition is a plain-data handle you can pass directly
(or via `() => resource` for forward references) to `linkedMaster`, `resourceLink`, `grnFieldMounts`, `targetResource`,
or action transform outputs.

```ts
const SimpleItemModel = defineMasterDataResource({
  model: GS2.inventory.SimpleItemModel,
  mount: Item,
  bindings: {
    name: Bind.domainProperty(Source.direct(Item, "id")),
  },
});
```

```ts
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
```

| Field | Records |
| --- | --- |
| `model` | `GS2.<service>.<Model>`. Types `bindings`. |
| `mount?` | A domain type handle (`LocalDomainTypeDef`, `OverlayDomainTypeDef`, `DependencyDomainTypeRef`), thunk `() => Type`, or `inlineElementOf(...)`. One entry per row of the type or per element of the inline element list. |
| `bindings?` | The fields' values (see [Bindings](#bindings)), typed by the model. |
| `domainPropertyBindings?` | The same, untyped: field paths the catalog schema does not describe. |
| `children?` | Child `MasterDataResourceDef[]`, such as a model inside a namespace. |
| `arrayChildren?` | `{ [arrayFieldName]: MasterDataResourceDef[] }`: elements of array fields of this model, such as `acquireActions`. Each child's model must be the field's element model. |
| `actionProgram?` | For an action model (`GS2.transaction.AcquireAction`, ...): the action this entry performs (see [Action programs](#action-programs-and-arguments)). |
| `actionPropertyPrograms?` | `{ [propertyName]: ActionProgram }` for action fields; not covered further by this reference. |
| `resourceLink?` | A local resource handle (or `() => resource`), or `{ kind: "external", sourcePackageId, resourceKind, resourceId }` for a dependency's resource. The resource whose key `Bind.resourceKey()` reads. |
| `grnFieldMounts?` | `{ parameterName, mountedResource, keyMappings: [{ grnKeyName, sourceKeyName }] }[]`. Fills the keys of a GRN field from the keys of another master data resource (or dependency resource id). |
| `grnKeyBindings?` | `{ parameterName, keyName, directive }[]`. Binds one key of a GRN field. |
| `rowScope?` | `{ kind: "allRows" }`, `{ kind: "matched", ancestor, direction, refType, property }`, or `{ kind: "fkFanout", childType, fkProperty }`. Controls which rows are included under each entry of an ancestor resource. |

Build failures specific to resources: a child whose model is not the element model of the array field
(`arrayElementLocationMismatch`), an array field that holds no model (`arrayElementParentPropertyUnresolved`), an
unknown mount (`invalidMountPath`), a reference to a resource that was never included in the package
(`unresolvedResourceRef`), and `Source.parent(...)` with no ancestor to point at (`unresolvedParentBinding`).

## User data resources

A user data resource describes one GS2 per-player model and which properties its fields fill. Declare it with
`defineUserDataResource({ model, ... })` and include it in `definePackage({ userDataResources })` (or in a parent's
`children`).

```ts
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
```

| Field | Records |
| --- | --- |
| `model` | `GS2.<service>.<Model>`. Types `bindings`. |
| `linkedMaster?` | The `MasterDataResourceDef` (or `() => master` / resource id string) the model belongs to; the link supplies the model's identity independently of the mount. |
| `mount?` | The domain type handle whose rows the user data belongs to. |
| `bindings?` | The fields (see [Bindings](#bindings)). User data accepts `Bind.static`, `Bind.null`, `Bind.nulls`, `Bind.skip`, `Bind.domainProperty`, `Bind.domainProperties` and `Bind.domainPropertyKey`; other kinds fail with `invalidBindingValue`. |
| `domainPropertyBindings?` | Untyped field bindings for paths the catalog schema does not describe. |
| `existenceProperty?` | A `bool` property name that records whether the user data exists. |
| `arrayMembershipMappings?` | `{ parameterName, child, targetKeyProperty, targetProperty }[]`: a field that lists names; each row of `child` whose `targetKeyProperty` appears in the list gets `true` in `targetProperty`. |
| `grnRefBindings?` | `{ parameterName, grnFormat, keyMappings: [{ extractedKeyName, target, targetKeyProperty }] }[]`: reads keys out of a GRN field and matches them to rows of `target`. |
| `modelArrayDecodeBindings?` | `{ parameterName, target, targetListProperty, fieldMappings: [{ fieldName, targetProperty }], idSourceField? }[]`: decodes an array of GS2 models into an inline list property. |
| `elementProjectionBindings?` | `{ parameterName, target, entries: [{ selectors: [{ fieldName, value }], projections: [{ fieldName, targetProperty }] }] }[]`: picks array elements whose fields equal `selectors` and copies their fields into properties. |
| `transformDecodeBindings?` | `{ parameterName, target, targetListProperty, entries }[]`; signature only, not covered by this reference. |
| `keyProjectionBindings?` | `{ parameterName, target, targetProperty }[]`: copies a resolved key into a property without replacing its own binding. |
| `children?` | Child `UserDataResourceDef[]`. |

## Bindings

`bindings: { ... }` maps GS2 field names to directives. Nested objects follow nested fields: `{ platformSetting: { fake:
{ acceptFakeReceipt: ... } } }` binds the field path `platformSetting.fake.acceptFakeReceipt`. A field you leave out is
not bound.

| Directive | Value of the field |
| --- | --- |
| `Bind.static(value)` | A fixed JSON value. |
| `Bind.null()` | `null`. |
| `Bind.nulls(...parameterNames)` | An object with `Bind.null()` for each name; spread it into the record. |
| `Bind.skip()` | The field is not written: no value is sent to GS2 (master data) and the field is not read into a property (user data). |
| `Bind.domainProperty(source)` | The property `source` names. |
| `Bind.domainProperties(sources)` | User data: each of the properties `sources` names. Master data does not support it (see below). |
| `Bind.domainPropertyKey(source, suffix)` | User data only: the property's value with `suffix` appended, used as a key. The value is not written back. |
| `Bind.resourceKey()` | Master data only: the key of the resource set with `resourceLink`. |
| `Bind.placeholder(text)` | Master data only: `text` passed through unchanged, for example `#{userId}`. |
| `Bind.expression(expression)` | Master data only: an expression binding; its syntax is not covered by this reference. |

Some master data bindings pass `dsl build` but are refused by the editor and code generation: `Bind.domainProperties`
in any master data resource, and `Bind.domainProperty` or `Bind.expression` in a master data resource that is not
mounted on a domain type (such as a namespace). Such a resource accepts `Bind.static`, `Bind.null`, `Bind.nulls`,
`Bind.placeholder`, `Bind.skip` and `Bind.resourceKey`.

`Source` names a property relative to the resource that binds it:

| Member | Names |
| --- | --- |
| `Source.direct(target, propertyName)` | A property of the type (`LocalDomainTypeDef`, `OverlayDomainTypeDef`, `DependencyDomainTypeRef`, or `inlineElementOf(...)`) the resource is mounted on. With a local definition, `propertyName` is type-checked. |
| `Source.parent(source)` | `source`, read one resource level up (the parent resource's mount). Nest it to go further up. |
| `Source.idRef(origin, [{ refPropertyName, target }, ...], propertyName)` | A property reached by following ref properties from `origin`. |
| `Source.dependencyResource(sourcePackageId, resourceKind, resourceId, source)` | Signature only; not covered by this reference. |

Presets that return a complete binding record for a common settings block:

| Function | Returns |
| --- | --- |
| `transactionSettingV2(overrides?)` | `{ distributorNamespaceId, enableParallelExecution }`, defaulting to the GRN `grn:gs2:{region}:{ownerId}:distributor:default` and `false` (actions run one at a time). Bind it to a namespace's `transactionSettingV2` field. |
| `scriptSetting(options?)` | `{ triggerScriptId, doneTriggerTargetType, doneTriggerScriptId, doneTriggerQueueNamespaceId }`. Omitted fields are `null`; `doneTriggerTargetType` defaults to `"none"`, and the asynchronous script fields are accepted only with `doneTriggerTargetType: "gs2_script"`. |
| `scriptGrn(namespaceName, scriptName)` | `grn:gs2:{region}:{ownerId}:script:<namespaceName>:script:<scriptName>`. |

```ts
masterDataResources: [
  defineMasterDataResource({
    model: GS2.exchange.Namespace,
    bindings: {
      name: Bind.static("GiftShop"),
      ...Bind.nulls(
        "acquireAwaitScript",
        "exchangeScript",
        "incrementalExchangeScript",
        "logSetting"
      ),
      transactionSettingV2: transactionSettingV2(),
    },
    children: [GiftBoxRateModel],
  }),
],
```

## Action programs and arguments

An action model entry (an element of `acquireActions`, `consumeActions`, ...) gets its action from an
`ActionProgram`:

| Member | The action |
| --- | --- |
| `ActionProgram.transform(transform, args)` / `ActionProgram.transform(transformPackageId, transformId, args)` | The actions an action transform (a local `ActionTransformDef`/thunk, or a dependency's package id and transform id) produces for `args`. |
| `ActionProgram.transformEntry(transform, args)` / `ActionProgram.transformEntry(transformPackageId, transformId, args)` | One entry for `ActionProgram.transformEntries([...])`. |
| `ActionProgram.transformEntries(entries)` | Several transform calls. |
| `ActionProgram.domainProperty(source?)` | The actions held in an action property (`PT.listOf(PT.acquireAction())`, ...). |
| `ActionProgram.concrete(actionName, requestBindings)` | A GS2 action named directly, with its request fields bound by `Bind.*`. |

`Arg` gives the arguments of a transform call:

| Member | Argument value |
| --- | --- |
| `Arg.static(parameterName, value)` | A fixed JSON value. A value that is not JSON throws while the DSL evaluates. |
| `Arg.domainProperty(parameterName, source)` | A property (see `Source`). |
| `Arg.placeholder(parameterName, text)` | `text` passed through unchanged, for example `#{slot}`. |
| `Arg.actionTransformRef(parameterName, transform, args)` / `Arg.actionTransformRef(parameterName, transformPackageId, transformId, args)` | A nested transform call. |
| `Arg.actionLiteral(parameterName, value)` | Signature only; not covered by this reference. A value that is not JSON throws, as for `Arg.static`. |

A transform of this package is called with its handle (`ActionTransformDef` or `() => transform`). A
dependency's transform is called with `dep.transformProgram(name, args)`, which returns the same program as
`ActionProgram.transform`; `args` maps each parameter name to the `source` an `Arg.*` helper would produce
(`{ kind: "static", value }`, `{ kind: "domainProperty", source }`, ...). A property is named through a `Source`, unlike
the `{ kind: "domainProperty", propertyName }` of `dep.transformCall` (see [Overlay types](#overlay-types)). The
parameter names are checked against the dependency's surface by `tsc` and while the DSL evaluates. Unlike `Arg.static`,
a `static` value that is not JSON is not refused while the DSL evaluates; `dsl build` refuses it later.

`example-gift-shop` fills the `acquireActions` of a rate model with `example-inventory`'s `AcquireItem`, and its
`consumeActions` with the actions the box's `cost` property holds:

```ts
const GiftBoxRateModel = defineMasterDataResource({
  model: GS2.exchange.RateModel,
  mount: GiftBox,
  bindings: {
    name: Bind.domainProperty(Source.direct(GiftBox, "id")),
  },
  arrayChildren: {
    acquireActions: [
      defineMasterDataResource({
        model: GS2.transaction.AcquireAction,
        mount: GiftBox,
        actionProgram: inventory.transformProgram("AcquireItem", {
          itemName: {
            kind: "domainProperty",
            source: Source.parent(Source.direct(GiftBox, "item")),
          },
          count: {
            kind: "domainProperty",
            source: Source.parent(Source.direct(GiftBox, "count")),
          },
        }),
      }),
    ],
    consumeActions: [
      defineMasterDataResource({
        model: GS2.transaction.ConsumeAction,
        mount: GiftBox,
        actionProgram: ActionProgram.domainProperty(Source.parent(Source.direct(GiftBox, "cost"))),
      }),
    ],
  },
});
```

## Action transforms

`defineActionTransform(name, spec)` declares a transform: typed parameters in, GS2 actions out. Include it in
`definePackage({ actionTransforms: [...] })`.

```ts
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
```

| Field | Records |
| --- | --- |
| `category` | `"verify" \| "consume" \| "acquire"`: the transaction phase of the produced actions. |
| `parameters?` | `{ [name]: { type, description?, required? } }`. `type` is a primitive, enum, `ref` or action type, or a list of one; `required` defaults to `true`. An inline or inline element type fails with `unsupportedTransformParameterType`. |
| `outputs` | Array of direct outputs (`{ kind: "direct", actionName, resource?, parameterMappings?, conditions? }`) or delegation outputs (`{ kind: "delegation", target, arguments?, conditions? }`). |

A direct output's `parameterMappings` maps each request field of the action to its value, made with `OutputMap`. Field
paths may index arrays: `{ "acquireCounts[0].count": OutputMap.parameter("count") }`.

| Helper | The request field's value |
| --- | --- |
| `OutputMap.parameter(parameterName)` | The value of a parameter of the transform. |
| `OutputMap.static(value)` | A fixed JSON value. |
| `OutputMap.resourceKey()` | The target resource's key. Needs a target `resource`; top-level fields only. |
| `OutputMap.placeholder(text)` | `text` passed through unchanged, for example `#{userId}`. |
| `OutputMap.mountedResourceProperty(resource, keyPropertyName?)` | A value of the resource's mount; not covered further by this reference. |

Direct output `resource` is a local resource handle (or `() => resource`), or
`{ kind: "external", sourcePackageId, resourceKind, resourceId }` for a dependency's resource.

An output's `conditions` is `{ sourceParameter, operator, value }[]`: produce the output only when every parameter
compares to its `value` with its `operator` (`"eq"`, `"neq"`, `"gt"`, `"gte"`, `"lt"`, `"lte"`). `"gt"`, `"gte"`, `"lt"`
and `"lte"` apply only to numeric parameters; list and action parameters cannot be condition sources.

A delegation output's `target` is the transform it calls: a local `ActionTransformDef` (or `() => transform`), or
`{ transformPackageId, transformId }` for a dependency's. Its `arguments` maps each parameter of the target to
`{ kind: "parameter", sourceParameter }` (a parameter of this transform) or `{ kind: "static", value }`.

A local resource referred to by an output must be part of the package (`unresolvedResourceRef` / `invalidResourceRef`).

## Delegated actions

A delegated action gives a domain type a method that runs a GS2 action of one of the package's resources. UI buttons
call it by method name. Register it on the type (`delegatedActions: { Method: def }`), on an inline element, or on the
package (`definePackage({ delegatedActions: [{ target, methodName, action }] })`, where `action` is the
`DelegatedActionDef`); the package form also accepts a
dependency's type, and the package then hosts the method on a local overlay of that type.

```ts
delegatedActions: [
  {
    target: GiftBox,
    methodName: "Open",
    action: {
      targetActionKey: "Gs2Exchange:RateModel.Exchange",
      targetResource: GiftBoxRateModel,
      parameterOverrides: [{ parameterName: "count", source: { kind: "static", value: 1 } }],
    },
  },
],
uiComponents: [
  defineUiComponent(GiftBox, {
    items: [
      UiItem.templateLabel("ContentsLabel", "{count} x {item}", {
        count: UiSource.prop("count"),
        item: UiSource.prop("item"),
      }),
      UiItem.buttonAction("OpenButton", "Open"),
    ],
  }),
```

`DelegatedActionDef`:

| Field | Meaning |
| --- | --- |
| `targetActionKey` | The catalog action, `Gs2<Service>:<Model>.<Method>`. |
| `targetResource` | A master or user data resource handle (or `() => resource`) of this package. A resource of another package fails with `invalidDelegatedActionResourceRef`. |
| `parameterOverrides?` | `{ parameterName, source }[]`. `source` is `{ kind: "static", value }`, `{ kind: "domainProperty", propertyName }` (a property of the host type), `{ kind: "actionLiteral", value }` or `{ kind: "listEntries", entries }`. Parameters you do not override are left to the generated method's caller. |

Registering on a type the package does not include in `domainTypes` fails with `domainTypeDefinitionNotRegistered`.

## UI components

`defineUiComponent(target, { items })` declares the generated UI of a type and is included in
`definePackage({ uiComponents: [...] })`. `target` is a domain type handle (`LocalDomainTypeDef`,
`OverlayDomainTypeDef`, `DependencyDomainTypeRef` — the package hosts it on a local overlay), or
`inlineElementOf(...)` for the elements of a list property. Each target has at most one UI component
(`duplicateUiComponentDefinition`).

```ts
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
```

Value sources (`UiSource`):

| Member | Source |
| --- | --- |
| `UiSource.prop(name)` | A property of the target, `"id"` included. |
| `UiSource.inheritedProp(propertyId)` | An inherited property by its published id, when no name is available. |
| `UiSource.lit(value)` | A literal `string`, `number`, `boolean` or `null`. |
| `UiSource.bandLower(target, tablePropertyName, position)`, `UiSource.bandUpper(...)` | A table band source for `gauge` bounds; the table's type must be single entry (`uiComponentTableBandSourceNotSingleEntry`). Otherwise not covered by this reference. |
| `UiSource.bandLowerById(typeId, tablePropertyId, position)`, `UiSource.bandUpperById(...)` | The same, by published ids. |
| `UiSource.rowProp(target, rowId, propertyName)` | A number or `bool` property of row `rowId` of another type, for `UiCond` operands only ([Another type's row](#another-types-row)). `target` is a domain type handle (`LocalDomainTypeDef`, `OverlayDomainTypeDef`, `DependencyDomainTypeRef`, or a thunk `() => target`). |

Items (`UiItem`). Each takes a component class name first and an optional options object last. Every options object accepts
`name` and `description` ([Item options](#item-options)); the extra options of a kind are listed with it. Each item
becomes one generated Unity component that reads the row of its handler ([Rows in the game](#rows-in-the-game)); all but
`buttonAction` update whenever that row changes. No component writes to a `Text` or another UI element by itself: wire
`OnUpdate` to the element in the Inspector, and fill the target lists of `gauge`, `image`, `activeToggle` and
`interactable`.

| Item | Arguments | The generated component |
| --- | --- | --- |
| `UiItem.label(className, source, options?)` | `source`: `UiSource.prop(...)` or `UiSource.lit(...)`. `options.fallbackText`: the text sent while the property has no value. | Sends the value as text through `OnUpdate` (`UnityEvent<string>`). A `timestamp` is written `yyyy-MM-dd HH:mm`; other values are converted with `Convert.ToString`, so a list or inline element property does not show its contents. A `PT.localizedString` source sends the translation for the player's locale and sends again when the locale changes ([Localized text](#localized-text)); of the other items only `templateLabel` and the `UiCond` of `activeToggle` and `interactable` accept that source. |
| `UiItem.value(className, propertySource, options?)` | `propertySource`: `UiSource.prop(...)` of a property of a primitive type, a `ref`, or `"id"`. No literal. | Sends the value in its own C# type through `OnUpdate`: `UnityEvent<int>` for `int32`, `long` for `int64`, `float`, `double`, `bool`, `string`, `DateTime` for `timestamp`, and `string` for a `ref` or `"id"`. A missing value is sent as the type's default (`0`, `""`). `Select(value)` raises `OnSelect` with a value the game passes. Any other property type (`enum`, a list, an inline element) leaves the item out with a warning. |
| `UiItem.templateLabel(className, template, sources, options?)` | `template` with `{key}` placeholders; `sources` maps each key to a source. Every placeholder needs exactly one source and every source a placeholder. `options.fallbackText`: the text sent while no row is loaded. | Sends `template` with each `{key}` replaced by its value through `OnUpdate` (`UnityEvent<string>`). A `PT.localizedString` source is replaced by the translation for the player's locale, and the text is sent again when the locale changes ([Localized text](#localized-text)). |
| `UiItem.image(className, source, imageMode, options?)` | `imageMode`: `"spriteResourcePath"`, `"addressableKey"`, `"url"` or `"assetReference"`. `options.fallback`: the reference used while the property has no value. | Calls `partial void ApplyImage(Image target, string reference)`, which the game implements in its own part of the class to load the image; `ImageMode` names the mode. The generated code loads nothing. |
| `UiItem.gauge(className, current, max, options?)` | Numeric sources. `options.min` accepts the same sources as `max` and defaults to 0; `options.clamp` (default `true`) keeps the fill between 0 and 1. | Sets `fillAmount` of its target `Image` to `(current - min) / (max - min)`, or 0 when that range is not positive. A non-numeric source leaves the item out with a warning. |
| `UiItem.buttonAction(className, methodName, args?, options?)` | `methodName`: a delegated action of the target. `args` binds by name the parameters the action's generated method takes from its caller (for a dependency's action, its surface's `parameters`; see [Dependencies](#dependencies)); the sources are read when the button is clicked. | Calls the method for the row when its `Button` is clicked and ignores clicks while a call runs; then raises `OnCompleted`, or `OnFailed` on a GS2 error. It never disables the button: add an `interactable` item for that. |
| `UiItem.activeToggle(className, condition, options?)` | A `UiCond` condition. | Activates the GameObjects in `_activeWhenTrue` and deactivates those in `_activeWhenFalse` while the condition holds, and the reverse while it does not. List siblings or children, never the component's own GameObject. |
| `UiItem.interactable(className, condition, options?)` | A `UiCond` condition. | Sets `interactable` of the `Selectable`s (such as a `Button`) in `_interactableWhenTrue` to the condition and of those in `_interactableWhenFalse` to its negation. |

Choose `label` for a value shown as text as it is, `templateLabel` for text with words around values, and `value` for a
value the game formats or uses itself (a number it animates, a date it counts down to). Sources read only the target row,
apart from the table band sources of `gauge`; a condition also reads the parent row with `UiCond.rowElement` and one row
of any type with `UiSource.rowProp`.

`UiCond` builds the conditions of `UiItem.activeToggle` and `UiItem.interactable`:

| Member | Holds when |
| --- | --- |
| `UiCond.truthy(source)` | `source` is truthy. |
| `UiCond.eq`, `neq`, `gt`, `gte`, `lt`, `lte` `(lhs, rhs)` | The comparison of two sources holds. Either side may be `UiSource.rowProp(...)`. |
| `UiCond.and(...conditions)`, `UiCond.or(...conditions)`, `UiCond.not(condition)` | Combinations. Nesting is limited to 16 levels. |
| `UiCond.rowElement(parentTarget, listPropertyName)` | Reads a `bool` list property of the parent row (`uiComponentRowElementListNotBoolList` otherwise); not covered further by this reference. |

A `PT.localizedString` operand reads the translation for the player's locale: `truthy`, `eq` and `neq` only
([Localized text](#localized-text)).

Rules: class names are PascalCase and unique among all UI components of the same target type; property names must exist
on the target (`uiComponentUnknownProperty`); a button's method must be a delegated action registered for the target or
published by its dependency (`uiComponentUnknownDelegatedAction`). `dsl build` also refuses a UI component whose target
type no resource mounts, in this package or in a dependency.

```ts
defineUiComponent(Item, {
  items: [
    UiItem.label("GiftMessageLabel", UiSource.prop("giftMessage")),
    UiItem.label("NameLabel", UiSource.prop("displayName")),
    UiItem.templateLabel("GiftTagLabel", "{name}: {message}", {
      name: UiSource.prop("displayName"),
      message: UiSource.prop("giftMessage"),
    }),
    UiItem.activeToggle("NameToggle", UiCond.truthy(UiSource.prop("displayName"))),
    UiItem.value("GiftCountValue", UiSource.prop("count")),
  ],
}),
```

### Another type's row

`UiSource.rowProp(type, rowId, propertyName)` lets a condition read one row of another type, such as the player's stamina in
`Energy` row `"stamina"` while the component targets a quest. `rowId` is the row's id; the property must be a number or a
`bool`. `type` may be the component's own target type, to compare with another of its rows. When `type` is a dependency's type, the package hosts it on a local overlay (one `type:<Type>` ledger token; build
once with `--write-ledger`).

```ts
// Disables the box's Open button while the player owns fewer coins than the box costs. The coin row of
// inventory's Item is read from the Item Handler above this row in the scene.
UiItem.interactable(
  "AffordableInteractable",
  UiCond.gte(
    UiSource.rowProp(inventory.type("Item"), "coin", "count"),
    UiSource.prop("price")
  )
),
```

The generated component looks through every `<Type>Handler` above it in the scene, nearest first, and reads the row from the
first one whose model is the row `rowId`; place one handler set to each row the page reads above the components, typically
on the page root. Several rows of one type can sit there, as each component finds its own. It looks for the handlers when it is
enabled, so a handler placed above it later is seen once it is enabled again. It reads every property it needs from that row
at once and evaluates the condition again whenever its own row or any of those handlers changes. While no handler above it
holds the row, or while a property it reads has no value, the condition is unknown; it logs a warning once when no handler of
the type is above it, and once when all of them have loaded and none holds the row. While unknown, `interactable` makes every `Selectable` in both lists non-interactable, and `activeToggle` leaves its
targets as they are. `dsl build` refuses an unknown type or property and an invalid row id. Code generation leaves the item
out with a warning when the property is not a number or `bool`, and refuses the project when the type emits no handler.

### Item options

`name` and `description` label the item in GS2 Studio's UI component editor and nowhere else: the editor lists the item
under its class name, shows `name` as its display name when it differs from the class name, names the item by `name` in
its problem messages, and shows `description` under it. Neither reaches the generated code or the game. Without `name`, the
item's name is the target type's name. Leave both out unless the editor's reader needs them.

The class name is what the generated code uses: the item becomes the C# class `<Type><className>` (`QuestStartButton`
for `buttonAction("StartButton", ...)` on `Quest`) in the namespace of the type's handler followed by `.UI`, listed in
Unity's Add Component menu under `GS2 Studio/DomainType/<Type>/<Kind>/<className>`.

```ts
uiComponents: [
  defineUiComponent(GiftBox, {
    items: [
      UiItem.templateLabel("PriceLabel", "{price} coins", { price: UiSource.prop("price") }),
      // name and description label the item in GS2 Studio's editor only.
      UiItem.value("PriceValue", UiSource.prop("price"), {
        name: "Price (number)",
        description: "Sends the price as an int for the game to format.",
      }),
      // Disables the box's Open button while the player owns fewer coins than the box costs. The coin row of
      // inventory's Item is read from the Item Handler above this row in the scene.
      UiItem.interactable(
        "AffordableInteractable",
        UiCond.gte(
          UiSource.rowProp(inventory.type("Item"), "coin", "count"),
          UiSource.prop("price")
        )
      ),
    ],
  }),
],
```

### Rows in the game

A UI component describes the components of one row. It makes no list, prefab or scene: the game places the generated
components in its own UI, below a handler that holds the row. Each component uses the nearest `<Type>HandlerBase` above
it in the hierarchy; without one it logs a warning and does nothing. Code generation writes these handlers for each type
a resource mounts:

| Generated class | Holds |
| --- | --- |
| `<Type>Handler` | One row: the row whose id is set in its Inspector, with the scope ids the GS2 model needs (such as the quest group of a quest). |
| `<Type>ListHandler` | Every row GS2 returns for the scope set in its Inspector. For each row it instantiates `_itemPrefab`, a prefab with a `<Type>ListItemHandler` at its root and the item components below it, under `_contentParent`, and it adds and removes instances as rows come and go. When the type has both a master data and a user data model that can be listed, `_axis` picks one; it must be set, or the list loads nothing. Written only for a type that is not single entry and whose rows a GS2 master data or user data model lists. |
| `<Type>ListBy<Property>Handler` | The same, for the rows whose `ref` property `<Property>` names the row of the nearest handler of the referenced type above it (for example the quests of one quest group). |

A list shows the rows GS2 holds at run time (the deployed master data, or the player's user data), each with the values
of its asset-delivered properties.

Every list of a type is in the order of the type's sort setting (`sort` on a local type in
[Keys and identity](#keys-and-identity), or on an overlay in [Overlay types](#overlay-types)). Rows whose keys are
equal, and all rows of a type without a sort setting, are in ascending id order (code-unit order); only the elements of
an inline element list without a sort setting keep their order in the list. The setting belongs to the type, so every
list of the type shares it. An overlay without `sort` keeps the dependency's order; an overlay's `sort`
replaces it unless it is id ascending, which is the same as no `sort`. Rows have no authored order: to show them in an order you choose, give the
type a required order property (such as `displayOrder: PT.int32().assetDelivery().required()`) and sort by it.

In the options of `example-gift-sale`'s overlay (the whole file is in [Overlay types](#overlay-types)):

```ts
// Every generated list of gift boxes shows the cheapest box first.
sort: { key: "price", direction: "asc" },
```

At run time, setting `Comparer` on a list handler replaces the order, and `null` restores the generated one. A list sorts
each time it reloads its rows from GS2; when a sort key changes without a reload (a value of the player's data, for
example), call `Resort()`.

## Code templates

`codeTemplates: [{ outputFileName, templateSource }]` on `definePackage(...)` adds file templates to the package. Code
generation renders templates whose output name ends in `.cs` with Nunjucks-style syntax (`{{ }}` output, `{% for %}`,
`{% if %}`, `{% set %}`); the context has `namespacePrefix`, `packageName`, and `domainTypes` (each with `name`,
`idTypeName` and `namespace`; overlays excluded). An output name that cannot be written as a file fails with
`unsafeCodeTemplateOutputFileName`. Load the template text with a `?raw` import:

```ts
codeTemplates: [{ outputFileName: "GiftShop.cs", templateSource: giftShopTemplate }],
```

```text
namespace {{ namespacePrefix }}.GiftShop
{
    public static class GiftShopTypes
    {
{%- for type in domainTypes %}
        public const string {{ type.name }} = "{{ type.namespace }}";
{%- endfor %}
    }
}
```

## Dependencies

A package can use what another package of the same project publishes: a package installed into the project, or a
package authored in the project (for example one you build with `dsl build`). The DSL build reads nothing from the
project, so it learns the dependency's names and ids from the dependency's surface file:

1. Put the dependency in the project: install it in GS2 Studio ("Add dependency" under a package's "Dependencies"), or
   build it into the project with `dsl build` first.
2. Run `dsl surfaces --dir <project> --out <dir>`; it writes `<dir>/<packageId>.json` for every package of the project.
   For a package you build yourself, the `dependency-surface.json` that `dsl build` writes beside its ledger has the
   same content.
3. Import the JSON and pass it to `dependencyPackage(surface)`.
4. Declare the dependency in `definePackage({ dependencies: { [dep.packageId]: spec } })`.

`example-gift-shop` depends on `example-inventory`, which is built into the same project, so its spec is `*`:

```ts
const inventory = dependencyPackage(inventorySurface);
const InventoryItem = inventory.type("Item");
```

```ts
dependencies: {
  [inventory.packageId]: "*",
},
domainTypes: [Item, GiftBox],
instances: [
  instance(Item, "elixir", {
    giftMessage: "A rare elixir, with our thanks.",
    displayName: { ja: "エリクサー", en: "Elixir" },
  }),
  instance(GiftBox, "starter", { item: "elixir", count: 3 }),
],
```

`spec` is written to the package's `dependencies` and says where the dependency comes from:

| `spec` | The dependency is |
| --- | --- |
| `*` | The package with that id authored in the same project. |
| `github:<owner>/<repo>` or `github:<owner>/<repo>@<range>` | A package installed from that GitHub repository. |
| `npm:<name>@<range>` | A package installed from npm under `<name>`. |
| `file:<path>` | A package installed from a local directory. |
| any other text (a version range) | The package with that id authored in the same project, in that range. A package from anywhere else needs one of the prefixes above. |

Declare an installed package with the spec of the source it was installed from, the same spec as the `dependencies` of
the project's package that installed it (`<project>/packages/<packageId>/package.json`; read it, do not edit it), range
included. A `file:` path is relative to the declaring package's directory, so recompute it from
`<project>/packages/<your packageId>/` when the two directories are not at the same depth:

- A GitHub spec names the repository only, also for a package in a subdirectory of it: `github:<owner>/<repo>/<dir>`
  is refused. The project's `project-lock.json` records the directory (`subdirectory` of the package's entry, beside
  `owner` and `repo`). Every package of the GS2 Studio package repository is `github:gs2io/gs2-studio-package`.
- Never give an installed package `*`: it names a package authored in the project. `dsl build` refuses a spec of an
  installed package that names another source than the one the project installed it from
  (`CLI_DSL_DEPENDENCY_SPEC_MISMATCH`), writes nothing, and prints the spec to declare instead. Correct it in the DSL
  and build again.

`dependencyPackage(surface)` returns:

| Member | Returns |
| --- | --- |
| `packageId` | The dependency's package id. |
| `type(typeName)` | A dependency type handle, for `PT.ref`, `instance`, `overlayInstance`, `mount`, `Source.direct`, `defineUiComponent`, `delegatedActions` and `inlineElementOf`. |
| `overlay(typeName)` | The options of `defineOverlayDomainType` for an overlay of that type. |
| `typeId(typeName)` | The type's declaring id. |
| `propertyId(typeName, propertyName)` | A published property id, usable as an instance value key or `UiSource.inheritedProp`. |
| `elementPropertyId(typeName, propertyPath, propertyName)` | The id of a property of a published inline element schema. |
| `inlineElements(typeName, listPropertyName, elements)` | Inline element values keyed by property ids, which a dependency type's row needs. |
| `delegatedActionTarget(typeName, methodName)` | The published target of a delegated action. |
| `transformId(name)` | A published action transform id, for `Arg.actionTransformRef` or `ActionProgram.transform`. |
| `transformCall(name, args)` | `{ transformPackageId, transformId, arguments }` of an `actionPropertyTransforms` entry, from arguments keyed by parameter name. |
| `transformProgram(name, args)` | The action program that calls the transform, from arguments keyed by parameter name. |
| `resourceId("<service>.<Model>")` | A published master data resource id, for external resource links and action transform outputs. |

The surface's names are type-checked when the JSON is imported with `resolveJsonModule`. A name the surface does not
publish throws while the DSL evaluates (`<packageId>'s dependency surface: no type named "X". Published: ...`), so the
build fails before validation. The same holds for the parameter names of `transformCall` and `transformProgram`; a
missing required parameter throws too, and the message lists the parameters.

Besides names and ids, the surface describes what a dependent needs to use them:

| Key | Describes |
| --- | --- |
| `types.<Type>.propertyDetails.<property>` | `type` (`int32`, `string`, `localizedString`, `enum<a\|b>`, `ref<Item>`, `inline<Item>`, `list<...>`, `consumeAction` and the other action kinds; `list<inlineElement>` for an inline element list, whose schema is under `inlineSchemas`; another package's type as `<packageId>:<Type>`), `requirement` (`always`, `never` or `conditional`), `bindingHint` (`none`, `masterData`, `userData` or `assetDelivery`) and `display` (label and description per locale; absent when the property has none). |
| `types.<Type>.delegatedActions.<Method>` | `targetResource`, `targetActionKey` and `parameters`: the parameters the generated method takes from its caller, which a button's `args` gives, by name with `type` (the GS2 catalog's spelling, such as `[]transaction::Config`) and `required`. The method fills every other parameter of the action itself: the namespace, the access token, the keys of the row, and those the delegated action's `parameterOverrides` set. Give `args` every `required: true` parameter; when none is, `args` may be `undefined`. A button binds only a parameter of a scalar type (a string, number or bool); one of another type, such as `config`, keeps its default. `Gs2Exchange:RateModel.Exchange` and `Gs2Showcase:DisplayItem.Buy` also take a required `storeProductId` string, which `parameters` does not list, when a master data resource of the packages that make up the type has `Gs2Money2:VerifyReceiptByUserId` (a paid product) among its actions, written directly, in a static binding, or produced by an action transform it uses. `parameters` is absent when the action does not resolve (an action the catalog lacks, or a target resource that does not mount the type) or code generation blocks it, for the delegated actions of inline schemas (`inlineSchemas.<list>.delegatedActions`), and from older surfaces: then the surface does not say what the method takes. |
| `types.<Type>.sort` | The order of the type's rows, `{ key, direction }` as an overlay's `sort` takes it (`key` is `null` for the id); absent when the rows are in ascending id order, and from older surfaces. |
| `types.<Type>.shippedRowIds` | The ids of the rows this package ships of the type, sorted; `[]` when it ships none. Each package lists only its own rows: the rows of a type are those of every surface entry with the same `canonicalPackageId` and `canonicalTypeId`, plus those every surface lists under `shippedRowsOfDependencyTypes."<canonicalPackageId>:<canonicalTypeId>"`. These rows are provided, so do not author them: a row you author with a listed id replaces the shipped row and all its values (change some values with `overlayInstance` instead). Rows with other ids are added beside them, except on a single-entry type, whose one row is the shipped one. A row an `overlayInstance` suppresses is still listed. When no surface lists a row and a build names the type in `No master data is registered for domain model "<Type>"`, the rows are yours to author. |
| `types.<Type>.uiComponents.<ClassName>` | The UI items on the type, the package's own and those of the packages it overlays (`{}` for none), by class name: `kind` (`label`, `buttonAction`, ...), `name`, the declaring `packageId` and, for a button, the delegated action `method` it calls. An inline schema lists its items under `inlineSchemas.<list>.uiComponents`. Code generation gives the items of an overlay, renamed or not, the same generated classes as the type's, so an item you add with a listed class name replaces the listed item (`dsl build` warns about it). Reuse a listed item instead of adding one that shows the same. |
| `shippedRowsOfDependencyTypes` | The ids of the rows this package ships of a dependency's type it does not declare (`instance(dep.type("<Type>"), ...)`), keyed `<canonicalPackageId>:<canonicalTypeId>` of the type, as its surface entries publish them. |
| `actionTransformSignatures.<Name>` | `category` (`acquire`, `consume` or `verify`) and `parameters`: per parameter in declaration order, `type`, `required` and, only when the parameter gives one, `description` (one text, not per locale). A `ref<T>` parameter takes a row id of `T`. |

A surface written by an older GS2 Studio has neither `propertyDetails` nor `actionTransformSignatures`; `transformCall` and `transformProgram` then fail to compile and
throw. Write it again with `dsl surfaces`.

`example-gift-shop` reads `surfaces/example-inventory.json`, which `dsl build` wrote for `example-inventory`:

```json
{
  "schemaVersion": 1,
  "packageId": "example-inventory",
  "types": {
    "Item": {
      "id": "dt_20QRK0BTMW89TAWPHGNYFXNYJ5",
      "singleEntry": false,
      "shippedRowIds": [],
      "canonicalPackageId": "example-inventory",
      "canonicalTypeId": "dt_20QRK0BTMW89TAWPHGNYFXNYJ5",
      "uiComponents": {
        "CountValue": {
          "kind": "value",
          "name": "Item",
          "packageId": "example-inventory"
        },
        "OwnedInteractable": {
          "kind": "interactable",
          "name": "Item",
          "packageId": "example-inventory"
        },
        "StockLabel": {
          "kind": "templateLabel",
          "name": "Item",
          "packageId": "example-inventory"
        }
      },
      "properties": {
        "count": "prop_1DQWSQS8AC837BT0EWF1439PFW",
        "id": "prop_7ZZZZZZZZZZZZZZZZZZZZZZZZZ"
      },
      "propertyDetails": {
        "count": {
          "type": "int64",
          "requirement": "always",
          "bindingHint": "userData",
          "display": {
            "en": {
              "label": "Owned quantity",
              "description": "How many of the item the player owns."
            }
          }
        },
        "id": {
          "type": "string",
          "requirement": "always",
          "bindingHint": "none",
          "display": {
            "en": {
              "label": "ID",
              "description": "Identifies the item."
            }
          }
        }
      }
    }
  },
  "shippedRowsOfDependencyTypes": {},
  "actionTransforms": {
    "AcquireItem": "at_0XAMJJD9WX8S0TR71Z8KMQ8V80",
    "ConsumeItem": "at_1YA7MG1XJH88XT3P4Z6JF09ZVW"
  },
  "actionTransformSignatures": {
    "AcquireItem": {
      "category": "acquire",
      "parameters": {
        "itemName": {
          "type": "ref<Item>",
          "required": true
        },
        "count": {
          "type": "int32",
          "required": true
        }
      }
    },
    "ConsumeItem": {
      "category": "consume",
      "parameters": {
        "itemName": {
          "type": "ref<Item>",
          "required": true
        },
        "count": {
          "type": "int32",
          "required": true
        }
      }
    }
  },
  "masterDataResources": {
    "inventory.Namespace": "mdr_0NBQC9D3YBB2RANTKJWRS3FA1B",
    "inventory.SimpleInventoryModel": "mdr_17QR9NJ2WDBFWTS2WJKMDP2NXE",
    "inventory.SimpleItemModel": "mdr_05MMRB5P29AYP8MJCVYCTTDQSP"
  }
}
```

## The id ledger

`dsl build` reads `id-ledger.json` next to the entry (or `--ledger <path>`) and accepts it only in the canonical form it
writes: the four keys in the order `schemaVersion`, `retired`, `random`, `deterministicOverrides`; the entries of each
section sorted by token (plain code-unit order, as JavaScript `<` compares strings); two-space indentation; a final
newline. When you edit the ledger by hand, keep that order.

| Key | Holds |
| --- | --- |
| `schemaVersion` | `1`. |
| `random` | The generated ids of types (`type:<Type>`), properties (`property:<Type>.<name>`, inline element members as `property:<Type>.<list>.<name>`), rows and transforms (`transform:<Name>`). A row token is `row:["<owner packageId>","<type>","<rowId>"]`, where the owner is the package that declares the row's type (this package, or for a row of a dependency's type or of an overlay, the dependency that declares it), and `<type>` is `type:<Type>` for a local type of this package and the dependency's type id (`dt_...`) for a row of a dependency's type or of an overlay. |
| `deterministicOverrides` | Ids of resources (`master/...`, `user/...`) and UI components (`ui:<Type>...`) that must differ from the id the build computes. |
| `retired` | Tokens and ids that are no longer used. Their ids are never reused. |

```json
{
  "schemaVersion": 1,
  "retired": {},
  "random": {
    "property:GameSettings.partySize": "prop_313X7A82EK88YSQD919ZR2NY09",
    "property:Hero.attack": "prop_2CEQ99WCPR8JXAJMPXERZBM0BD",
    "property:Hero.availableUntil": "prop_1BV2NRZMKM8G0V2BMDP6HJ9AXM",
    "property:Hero.element": "prop_0S7PEWZ0178STR3EYTNK26J2DE",
    "property:Hero.limited": "prop_3X365H6WXW81WBM9JNKNJJ95VX",
    "property:Hero.maxAttack": "prop_1ATSDZEET0931AY03K47EE4SF0",
    "property:Hero.rarity": "prop_27EBWY3RZY9B1VZTVFSWWD41TZ",
    "property:Hero.tags": "prop_712W5RPXF88DA9TE35XJ35A090",
    "property:HeroLevel.attack": "prop_1KC9NWP10D95886B2TH0DXRNKQ",
    "property:HeroLevel.hero": "prop_3YBGJG7A248Y3AQTNNEDB1Z9X0",
    "property:HeroLevel.level": "prop_7VHB2B8DFQ91NBE63ZP8R0V9DQ",
    "property:Rarity.weight": "prop_1ZWY59T8GR83QAB39275FZZ6F4",
    "row:[\"example-heroes\",\"type:GameSettings\",\"gamesettings\"]": "row_6WGFWAG4VT98PBJBMQZQ67CGZX",
    "row:[\"example-heroes\",\"type:Hero\",\"blaze\"]": "row_3H7BS43ZEV9PGSJ2ZYFB2HZNSB",
    "row:[\"example-heroes\",\"type:HeroLevel\",\"blaze.1\"]": "row_5ZNE6H5NAV8BNVWDA03T2F7WYV",
    "row:[\"example-heroes\",\"type:HeroLevel\",\"blaze.2\"]": "row_1M01AAKYS18AMTNFE51DS2JJ07",
    "row:[\"example-heroes\",\"type:Rarity\",\"common\"]": "row_4Q43KEBZTB99XSFTRN7TXE2VA5",
    "row:[\"example-heroes\",\"type:Rarity\",\"rare\"]": "row_6BFMRCTQWS9A7T9Z287H56BN01",
    "type:GameSettings": "dt_4ZNDYYBD8196QA3KDFWTBW84N3",
    "type:Hero": "dt_1X565NJJ4W9KJT458RJNNYHGPH",
    "type:HeroLevel": "dt_3HXWZCPKXE82VSWCNN7AHDPQGY",
    "type:Rarity": "dt_0SZKPHZ86K8KT8W6EXXGRT6X60"
  },
  "deterministicOverrides": {}
}
```

Rules:

- The first build runs with `--write-ledger`; it creates the ledger. Later builds that add types, properties, rows or
  transforms need `--write-ledger` again, which only adds missing `random` tokens and never changes existing values.
- Never change an existing id: other packages and projects refer to it.
- Renaming a type, property, row or transform changes its token, and the build fails with `random token <old> is not
  current; move it to retired` and `random token <new> is missing from the ledger`. To keep the identity, move the old
  token's id to the new token in `random` and keep the entries sorted. While the old token is still in `random`,
  `--write-ledger` fails with the same "not current" problem and writes nothing; it would record a new id for the new
  token only after the old one is moved to `retired`, which ends the old identity. Renaming a type renames the tokens
  of its properties and rows too (`type:Item` and `property:Item.count` become `type:Article` and
  `property:Article.count`); move each of them.
- A row token contains the row id, so changing a composite-key row id looks like a rename. Check the new id against
  the composite key rule (see [Keys and identity](#keys-and-identity)) before you move its token.
- Deleting one: move its token and id from `random` to `retired`.
- Resource and UI component ids are computed by the build, and the build reports nothing when they change. Renaming a
  type changes the ids of its UI component, of each item of that component, and of each user data resource mounted on
  the type (other packages may refer to that resource, for example as a delegated action target). Master data resource
  ids do not depend on type names. To keep an old id, add its new token with the old id to `deterministicOverrides`
  (sorted by token):

  | Id | Token | Old id is |
  | --- | --- | --- |
  | UI component | `ui:<Type>:definition` | the file name under the project's `packages/<packageId>/ui-components/` |
  | UI component item | `ui:<Type>:item:<ClassName>` | the item's `id` in that file |
  | User data resource | `user/<service>:<Model>:<Type>:<static name>#<n>` | the directory name under `packages/<packageId>/user-data/` |

  In the user data token, `<static name>` is the value of a `Bind.static` binding of the `name` field (empty when there
  is none), `<n>` counts earlier resources with the same token (usually `0`), and a child resource's token starts with
  its parent's token instead of `user`. For example, renaming `Item` to `Article` in `example-inventory`, with its user
  data resource mounted on the type, needs `ui:Article:definition`, `ui:Article:item:StockLabel`,
  `ui:Article:item:CountValue`, `ui:Article:item:OwnedInteractable` and `user/inventory:SimpleItem:Article:#0`.

## Building with dsl build

```sh
"<GS2 Studio>" dsl surfaces --dir <project> --out <dir>
"<GS2 Studio>" dsl build --dir <project> --entry <dsl/index.ts> [--ledger <path>] [--write-ledger] [--catalogs <dir>]
```

`dsl build` evaluates the entry, checks the package, and on success saves it into the project: it replaces the
project's own package with the same id (a new project's own package is `local-project`) or adds a new package. It
writes the ledger (when it changes), then the project, then `dependency-surface.json` beside the ledger. When a check
fails it writes nothing.

| Failure | Cause | Fix |
| --- | --- | --- |
| `CLI_DSL_LOAD_FAILED` | An import is refused, the syntax cannot be stripped, a type was imported as a value, a `dependencyPackage` lookup or another DSL call threw. The message names the file and position. | Fix the import or the call it names. |
| `CLI_DSL_EXPORT_INVALID` | The entry does not export exactly one `definePackage({...})` or `.build()` result. | Export one package definition or built package. |
| `CLI_DSL_PACKAGE_INVALID` | The DSL validators refused the package; each problem is printed as JSON, for example `{"kind":"duplicatePropertyName","typeName":"Item","propertyName":"count"}`, except `restoreFailure`, which is printed as its plain message. | Fix the declaration the `kind` names (see [Validation error kinds](#validation-error-kinds)). |
| `CLI_DSL_PACKAGE_ID_TAKEN` | The package id is a dependency installed in the project. | Use another id. |
| `CLI_DSL_DEPENDENCY_NOT_INSTALLED` | A declared dependency is not in the project. | For a package authored in the project, build it with `dsl build` first; for another package, add it in GS2 Studio. |
| `CLI_DSL_DEPENDENCY_SPEC_MISMATCH` | The spec of an installed package names another source than the one the project installed it from, such as `*`. | Declare it with the spec the message prints. |
| `CLI_DSL_LEDGER_MISSING` | No ledger, and no `--write-ledger`. | Run with `--write-ledger` the first time. |
| `CLI_DSL_LEDGER_MISMATCH` | Missing tokens (listed with candidate ids), tokens that are no longer current, or a retired token that reappeared. | Missing tokens: rerun with `--write-ledger`. Others: edit the ledger as the message says. |
| `CLI_DSL_LEDGER_INVALID` | The ledger is not canonical JSON of the shape above. | Repair the file as the message says. |
| `CLI_DSL_LEDGER_UNREADABLE` | The ledger file exists but cannot be read. | Fix the file's permissions or path. |
| `CLI_DSL_WRITE_FAILED` | Writing the ledger or the dependency surface failed. | Fix the cause the message names and rerun. |
| `CLI_DSL_VALIDATION_FAILED` | The checks the editor applies before it opens or installs a package: unbound `masterData` / `userData` properties, rows that fail validation, composite-key ids, UI components on unmounted types, and others, listed one by one. | Fix each finding. |

After it saves the package, `dsl build` prints on stderr the errors and warnings `project check` reports for the
project, as `[error] ...` and `[warning] ...` lines (`--json`: `diagnostics`). The build still exits with 0, because the
package is saved; fix each line and build again:

| Line | Fix |
| --- | --- |
| `[warning] <dependency> / <Type>::id: ... No master data is registered for domain model "<Type>", so <resource> resource cannot be expanded.` | The dependency's GS2 resource needs rows of `<Type>` from the project. Add them with `instance(dep.type("<Type>"), id, values)`, with a value for each property `types.<Type>.propertyDetails` of the surface lists as `requirement: "always"`, except `id` (the row id), `userData` properties and action lists. The line's remedy names that call and that surface key with the type's name; it keeps `<Type>` when the warning names an inline schema or an unresolved type rather than a type `dep.type()` takes. An inline schema's rows are elements of the host type's list property (`dep.inlineElements(...)`). |
| `... is a dependency the DSL cannot change, so these are fixed through the dependency that brings it in: ...` | A defect of the dependency itself. Remove the dependency the message names from the DSL when the package does not need it; the update or removal the message leaves to the project's owner is made in GS2 Studio. |
| `[error] ... the required arguments (...) of action transform "..." have no value for row "..."` | A transform argument reads a property the row has no value for. Give every row the value, also the dependency's rows (`overlayInstance`). |
| A line about another package that this DSL does not change | Leave it; tell the user about it instead of building again. |
| Any other line | Fix the DSL as the message says. Messages written for the editor name the editor's steps. |

These lines do not include what Unity code generation alone refuses; open the project in GS2 Studio to see that too.

## Validation error kinds

`CLI_DSL_PACKAGE_INVALID` prints each problem as a JSON object (a `restoreFailure` as its plain message); its `kind` is
one of these. The other fields name the
type, property, resource or component involved.

| Kind | Cause |
| --- | --- |
| `restoreFailure` | The built package cannot be read back as package files; `message` says why. Often the cause of the problems listed after it. |
| `schemaValidation` | A value failed a shape check; `path` and `message` locate it (for example `package.display`). |
| `selfDependencyNotAllowed` | `dependencies` names the package itself. |
| `reservedPropertyName` | A property named `id`. |
| `duplicateDomainTypeName`, `duplicatePropertyName` | Two types, or two properties of one type, share a name. |
| `duplicateOverlaySource` | Two overlays of the same source type. |
| `domainTypeDefinitionNotRegistered` | A definition used without being listed in `domainTypes`; `context` says where it was used. |
| `invalidRefTarget` | `PT.ref(...)` names a type the package does not include. |
| `invalidInstanceType` | A row of a type the package does not declare. |
| `invalidInstanceDomainTypeKind` | An `overlayInstance` of a local type. |
| `instanceIdTooLong` | A row id longer than `maximumLength` (128), the longest name GS2 accepts. |
| `invalidSingleEntryName`, `singleEntryInstanceIdMismatch` | A single-entry type name that gives no valid row id, or a row whose id is not `expectedId`. |
| `invalidCompositeKey` | A composite key member that is missing, `id`, repeated, of an unsupported type or hint, or combined with `singleEntry` (`reason`). |
| `invalidSortKey` | A sort key that is unknown, not comparable, or not required (`reason`). |
| `invalidInlineBindingHint` | A binding hint an inline property does not accept. |
| `invalidLocalizedStringBindingHint` | A `PT.localizedString` property without `.assetDelivery()`. |
| `invalidDelegatedActionResourceRef` | A delegated action targeting a resource that is not the package's. |
| `unresolvedPropertySlot`, `inlineValueKeyNotPublished` | A property name that resolves to nothing; an inline value key of a type this package does not declare, which must be a property id (use `dep.inlineElements(...)`). |
| `invalidMountPath`, `invalidMountPathFormat` | A resource mounted on an unknown type, or on a name that is not PascalCase. |
| `invalidParentRef`, `cyclicParentRef`, `duplicateArrayElementIndex` | A broken resource tree. |
| `arrayElementLocationMismatch`, `arrayElementParentPropertyUnresolved`, `invalidArrayPropertyName` | An `arrayChildren` entry whose model is not the array field's element model, whose field holds no model, or whose field name is invalid. |
| `invalidMountedMasterResource` | A user data resource linked to a master data resource that is not in the package. |
| `invalidElementSource` | A `rowScope` (`fkFanout`) whose child type or property is unknown. |
| `invalidResourceLinkRef`, `invalidExternalResourceLinkSource` | A `resourceLink` target that is not in the package, or an external link to a package the package does not declare as a dependency. |
| `unresolvedResourceRef` | A resource reference to a resource never included in the package; `context` says where. |
| `resourceDefinitionAttachedTwice` | One `defineMasterDataResource` / `defineUserDataResource` definition included in two places of the resource trees (`resourceKind`, `model`). |
| `unresolvedParentBinding` | `Source.parent(...)` with no ancestor resource. |
| `invalidBindingValue` | A malformed or unaccepted binding; `context` says which. |
| `invalidModelRef` | `model` given something that is not a catalog model. |
| `unsupportedTransformParameterType`, `invalidResourceRef`, `resourceRefNotImported` | A transform parameter type a transform cannot take, or an output resource that is not the package's. |
| `uiComponentTargetTypeUnknown`, `uiComponentTargetTypeInvalidFormat` | A UI component target that is not a type of the package, or not PascalCase. |
| `duplicateUiComponentDefinition`, `duplicateUiComponentClassName`, `invalidUiComponentClassName` | Two components for one target; a class name used twice on a type; a class name that is empty, too long or not PascalCase. |
| `uiComponentUnknownProperty`, `uiComponentUnknownDelegatedAction` | An item names a property or method the target does not have. |
| `uiComponentButtonActionParameterInvalidFormat` | A `buttonAction` argument name that is not a valid parameter name. |
| `uiComponentTableBandSourceTypeUnknown`, `uiComponentTableBandTableUnknown`, `uiComponentTableBandSourceNotSingleEntry` | A band source on an unknown type or property, or on a type that is not single entry. |
| `uiComponentRowElementSourceTypeUnknown`, `uiComponentRowElementListUnknown`, `uiComponentRowElementListNotBoolList` | A `UiCond.rowElement` on an unknown type or list, or on a list that is not a `bool` list. |
| `uiComponentForeignRowSourceTypeUnknown`, `uiComponentForeignRowPropertyUnknown`, `uiComponentForeignRowIdInvalid` | A `UiSource.rowProp` on an unknown type or property, or with a row id that is not letters, digits, `_`, `.` and `-`. |
| `uiComponentConditionTooDeep` | A UI condition nested deeper than `maxDepth`. |
| `uiComponentTemplateLabelKeyMismatch` | A `templateLabel` placeholder without a source, a source without a placeholder, or a key given twice (`direction`). |
| `unsafeCodeTemplateOutputFileName` | A code template output name that cannot be written as a file. |

## Exported types

`gs2-studio-dsl` exports these types for annotations:

| Type | Is |
| --- | --- |
| `BuiltPackage` | The result of `build()`. |
| `PackageDefinition`, `PackageSpec` | What `definePackage(...)` takes and returns. |
| `LocalizedDisplay` | Label, description and unit per locale. |
| `LocalizedStringValue` | The value of a `PT.localizedString()` property in a row: text per locale. |
| `LocalDomainTypeDef`, `OverlayDomainTypeDef`, `DomainTypeDef` | What `defineDomainType` and `defineOverlayDomainType` return. |
| `InlineElementDef`, `InlineElementReference` | What `defineInlineElement` and `inlineElementOf` return. |
| `MasterDataResourceDef`, `UserDataResourceDef` | What `defineMasterDataResource` and `defineUserDataResource` return. |
| `ActionTransformDef`, `ActionTransformSpec` | What `defineActionTransform` takes and returns. |
| `DelegatedActionDef`, `UiComponentDef` | Delegated action and UI component definitions. |
| `AuthoredInstanceSpec`, `OverlayInstanceSpec`, `InstanceValues` | Instance definitions and value records. |
| `DependencySurface`, `DependencyDomainTypeRef`, `TransformCall` | Dependency surface types and handles. |
| `StaticBindingDirective`, `ScriptSettingOptions` | Binding helper types. |
