# gs2-studio-dsl reference

The syntax reference of the GS2 Studio package DSL: every name `gs2-studio-dsl` and `gs2-studio-dsl/gs2` export, what
each member records, and the rules GS2 Studio applies when it builds the package. The code samples are parts of three
example packages (`example-inventory`, `example-heroes`, `example-gift-shop`). Before this package is published, each
example is type-checked against these declarations and built with `dsl build` into one project, which then passes
`project check`.

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
| Package | What one DSL entry builds: `definePackage(id, version)...build()`. GS2 Studio writes it into a project as package files. |
| Domain type | A named record type of the game (`Item`, `Hero`). Every domain type has the reserved property `id`. |
| Property | A typed field of a domain type, with a binding hint and a requirement. |
| Instance (row) | One record of a domain type, authored in the package. Its `id` is the row id. |
| Binding hint | Where a property's value comes from: GS2 master data, GS2 user data, asset delivery, or none. |
| Master data resource | A GS2 master data model (`GS2.inventory.SimpleItemModel`) and how its fields are filled from domain types. |
| User data resource | A GS2 per-player model (`GS2.inventory.SimpleItem`) and how its fields map to domain type properties. |
| Binding | The value source of one GS2 field: a fixed value, a property, a placeholder, ... (`Bind.*`). |
| Action transform | A named, parameterized recipe that produces GS2 transaction actions (`Gs2Inventory:AcquireSimpleItemsByUserId`). |
| Delegated action | A method on a domain type that calls a GS2 action of one of the package's resources. |
| UI component | Generated Unity UI bindings for a domain type's properties and actions. |
| Overlay type | A local declaration that extends a type of a dependency: it adds properties and settings to the dependency's type. |
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
| Instance id | Letters, digits, `_`, `.` and `-`. |
| UI component class name | PascalCase. |

## Modules and imports

GS2 Studio evaluates the entry file with Node's own loader after removing the TypeScript types. It does not type-check:
run `tsc --noEmit` yourself (the README gives the tsconfig). A DSL module may import only:

| Import | Resolves to |
| --- | --- |
| `gs2-studio-dsl` | The DSL runtime: `definePackage`, `PT`, `Bind`, ... |
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
  Arg,
  Bind,
  defineDomainType,
  defineMasterDataResource,
  defineOverlayDomainType,
  definePackage,
  dependencyPackage,
  type LocalizedDisplay,
  PT,
  Source,
  transactionSettingV2,
} from "gs2-studio-dsl";
import { GS2 } from "gs2-studio-dsl/gs2";

import inventorySurface from "./surfaces/example-inventory.json" with { type: "json" };
import giftShopTemplate from "./templates/GiftShop.cs.njk?raw";
```

## Packages

`definePackage(id: string, version: string): PackageBuilder` starts a package. Every member returns the builder, so the
calls chain until `build()`. The entry module must export exactly one `build()` result.

```ts
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

| Member | Records |
| --- | --- |
| `display(entry: LocalizedDisplay)` | The package's label and description per locale. |
| `displayType(definition \| typeName, entry: LocalizedDisplay)` | The label and description of a domain type this package declares, overlays included. The type must be registered with `domainType(...)`. |
| `dependency(packageId, spec)` | A dependency, written to the package's `dependencies`. See [Dependencies](#dependencies) for `spec`. |
| `domainType(definition)` | Registers a type made with `defineDomainType` or `defineOverlayDomainType`. |
| `domainType(name, cb)` | Declares a type with the untyped builder (see [Domain types](#domain-types)). |
| `overlayTypeSpec(name, options)` | Declares an overlay type from an options object (see [Overlay types](#overlay-types)). |
| `delegatedAction(definition \| typeName \| dependencyType, methodName, def)` | A delegated action on a type (see [Delegated actions](#delegated-actions)). |
| `instance(...)` | A row of a type (see [Instances](#instances)). |
| `overlayInstance(type, sourceInstanceId, options?)` | Overrides or suppresses a row a dependency ships (see [Instances](#instances)). |
| `actionTransform(name, cb)` | An action transform (see [Action transforms](#action-transforms)). |
| `uiComponent(target, cb)` | The UI component of a type or of an inline element (see [UI components](#ui-components)). |
| `codeTemplate(outputFileName, templateSource)` | A code template (see [Code templates](#code-templates)). |
| `masterDataResource(definition \| cb)` | A root master data resource and its children. |
| `userDataResource(definition \| cb)` | A root user data resource and its children. |
| `build(): BuiltPackage` | Compiles and validates the package. Export the result; it has no members you use. |

`LocalizedDisplay` is `{ [locale: string]: { label?: string; description?: string; unit?: string } }`, for example
`{ en: { label: "Item", description: "An item a player can own." } }`.

A package may not depend on itself (`selfDependencyNotAllowed`) or declare the same dependency twice
(`duplicateDependencyPackage`).

## Domain types

### defineDomainType

`defineDomainType(name, define)` returns a definition that the package registers with `domainType(definition)`. The
callback receives a typed builder and must return that same builder (chain the calls and return the chain); returning
anything else throws `defineDomainType callback must return the builder it receives` while the DSL evaluates.

```ts
const Item = defineDomainType("Item", dt =>
  dt.property(PT.int64("count").userData().required()).localizedProperties({
    id: text("ID", "Identifies the item."),
    count: text("Owned quantity", "How many of the item the player owns."),
  })
);
```

The typed builder records property names in the definition's type, so later calls that take property names
(`sortBy`, `compositeKey`, `localizedProperties`, `Source.direct(definition, ...)`, `ui.prop(...)`, typed `instance`
values) are checked by `tsc`.

| Member | Records |
| --- | --- |
| `property(PT.<kind>(name)...)` | A property (see [Properties](#properties)). The name `id` is refused by the type checker and by the build (`reservedPropertyName`). |
| `localizedProperties({ id, ...each property })` | Label, description and unit of `id` and of every declared property; all of them must be listed. This replaces any `.localizedDisplay(...)` given on a property. |
| `idLocalizedDisplay(entry)` | The display of the `id` property alone. `localizedProperties({ id })` takes precedence. |
| `singleEntry()` | The type has exactly one row (see [Keys and identity](#keys-and-identity)). |
| `sortBy(propertyName \| "id" \| null, direction = "asc")` | The row order. |
| `compositeKey(first, ...rest)` | Row ids composed from these properties. |
| `delegatedAction(methodName, def)` | A delegated action; a later registration with the same method name replaces it. |

A definition does nothing until it is registered: using a definition that the package never passes to `domainType(...)`
in an instance, a resource mount, a binding source or a UI component fails the build with
`domainTypeDefinitionNotRegistered`. The order of the calls does not matter.
Two types with the same name fail with `duplicateDomainTypeName`.

### The untyped builder

`domainType(name, builder => { ... })` declares a type without a definition object. Its builder has the same members
as the typed one, without type-checked names, plus:

| Member | Records |
| --- | --- |
| `name` | The type name (read-only). |
| `property(name, type, options?)` | A property from a type made with `PT.<kind>()` and `options`: `{ localizedDisplay?, requirement?, bindingHint? }`, where `requirement` is `{ kind: "always" }`, `{ kind: "never" }` or `{ kind: "conditional", condition, requiredWhenMet }` and `bindingHint` is `"masterData" \| "userData" \| "assetDelivery" \| "none"`. |
| `localizedProperties(record)` | Any subset of the names. |

Prefer `defineDomainType`: other calls can then refer to the definition instead of repeating its name.

## Properties

### Property types

`PT` makes property types. Called with a name, a primitive kind returns a property definition; called without one, it
returns the bare type for `PT.prop`, `PT.listOf`, action transform parameters and the untyped builder.

| Call | Type | Instance value |
| --- | --- | --- |
| `PT.string(name?)` | string | `string` |
| `PT.int32(name?)`, `PT.int64(name?)` | integer | `number` |
| `PT.float32(name?)`, `PT.float64(name?)` | floating point | `number` |
| `PT.bool(name?)` | boolean | `boolean` |
| `PT.timestamp(name?)` | timestamp | `string` |
| `PT.enum(...values)` | one of `values` | `string` |
| `PT.ref(typeNameOrTypeId)` | a reference to a row of another type | the row id (`string`) |
| `PT.inline(typeName)` | a value of another domain type, embedded | an object |
| `PT.listOf(elementType)` | a list | an array |
| `PT.inlineElement(schema)` | an element of a list, from `defineInlineElement` (only inside `PT.listOf`) | an object |
| `PT.verifyAction()`, `PT.consumeAction()`, `PT.acquireAction()` | a GS2 transaction action | an action value |
| `PT.prop(name, type)` | a property of any non-primitive type | as for `type` |

`PT.ref` takes the name of a type in this package, or the id of a dependency's type (`dep.typeId("Item")`, see
[Dependencies](#dependencies)). A name that names no type fails with `invalidRefTarget`.

`example-heroes` delivers its data to the client as assets, so its properties use `.assetDelivery()` and no GS2 resource
binds them:

```ts
const Hero = defineDomainType("Hero", dt =>
  dt
    .property(PT.prop("rarity", PT.ref("Rarity")).assetDelivery().required())
    .property(
      PT.prop("element", PT.enum("Fire", "Water", "Wind"))
        .assetDelivery()
        .required()
    )
    .property(PT.int32("attack").assetDelivery().required())
    .property(PT.int32("maxAttack").assetDelivery().required())
    .property(PT.bool("limited").assetDelivery().required())
    .property(PT.timestamp("availableUntil").assetDelivery().requiredWhen(Cond.eq("limited", true)))
    .property(PT.prop("tags", PT.listOf(PT.string())))
    .localizedProperties({
      id: text("ID", "Identifies the hero."),
      rarity: text("Rarity", "How rare the hero is."),
      element: text("Element", "The hero's element."),
      attack: text("Attack", "Attack at the first level."),
      maxAttack: text("Max attack", "Attack at the last level."),
      limited: text("Limited", "Whether the hero is offered for a limited time."),
      availableUntil: text("Available until", "When a limited hero stops being offered."),
      tags: text("Tags", "Free-form search tags."),
    })
);
```

### Property modifiers

| Modifier | Records |
| --- | --- |
| `.required()` | The property must have a value. Typed `instance` values must then include it. |
| `.requiredWhen(condition, requiredWhenMet = true)` | Required when `condition` holds (or, with `requiredWhenMet = false`, when it does not). |
| `.optionalWhen(condition)` | Same as `.requiredWhen(condition, false)`. |
| `.masterData()` | Binding hint `masterData`: a master data resource fills the property. |
| `.userData()` | Binding hint `userData`: a user data resource fills the property. |
| `.assetDelivery()` | Binding hint `assetDelivery`: the value is delivered to the client as an asset. |
| `.localizedDisplay(entry)` | The property's label, description and unit. |

Without a modifier a property is optional and its binding hint is `none`. The last requirement modifier wins.

`dsl build` refuses a `.masterData()` property that no master data resource binds ("No master data resource binds this
property.") and a `.userData()` property that no user data resource binds ("No user data resource binds this
property."): bind it, or remove the hint.

Binding hints the build accepts for each shape:

| Property | Accepted hints |
| --- | --- |
| `PT.inline(T)` | any but `masterData` |
| `PT.listOf(PT.inline(T))` | `userData`, `none` |
| `PT.listOf(PT.inlineElement(schema))` | `masterData` only |
| a member of `compositeKey(...)` | `masterData`, `assetDelivery` |
| an `elementKey(...)` member of an inline element | `masterData` only |
| any other property of an inline element | `masterData`, `assetDelivery` |

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

**Single entry.** `singleEntry()` declares a type with one row. That row's id must be the type name in lower case
(`GameSettings` → `gamesettings`); another id fails with `singleEntryInstanceIdMismatch`, whose `expectedId` names the
id to use. A single-entry type cannot also have a composite key.

```ts
const GameSettings = defineDomainType("GameSettings", dt =>
  dt
    .singleEntry()
    .property(PT.int32("partySize").assetDelivery().required())
    .localizedProperties({
      id: text("ID", "The one settings row."),
      partySize: text("Party size", "How many heroes a party holds."),
    })
);
```

**Composite key.** `compositeKey(first, ...rest)` makes each row id the members' values joined with `.`. Members must be
declared properties of type `string`, `int32`, `int64`, `bool`, `enum` or `ref`, with hint `masterData` or
`assetDelivery`; `id`, duplicates and unknown names fail with `invalidCompositeKey`. The parts are joined in the order of
the members' **property ids** (as the ledger records them), not in the order you pass them, and a member value may not
contain `.`. A row id that differs from the composed id fails `dsl build` ("instance ids that no longer match their
composite-key values"), and a failed build writes no ledger. The member ids are random until the ledger records them, so
author a composite-key type in two steps: build it with `--write-ledger` before it has rows, read the members'
`property:<Type>.<name>` ids in `id-ledger.json`, then add the rows with their values in ascending id order and build
again.

```ts
const HeroLevel = defineDomainType("HeroLevel", dt =>
  dt
    .property(PT.prop("hero", PT.ref("Hero")).assetDelivery().required())
    .property(PT.int32("level").assetDelivery().required())
    .property(PT.int32("attack").assetDelivery().required())
    .compositeKey("hero", "level")
    .localizedProperties({
      id: text("ID", "Composed from the hero and the level."),
      hero: text("Hero", "The hero this level belongs to."),
      level: text("Level", "The level number."),
      attack: text("Attack", "Attack at this level."),
    })
);
```

**Sort order.** `sortBy(propertyName, direction)` orders rows by a property that is required (`.required()`) and of a
primitive or enum type, or by `"id"`; otherwise the build fails with `invalidSortKey`. `sortBy(null, direction)` sorts
by the reserved id. Without `sortBy`, rows sort by id ascending.

```ts
const Rarity = defineDomainType("Rarity", dt =>
  dt
    .property(PT.int32("weight").assetDelivery().required())
    .sortBy("weight", "desc")
    .localizedProperties({
      id: text("ID", "Identifies the rarity."),
      weight: text("Weight", "Higher weights sort first."),
    })
);
```

## Instances

`instance(...)` authors a row.

| Overload | Value keys |
| --- | --- |
| `instance(definition, id, values)` | A local definition (`defineDomainType`) only. Property names of the definition, type-checked: every `.required()` property must be present, whatever its binding hint. Rows of an overlay type are written with the overlay's name. |
| `instance(typeName, id, values)` | Property names of the local type with that name, or property ids. For an overlay, also the names the dependency publishes. |
| `instance(dependencyType, id, values)` | Property names the dependency publishes for the type (`dep.type("T")`), or property ids. |

Values are JSON: `string`, `number`, `boolean`, `null`, arrays and objects. A `ref` value is the target row's id; a
list value is an array; an inline element list is an array of objects keyed by the element's property names. A key that
names no property fails with `unresolvedPropertySlot`. A row of a type this package does not declare fails with
`invalidInstanceType`.

A row of a type whose required properties a user data resource fills (such as `Item.count` in `example-inventory`)
has no values to give for them. Author it with the type name, which does not type-check the values:
`instance("Item", "herb", {})`.

```ts
.instance(Rarity, "common", { weight: 1 })
.instance(Rarity, "rare", { weight: 10 })
.instance(Hero, "blaze", {
  rarity: "rare",
  element: "Fire",
  attack: 12,
  maxAttack: 120,
  limited: false,
  tags: ["starter"],
})
.instance(HeroLevel, "blaze.1", { hero: "blaze", level: 1, attack: 12 })
.instance(HeroLevel, "blaze.2", { hero: "blaze", level: 2, attack: 18 })
.instance(GameSettings, "gamesettings", { partySize: 4 })
```

`overlayInstance(type, sourceInstanceId, { overrides?, suppressed? })` changes a row that a dependency ships, without
copying it: `overrides` replaces the listed values (keys resolve like `instance` keys); `suppressed` is a boolean
flag on the row. `type` is a dependency type (`dep.type("T")`), an overlay definition, or the name of an overlay. An overlay row
aimed at a type this package declares as local fails with `invalidInstanceDomainTypeKind`.

## Overlay types

An overlay type extends a dependency's type: rows of the overlay are rows of the dependency's type, and the overlay adds
properties and settings. Make one with `defineOverlayDomainType(name, options, define?)` and register it with
`domainType(...)`; `options` usually starts from `dep.overlay("TypeName")`, which supplies the source, `singleEntry` and
the published properties, inline schemas and delegated actions.

```ts
const Item = defineOverlayDomainType("Item", inventory.overlay("Item"), dt =>
  dt.property(PT.string("giftMessage").assetDelivery()).localizedProperties({
    giftMessage: text("Gift message", "Shown when the item arrives as a gift."),
  })
);
```

The overlay builder has two members: `property(...)`, as for local types, and `localizedProperties(...)`, which lists
every added property (without `id`). Inherited properties are addressed by the names the dependency publishes, for
example in `ui.prop(...)` and in instance values.

| Option | Records |
| --- | --- |
| `source`, `publishedProperties`, `publishedInlineSchemas`, `publishedDelegatedActions` | What `dep.overlay(...)` supplies. Do not write them by hand. |
| `singleEntry` | Whether the type has one row; `dep.overlay(...)` copies the source's value. |
| `sort` | `{ key: propertyName \| null, direction?: "asc" \| "desc" }`. |
| `compositeKeyMode` | `{ kind: "inherit" }`, `{ kind: "suppress" }`, or `{ kind: "override", members: [...names] }`. |
| `actionPropertyTransforms` | Transform calls attached to an action property of the type: `{ targetProperty, mode?: "replace" \| "append", transformPackageId, transformId, arguments }`. `mode` defaults to `"replace"`; `"append"` lets several packages add to the same action. `arguments` take the shapes of `DomainTypeTransformArgumentDef` (`static`, `domainProperty` by property name, `actionLiteral`, `placeholder`, nested `actionTransformRef`). |
| `delegatedActions` | `{ methodName, def }[]`, as [delegated actions](#delegated-actions). |
| `renamedInheritedProperties` | `Record<string, string>`; not covered by this reference. |

Names in `sort`, `compositeKeyMode` and `targetProperty` resolve against the overlay's own properties and the published
ones; a name that resolves to neither fails with `unresolvedPropertySlot`. Two overlays of the same source type fail
with `duplicateOverlaySource`.

`overlayTypeSpec(name, options)` declares the same thing on the package builder, with the added properties given as
`options.declared: { name, type, localizedDisplay?, requirement?, bindingHint? }[]`.

## Inline elements

An inline element is the element type of a list property: each row of the host type holds a list of elements, and the
element has no table of its own. `defineInlineElement(name, define)` makes the element schema, and
`PT.listOf(PT.inlineElement(schema))` declares the list property, which must have the hint `masterData`.

The schema builder is immutable: each member returns a new builder. Chain every call and return the end of the chain;
a call whose result is dropped has no effect.

| Member | Records |
| --- | --- |
| `property(PT.<kind>(name)...)` | An element property. |
| `elementKey(first, ...rest)` | The members that identify an element within its row. The element id is the row id and the key values joined with `.`. |
| `localizedDisplay(entry)` | The element type's label and description. |
| `localizedProperties({ id, ...each property })` | As for domain types. |
| `sortBy(propertyName \| "id" \| null, direction = "asc")` | The element order. |
| `delegatedAction(methodName, def)` | A delegated action on the element. |

A schema may back one list property only; attaching it to a second property fails with `invalidBindingValue`.

`inlineElementOf(host, firstPropertyName, ...nestedPropertyNames)` refers to the elements of a list property, for
`mountLocal(...)` of a resource, `Source.direct(...)`, `uiComponent(...)` and `UiCond.rowElement(...)`. `host` is a
definition, a type name or a dependency type.

## The GS2 catalog

`GS2` (from `gs2-studio-dsl` or `gs2-studio-dsl/gs2`) lists every GS2 service and model the DSL can configure:
`GS2.<service>.<Model>` is `{ service, modelName }`, for example `GS2.inventory.SimpleItemModel`. Passing it to a
resource's `model(...)` types the resource's `bindings(...)` with that model's fields. Action names in transforms and
delegated actions are written `Gs2<Service>:<ActionName>` (`Gs2Inventory:AcquireSimpleItemsByUserId`) and
`Gs2<Service>:<Model>.<Method>` (`Gs2Exchange:RateModel.Exchange`).

## Master data resources

A master data resource configures one GS2 master data model. Without a mount it is one entry (a namespace, a settings
model); mounted on a domain type it is one entry per row of that type, with field values taken from the row. Only a
mounted resource can read properties (`Bind.domainProperty`); see [Bindings](#bindings) for what each kind accepts.

Declare one inline with `masterDataResource(resource => ...)`, or make a definition with `defineMasterDataResource(...)`
and attach it once, as a root (`masterDataResource(definition)`) or as a child (`addChild` / `addArrayChild`). A
definition attached in a second place throws `ResourceDefinition can only be attached to one graph location`. A
definition can be referred to (for example by `resourceRef(() => definition)`) before the code that attaches it.

```ts
const SimpleItemModel = defineMasterDataResource(resource =>
  resource
    .model(GS2.inventory.SimpleItemModel)
    .mountLocal(Item)
    .bindings({
      name: Bind.domainProperty(Source.direct(Item, "id")),
    })
);
```

```ts
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
```

| Member | Records |
| --- | --- |
| `model(GS2.<service>.<Model>)` | The GS2 model. Call it first: it types `bindings`. |
| `mountLocal(definition \| typeName \| dependencyType \| inlineElementOf(...))` | One entry per row of the type, or per element of the inline element list. |
| `mountDependency(firstHopPackageId, typeName, typeId)` | One entry per row of a dependency's type, by its published id. |
| `bindings(record)` | The fields' values (see [Bindings](#bindings)), typed by the model. |
| `domainPropertyBindings(record)` | The same, untyped: field paths the catalog schema does not describe. |
| `addChild(definition \| cb)` | A child model, such as a model inside a namespace. |
| `addArrayChild(arrayFieldName, definition \| cb)` | An element of an array field of this model, such as `acquireActions`. The child's model must be the field's element model. |
| `actionProgram(program)` | For an action model (`GS2.transaction.AcquireAction`, ...): the action this entry performs (see [Action programs](#action-programs-and-arguments)). |
| `actionPropertyProgram(propertyName, program)` | An action program for one action field; not covered further by this reference. |
| `resourceLink(definition \| ref)` | The resource whose key `Bind.resourceKey()` reads. |
| `externalResourceLink(sourcePackageId, resourceKind, resourceId)` | The same, for a dependency's resource by its published id. The package must declare the dependency. |
| `grnFieldMount(fieldName, resource \| resourceId, [{ grnKeyName, sourceKeyName }])` | Fills the keys of a GRN field from the keys of another master data resource. |
| `grnKeyBinding(fieldName, keyName, directive)` | Binds one key of a GRN field. |
| `rowScopeAllRows()` | Under each entry of the ancestor, include every row of the mounted type. |
| `rowScopeMatched({ ancestor, direction, refType, propertyName })` | Include only rows related to the ancestor's row through the ref property `propertyName` of `refType`; `direction` is `"childRefToAncestor"` or `"ancestorRefToChild"`. |
| `elementSourceFkFanout(childType, fkPropertyName)` | Signature only; not covered by this reference. |
| `ref()` | A `MasterDataResourceRef` for this resource. |

Build failures specific to resources: a child whose model is not the element model of the array field
(`arrayElementLocationMismatch`), an array field that holds no model (`arrayElementParentPropertyUnresolved`), an
unknown mount (`invalidMountPath`), a reference to a resource that was never attached (`unresolvedResourceRef`), and
`Source.parent(...)` with no ancestor to point at (`unresolvedParentBinding`).

## User data resources

A user data resource describes one GS2 per-player model and which properties its fields fill. Declare it with
`userDataResource(resource => ...)` or `defineUserDataResource(...)`; definitions attach once, as for master data.

```ts
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
```

| Member | Records |
| --- | --- |
| `model(GS2.<service>.<Model>)` | The GS2 model. Call it first. |
| `linkedMasterResourceId(definition \| ref)` | The master data resource the model belongs to; the link supplies the model's identity independently of the mount. |
| `mountLocal(definition \| typeName \| dependencyType)` | The domain type whose rows the user data belongs to. |
| `mountDependency(firstHopPackageId, typeName, typeId)` | The same for a dependency's type, by its published id. |
| `mountType(mountPath)` | A mount given as `{ kind: "local", typeName }` or `{ kind: "dependency", firstHopPackageId, typeName }`. |
| `bindings(record)` | The fields (see [Bindings](#bindings)). User data accepts `Bind.static`, `Bind.null`, `Bind.nulls`, `Bind.skip`, `Bind.domainProperty`, `Bind.domainProperties` and `Bind.domainPropertyKey`; other kinds fail with `invalidBindingValue`. |
| `existenceProperty(propertyName)` | A `bool` property that records whether the user data exists. |
| `arrayMembershipMapping(fieldName, childType, targetKeyPropertyName, targetPropertyName)` | A field that lists names: each row of `childType` whose `targetKeyPropertyName` appears in the list gets `true` in `targetPropertyName`. |
| `grnRefBinding(fieldName, grnFormat, [{ extractedKeyName, target, targetKeyPropertyName }])` | Reads keys out of a GRN field and matches them to rows of `target`. |
| `modelArrayDecodeBinding(fieldName, target, targetListPropertyName, [{ fieldName, targetPropertyName }], idSourceField?)` | Decodes an array of GS2 models into an inline list property. |
| `elementProjectionBinding(fieldName, target, [{ selectors, projections }])` | Picks array elements whose fields equal the `selectors` and copies their fields into properties. |
| `transformDecodeBinding(fieldName, target, targetListPropertyName, entries)` | Signature only; not covered by this reference. |
| `keyProjectionBinding(fieldName, target, targetPropertyName)` | Copies a resolved key into a property without replacing its own binding. |
| `addChild(definition \| cb)` | A child user data model. |
| `ref()` | A reference to this resource, for `resourceRef(() => ...)` and `targetResource`. |

## Bindings

`bindings({...})` maps GS2 field names to directives. Nested objects follow nested fields: `{ platformSetting: { fake:
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
| `Bind.resourceKey()` | Master data only: the key of the resource set with `resourceLink(...)`. |
| `Bind.placeholder(text)` | Master data only: `text` passed through unchanged, for example `#{userId}`. |
| `Bind.expression(expression)` | Master data only: an expression binding; its syntax is not covered by this reference. |

Some master data bindings pass `dsl build` but are refused by the editor and code generation: `Bind.domainProperties`
in any master data resource, and `Bind.domainProperty` or `Bind.expression` in a master data resource that is not
mounted on a domain type (such as a namespace). Such a resource accepts `Bind.static`, `Bind.null`, `Bind.nulls`,
`Bind.placeholder`, `Bind.skip` and `Bind.resourceKey`.

`Source` names a property relative to the resource that binds it:

| Member | Names |
| --- | --- |
| `Source.direct(definition \| typeName \| dependencyType \| inlineElementOf(...), propertyName)` | A property of the type the resource is mounted on. With a definition, `propertyName` is type-checked. |
| `Source.parent(source)` | `source`, read one resource level up (the parent resource's mount). Nest it to go further up. |
| `Source.idRef(typeName, [{ refPropertyName, targetTypeName }, ...], propertyName)` | A property reached by following ref properties from `typeName`. |
| `Source.dependencyResource(sourcePackageId, resourceKind, resourceId, source)` | Signature only; not covered by this reference. |

Presets that return a complete binding record for a common settings block:

| Function | Returns |
| --- | --- |
| `transactionSettingV2(overrides?)` | `{ distributorNamespaceId, enableParallelExecution }`, defaulting to the GRN `grn:gs2:{region}:{ownerId}:distributor:default` and `false` (actions run one at a time). Bind it to a namespace's `transactionSettingV2` field. |
| `scriptSetting(options?)` | `{ triggerScriptId, doneTriggerTargetType, doneTriggerScriptId, doneTriggerQueueNamespaceId }`. Omitted fields are `null`; `doneTriggerTargetType` defaults to `"none"`, and the asynchronous script fields are accepted only with `doneTriggerTargetType: "gs2_script"`. |
| `scriptGrn(namespaceName, scriptName)` | `grn:gs2:{region}:{ownerId}:script:<namespaceName>:script:<scriptName>`. |

```ts
.masterDataResource(namespace =>
  namespace
    .model(GS2.exchange.Namespace)
    .bindings({
      name: Bind.static("GiftShop"),
      ...Bind.nulls(
        "acquireAwaitScript",
        "exchangeScript",
        "incrementalExchangeScript",
        "logSetting"
      ),
      transactionSettingV2: transactionSettingV2(),
    })
    .addChild(GiftBoxRateModel)
)
```

## Action programs and arguments

An action model entry (an element of `acquireActions`, `consumeActions`, ...) gets its action from an
`ActionProgram`:

| Member | The action |
| --- | --- |
| `ActionProgram.transform(transformPackageId, transformId, args)` | The actions an action transform produces for `args`. |
| `ActionProgram.transformEntries(entries)` | Several transform calls, each `{ target: { kind: "selected", transformPackageId, transformId }, arguments }`. |
| `ActionProgram.domainProperty(source?)` | The actions held in an action property (`PT.listOf(PT.acquireAction())`, ...). |
| `ActionProgram.concrete(actionName, requestBindings)` | A GS2 action named directly, with its request fields bound by `Bind.*`. |

`Arg` gives the arguments of a transform call:

| Member | Argument value |
| --- | --- |
| `Arg.static(parameterName, value)` | A fixed JSON value. A value that is not JSON throws while the DSL evaluates. |
| `Arg.domainProperty(parameterName, source)` | A property (see `Source`). |
| `Arg.placeholder(parameterName, text)` | `text` passed through unchanged, for example `#{slot}`. |
| `Arg.actionTransformRef(parameterName, transformPackageId, transformId, args)` | A nested transform call. |
| `Arg.actionLiteral(parameterName, value)` | Signature only; not covered by this reference. A value that is not JSON throws, as for `Arg.static`. |

A transform of this package is called with the package's own id and the transform's id; a dependency's transform with
`dep.packageId` and `dep.transformId(name)`.

```ts
const GiftBoxRateModel = defineMasterDataResource(resource =>
  resource
    .model(GS2.exchange.RateModel)
    .mountLocal(GiftBox)
    .bindings({
      name: Bind.domainProperty(Source.direct(GiftBox, "id")),
    })
    .addArrayChild("acquireActions", acquireAction => {
      acquireAction
        .model(GS2.transaction.AcquireAction)
        .mountLocal(GiftBox)
        .actionProgram(
          ActionProgram.transform(inventory.packageId, inventory.transformId("AcquireItem"), [
            Arg.domainProperty("itemName", Source.parent(Source.direct(GiftBox, "item"))),
            Arg.domainProperty("count", Source.parent(Source.direct(GiftBox, "count"))),
          ])
        );
    })
);
```

## Action transforms

`actionTransform(name, transform => ...)` declares a transform: typed parameters in, GS2 actions out.

```ts
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
```

| Member | Records |
| --- | --- |
| `category("verify" \| "consume" \| "acquire")` | The transaction phase of the produced actions. Defaults to `"verify"`. |
| `parameter(name, { type, description?, required? })` | A parameter. `type` is a primitive, enum, `ref` or action type, or a list of one; `required` defaults to `true`. An inline or inline element type fails with `unsupportedTransformParameterType`. |
| `output(actionName, cb)` | One GS2 action, built with the output builder below. |
| `delegationOutput(targetPackageId, targetTransformId, cb)` | Delegates to another transform, built with the delegation builder below. |

Output builder:

| Member | Records |
| --- | --- |
| `resourceRef(() => definition \| ref)` | The master or user data resource the action targets; the function runs at build time, so it may name a resource declared later. |
| `externalResourceRef(sourcePackageId, resourceKind, resourceId)` | A dependency's resource as the target, by its published id. |
| `mapParameter(requestField, parameterName)` | A request field from a parameter. Field paths may index arrays: `acquireCounts[0].count`. |
| `mapStatic(requestField, value)` | A fixed JSON value. |
| `mapResourceKey(requestField)` | The target resource's key. Needs a target resource; top-level fields only. |
| `mapPlaceholder(requestField, text)` | `text` passed through unchanged, for example `#{userId}`. |
| `mapMountedResourceProperty(requestField, () => resource, keyPropertyName?)` | A value of the resource's mount; not covered further by this reference. |
| `condition(parameterName, operator, value)` | Produce this output only when the parameter compares to `value` with `operator`. `"eq"` and `"neq"` apply to any parameter that can be a condition source; `"gt"`, `"gte"`, `"lt"` and `"lte"` only to numeric parameters. List and action parameters cannot be condition sources. |

Delegation builder: `bindParameter(targetParameter, sourceParameter)`, `bindStatic(targetParameter, value)` and
`condition(parameterName, operator, value)`.

A local resource referred to by an output must be part of the package (`invalidResourceRef`).

## Delegated actions

A delegated action gives a domain type a method that runs a GS2 action of one of the package's resources. UI buttons
call it by method name. Register it on the type builder (`delegatedAction(methodName, def)`), on an inline element, or
on the package (`delegatedAction(type, methodName, def)`); the package form also accepts a dependency's type, and the
package then hosts the method on a local overlay of that type.

```ts
.delegatedAction(GiftBox, "Open", {
  targetActionKey: "Gs2Exchange:RateModel.Exchange",
  targetResource: GiftBoxRateModel,
  parameterOverrides: [{ parameterName: "count", source: { kind: "static", value: 1 } }],
})
.uiComponent(GiftBox, ui =>
  ui
    .templateLabel(
      "ContentsLabel",
      "{count} x {item}",
      { count: ui.prop("count"), item: ui.prop("item") },
      { name: "GiftBox" }
    )
    .buttonAction("OpenButton", "Open", undefined, { name: "GiftBox" })
)
```

`DelegatedActionDef`:

| Field | Meaning |
| --- | --- |
| `targetActionKey` | The catalog action, `Gs2<Service>:<Model>.<Method>`. |
| `targetResource` | A master or user data resource definition (or ref) of this package. A resource of another package fails with `invalidDelegatedActionResourceRef`. |
| `parameterOverrides?` | `{ parameterName, source }[]`. `source` is `{ kind: "static", value }`, `{ kind: "domainProperty", propertyName }` (a property of the host type), `{ kind: "actionLiteral", value }` or `{ kind: "listEntries", entries }`. Parameters you do not override are left to the generated method's caller. |

A method name registered twice on the same type keeps the later registration. Registering on a type the package does
not declare fails with `delegatedActionTargetTypeUnknown`.

## UI components

`uiComponent(target, ui => ...)` declares the generated UI of a type. `target` is a definition, a type name, a
dependency type (the package hosts it on a local overlay), or `inlineElementOf(...)` for the elements of a list
property. Each target has at most one UI component (`duplicateUiComponentDefinition`).

```ts
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
```

Value sources:

| Member | Source |
| --- | --- |
| `ui.prop(name)` | A property of the target, `"id"` included. With a definition, `name` is type-checked against declared and published properties. |
| `ui.inheritedProp(propertyId)` | An inherited property by its published id, when no name is available. |
| `ui.lit(value)` | A literal `string`, `number`, `boolean` or `null`. |
| `ui.bandLower(definition, tablePropertyName, position)`, `ui.bandUpper(...)` | A table band source for `gauge` bounds; the table's type must be single entry (`uiComponentTableBandSourceNotSingleEntry`). Otherwise not covered by this reference. |
| `ui.bandLowerById(typeId, tablePropertyId, position)`, `ui.bandUpperById(...)` | The same, by published ids. |

Items (each takes a component class name first and an optional `{ name?, description? }` last):

| Item | Shows |
| --- | --- |
| `label(className, source, options?)` | A value as text; `options.fallbackText` when it is empty. |
| `value(className, propertySource, options?)` | A property value. |
| `templateLabel(className, template, sources, options?)` | `template` with each `{key}` replaced by `sources[key]`. Every placeholder needs exactly one source and every source a placeholder. |
| `image(className, source, imageMode, options?)` | Signature only: `imageMode` is `"spriteResourcePath"`, `"addressableKey"`, `"url"` or `"assetReference"`, and `options.fallback` is a string. Not covered by this reference. |
| `gauge(className, current, max, options?)` | A gauge of `current` against `max`; `options.min` accepts the same sources as `max`, and `options.clamp` is a boolean. |
| `buttonAction(className, methodName, args?, options?)` | A button that calls a delegated action of the target; `args` binds its parameters by name. |
| `activeToggle(className, condition, options?)` | A toggle driven by `condition`. |
| `interactable(className, condition, options?)` | Interactability driven by `condition`. |

`UiCond` builds the conditions of `activeToggle` and `interactable`:

| Member | Holds when |
| --- | --- |
| `UiCond.truthy(source)` | `source` is truthy. |
| `UiCond.eq`, `neq`, `gt`, `gte`, `lt`, `lte` `(lhs, rhs)` | The comparison of two sources holds. |
| `UiCond.and(...conditions)`, `UiCond.or(...conditions)`, `UiCond.not(condition)` | Combinations. Nesting is limited to 16 levels. |
| `UiCond.rowElement(parentType, listPropertyName)` | Reads a `bool` list property of the parent row (`uiComponentRowElementListNotBoolList` otherwise); not covered further by this reference. |

Rules: class names are PascalCase and unique among all UI components of the same target type; property names must exist
on the target (`uiComponentUnknownProperty`); a button's method must be a delegated action registered for the target or
published by its dependency (`uiComponentUnknownDelegatedAction`). `dsl build` also refuses a UI component whose target
type no resource mounts, in this package or in a dependency.

```ts
.uiComponent(Item, ui =>
  ui
    .label("GiftMessageLabel", ui.prop("giftMessage"), { name: "Item" })
    .value("CountValue", ui.prop("count"), { name: "Item" })
)
```

## Code templates

`codeTemplate(outputFileName, templateSource)` adds a file template to the package. Code generation renders templates
whose output name ends in `.cs` with Nunjucks-style syntax (`{{ }}` output, `{% for %}`, `{% if %}`, `{% set %}`); the
context has `namespacePrefix`, `packageName`, and `domainTypes` (each with `name`, `idTypeName` and `namespace`; overlays
excluded). An output name that cannot be written as a file fails with `unsafeCodeTemplateOutputFileName`. Load the
template text with a `?raw` import:

```ts
.codeTemplate("GiftShop.cs", giftShopTemplate)
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
4. Declare the dependency with `dependency(dep.packageId, spec)`.

`example-gift-shop` depends on `example-inventory`, which is built into the same project, so its spec is `*`:

```ts
const inventory = dependencyPackage(inventorySurface);
```

```ts
.dependency(inventory.packageId, "*")
.domainType(Item)
.domainType(GiftBox)
.instance("Item", "elixir", { giftMessage: "A rare elixir, with our thanks." })
.instance(GiftBox, "starter", { item: "elixir", count: 3 })
```

`spec` is written to the package's `dependencies` and says where the dependency comes from:

| `spec` | The dependency is |
| --- | --- |
| `*` | The package with that id authored in the same project. |
| `github:<owner>/<repo>` or `github:<owner>/<repo>@<range>` | A package installed from that GitHub repository. |
| `npm:<name>@<range>` | A package installed from npm under `<name>`. |
| `file:<path>` | A package installed from a local directory. |
| any other text (a version range) | The project's own package with that id if there is one, otherwise the npm package named by the id, in that range. |

`dependencyPackage(surface)` returns:

| Member | Returns |
| --- | --- |
| `packageId` | The dependency's package id. |
| `type(typeName)` | A dependency type, for `instance`, `overlayInstance`, `mountLocal`, `Source.direct`, `uiComponent`, `delegatedAction` and `inlineElementOf`. |
| `overlay(typeName)` | The options of `defineOverlayDomainType` for an overlay of that type. |
| `typeId(typeName)` | The type's declaring id, for `PT.ref(...)` and `mountDependency(...)`. |
| `propertyId(typeName, propertyName)` | A published property id, usable as an instance value key. |
| `elementPropertyId(typeName, propertyPath, propertyName)` | The id of a property of a published inline element schema. |
| `inlineElements(typeName, listPropertyName, elements)` | Inline element values keyed by property ids, which a dependency type's row needs. |
| `delegatedActionTarget(typeName, methodName)` | The published target of a delegated action. |
| `transformId(name)` | A published action transform id, for `ActionProgram.transform` and `Arg.actionTransformRef`. |
| `resourceId("<service>.<Model>")` | A published master data resource id, for `externalResourceRef` and `externalResourceLink`. |

The surface's names are type-checked when the JSON is imported with `resolveJsonModule`. A name the surface does not
publish throws while the DSL evaluates (`<packageId>'s dependency surface: no type named "X". Published: ...`), so the
build fails before validation.

`example-gift-shop` reads `surfaces/example-inventory.json`, which `dsl build` wrote for `example-inventory`:

```json
{
  "schemaVersion": 1,
  "packageId": "example-inventory",
  "types": {
    "Item": {
      "id": "dt_20QRK0BTMW89TAWPHGNYFXNYJ5",
      "singleEntry": false,
      "canonicalPackageId": "example-inventory",
      "canonicalTypeId": "dt_20QRK0BTMW89TAWPHGNYFXNYJ5",
      "properties": {
        "count": "prop_1DQWSQS8AC837BT0EWF1439PFW",
        "id": "prop_7ZZZZZZZZZZZZZZZZZZZZZZZZZ"
      }
    }
  },
  "actionTransforms": {
    "AcquireItem": "at_0XAMJJD9WX8S0TR71Z8KMQ8V80",
    "ConsumeItem": "at_1YA7MG1XJH88XT3P4Z6JF09ZVW"
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
| `random` | The generated ids of types (`type:<Type>`), properties (`property:<Type>.<name>`, inline element members as `property:<Type>.<list>.<name>`), rows and transforms (`transform:<Name>`). A row token is `row:["<owner packageId>","<type>","<rowId>"]`, where `<type>` is `type:<Type>` for a type of this package and the dependency's type id (`dt_...`) for a row added to a dependency's type. |
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
| `CLI_DSL_EXPORT_INVALID` | The entry does not export exactly one `definePackage(...).build()` result. | Export one built package. |
| `CLI_DSL_PACKAGE_INVALID` | The DSL validators refused the package; each problem is printed as JSON, for example `{"kind":"duplicatePropertyName","typeName":"Item","propertyName":"count"}`, except `restoreFailure`, which is printed as its plain message. | Fix the declaration the `kind` names (see [Validation error kinds](#validation-error-kinds)). |
| `CLI_DSL_PACKAGE_ID_TAKEN` | The package id is a dependency installed in the project. | Use another id. |
| `CLI_DSL_DEPENDENCY_NOT_INSTALLED` | A declared dependency is not in the project. | For a package authored in the project, build it with `dsl build` first; for another package, add it in GS2 Studio. |
| `CLI_DSL_LEDGER_MISSING` | No ledger, and no `--write-ledger`. | Run with `--write-ledger` the first time. |
| `CLI_DSL_LEDGER_MISMATCH` | Missing tokens (listed with candidate ids), tokens that are no longer current, or a retired token that reappeared. | Missing tokens: rerun with `--write-ledger`. Others: edit the ledger as the message says. |
| `CLI_DSL_LEDGER_INVALID` | The ledger is not canonical JSON of the shape above. | Repair the file as the message says. |
| `CLI_DSL_LEDGER_UNREADABLE` | The ledger file exists but cannot be read. | Fix the file's permissions or path. |
| `CLI_DSL_WRITE_FAILED` | Writing the ledger or the dependency surface failed. | Fix the cause the message names and rerun. |
| `CLI_DSL_VALIDATION_FAILED` | The checks the editor applies before it opens or installs a package: unbound `masterData` / `userData` properties, rows that fail validation, composite-key ids, UI components on unmounted types, and others, listed one by one. | Fix each finding. |

`dsl build` does not run every check the editor and code generation run. A build can succeed with a binding the editor
then reports (see [Bindings](#bindings)). After a build, open the project in GS2 Studio and fix what it reports.

## Validation error kinds

`CLI_DSL_PACKAGE_INVALID` prints each problem as a JSON object (a `restoreFailure` as its plain message); its `kind` is
one of these. The other fields name the
type, property, resource or component involved.

| Kind | Cause |
| --- | --- |
| `restoreFailure` | The built package cannot be read back as package files; `message` says why. Often the cause of the problems listed after it. |
| `schemaValidation` | A value failed a shape check; `path` and `message` locate it (for example `package.display`). |
| `selfDependencyNotAllowed`, `duplicateDependencyPackage` | `dependency(...)` names the package itself, or one package twice. |
| `reservedPropertyName` | A property named `id`. |
| `duplicateDomainTypeName`, `duplicatePropertyName` | Two types, or two properties of one type, share a name. |
| `duplicateOverlaySource` | Two overlays of the same source type. |
| `domainTypeDefinitionNotRegistered` | A definition used but never passed to `domainType(...)`; `context` says where it was used. |
| `invalidRefTarget`, `invalidRefTargetFormat` | `PT.ref(...)` names no type of the package, or a name that is not PascalCase. |
| `invalidInstanceType` | A row of a type the package does not declare. |
| `invalidInstanceDomainTypeKind` | An `overlayInstance` of a local type. |
| `invalidSingleEntryName`, `singleEntryInstanceIdMismatch` | A single-entry type name that gives no valid row id, or a row whose id is not `expectedId`. |
| `invalidCompositeKey` | A composite key member that is missing, `id`, repeated, of an unsupported type or hint, or combined with `singleEntry` (`reason`). |
| `invalidSortKey` | A sort key that is unknown, not comparable, or not required (`reason`). |
| `invalidInlineBindingHint` | A binding hint an inline property does not accept. |
| `delegatedActionTargetTypeUnknown`, `invalidDelegatedActionResourceRef` | A delegated action on an undeclared type, or targeting a resource that is not the package's. |
| `unresolvedPropertySlot`, `inlineValueKeyNotPublished` | A property name that resolves to nothing; an inline value key of a type this package does not declare, which must be a property id (use `dep.inlineElements(...)`). |
| `invalidMountPath`, `invalidMountPathFormat` | A resource mounted on an unknown type, or on a name that is not PascalCase. |
| `invalidParentRef`, `cyclicParentRef`, `duplicateArrayElementIndex` | A broken resource tree. |
| `arrayElementLocationMismatch`, `arrayElementParentPropertyUnresolved`, `invalidArrayPropertyName` | An `addArrayChild` whose model is not the array field's element model, whose field holds no model, or whose field name is invalid. |
| `invalidMountedMasterResource` | A user data resource linked to a master data resource that is not in the package. |
| `invalidElementSource`, `invalidElementSourceChildTypeFormat` | An `elementSourceFkFanout` whose child type or property is unknown, or whose type name is invalid. |
| `invalidResourceLinkRef`, `invalidExternalResourceLinkSource` | A `resourceLink` target that is not in the package, or an `externalResourceLink` to a package the package does not declare as a dependency. |
| `unresolvedResourceRef` | A resource reference to a resource never attached to the package; `context` says where. |
| `unresolvedParentBinding` | `Source.parent(...)` with no ancestor resource. |
| `invalidBindingValue` | A malformed or unaccepted binding; `context` says which. |
| `invalidModelRef` | `model(...)` given something that is not a catalog model. |
| `unsupportedTransformParameterType`, `invalidResourceRef`, `resourceRefNotImported` | A transform parameter type a transform cannot take, or an output resource that is not the package's. |
| `uiComponentTargetTypeUnknown`, `uiComponentTargetTypeInvalidFormat` | A UI component target that is not a type of the package, or not PascalCase. |
| `duplicateUiComponentDefinition`, `duplicateUiComponentClassName`, `invalidUiComponentClassName` | Two components for one target; a class name used twice on a type; a class name that is empty, too long or not PascalCase. |
| `uiComponentUnknownProperty`, `uiComponentUnknownDelegatedAction` | An item names a property or method the target does not have. |
| `uiComponentButtonActionParameterInvalidFormat` | A `buttonAction` argument name that is not a valid parameter name. |
| `uiComponentTableBandSourceTypeUnknown`, `uiComponentTableBandTableUnknown`, `uiComponentTableBandSourceNotSingleEntry` | A band source on an unknown type or property, or on a type that is not single entry. |
| `uiComponentRowElementSourceTypeUnknown`, `uiComponentRowElementListUnknown`, `uiComponentRowElementListNotBoolList` | A `UiCond.rowElement` on an unknown type or list, or on a list that is not a `bool` list. |
| `uiComponentConditionTooDeep` | A UI condition nested deeper than `maxDepth`. |
| `uiComponentTemplateLabelKeyMismatch` | A `templateLabel` placeholder without a source, a source without a placeholder, or a key given twice (`direction`). |
| `unsafeCodeTemplateOutputFileName` | A code template output name that cannot be written as a file. |

## Exported types

`gs2-studio-dsl` exports these types for annotations:

| Type | Is |
| --- | --- |
| `BuiltPackage` | The result of `build()`. |
| `PackageBuilder` | The builder `definePackage` returns. |
| `LocalizedDisplay` | Label, description and unit per locale. |
| `MasterDataResourceDefinition`, `UserDataResourceDefinition` | What `defineMasterDataResource` and `defineUserDataResource` return. |
| `MasterDataResourceRef` | What a master data resource's `ref()` returns. |
| `DependencySurface` | The shape of a surface file. |
| `DependencyDomainTypeRef` | What `dep.type(...)` returns. |
| `ScriptSettingOptions` | The options of `scriptSetting`. |
