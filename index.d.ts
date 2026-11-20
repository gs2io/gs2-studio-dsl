type RequirementConditionSnapshotDto = {
	readonly kind: "eq" | "neq";
	readonly propertyName: string;
	readonly value: string | number | boolean;
} | {
	readonly kind: "gt" | "gte" | "lt" | "lte";
	readonly propertyName: string;
	readonly value: number;
} | {
	readonly kind: "isSet" | "isNotSet";
	readonly propertyName: string;
} | {
	readonly kind: "and";
	readonly children: readonly RequirementConditionSnapshotDto[];
} | {
	readonly kind: "or";
	readonly children: readonly RequirementConditionSnapshotDto[];
} | {
	readonly kind: "not";
	readonly child: RequirementConditionSnapshotDto;
};
type RequirementSnapshotDto = {
	readonly kind: "always";
} | {
	readonly kind: "never";
} | {
	readonly kind: "conditional";
	readonly condition: RequirementConditionSnapshotDto;
	readonly requiredWhenMet: boolean;
};
type ComparisonOperatorSnapshotDto = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
type JsonValue = string | number | boolean | null | {
	readonly [key: string]: JsonValue;
} | readonly JsonValue[];
type ResourceKindSnapshotDto = "masterData" | "userData";
interface ExternalResourceRefSnapshotDto {
	readonly sourcePackageId: string;
	readonly resourceKind: ResourceKindSnapshotDto;
	readonly resourceId: string;
}
interface TaggedExternalResourceRefSnapshotDto extends ExternalResourceRefSnapshotDto {
	readonly kind: "external";
}
type ResourceRefSnapshotDto = {
	readonly kind: "local";
	readonly resourceKind: ResourceKindSnapshotDto;
	readonly resourceId: string;
} | TaggedExternalResourceRefSnapshotDto;
type TransformTargetSnapshotDto = {
	readonly kind: "unselected";
} | {
	readonly kind: "selected";
	readonly transformPackageId: string;
	readonly transformId: string;
};
interface TransformArgumentEnvelopeSnapshotDto<TSource> {
	readonly parameterName: string;
	readonly source: TSource;
}
interface TransformCallSnapshotDto<TArgument, TTarget extends TransformTargetSnapshotDto = TransformTargetSnapshotDto> {
	readonly target: TTarget;
	readonly arguments: readonly TArgument[];
}
interface TransformReferenceSnapshotDto<TArgument, TTarget extends TransformTargetSnapshotDto = TransformTargetSnapshotDto> {
	readonly kind: "actionTransformRef";
	readonly invocation: TransformCallSnapshotDto<TArgument, TTarget>;
}
type ActionCategorySnapshotDto = "verify" | "consume" | "acquire";
interface LocalizedDisplayEntrySnapshotDto {
	readonly label?: string;
	readonly description?: string;
	readonly unit?: string;
}
interface LocalizedDisplaySnapshotDto {
	readonly [locale: string]: LocalizedDisplayEntrySnapshotDto;
}
type DomainPropertyValueSnapshotDto = JsonValue;
type UiImageModeSnapshotDto = "spriteResourcePath" | "addressableKey" | "url" | "assetReference";
type FileRequirementDto = RequirementSnapshotDto;
type FileDomainPropertyValueDto = DomainPropertyValueSnapshotDto;
type FileResourceRefDto = ResourceRefSnapshotDto;
type FileOutputParameterMappingDto = {
	readonly kind: "parameter";
	readonly parameterName: string;
	readonly sourceParameter?: string;
} | {
	readonly kind: "static";
	readonly parameterName: string;
	/** Restore checks the value is JSON. */
	readonly value: unknown;
} | {
	readonly kind: "resourceKey";
	readonly parameterName: string;
} | {
	readonly kind: "placeholder";
	readonly parameterName: string;
	readonly value: string;
} | {
	readonly kind: "mountedResourceProperty";
	readonly parameterName: string;
	readonly resourceRef: FileResourceRefDto;
	readonly keyPropertyName?: string;
};
type FileTransformConditionDto = {
	readonly sourceParameter: string;
	readonly operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
	/** Restore checks the value is JSON. */
	readonly value: unknown;
};
type FileDelegationParameterBindingDto = TransformArgumentEnvelopeSnapshotDto<{
	readonly kind: "parameter";
	readonly sourceParameter?: string;
} | {
	readonly kind: "static";
	/** Restore checks the value is JSON. */
	readonly value: unknown;
}>;
type FileActionTransformDirectOutputDto = {
	readonly kind: "direct";
	readonly conditions: readonly FileTransformConditionDto[];
	readonly actionName?: string;
	readonly resourceRef?: FileResourceRefDto;
	readonly parameterMappings: readonly FileOutputParameterMappingDto[];
};
interface FileActionTransformDelegationOutputDto {
	readonly kind: "delegation";
	readonly conditions: readonly FileTransformConditionDto[];
	readonly invocation: TransformCallSnapshotDto<FileDelegationParameterBindingDto>;
}
type FileActionTransformOutputDto = FileActionTransformDirectOutputDto | FileActionTransformDelegationOutputDto;
type FileDelegationOutputDto = Extract<FileActionTransformOutputDto, {
	kind: "delegation";
}>;
type FileDelegationConditionDto = FileDelegationOutputDto["conditions"][number];
declare class ActionTransformDelegationOutputBuilder {
	private readonly _targetPackageId;
	private readonly _targetId;
	private readonly _parameterBindings;
	private readonly _conditions;
	constructor(targetPackageId: string, targetId: string);
	bindParameter(targetParameter: string, sourceParameter: string): this;
	bindStatic(targetParameter: string, value: JsonValue): this;
	condition(sourceParameter: string, operator: FileDelegationConditionDto["operator"], value: JsonValue): this;
}
declare const RESOURCE_DEFINITION: unique symbol;
interface ResourceDefinitionBase<TKind extends "masterData" | "userData"> {
	readonly definitionKind: "resource";
	readonly resourceKind: TKind;
	readonly [RESOURCE_DEFINITION]: TKind;
}
export interface MasterDataResourceDefinition extends ResourceDefinitionBase<"masterData"> {
}
export interface UserDataResourceDefinition extends ResourceDefinitionBase<"userData"> {
}
declare abstract class ResourceRefBase<TKind extends string> {
	#private;
	constructor(token: symbol, resolve: () => string);
	_resolveId(): string;
}
declare class MasterDataResourceRef extends ResourceRefBase<"master"> {
}
declare class UserDataResourceRef extends ResourceRefBase<"user"> {
}
type MasterDataResourceReference = MasterDataResourceDefinition | MasterDataResourceRef;
type UserDataResourceReference = UserDataResourceDefinition | UserDataResourceRef;
type ResourceRefProvider = () => MasterDataResourceReference | UserDataResourceReference;
declare class ActionTransformOutputBuilder {
	private readonly _actionName;
	/** A local target is resolved at build so forward resources can acquire ids; an external target is already published. */
	private _resourceRef?;
	private readonly _parameterMappings;
	private readonly _conditions;
	constructor(actionName: string);
	/** Defer the provider until build so forward resources can acquire ids; setting it replaces any external target. */
	resourceRef(refProvider: ResourceRefProvider): this;
	/** Require a published resource id because this build cannot inspect the dependency closure; setting it replaces any local target. */
	externalResourceRef(sourcePackageId: string, resourceKind: "masterData" | "userData", resourceId: string): this;
	mapParameter(parameterName: string, sourceParameter: string): this;
	mapStatic(parameterName: string, value: JsonValue): this;
	mapResourceKey(parameterName: string): this;
	mapPlaceholder(parameterName: string, value: string): this;
	/** Defer mounted-resource mappings too, so their refs can point forward just like the output target. */
	mapMountedResourceProperty(parameterName: string, refProvider: ResourceRefProvider, keyPropertyName?: string): this;
	condition(sourceParameter: string, operator: FileTransformConditionDto["operator"], value: JsonValue): this;
	/** Fold provider throws into the unresolved-ref diagnostic so callers receive a collected build error. */
	private resolveLocalRef;
}
type Result<T, E> = {
	readonly kind: "success";
	readonly value: T;
} | {
	readonly kind: "failure";
	readonly error: E;
};
type CombinedValues<T extends Record<string, () => Result<unknown, unknown>>> = {
	[K in keyof T]: T[K] extends () => Result<infer V, unknown> ? V : never;
};
type CombinedError<T extends Record<string, () => Result<unknown, unknown>>> = {
	[K in keyof T]: T[K] extends () => Result<unknown, infer E> ? E : never;
}[keyof T];
declare const Result: {
	readonly success: <T, E = never>(value: T) => Result<T, E>;
	readonly failure: <T = never, E = unknown>(error: E) => Result<T, E>;
	readonly isSuccess: <T, E>(result: Result<T, E>) => result is {
		readonly kind: "success";
		readonly value: T;
	};
	readonly isFailure: <T, E>(result: Result<T, E>) => result is {
		readonly kind: "failure";
		readonly error: E;
	};
	readonly map: <T, E, U>(result: Result<T, E>, fn: (value: T) => U) => Result<U, E>;
	readonly flatMap: <T, E, U, F>(result: Result<T, E>, fn: (value: T) => Result<U, F>) => Result<U, E | F>;
	readonly mapError: <T, E, F>(result: Result<T, E>, fn: (error: E) => F) => Result<T, F>;
	/**
	 * Eager Result arguments would run every computation before `combine` starts.
	 * Thunks let the first failure prevent later computations from running.
	 */
	readonly combine: <T extends Record<string, () => Result<unknown, unknown>>>(thunks: T) => Result<CombinedValues<T>, CombinedError<T>>;
	readonly traverse: <T, U, E>(items: readonly T[], fn: (item: T, index: number) => Result<U, E>) => Result<readonly U[], E>;
	/**
	 * Use only when failure proves a programming bug, such as an invalid fixture.
	 * Recoverable failures need Result narrowing so callers can handle the error.
	 */
	readonly unwrap: <T, E>(result: Result<T, E>) => T;
	/**
	 * Already-validated inputs make failure a caller bug; returning it as a domain
	 * error would hide the broken invariant.
	 */
	readonly unwrapInvariant: <T, E extends {
		readonly kind: string;
	}>(result: Result<T, E>, context: string) => T;
	readonly valueOrUndefined: <T, E>(result: Result<T, E>) => T | undefined;
};
type Unverified<B extends string> = string & {
	readonly __brand: B;
};
type Verified<B extends string> = Unverified<B> & {
	readonly __verified: true;
};
interface BrandFactory<T extends Verified<string>, E> {
	readonly create: (value: string) => Result<T, E>;
	readonly trusted: (value: string) => T;
	/** Promotes the brand's Unverified twin through the same grammar `create` applies; a brand without a twin has nothing to pass. */
	readonly verify: (value: Unverified<T["__brand"]>) => Result<T, E>;
}
type DomainTypeName = Verified<"DomainTypeName">;
type UnverifiedDomainTypeName = Unverified<DomainTypeName["__brand"]>;
declare const DomainTypeName: BrandFactory<DomainTypeName, {
	readonly kind: "invalidDomainTypeName";
	readonly reason: "empty" | "tooLong" | "notPascalCase";
}>;
declare const UnverifiedDomainTypeName: {
	(value: string): Unverified<"DomainTypeName">;
	(value: string | undefined): Unverified<"DomainTypeName"> | undefined;
};
declare const PRIMITIVE_TYPES: {
	readonly kinds: readonly ("string" | "int32" | "int64" | "float32" | "float64" | "bool" | "timestamp")[];
	has(value: unknown): value is "string" | "int32" | "int64" | "float32" | "float64" | "bool" | "timestamp";
};
type PrimitiveTypeKind = (typeof PRIMITIVE_TYPES.kinds)[number];
type PropertyElementTypeShape<TypeId extends string> = {
	readonly kind: "primitive";
	readonly primitiveType: PrimitiveTypeKind;
} | {
	readonly kind: "enum";
	readonly values: readonly string[];
} | {
	readonly kind: "ref";
	readonly targetTypeId?: TypeId;
} | {
	readonly kind: "inline";
	readonly targetTypeId?: TypeId;
} | {
	readonly kind: "verifyAction";
} | {
	readonly kind: "consumeAction";
} | {
	readonly kind: "acquireAction";
};
type ResolvedFreeElement = Exclude<PropertyElementTypeShape<never>, {
	readonly kind: "ref" | "inline";
}>;
type PrimitivePropertyTypeDef = Extract<ResolvedFreeElement, {
	readonly kind: "primitive";
}>;
type EnumPropertyTypeDef = Extract<ResolvedFreeElement, {
	readonly kind: "enum";
}>;
type VerifyActionPropertyTypeDef = Extract<ResolvedFreeElement, {
	readonly kind: "verifyAction";
}>;
type ConsumeActionPropertyTypeDef = Extract<ResolvedFreeElement, {
	readonly kind: "consumeAction";
}>;
type AcquireActionPropertyTypeDef = Extract<ResolvedFreeElement, {
	readonly kind: "acquireAction";
}>;
interface RefPropertyTypeDef {
	readonly kind: "ref";
	readonly targetType: UnverifiedDomainTypeName;
}
interface InlinePropertyTypeDef {
	readonly kind: "inline";
	readonly targetType: UnverifiedDomainTypeName;
}
interface InlineElementTypeDef {
	readonly kind: "inlineElement";
	readonly schema: {};
}
interface ListPropertyTypeDef<TElement extends PropertyTypeDef | InlineElementTypeDef = PropertyTypeDef | InlineElementTypeDef> {
	readonly kind: "list";
	readonly elementType: TElement;
}
type PropertyTypeDef = ResolvedFreeElement | RefPropertyTypeDef | InlinePropertyTypeDef | ListPropertyTypeDef;
type TransformParameterTypeDef = Exclude<PropertyTypeDef, {
	readonly kind: "list";
}> | ListPropertyTypeDef<PropertyTypeDef>;
declare class ActionTransformBuilder {
	private readonly _name;
	private readonly _id;
	private _category;
	private readonly _parameters;
	private readonly _outputBuilders;
	private readonly _parameterErrors;
	constructor(name: string);
	/** Typed as the persisted category so the published declarations do not carry the domain category helpers. */
	category(cat: ActionCategorySnapshotDto): this;
	parameter(name: string, options: {
		type: TransformParameterTypeDef;
		description?: string;
		required?: boolean;
	}): this;
	output(actionName: string, cb: (builder: ActionTransformOutputBuilder) => void): this;
	/** Defer target existence checks because a single-package build has no dependency closure. */
	delegationOutput(targetPackageId: string, targetId: string, cb: (builder: ActionTransformDelegationOutputBuilder) => void): this;
}
declare const BINDING_HINT_KINDS: {
	readonly kinds: readonly ("masterData" | "userData" | "none" | "assetDelivery")[];
	has(value: unknown): value is "masterData" | "userData" | "none" | "assetDelivery";
};
type BindingHintKind = (typeof BINDING_HINT_KINDS.kinds)[number];
declare const COMPARISON_OPS: {
	readonly kinds: readonly ("eq" | "neq" | "gt" | "gte" | "lt" | "lte")[];
	has(value: unknown): value is "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
};
type ComparisonOp = (typeof COMPARISON_OPS.kinds)[number];
type OrderingComparisonOp = Exclude<ComparisonOp, "eq" | "neq">;
interface AndCondition<TCondition> {
	readonly kind: "and";
	readonly children: readonly TCondition[];
}
interface OrCondition<TCondition> {
	readonly kind: "or";
	readonly children: readonly TCondition[];
}
interface NotCondition<TCondition> {
	readonly kind: "not";
	readonly child: TCondition;
}
type ConditionPropertyName = string;
type RequirementCondition = {
	readonly kind: "eq" | "neq";
	readonly propertyName: ConditionPropertyName;
	readonly value: string | number | boolean;
} | {
	readonly kind: OrderingComparisonOp;
	readonly propertyName: ConditionPropertyName;
	readonly value: number;
} | {
	readonly kind: "isSet" | "isNotSet";
	readonly propertyName: ConditionPropertyName;
} | AndCondition<RequirementCondition> | OrCondition<RequirementCondition> | NotCondition<RequirementCondition>;
type RequirementCondition$1 = RequirementCondition;
declare class PropertyDef<TName extends string = string, TValue extends FileDomainPropertyValueDto = FileDomainPropertyValueDto, TRequired extends boolean = boolean> {
	readonly _kind: "PropertyDef";
	readonly name: TName;
	readonly type: PropertyTypeDef;
	private _localizedDisplay?;
	private _requirement;
	private _bindingHint?;
	constructor(name: TName, type: PropertyTypeDef);
	localizedDisplay(localizedDisplay: LocalizedDisplaySnapshotDto): PropertyDef<TName, TValue, TRequired>;
	required(): PropertyDef<TName, TValue, true>;
	requiredWhen(condition: RequirementCondition$1, requiredWhenMet?: boolean): PropertyDef<TName, TValue, false>;
	optionalWhen(condition: RequirementCondition$1): PropertyDef<TName, TValue, false>;
	masterData(): PropertyDef<TName, TValue, TRequired>;
	userData(): PropertyDef<TName, TValue, TRequired>;
	assetDelivery(): PropertyDef<TName, TValue, TRequired>;
}
interface PTHelper {
	string(): PrimitivePropertyTypeDef;
	string<N extends string>(name: N): PropertyDef<N, string, false>;
	int32(): PrimitivePropertyTypeDef;
	int32<N extends string>(name: N): PropertyDef<N, number, false>;
	int64(): PrimitivePropertyTypeDef;
	int64<N extends string>(name: N): PropertyDef<N, number, false>;
	float32(): PrimitivePropertyTypeDef;
	float32<N extends string>(name: N): PropertyDef<N, number, false>;
	float64(): PrimitivePropertyTypeDef;
	float64<N extends string>(name: N): PropertyDef<N, number, false>;
	bool(): PrimitivePropertyTypeDef;
	bool<N extends string>(name: N): PropertyDef<N, boolean, false>;
	timestamp(): PrimitivePropertyTypeDef;
	timestamp<N extends string>(name: N): PropertyDef<N, string, false>;
	ref(targetType: string): RefPropertyTypeDef;
	inline(targetType: string): InlinePropertyTypeDef;
	enum(...values: string[]): EnumPropertyTypeDef;
	inlineElement(schema: InlineElementTypeDef["schema"]): InlineElementTypeDef;
	listOf<T extends PropertyTypeDef | InlineElementTypeDef>(elementType: T): ListPropertyTypeDef<T>;
	verifyAction(): VerifyActionPropertyTypeDef;
	consumeAction(): ConsumeActionPropertyTypeDef;
	acquireAction(): AcquireActionPropertyTypeDef;
	prop<N extends string>(name: N, type: Exclude<PropertyTypeDef, PrimitivePropertyTypeDef>): PropertyDef<N, FileDomainPropertyValueDto, false>;
}
export declare const PT: PTHelper;
type ConditionScalar = string | number | boolean;
/** The signatures refuse the shapes the stored-condition parser rejects: a non-scalar comparison value and an empty junction. */
export declare const Cond: {
	readonly eq: (propertyName: string, value: ConditionScalar) => RequirementCondition$1;
	readonly neq: (propertyName: string, value: ConditionScalar) => RequirementCondition$1;
	readonly isSet: (propertyName: string) => RequirementCondition$1;
	readonly isNotSet: (propertyName: string) => RequirementCondition$1;
	readonly not: (condition: RequirementCondition$1) => RequirementCondition$1;
	readonly and: (conditions_0: RequirementCondition, ...conditions: RequirementCondition[]) => RequirementCondition$1;
	readonly or: (conditions_0: RequirementCondition, ...conditions: RequirementCondition[]) => RequirementCondition$1;
	readonly gt: (propertyName: string, value: number) => RequirementCondition$1;
	readonly lt: (propertyName: string, value: number) => RequirementCondition$1;
	readonly gte: (propertyName: string, value: number) => RequirementCondition$1;
	readonly lte: (propertyName: string, value: number) => RequirementCondition$1;
};
interface PropertyOptions {
	readonly localizedDisplay?: LocalizedDisplaySnapshotDto;
	readonly requirement?: FileRequirementDto;
	readonly bindingHint?: BindingHintKind;
}
interface DomainTypeTransformArgumentDef {
	readonly parameterName: string;
	readonly source: {
		readonly kind: "static";
		readonly value: unknown;
	} | {
		readonly kind: "domainProperty";
		readonly propertyName: string;
	} | {
		readonly kind: "actionLiteral";
		readonly value: unknown;
	} | {
		readonly kind: "placeholder";
		readonly value: string;
	} | {
		readonly kind: "actionTransformRef";
		readonly transformPackageId: string;
		readonly transformId: string;
		readonly arguments: readonly DomainTypeTransformArgumentDef[];
	};
}
type ListValueSourceDef = {
	readonly kind: "static";
	readonly value: unknown;
} | {
	readonly kind: "domainProperty";
	readonly propertyName: string;
};
type ListEntryDef = {
	readonly kind: "value";
	readonly source: ListValueSourceDef;
} | {
	readonly kind: "fields";
	readonly fields: readonly {
		readonly name: string;
		readonly source: ListValueSourceDef;
	}[];
};
interface DelegatedActionParameterOverrideDef {
	readonly parameterName: string;
	readonly source: {
		readonly kind: "static";
		readonly value: unknown;
	} | {
		readonly kind: "domainProperty";
		readonly propertyName: string;
	} | {
		readonly kind: "actionLiteral";
		readonly value: unknown;
	} | {
		readonly kind: "listEntries";
		readonly entries: readonly ListEntryDef[];
	};
}
interface DelegatedActionDef {
	readonly targetActionKey: string;
	/** Keep a local resource ref until package compilation can supply both its id and the owning package coordinate. */
	readonly targetResource: MasterDataResourceReference | UserDataResourceReference;
	/** Omission leaves catalog explicit parameters available to the generated caller. */
	readonly parameterOverrides?: readonly DelegatedActionParameterOverrideDef[];
}
declare class DomainTypeBuilder {
	private readonly _id;
	private readonly _name;
	private _idLocalizedDisplay?;
	private _localizedProperties?;
	private _singleEntry;
	private _sort?;
	private _compositeKey?;
	private readonly _properties;
	private readonly _delegatedActions;
	private readonly _parameterErrors;
	constructor(name: string);
	get name(): string;
	singleEntry(): this;
	/** null explicitly selects reserved-id sorting, including descending order. */
	sortBy(propertyName: string | null, direction?: "asc" | "desc"): this;
	/** Keep authored order while resolving names to ids; package validation rejects combining this identity with singleEntry. */
	compositeKey(first: string, ...rest: readonly string[]): this;
	idLocalizedDisplay(localizedDisplay: LocalizedDisplaySnapshotDto): this;
	localizedProperties(localizedProperties: Readonly<Record<string, LocalizedDisplaySnapshotDto>>): this;
	/** Retain the resource ref until package compilation supplies its owning package; registrations with the same method name replace one another. */
	delegatedAction(methodName: string, def: DelegatedActionDef): this;
	/** The builder owns the reserved id property, so authoring it again is rejected. */
	property(def: PropertyDef): this;
	property(name: string, type: PropertyTypeDef, options?: PropertyOptions): this;
	private _rejectReservedPropertyName;
	/** Both overloads must emit the same property key order because materialized JSON preserves insertion order. */
	private _pushProperty;
	/** Preserve unresolved authored names so package validation can identify the bad identity member. */
	private _resolveIdentityKeys;
}
interface DelegatedActionTarget {
	readonly targetResource: ExternalResourceRefSnapshotDto;
	readonly targetActionKey: string;
}
interface PublishedInlineElementSchema {
	readonly properties: Readonly<Record<string, string>>;
	readonly elementKey: readonly string[] | null;
	readonly delegatedActions?: DependencySurfaceType["delegatedActions"];
	readonly inlineSchemas?: Readonly<Record<string, PublishedInlineElementSchema>>;
}
interface DependencySurfaceType {
	/** Keep the declaring id for direct-source links even when canonical identity belongs to another package. */
	readonly id: string;
	readonly singleEntry: boolean;
	/** Preserve canonical identity across re-exporting overlays. */
	readonly canonicalPackageId: string;
	readonly canonicalTypeId: string;
	/** Effective names and IDs, including inherited and aliased properties, for read-only lookup. */
	readonly properties: Readonly<Record<string, string>>;
	/** Effective action targets include inherited registrations selected by compilation. */
	readonly delegatedActions?: Readonly<Record<string, {
		readonly targetResource: Omit<ExternalResourceRefSnapshotDto, "resourceKind"> & {
			readonly resourceKind: string;
		};
		readonly targetActionKey: string;
	}>>;
	/** Each owned schema is nested under its declaring property, never a separate type. */
	readonly inlineSchemas?: Readonly<Record<string, PublishedInlineElementSchema>>;
}
export interface DependencySurface {
	readonly schemaVersion: number;
	readonly packageId: string;
	readonly types: Readonly<Record<string, DependencySurfaceType>>;
	readonly actionTransforms: Readonly<Record<string, string>>;
	/** Use service.modelName coordinates to distinguish resources with the same model name in different services. */
	readonly masterDataResources: Readonly<Record<string, string>>;
}
interface DependencyOverlaySource {
	readonly directSourcePackageId: string;
	readonly directSourceTypeId: string;
	/** Build-only coordinates published by the dependency; persistence retains only the direct source. */
	readonly canonicalType: {
		readonly packageId: string;
		readonly domainTypeId: string;
	};
}
interface DependencyOverlayOptions<TPublished extends Readonly<Record<string, string>> = Readonly<Record<string, string>>> {
	readonly source: DependencyOverlaySource;
	readonly singleEntry: boolean;
	/** Overlay sources expose their additions only; inherited names must be read from the surface that declares them. */
	readonly publishedProperties: TPublished;
	/** Carry structural action targets so component buttons can be authored by method name. */
	readonly publishedDelegatedActions: Readonly<Record<string, DelegatedActionTarget>>;
	readonly publishedInlineSchemas?: Readonly<Record<string, PublishedInlineElementSchema>>;
}
/** Carry the full source so attachments can synthesize an overlay without writing into dependency files; authored rows use its canonical id directly. */
export interface DependencyDomainTypeRef<TPublished extends Readonly<Record<string, string>> = Readonly<Record<string, string>>> extends DependencyOverlayOptions<TPublished> {
	readonly kind: "dependencyDomainType";
	readonly packageId: string;
	readonly typeName: string;
}
type TypeNames<S extends DependencySurface> = keyof S["types"] & string;
type PublishedPropertiesOf<T> = Readonly<Record<PropertyNames<T>, string>>;
type DelegatedActionNames<T> = T extends {
	readonly delegatedActions?: infer A;
} ? [
	A
] extends [
	undefined
] ? never : keyof NonNullable<A> & string : never;
type PropertyNames<T> = T extends {
	readonly properties: infer P;
} ? keyof P & string : never;
interface DependencyPackage<S extends DependencySurface> {
	readonly packageId: S["packageId"];
	/** Inherit singleEntry from the source so an authored overlay cannot restate it inconsistently. */
	overlay<K extends TypeNames<S>>(typeName: K): DependencyOverlayOptions<PublishedPropertiesOf<S["types"][K]>>;
	type<K extends TypeNames<S>>(typeName: K): DependencyDomainTypeRef<PublishedPropertiesOf<S["types"][K]>>;
	/** Return the declaring id for direct references; canonical row identity is carried by type().source.canonicalType.domainTypeId. */
	typeId(typeName: TypeNames<S>): string;
	propertyId<K extends TypeNames<S>>(typeName: K, propertyName: PropertyNames<S["types"][K]>): string;
	/** Resolve the published action coordinates instead of fabricating one for an unknown method. */
	delegatedActionTarget<K extends TypeNames<S>>(typeName: K, methodName: DelegatedActionNames<S["types"][K]>): DelegatedActionTarget;
	resourceId(key: keyof S["masterDataResources"] & string): string;
	transformId(name: keyof S["actionTransforms"] & string): string;
	elementPropertyId<K extends TypeNames<S>>(typeName: K, propertyPath: readonly [
		string,
		...string[]
	], propertyName: string): string;
	inlineElements<K extends TypeNames<S>>(typeName: K, listPropertyName: InlineListNames<S["types"][K]>, elements: readonly Readonly<Record<string, InlineElementValue>>[]): readonly Readonly<Record<string, InlineElementValue>>[];
}
type InlineElementValue = FileDomainPropertyValueDto;
type InlineListNames<T> = T extends {
	readonly inlineSchemas?: infer L;
} ? [
	L
] extends [
	undefined
] ? never : keyof NonNullable<L> & string : never;
export declare function dependencyPackage<S extends DependencySurface>(surface: S): DependencyPackage<S>;
type DslDomainTypeMountPathDto = {
	readonly kind: "local";
	readonly typeName: string;
	readonly typeId?: string;
} | {
	readonly kind: "dependency";
	readonly firstHopPackageId: string;
	readonly typeName: string;
	readonly typeId?: string;
};
type DslMountPathDto = DslDomainTypeMountPathDto | {
	readonly kind: "inlineElement";
	readonly host: DslDomainTypeMountPathDto;
	readonly dependencyRef?: DependencyDomainTypeRef;
	readonly propertyPath: readonly [
		string,
		...string[]
	];
};
interface DslRefChainEntryDto {
	readonly refPropertyId: string;
	readonly targetMountPath: DslDomainTypeMountPathDto;
}
interface DslBindingSourceDto {
	readonly scopes: readonly ({
		readonly kind: "parent";
		readonly parentResourceId: string;
	} | {
		readonly kind: "dependencyResource";
		readonly sourcePackageId: string;
		readonly resourceKind: "masterData" | "userData";
		readonly resourceId: string;
	})[];
	readonly terminal: {
		readonly kind: "direct";
		readonly mountPath: DslMountPathDto;
		readonly propertyId: string;
	} | {
		readonly kind: "idRef";
		readonly originTypeName: string;
		readonly refChain: readonly [
			DslRefChainEntryDto,
			...DslRefChainEntryDto[]
		];
		readonly propertyId: string;
	};
}
type DslDomainPropertySourceDto = DslBindingSourceDto;
type DslTransformArgumentSourceDto = {
	readonly kind: "static";
	readonly value: JsonValue;
} | {
	readonly kind: "domainProperty";
	readonly source: DslBindingSourceDto;
} | {
	readonly kind: "actionLiteral";
	readonly value: JsonValue;
} | TransformReferenceSnapshotDto<DslTransformArgumentDto> | {
	readonly kind: "placeholder";
	readonly value: string;
};
interface DslTransformArgumentDto extends TransformArgumentEnvelopeSnapshotDto<DslTransformArgumentSourceDto> {
}
interface DslTransformEntryDto extends TransformCallSnapshotDto<DslTransformArgumentDto> {
}
type DslRuntimeValueBindingDto = {
	readonly kind: "static";
	readonly parameterName: string;
	readonly value: JsonValue;
} | {
	readonly kind: "domainProperty";
	readonly parameterName: string;
	readonly source: DslDomainPropertySourceDto;
} | {
	readonly kind: "skip";
	readonly parameterName: string;
} | {
	readonly kind: "expression";
	readonly parameterName: string;
	readonly expression: string;
} | {
	readonly kind: "domainProperties";
	readonly parameterName: string;
	readonly sources: readonly DslBindingSourceDto[];
} | {
	readonly kind: "resourceKey";
	readonly parameterName: string;
} | {
	readonly kind: "placeholder";
	readonly parameterName: string;
	readonly value: string;
};
type DslActionProgramDto = {
	readonly kind: "concrete";
	readonly actionName: string;
	readonly requestBindings: readonly DslRuntimeValueBindingDto[];
} | {
	readonly kind: "domainProperty";
	readonly source?: DslBindingSourceDto;
} | {
	readonly kind: "transform";
	readonly invocation: DslTransformEntryDto;
} | {
	readonly kind: "transformEntries";
	readonly entries: readonly DslTransformEntryDto[];
};
type DslActionProgramInput = (Omit<Extract<DslActionProgramDto, {
	readonly kind: "concrete";
}>, "requestBindings"> & {
	readonly requestBindings: UntypedBindingRecord;
}) | Exclude<DslActionProgramDto, {
	readonly kind: "concrete";
}>;
/** Author a program directly, independently of its destination's parameter name. */
export declare const ActionProgram: {
	readonly concrete: (actionName: string, requestBindings: UntypedBindingRecord) => DslActionProgramInput;
	readonly domainProperty: (source?: DslBindingSourceDto) => DslActionProgramInput;
	readonly transform: (transformPackageId: string, transformId: string, args: readonly DslTransformArgumentDto[]) => DslActionProgramInput;
	readonly transformEntries: (entries: readonly DslTransformEntryDto[]) => DslActionProgramInput;
};
interface OverlayTypeSpecOptions {
	readonly source: DependencyOverlaySource;
	/** Package validation rejects combining singleEntry with a composite-key override because they define conflicting identities. */
	readonly singleEntry?: boolean;
	/** Resolve declared and source-published names before accepting a stable property id; unknown names collect errors. Inherited membership still needs the dependency closure. */
	readonly sort?: {
		readonly key: string | null;
		readonly direction?: "asc" | "desc";
	};
	/** Resolve override members through the same slots as sort keys; only checks independent of the dependency closure can run here. */
	readonly compositeKeyMode?: {
		readonly kind: "inherit";
	} | {
		readonly kind: "suppress";
	} | {
		readonly kind: "override";
		readonly members: readonly string[];
	};
	/** Obtain these names from the dependency surface; hand-written metadata would make the resolver trust declarations this package does not own. */
	readonly publishedProperties?: Readonly<Record<string, string>>;
	readonly publishedInlineSchemas?: Readonly<Record<string, PublishedInlineElementSchema>>;
	/** Retain published action coordinatess so component method names can resolve without local action declarations. */
	readonly publishedDelegatedActions?: Readonly<Record<string, DelegatedActionTarget>>;
	/** Keep inherited alias keys as source ids so renaming their display text cannot change identity. */
	readonly renamedInheritedProperties?: Readonly<Record<string, string>>;
	/** Resolve targets and nested argument properties against declared and published slots; unresolved names must produce diagnostics. */
	readonly actionPropertyTransforms?: readonly OverlayActionPropertyTransformDef[];
	readonly declared?: readonly {
		readonly name: string;
		readonly type: PropertyTypeDef;
		readonly localizedDisplay?: LocalizedDisplaySnapshotDto;
		readonly requirement?: FileRequirementDto;
		readonly bindingHint?: BindingHintKind;
	}[];
	/** Defer target refs until resources have ids so overlays can use the same forward references as local types. */
	readonly delegatedActions?: readonly {
		readonly methodName: string;
		readonly def: DelegatedActionDef;
	}[];
}
type OverlayActionPropertyTransformMode = "replace" | "append";
interface OverlayActionPropertyTransformDef {
	readonly targetProperty: string;
	readonly mode?: OverlayActionPropertyTransformMode;
	readonly transformPackageId: string;
	readonly transformId: string;
	readonly arguments: readonly DomainTypeTransformArgumentDef[];
}
type Whitespace = " " | "\t" | "\n" | "\r";
type TrimLeft<S extends string> = S extends `${Whitespace}${infer R}` ? TrimLeft<R> : S;
type TrimRight<S extends string> = S extends `${infer R}${Whitespace}` ? TrimRight<R> : S;
type Trim<S extends string> = TrimLeft<TrimRight<S>>;
type EmptyTypedProps = Record<never, FileDomainPropertyValueDto>;
type LocalizedPropertyDisplayMap<TProps extends Record<string, FileDomainPropertyValueDto>, TIncludeId extends boolean = true> = (TIncludeId extends true ? {
	readonly id: LocalizedDisplaySnapshotDto;
} : Record<never, never>) & {
	readonly [K in Extract<keyof TProps, string>]: LocalizedDisplaySnapshotDto;
};
type NextDomainTypeProps<TProps extends Record<string, FileDomainPropertyValueDto>, N extends string, V extends FileDomainPropertyValueDto, R extends boolean> = TProps & (R extends true ? {
	readonly [K in N]: V;
} : {
	readonly [K in N]?: V;
});
type NonReservedPropertyDef<N extends string, V extends FileDomainPropertyValueDto, R extends boolean> = Trim<N> extends "id" ? never : PropertyDef<N, V, R>;
declare class TypedDomainTypeBuilder<TProps extends Record<string, FileDomainPropertyValueDto> = EmptyTypedProps> {
	idLocalizedDisplay(localizedDisplay: LocalizedDisplaySnapshotDto): this;
	singleEntry(): this;
	sortBy(propertyName: Extract<keyof TProps, string> | "id" | null, direction?: "asc" | "desc"): this;
	compositeKey(first: Extract<keyof TProps, string>, ...rest: readonly Extract<keyof TProps, string>[]): this;
	localizedProperties(localizedProperties: LocalizedPropertyDisplayMap<TProps>): this;
	/** Static rejection covers reserved literal names; package validation is still needed for dynamically authored names. */
	property<N extends string, V extends FileDomainPropertyValueDto, R extends boolean>(def: NonReservedPropertyDef<N, V, R>): TypedDomainTypeBuilder<NextDomainTypeProps<TProps, N, V, R>>;
	delegatedAction(methodName: string, def: DelegatedActionDef): this;
}
declare class TypedOverlayDomainTypeBuilder<TProps extends Record<string, FileDomainPropertyValueDto> = EmptyTypedProps> {
	property<N extends string, V extends FileDomainPropertyValueDto, R extends boolean>(def: NonReservedPropertyDef<N, V, R>): TypedOverlayDomainTypeBuilder<NextDomainTypeProps<TProps, N, V, R>>;
	localizedProperties(localizedProperties: LocalizedPropertyDisplayMap<TProps, false>): this;
}
type DslUiLiteralValue = string | number | boolean | null;
type DslUiValueSourceDto = {
	readonly kind: "property";
	readonly propertyName: string;
}
/** Accept an inherited PropertyId directly when the single-package build has no published name for it. */
 | {
	readonly kind: "inheritedProperty";
	readonly propertyId: string;
} | {
	readonly kind: "literal";
	readonly value: DslUiLiteralValue;
};
type DslUiPropertySourceDto = Extract<DslUiValueSourceDto, {
	kind: "property";
} | {
	kind: "inheritedProperty";
}>;
type DslUiTableBandTableRefDto = {
	readonly by: "name";
	readonly sourceDomainTypeName: string;
	readonly tablePropertyName: string;
} | {
	readonly by: "id";
	readonly sourceDomainTypeId: string;
	readonly tablePropertyId: string;
};
type DslUiTableBandEdge = "lower" | "upper";
interface DslUiTableBandSourceDto {
	readonly kind: "tableBand";
	readonly table: DslUiTableBandTableRefDto;
	/** Resolve position on the component target, independently of the type that owns the table. */
	readonly position: DslUiPropertySourceDto;
	readonly edge: DslUiTableBandEdge;
}
type DslUiGaugeBoundSourceDto = DslUiValueSourceDto | DslUiTableBandSourceDto;
type DslUiImageMode = UiImageModeSnapshotDto;
type DslUiConditionDto = {
	readonly kind: "truthy";
	readonly source: DslUiValueSourceDto;
} | {
	readonly kind: "comparison";
	readonly operator: ComparisonOperatorSnapshotDto;
	readonly lhs: DslUiValueSourceDto;
	readonly rhs: DslUiValueSourceDto;
} | {
	readonly kind: "and";
	readonly children: readonly DslUiConditionDto[];
} | {
	readonly kind: "or";
	readonly children: readonly DslUiConditionDto[];
} | {
	readonly kind: "not";
	readonly child: DslUiConditionDto;
} | {
	readonly kind: "rowElement";
	readonly sourceDomainTypeName: string;
	readonly sourcePropertyPath?: readonly [
		string,
		...string[]
	];
	/** A dependency ref lets the builder host the parent type and resolve list names from its published surface. */
	readonly dependencyType?: DependencyDomainTypeRef;
	readonly list: DslUiRowElementListDto;
};
type DslUiRowElementListDto = {
	readonly by: "name";
	readonly listPropertyName: string;
} | {
	readonly by: "id";
	readonly propertyId: string;
};
type PackageDisplayEntryDraft = LocalizedDisplaySnapshotDto;
declare const DOMAIN_TYPE_PROPERTIES: unique symbol;
declare const DOMAIN_TYPE_PUBLISHED: unique symbol;
interface DomainTypeDefinitionBase<TName extends string, TProps extends Record<string, FileDomainPropertyValueDto>, TPublished extends Record<string, FileDomainPropertyValueDto>> {
	readonly typeName: TName;
	readonly [DOMAIN_TYPE_PROPERTIES]: TProps;
	readonly [DOMAIN_TYPE_PUBLISHED]: TPublished;
}
interface LocalDomainTypeDefinition<TName extends string = string, TProps extends Record<string, FileDomainPropertyValueDto> = Record<string, FileDomainPropertyValueDto>> extends DomainTypeDefinitionBase<TName, TProps, EmptyTypedProps> {
	readonly definitionKind: "local";
}
interface OverlayDomainTypeDefinition<TName extends string = string, TProps extends Record<string, FileDomainPropertyValueDto> = Record<string, FileDomainPropertyValueDto>, TPublished extends Record<string, FileDomainPropertyValueDto> = EmptyTypedProps> extends DomainTypeDefinitionBase<TName, TProps, TPublished> {
	readonly definitionKind: "overlay";
}
type DomainTypeDefinition<TName extends string = string, TProps extends Record<string, FileDomainPropertyValueDto> = Record<string, FileDomainPropertyValueDto>, TPublished extends Record<string, FileDomainPropertyValueDto> = EmptyTypedProps> = LocalDomainTypeDefinition<TName, TProps> | OverlayDomainTypeDefinition<TName, TProps, TPublished>;
type OverlayDomainTypeOptions = Omit<OverlayTypeSpecOptions, "declared">;
type PublishedProps<TOptions> = TOptions extends {
	readonly publishedProperties: infer TPublished;
} ? {
	readonly [K in keyof TPublished & string]: FileDomainPropertyValueDto;
} : EmptyTypedProps;
export declare function defineDomainType<TName extends string, TProps extends Record<string, FileDomainPropertyValueDto>>(name: TName, define: (domainType: TypedDomainTypeBuilder<EmptyTypedProps>) => TypedDomainTypeBuilder<TProps>): LocalDomainTypeDefinition<TName, TProps>;
export declare function defineOverlayDomainType<TName extends string, TOptions extends OverlayDomainTypeOptions>(name: TName, options: TOptions): OverlayDomainTypeDefinition<TName, EmptyTypedProps, PublishedProps<TOptions>>;
export declare function defineOverlayDomainType<TName extends string, TOptions extends OverlayDomainTypeOptions, TProps extends Record<string, FileDomainPropertyValueDto>>(name: TName, options: TOptions, define: (domainType: TypedOverlayDomainTypeBuilder<EmptyTypedProps>) => TypedOverlayDomainTypeBuilder<TProps>): OverlayDomainTypeDefinition<TName, TProps, PublishedProps<TOptions>>;
type InlineElementHost = string | DomainTypeDefinition | DependencyDomainTypeRef;
interface InlineElementReference {
	readonly kind: "inlineElementReference";
	readonly host: InlineElementHost;
	readonly propertyPath: readonly [
		string,
		...string[]
	];
}
export declare function inlineElementOf<TName extends string, TProps extends Record<string, FileDomainPropertyValueDto>, TPublished extends Record<string, FileDomainPropertyValueDto>>(host: DomainTypeDefinition<TName, TProps, TPublished>, firstPropertyName: Extract<keyof (TProps & TPublished), string>, ...nestedPropertyNames: readonly string[]): InlineElementReference;
export declare function inlineElementOf(host: string | DependencyDomainTypeRef, firstPropertyName: string, ...nestedPropertyNames: readonly string[]): InlineElementReference;
type StaticBindingDirective<T = unknown> = {
	readonly __brand: "BindingDirective";
	readonly kind: "static";
	readonly value: T;
};
type RuntimeBindingDirective = {
	readonly __brand: "BindingDirective";
} & ({
	readonly kind: "domainProperty";
	readonly source: DslDomainPropertySourceDto;
} | {
	readonly kind: "domainPropertyKey";
	readonly source: DslDomainPropertySourceDto;
	readonly suffix: string;
} | {
	readonly kind: "skip";
} | {
	readonly kind: "null";
} | {
	readonly kind: "expression";
	readonly expression: string;
} | {
	readonly kind: "resourceKey";
} | {
	readonly kind: "placeholder";
	readonly value: string;
} | {
	readonly kind: "domainProperties";
	readonly sources: readonly DslBindingSourceDto[];
});
type StaticBindingValue<T> = T extends readonly (infer Item)[] ? readonly StaticBindingValue<Item>[] | null : T extends object ? {
	readonly [K in keyof T]: StaticBindingValue<T[K]>;
} | null : T | null;
type BindingDirective<T = unknown> = StaticBindingDirective<StaticBindingValue<T>> | RuntimeBindingDirective;
type BindingRecord<S> = {
	readonly [K in keyof S & string]?: NonNullable<S[K]> extends readonly unknown[] ? BindingDirective<S[K]> : NonNullable<S[K]> extends object ? BindingDirective<S[K]> | BindingRecord<NonNullable<S[K]>> : BindingDirective<S[K]>;
};
type ArrayPropertyNameOf<S> = keyof {
	[K in keyof S & string as NonNullable<S[K]> extends readonly unknown[] ? K : never]: 0;
} & string;
interface SourceHelper {
	direct(typeName: string, propertyName: string): DslBindingSourceDto;
	direct(reference: InlineElementReference, propertyName: string): DslBindingSourceDto;
	direct<TName extends string, TProps extends Record<string, FileDomainPropertyValueDto>>(definition: DomainTypeDefinition<TName, TProps>, propertyName: Extract<keyof TProps, string> | "id"): DslBindingSourceDto;
	/** Dependency properties must resolve through published names because this package cannot inspect their declarations. */
	direct(dependencyType: DependencyDomainTypeRef, propertyName: string): DslBindingSourceDto;
	/** Retain the origin type because the first ref property cannot be resolved from its target mount. */
	idRef(typeName: string, refChain: readonly [
		{
			refPropertyName: string;
			targetTypeName: string;
		},
		...{
			refPropertyName: string;
			targetTypeName: string;
		}[]
	], propertyName: string): DslBindingSourceDto;
	parent(innerSource: DslBindingSourceDto): DslBindingSourceDto;
	dependencyResource(sourcePackageId: string, resourceKind: "masterData" | "userData", resourceId: string, innerSource: DslBindingSourceDto): DslBindingSourceDto;
}
export declare const Source: SourceHelper;
type WidenLiteral<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T;
export declare const Bind: {
	readonly static: <T>(value: T) => StaticBindingDirective<WidenLiteral<T>>;
	readonly domainProperty: (source: DslDomainPropertySourceDto) => RuntimeBindingDirective;
	/** This user-data key is forward-only: appending a suffix must not write the derived value back into the source property. */
	readonly domainPropertyKey: (source: DslDomainPropertySourceDto, suffix: string) => RuntimeBindingDirective;
	readonly skip: () => RuntimeBindingDirective;
	readonly null: () => RuntimeBindingDirective;
	/** Preserve the requested key union without a cast. Partial permits incremental construction and matches the optional keys in BindingRecord. */
	readonly nulls: <TName extends string>(...parameterNames: readonly TName[]) => Partial<Record<TName, RuntimeBindingDirective>>;
	readonly expression: (expression: string) => RuntimeBindingDirective;
	/** Restrict this to master-data runtime bindings; user-data declared bindings reject it at the schema gate. */
	readonly resourceKey: () => RuntimeBindingDirective;
	/** Restrict this to master-data runtime bindings; user-data declared bindings reject it at the schema gate. */
	readonly placeholder: (value: string) => RuntimeBindingDirective;
	readonly domainProperties: (sources: readonly DslBindingSourceDto[]) => RuntimeBindingDirective;
};
export declare const Arg: {
	readonly static: (parameterName: string, value: JsonValue) => DslTransformArgumentDto;
	readonly domainProperty: (parameterName: string, source: DslBindingSourceDto) => DslTransformArgumentDto;
	readonly actionLiteral: (parameterName: string, value: JsonValue) => DslTransformArgumentDto;
	readonly actionTransformRef: (parameterName: string, transformPackageId: string, transformId: string, args: readonly DslTransformArgumentDto[]) => DslTransformArgumentDto;
	readonly placeholder: (parameterName: string, value: string) => DslTransformArgumentDto;
};
interface AccountNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: AccountTransactionSettingV2Schema;
	readonly changePasswordIfTakeOver?: boolean;
	readonly differentUserIdForLoginAndDataRetention?: boolean;
	readonly createAccountScript?: AccountScriptSettingSchema;
	readonly authenticationScript?: AccountScriptSettingSchema;
	readonly createTakeOverScript?: AccountScriptSettingSchema;
	readonly doTakeOverScript?: AccountScriptSettingSchema;
	readonly banScript?: AccountScriptSettingSchema;
	readonly unBanScript?: AccountScriptSettingSchema;
	readonly logSetting?: AccountLogSettingSchema;
}
interface AccountAccountSchema {
	readonly accountId: string;
	readonly userId?: string;
	readonly password: string;
	readonly timeOffset?: number;
	readonly banStatuses?: readonly AccountBanStatusSchema[];
	readonly banned?: boolean;
	readonly lastAuthenticatedAt?: string;
	readonly createdAt?: string;
	readonly revision?: number;
}
interface AccountTakeOverSchema {
	readonly userId: string;
	readonly type: number;
	readonly userIdentifier: string;
}
interface AccountPlatformIdSchema {
	readonly userId: string;
	readonly type: number;
	readonly userIdentifier: string;
}
interface AccountDataOwnerSchema {
	readonly dataOwnerId: string;
	readonly userId: string;
	readonly name?: string;
	readonly createdAt?: string;
	readonly revision?: number;
}
interface AccountTakeOverTypeModelSchema {
	readonly type: number;
	readonly metadata?: string;
	readonly openIdConnectSetting: AccountOpenIdConnectSettingSchema;
}
interface AccountOpenIdConnectSettingSchema {
	readonly configurationPath: string;
	readonly clientId: string;
	readonly clientSecret?: string;
	readonly appleTeamId?: string;
	readonly appleKeyId?: string;
	readonly applePrivateKeyPem?: string;
	readonly doneEndpointUrl?: string;
	readonly additionalScopeValues?: readonly AccountScopeValueSchema[];
	readonly additionalReturnValues?: readonly string[];
}
interface AccountScopeValueSchema {
	readonly key: string;
	readonly value?: string;
}
interface AccountPlatformUserSchema {
	readonly type: number;
	readonly userIdentifier: string;
	readonly userId: string;
}
interface AccountBanStatusSchema {
	readonly reason: string;
	readonly releaseTimestamp: string;
}
interface AccountGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface AccountScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface AccountLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface AccountTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface AccountTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface AccountModelRegistry {
	Namespace: AccountNamespaceSchema;
	Account: AccountAccountSchema;
	TakeOver: AccountTakeOverSchema;
	PlatformId: AccountPlatformIdSchema;
	DataOwner: AccountDataOwnerSchema;
	TakeOverTypeModel: AccountTakeOverTypeModelSchema;
	OpenIdConnectSetting: AccountOpenIdConnectSettingSchema;
	ScopeValue: AccountScopeValueSchema;
	PlatformUser: AccountPlatformUserSchema;
	BanStatus: AccountBanStatusSchema;
	GitHubCheckoutSetting: AccountGitHubCheckoutSettingSchema;
	ScriptSetting: AccountScriptSettingSchema;
	LogSetting: AccountLogSettingSchema;
	TransactionSetting: AccountTransactionSettingSchema;
	TransactionSettingV2: AccountTransactionSettingV2Schema;
}
interface AdRewardNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: AdRewardTransactionSettingV2Schema;
	readonly admob?: AdRewardAdMobSchema;
	readonly unityAd?: AdRewardUnityAdSchema;
	readonly appLovinMaxes?: readonly AdRewardAppLovinMaxSchema[];
	readonly acquirePointScript?: AdRewardScriptSettingSchema;
	readonly consumePointScript?: AdRewardScriptSettingSchema;
	readonly changePointNotification: AdRewardNotificationSettingSchema;
	readonly logSetting?: AdRewardLogSettingSchema;
}
interface AdRewardPointSchema {
	readonly pointId: string;
	readonly userId: string;
	readonly point?: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface AdRewardAdMobSchema {
	readonly allowAdUnitIds: readonly string[];
}
interface AdRewardUnityAdSchema {
	readonly keys?: readonly string[];
}
interface AdRewardAppLovinMaxSchema {
	readonly allowAdUnitId: string;
	readonly eventKey: string;
}
interface AdRewardScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface AdRewardNotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly AdRewardMobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface AdRewardMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface AdRewardLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface AdRewardTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface AdRewardTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface AdRewardModelRegistry {
	Namespace: AdRewardNamespaceSchema;
	Point: AdRewardPointSchema;
	AdMob: AdRewardAdMobSchema;
	UnityAd: AdRewardUnityAdSchema;
	AppLovinMax: AdRewardAppLovinMaxSchema;
	ScriptSetting: AdRewardScriptSettingSchema;
	NotificationSetting: AdRewardNotificationSettingSchema;
	MobileNotificationMessage: AdRewardMobileNotificationMessageSchema;
	LogSetting: AdRewardLogSettingSchema;
	TransactionSetting: AdRewardTransactionSettingSchema;
	TransactionSettingV2: AdRewardTransactionSettingV2Schema;
}
interface AuthAccessTokenSchema {
	readonly userId: string;
	readonly federationFromUserId?: string;
	readonly expire?: string;
	readonly timeOffset?: number;
}
interface AuthModelRegistry {
	AccessToken: AuthAccessTokenSchema;
}
interface BuffNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: BuffTransactionSettingV2Schema;
	readonly applyBuffScript?: BuffScriptSettingSchema;
	readonly logSetting?: BuffLogSettingSchema;
}
interface BuffBuffTargetModelSchema {
	readonly targetModelName: string;
	readonly targetFieldName: string;
	readonly conditionGrns: readonly BuffBuffTargetGrnSchema[];
	readonly rate: number;
}
interface BuffBuffTargetActionSchema {
	readonly targetActionName: string;
	readonly targetFieldName: string;
	readonly conditionGrns: readonly BuffBuffTargetGrnSchema[];
	readonly rate: number;
}
interface BuffBuffTargetGrnSchema {
	readonly targetModelName: string;
	readonly targetGrn: string;
}
interface BuffBuffEntryModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly expression: string;
	readonly targetType: string;
	readonly targetModel?: BuffBuffTargetModelSchema;
	readonly targetAction?: BuffBuffTargetActionSchema;
	readonly priority: number;
	readonly applyPeriodScheduleEventId?: string;
}
interface BuffOverrideBuffRateSchema {
	readonly name: string;
	readonly rate: number;
}
interface BuffScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface BuffGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface BuffLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface BuffTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface BuffTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface BuffModelRegistry {
	Namespace: BuffNamespaceSchema;
	BuffTargetModel: BuffBuffTargetModelSchema;
	BuffTargetAction: BuffBuffTargetActionSchema;
	BuffTargetGrn: BuffBuffTargetGrnSchema;
	BuffEntryModel: BuffBuffEntryModelSchema;
	OverrideBuffRate: BuffOverrideBuffRateSchema;
	ScriptSetting: BuffScriptSettingSchema;
	GitHubCheckoutSetting: BuffGitHubCheckoutSettingSchema;
	LogSetting: BuffLogSettingSchema;
	TransactionSetting: BuffTransactionSettingSchema;
	TransactionSettingV2: BuffTransactionSettingV2Schema;
}
interface ChatNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: ChatTransactionSettingV2Schema;
	readonly allowCreateRoom?: boolean;
	readonly messageLifeTimeDays?: number;
	readonly postMessageScript?: ChatScriptSettingSchema;
	readonly createRoomScript?: ChatScriptSettingSchema;
	readonly deleteRoomScript?: ChatScriptSettingSchema;
	readonly subscribeRoomScript?: ChatScriptSettingSchema;
	readonly unsubscribeRoomScript?: ChatScriptSettingSchema;
	readonly postNotification: ChatNotificationSettingSchema;
	readonly logSetting?: ChatLogSettingSchema;
}
interface ChatRoomSchema {
	readonly name?: string;
	readonly userId?: string;
	readonly metadata?: string;
	readonly whiteListUserIds?: readonly string[];
}
interface ChatMessageSchema {
	readonly roomName?: string;
	readonly userId: string;
	readonly category?: number;
	readonly metadata: string;
}
interface ChatSubscribeSchema {
	readonly subscribeId: string;
	readonly userId: string;
	readonly roomName: string;
	readonly notificationTypes?: readonly ChatNotificationTypeSchema[];
	readonly createdAt?: string;
	readonly revision?: number;
}
interface ChatCategoryModelSchema {
	readonly category: number;
	readonly rejectAccessTokenPost?: string;
}
interface ChatNotificationTypeSchema {
	readonly category?: number;
	readonly enableTransferMobilePushNotification?: boolean;
}
interface ChatScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface ChatNotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly ChatMobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface ChatMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface ChatLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface ChatTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface ChatTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface ChatGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface ChatModelRegistry {
	Namespace: ChatNamespaceSchema;
	Room: ChatRoomSchema;
	Message: ChatMessageSchema;
	Subscribe: ChatSubscribeSchema;
	CategoryModel: ChatCategoryModelSchema;
	NotificationType: ChatNotificationTypeSchema;
	ScriptSetting: ChatScriptSettingSchema;
	NotificationSetting: ChatNotificationSettingSchema;
	MobileNotificationMessage: ChatMobileNotificationMessageSchema;
	LogSetting: ChatLogSettingSchema;
	TransactionSetting: ChatTransactionSettingSchema;
	TransactionSettingV2: ChatTransactionSettingV2Schema;
	GitHubCheckoutSetting: ChatGitHubCheckoutSettingSchema;
}
interface DatastoreNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: DatastoreTransactionSettingV2Schema;
	readonly doneUploadScript?: DatastoreScriptSettingSchema;
	readonly logSetting?: DatastoreLogSettingSchema;
}
interface DatastoreScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface DatastoreDataObjectSchema {
	readonly dataObjectId: string;
	readonly name?: string;
	readonly userId: string;
	readonly scope?: string;
	readonly allowUserIds?: readonly string[];
	readonly status: string;
	readonly generation?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface DatastoreDataObjectHistorySchema {
	readonly dataObjectHistoryId: string;
	readonly dataObjectName?: string;
	readonly generation: string;
	readonly contentLength: number;
	readonly createdAt?: string;
	readonly revision?: number;
}
interface DatastoreLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface DatastoreTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface DatastoreTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface DatastoreModelRegistry {
	Namespace: DatastoreNamespaceSchema;
	ScriptSetting: DatastoreScriptSettingSchema;
	DataObject: DatastoreDataObjectSchema;
	DataObjectHistory: DatastoreDataObjectHistorySchema;
	LogSetting: DatastoreLogSettingSchema;
	TransactionSetting: DatastoreTransactionSettingSchema;
	TransactionSettingV2: DatastoreTransactionSettingV2Schema;
}
interface DeployStackSchema {
	readonly name: string;
	readonly description?: string;
	readonly template: string;
	readonly status?: string;
}
interface DeployResourceSchema {
	readonly type: string;
	readonly name: string;
	readonly request: string;
	readonly response: string;
	readonly rollbackContext?: string;
	readonly rollbackRequest?: string;
	readonly rollbackAfter?: readonly string[];
	readonly outputFields?: readonly DeployOutputFieldSchema[];
	readonly workId: string;
}
interface DeployEventSchema {
	readonly resourceName: string;
	readonly type: string;
	readonly message?: string;
}
interface DeployOutputSchema {
	readonly name: string;
	readonly value?: string;
}
interface DeployOutputFieldSchema {
	readonly name: string;
	readonly fieldName: string;
}
interface DeployChangeSetSchema {
	readonly resourceName: string;
	readonly resourceType: string;
	readonly operation: string;
}
interface DeployGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface DeployModelRegistry {
	Stack: DeployStackSchema;
	Resource: DeployResourceSchema;
	Event: DeployEventSchema;
	Output: DeployOutputSchema;
	OutputField: DeployOutputFieldSchema;
	ChangeSet: DeployChangeSetSchema;
	GitHubCheckoutSetting: DeployGitHubCheckoutSettingSchema;
}
interface DictionaryNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: DictionaryTransactionSettingV2Schema;
	readonly entryScript?: DictionaryScriptSettingSchema;
	readonly duplicateEntryScript?: string;
	readonly logSetting?: DictionaryLogSettingSchema;
}
interface DictionaryEntryModelSchema {
	readonly name: string;
	readonly metadata?: string;
}
interface DictionaryEntrySchema {
	readonly entryId?: string;
	readonly userId?: string;
	readonly name: string;
	readonly acquiredAt?: string;
}
interface DictionaryLikeSchema {
	readonly likeId?: string;
	readonly userId?: string;
	readonly name: string;
}
interface DictionaryConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface DictionaryGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface DictionaryScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface DictionaryLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface DictionaryTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface DictionaryTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface DictionaryModelRegistry {
	Namespace: DictionaryNamespaceSchema;
	EntryModel: DictionaryEntryModelSchema;
	Entry: DictionaryEntrySchema;
	Like: DictionaryLikeSchema;
	Config: DictionaryConfigSchema;
	GitHubCheckoutSetting: DictionaryGitHubCheckoutSettingSchema;
	ScriptSetting: DictionaryScriptSettingSchema;
	LogSetting: DictionaryLogSettingSchema;
	TransactionSetting: DictionaryTransactionSettingSchema;
	TransactionSettingV2: DictionaryTransactionSettingV2Schema;
}
interface TransactionAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface TransactionConsumeActionSchema {
	readonly action: string;
	readonly request: string;
}
interface TransactionVerifyActionSchema {
	readonly action: string;
	readonly request: string;
}
interface TransactionConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface TransactionModelRegistry {
	AcquireAction: TransactionAcquireActionSchema;
	ConsumeAction: TransactionConsumeActionSchema;
	VerifyAction: TransactionVerifyActionSchema;
	Config: TransactionConfigSchema;
}
interface DistributorNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: DistributorTransactionSettingV2Schema;
	readonly assumeUserId?: string;
	readonly autoRunStampSheetNotification: DistributorNotificationSettingSchema;
	readonly autoRunTransactionNotification: DistributorNotificationSettingSchema;
	readonly logSetting?: DistributorLogSettingSchema;
}
interface DistributorDistributorModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly inboxNamespaceId?: string;
	readonly whiteListTargetIds?: readonly string[];
}
interface DistributorStampSheetResultSchema {
	readonly stampSheetResultId: string;
	readonly userId: string;
	readonly transactionId: string;
	readonly verifyTaskRequests?: readonly TransactionVerifyActionSchema[];
	readonly taskRequests?: readonly TransactionConsumeActionSchema[];
	readonly sheetRequest: TransactionAcquireActionSchema;
	readonly verifyTaskResultCodes?: readonly number[];
	readonly verifyTaskResults?: readonly string[];
	readonly taskResultCodes?: readonly number[];
	readonly taskResults?: readonly string[];
	readonly sheetResultCode?: number;
	readonly sheetResult?: string;
	readonly nextTransactionId?: string;
	readonly createdAt?: string;
	readonly revision?: number;
}
interface DistributorBatchRequestPayloadSchema {
	readonly requestId: string;
	readonly service: string;
	readonly methodName: string;
	readonly parameter: string;
}
interface DistributorBatchResultPayloadSchema {
	readonly requestId: string;
	readonly statusCode: number;
	readonly resultPayload: string;
}
interface DistributorUserDataEntrySchema {
	readonly service: string;
	readonly namespaceName: string;
	readonly kind: string;
	readonly payload: string;
}
interface DistributorAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface DistributorConsumeActionSchema {
	readonly action: string;
	readonly request: string;
}
interface DistributorVerifyActionSchema {
	readonly action: string;
	readonly request: string;
}
interface DistributorTransactionResultSchema {
	readonly transactionResultId: string;
	readonly userId: string;
	readonly transactionId: string;
	readonly verifyResults?: readonly DistributorVerifyActionResultSchema[];
	readonly consumeResults?: readonly DistributorConsumeActionResultSchema[];
	readonly acquireResults?: readonly DistributorAcquireActionResultSchema[];
	readonly hasError?: boolean;
	readonly createdAt?: string;
	readonly revision?: number;
}
interface DistributorAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface DistributorConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface DistributorVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface DistributorConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface DistributorGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface DistributorDistributeResourceSchema {
	readonly action: string;
	readonly request: string;
}
interface DistributorLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface DistributorTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface DistributorTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface DistributorNotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly DistributorMobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface DistributorMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface DistributorModelRegistry {
	Namespace: DistributorNamespaceSchema;
	DistributorModel: DistributorDistributorModelSchema;
	StampSheetResult: DistributorStampSheetResultSchema;
	BatchRequestPayload: DistributorBatchRequestPayloadSchema;
	BatchResultPayload: DistributorBatchResultPayloadSchema;
	UserDataEntry: DistributorUserDataEntrySchema;
	AcquireAction: DistributorAcquireActionSchema;
	ConsumeAction: DistributorConsumeActionSchema;
	VerifyAction: DistributorVerifyActionSchema;
	TransactionResult: DistributorTransactionResultSchema;
	AcquireActionResult: DistributorAcquireActionResultSchema;
	ConsumeActionResult: DistributorConsumeActionResultSchema;
	VerifyActionResult: DistributorVerifyActionResultSchema;
	Config: DistributorConfigSchema;
	GitHubCheckoutSetting: DistributorGitHubCheckoutSettingSchema;
	DistributeResource: DistributorDistributeResourceSchema;
	LogSetting: DistributorLogSettingSchema;
	TransactionSetting: DistributorTransactionSettingSchema;
	TransactionSettingV2: DistributorTransactionSettingV2Schema;
	NotificationSetting: DistributorNotificationSettingSchema;
	MobileNotificationMessage: DistributorMobileNotificationMessageSchema;
}
interface EnchantNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: EnchantTransactionSettingV2Schema;
	readonly logSetting?: EnchantLogSettingSchema;
}
interface EnchantBalanceParameterModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly totalValue: number;
	readonly initialValueStrategy?: string;
	readonly parameters: readonly EnchantBalanceParameterValueModelSchema[];
}
interface EnchantRarityParameterModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly maximumParameterCount: number;
	readonly parameterCounts: readonly EnchantRarityParameterCountModelSchema[];
	readonly parameters: readonly EnchantRarityParameterValueModelSchema[];
}
interface EnchantBalanceParameterStatusSchema {
	readonly balanceParameterStatusId: string;
	readonly userId: string;
	readonly parameterName: string;
	readonly propertyId: string;
	readonly parameterValues: readonly EnchantBalanceParameterValueSchema[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface EnchantRarityParameterStatusSchema {
	readonly rarityParameterStatusId: string;
	readonly userId: string;
	readonly parameterName: string;
	readonly propertyId: string;
	readonly parameterValues?: readonly EnchantRarityParameterValueSchema[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface EnchantBalanceParameterValueModelSchema {
	readonly name: string;
	readonly metadata?: string;
}
interface EnchantRarityParameterCountModelSchema {
	readonly count: number;
	readonly weight: number;
}
interface EnchantRarityParameterValueModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly resourceName: string;
	readonly resourceValue: number;
	readonly weight: number;
}
interface EnchantBalanceParameterValueSchema {
	readonly name: string;
	readonly value: number;
}
interface EnchantRarityParameterValueSchema {
	readonly name: string;
	readonly resourceName: string;
	readonly resourceValue: number;
}
interface EnchantVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface EnchantConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface EnchantAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface EnchantTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface EnchantConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface EnchantGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface EnchantScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface EnchantLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface EnchantTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface EnchantTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface EnchantModelRegistry {
	Namespace: EnchantNamespaceSchema;
	BalanceParameterModel: EnchantBalanceParameterModelSchema;
	RarityParameterModel: EnchantRarityParameterModelSchema;
	BalanceParameterStatus: EnchantBalanceParameterStatusSchema;
	RarityParameterStatus: EnchantRarityParameterStatusSchema;
	BalanceParameterValueModel: EnchantBalanceParameterValueModelSchema;
	RarityParameterCountModel: EnchantRarityParameterCountModelSchema;
	RarityParameterValueModel: EnchantRarityParameterValueModelSchema;
	BalanceParameterValue: EnchantBalanceParameterValueSchema;
	RarityParameterValue: EnchantRarityParameterValueSchema;
	VerifyActionResult: EnchantVerifyActionResultSchema;
	ConsumeActionResult: EnchantConsumeActionResultSchema;
	AcquireActionResult: EnchantAcquireActionResultSchema;
	TransactionResult: EnchantTransactionResultSchema;
	Config: EnchantConfigSchema;
	GitHubCheckoutSetting: EnchantGitHubCheckoutSettingSchema;
	ScriptSetting: EnchantScriptSettingSchema;
	LogSetting: EnchantLogSettingSchema;
	TransactionSetting: EnchantTransactionSettingSchema;
	TransactionSettingV2: EnchantTransactionSettingV2Schema;
}
interface EnhanceNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: EnhanceTransactionSettingV2Schema;
	readonly enhanceScript?: EnhanceScriptSettingSchema;
	readonly logSetting?: EnhanceLogSettingSchema;
}
interface EnhanceRateModelSchema {
	readonly name: string;
	readonly description?: string;
	readonly metadata?: string;
	readonly targetInventoryModelId: string;
	readonly acquireExperienceSuffix: string;
	readonly materialInventoryModelId: string;
	readonly acquireExperienceHierarchy?: readonly string[];
	readonly experienceModelId: string;
	readonly bonusRates?: readonly EnhanceBonusRateSchema[];
}
interface EnhanceUnleashRateModelSchema {
	readonly name: string;
	readonly description?: string;
	readonly metadata?: string;
	readonly targetInventoryModelId: string;
	readonly gradeModelId: string;
	readonly groupKeyHierarchy?: readonly string[];
	readonly gradeEntries: readonly EnhanceUnleashRateEntryModelSchema[];
}
interface EnhanceProgressSchema {
	readonly progressId: string;
	readonly userId: string;
	readonly rateName: string;
	readonly name?: string;
	readonly propertyId: string;
	readonly experienceValue: number;
	readonly rate: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface EnhanceBonusRateSchema {
	readonly rate?: number;
	readonly weight?: number;
}
interface EnhanceMaterialSchema {
	readonly materialItemSetId: string;
	readonly count?: number;
}
interface EnhanceUnleashRateEntryModelSchema {
	readonly gradeValue: number;
	readonly type?: string;
	readonly needCount?: number;
	readonly recipes?: readonly EnhanceUnleashRecipeSchema[];
}
interface EnhanceUnleashRecipeSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly targetGroupKeys?: readonly string[];
	readonly materials: readonly EnhanceUnleashMaterialSchema[];
}
interface EnhanceUnleashMaterialSchema {
	readonly name: string;
	readonly materialType: string;
	readonly individualSetting?: EnhanceUnleashIndividualMaterialSettingSchema;
	readonly quantitySetting?: EnhanceUnleashQuantityMaterialSettingSchema;
}
interface EnhanceUnleashIndividualMaterialSettingSchema {
	readonly matchType: string;
	readonly gradeCondition?: string;
	readonly gradeValue?: number;
	readonly count: number;
}
interface EnhanceUnleashQuantityMaterialSettingSchema {
	readonly matchType: string;
	readonly materialInventoryModelId?: string;
	readonly itemModelId?: string;
	readonly count: number;
}
interface EnhanceUnleashMaterialSelectionSchema {
	readonly name: string;
	readonly itemSetIds: readonly string[];
}
interface EnhanceConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface EnhanceVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface EnhanceConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface EnhanceAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface EnhanceTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface EnhanceGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface EnhanceScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface EnhanceLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface EnhanceTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface EnhanceTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface EnhanceModelRegistry {
	Namespace: EnhanceNamespaceSchema;
	RateModel: EnhanceRateModelSchema;
	UnleashRateModel: EnhanceUnleashRateModelSchema;
	Progress: EnhanceProgressSchema;
	BonusRate: EnhanceBonusRateSchema;
	Material: EnhanceMaterialSchema;
	UnleashRateEntryModel: EnhanceUnleashRateEntryModelSchema;
	UnleashRecipe: EnhanceUnleashRecipeSchema;
	UnleashMaterial: EnhanceUnleashMaterialSchema;
	UnleashIndividualMaterialSetting: EnhanceUnleashIndividualMaterialSettingSchema;
	UnleashQuantityMaterialSetting: EnhanceUnleashQuantityMaterialSettingSchema;
	UnleashMaterialSelection: EnhanceUnleashMaterialSelectionSchema;
	Config: EnhanceConfigSchema;
	VerifyActionResult: EnhanceVerifyActionResultSchema;
	ConsumeActionResult: EnhanceConsumeActionResultSchema;
	AcquireActionResult: EnhanceAcquireActionResultSchema;
	TransactionResult: EnhanceTransactionResultSchema;
	GitHubCheckoutSetting: EnhanceGitHubCheckoutSettingSchema;
	ScriptSetting: EnhanceScriptSettingSchema;
	LogSetting: EnhanceLogSettingSchema;
	TransactionSetting: EnhanceTransactionSettingSchema;
	TransactionSettingV2: EnhanceTransactionSettingV2Schema;
}
interface ExchangeNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly enableDirectExchange?: boolean;
	readonly enableAwaitExchange?: boolean;
	readonly transactionSettingV2?: ExchangeTransactionSettingV2Schema;
	readonly exchangeScript?: ExchangeScriptSettingSchema;
	readonly incrementalExchangeScript?: ExchangeScriptSettingSchema;
	readonly acquireAwaitScript?: ExchangeScriptSettingSchema;
	readonly logSetting?: ExchangeLogSettingSchema;
}
interface ExchangeRateModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly verifyActions?: readonly TransactionVerifyActionSchema[];
	readonly consumeActions?: readonly TransactionConsumeActionSchema[];
	readonly timingType?: string;
	readonly lockTime?: number;
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
}
interface ExchangeIncrementalRateModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly consumeAction: TransactionConsumeActionSchema;
	readonly calculateType: string;
	readonly baseValue?: number;
	readonly coefficientValue?: number;
	readonly calculateScriptId?: string;
	readonly exchangeCountId: string;
	readonly maximumExchangeCount?: number;
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
}
interface ExchangeAwaitSchema {
	readonly awaitId: string;
	readonly userId: string;
	readonly rateName: string;
	readonly name?: string;
	readonly count?: number;
	readonly skipSeconds?: number;
	readonly config?: readonly TransactionConfigSchema[];
	readonly acquirableAt?: string;
	readonly exchangedAt?: string;
	readonly createdAt?: string;
	readonly revision?: number;
}
interface ExchangeLogCostSchema {
	readonly base: number;
	readonly adds: readonly number[];
	readonly subs?: readonly number[];
}
interface ExchangeLogRateSchema {
	readonly base: number;
	readonly logs: readonly number[];
}
interface ExchangeAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ExchangeConsumeActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ExchangeVerifyActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ExchangeConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface ExchangeVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface ExchangeConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface ExchangeAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface ExchangeTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface ExchangeGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface ExchangeScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface ExchangeLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface ExchangeTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface ExchangeTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface ExchangeModelRegistry {
	Namespace: ExchangeNamespaceSchema;
	RateModel: ExchangeRateModelSchema;
	IncrementalRateModel: ExchangeIncrementalRateModelSchema;
	Await: ExchangeAwaitSchema;
	LogCost: ExchangeLogCostSchema;
	LogRate: ExchangeLogRateSchema;
	AcquireAction: ExchangeAcquireActionSchema;
	ConsumeAction: ExchangeConsumeActionSchema;
	VerifyAction: ExchangeVerifyActionSchema;
	Config: ExchangeConfigSchema;
	VerifyActionResult: ExchangeVerifyActionResultSchema;
	ConsumeActionResult: ExchangeConsumeActionResultSchema;
	AcquireActionResult: ExchangeAcquireActionResultSchema;
	TransactionResult: ExchangeTransactionResultSchema;
	GitHubCheckoutSetting: ExchangeGitHubCheckoutSettingSchema;
	ScriptSetting: ExchangeScriptSettingSchema;
	LogSetting: ExchangeLogSettingSchema;
	TransactionSetting: ExchangeTransactionSettingSchema;
	TransactionSettingV2: ExchangeTransactionSettingV2Schema;
}
interface ExperienceNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: ExperienceTransactionSettingV2Schema;
	readonly rankCapScriptId?: string;
	readonly changeExperienceScript?: ExperienceScriptSettingSchema;
	readonly changeRankScript?: ExperienceScriptSettingSchema;
	readonly changeRankCapScript?: ExperienceScriptSettingSchema;
	readonly overflowExperienceScript?: string;
	readonly logSetting?: ExperienceLogSettingSchema;
}
interface ExperienceExperienceModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly defaultExperience?: number;
	readonly defaultRankCap: number;
	readonly maxRankCap: number;
	readonly rankThreshold: ExperienceThresholdSchema;
	readonly acquireActionRates?: readonly ExperienceAcquireActionRateSchema[];
}
interface ExperienceThresholdSchema {
	readonly metadata?: string;
	readonly values: readonly number[];
}
interface ExperienceAcquireActionRateSchema {
	readonly name: string;
	readonly mode?: string;
	readonly rates?: readonly number[];
	readonly bigRates?: readonly string[];
}
interface ExperienceStatusSchema {
	readonly statusId: string;
	readonly experienceName: string;
	readonly userId: string;
	readonly propertyId: string;
	readonly experienceValue?: number;
	readonly rankValue?: number;
	readonly rankCapValue: number;
	readonly nextRankUpExperienceValue?: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface ExperienceVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface ExperienceConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface ExperienceAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface ExperienceTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface ExperienceAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ExperienceGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface ExperienceScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface ExperienceLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface ExperienceTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface ExperienceTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface ExperienceModelRegistry {
	Namespace: ExperienceNamespaceSchema;
	ExperienceModel: ExperienceExperienceModelSchema;
	Threshold: ExperienceThresholdSchema;
	AcquireActionRate: ExperienceAcquireActionRateSchema;
	Status: ExperienceStatusSchema;
	VerifyActionResult: ExperienceVerifyActionResultSchema;
	ConsumeActionResult: ExperienceConsumeActionResultSchema;
	AcquireActionResult: ExperienceAcquireActionResultSchema;
	TransactionResult: ExperienceTransactionResultSchema;
	AcquireAction: ExperienceAcquireActionSchema;
	GitHubCheckoutSetting: ExperienceGitHubCheckoutSettingSchema;
	ScriptSetting: ExperienceScriptSettingSchema;
	LogSetting: ExperienceLogSettingSchema;
	TransactionSetting: ExperienceTransactionSettingSchema;
	TransactionSettingV2: ExperienceTransactionSettingV2Schema;
}
interface FormationNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: FormationTransactionSettingV2Schema;
	readonly updateMoldScript?: FormationScriptSettingSchema;
	readonly updateFormScript?: FormationScriptSettingSchema;
	readonly updatePropertyFormScript?: FormationScriptSettingSchema;
	readonly logSetting?: FormationLogSettingSchema;
}
interface FormationFormModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly slots: readonly FormationSlotModelSchema[];
}
interface FormationMoldModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly initialMaxCapacity: number;
	readonly maxCapacity: number;
	readonly formModel: FormationFormModelSchema;
}
interface FormationPropertyFormModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly slots: readonly FormationSlotModelSchema[];
}
interface FormationMoldSchema {
	readonly moldId: string;
	readonly name: string;
	readonly userId: string;
	readonly capacity: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface FormationFormSchema {
	readonly formId: string;
	readonly name: string;
	readonly index: number;
	readonly slots?: readonly FormationSlotSchema[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface FormationPropertyFormSchema {
	readonly formId: string;
	readonly userId: string;
	readonly name: string;
	readonly propertyId: string;
	readonly slots?: readonly FormationSlotSchema[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface FormationSlotSchema {
	readonly name: string;
	readonly propertyId?: string;
	readonly metadata?: string;
}
interface FormationSlotModelSchema {
	readonly name: string;
	readonly propertyRegex?: string;
	readonly metadata?: string;
}
interface FormationSlotWithSignatureSchema {
	readonly name: string;
	readonly propertyType: string;
	readonly body?: string;
	readonly signature?: string;
	readonly metadata?: string;
}
interface FormationAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface FormationConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface FormationVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface FormationConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface FormationAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface FormationTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface FormationGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface FormationScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface FormationLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface FormationTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface FormationTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface FormationModelRegistry {
	Namespace: FormationNamespaceSchema;
	FormModel: FormationFormModelSchema;
	MoldModel: FormationMoldModelSchema;
	PropertyFormModel: FormationPropertyFormModelSchema;
	Mold: FormationMoldSchema;
	Form: FormationFormSchema;
	PropertyForm: FormationPropertyFormSchema;
	Slot: FormationSlotSchema;
	SlotModel: FormationSlotModelSchema;
	SlotWithSignature: FormationSlotWithSignatureSchema;
	AcquireAction: FormationAcquireActionSchema;
	Config: FormationConfigSchema;
	VerifyActionResult: FormationVerifyActionResultSchema;
	ConsumeActionResult: FormationConsumeActionResultSchema;
	AcquireActionResult: FormationAcquireActionResultSchema;
	TransactionResult: FormationTransactionResultSchema;
	GitHubCheckoutSetting: FormationGitHubCheckoutSettingSchema;
	ScriptSetting: FormationScriptSettingSchema;
	LogSetting: FormationLogSettingSchema;
	TransactionSetting: FormationTransactionSettingSchema;
	TransactionSettingV2: FormationTransactionSettingV2Schema;
}
interface FriendNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: FriendTransactionSettingV2Schema;
	readonly followScript?: FriendScriptSettingSchema;
	readonly unfollowScript?: FriendScriptSettingSchema;
	readonly sendRequestScript?: FriendScriptSettingSchema;
	readonly cancelRequestScript?: FriendScriptSettingSchema;
	readonly acceptRequestScript?: FriendScriptSettingSchema;
	readonly rejectRequestScript?: FriendScriptSettingSchema;
	readonly deleteFriendScript?: FriendScriptSettingSchema;
	readonly updateProfileScript?: FriendScriptSettingSchema;
	readonly followNotification?: FriendNotificationSettingSchema;
	readonly receiveRequestNotification: FriendNotificationSettingSchema;
	readonly cancelRequestNotification: FriendNotificationSettingSchema;
	readonly acceptRequestNotification: FriendNotificationSettingSchema;
	readonly rejectRequestNotification: FriendNotificationSettingSchema;
	readonly deleteFriendNotification: FriendNotificationSettingSchema;
	readonly logSetting?: FriendLogSettingSchema;
}
interface FriendProfileSchema {
	readonly profileId: string;
	readonly userId: string;
	readonly publicProfile?: string;
	readonly followerProfile?: string;
	readonly friendProfile?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface FriendFollowSchema {
	readonly followId: string;
	readonly userId: string;
	readonly targetUserIds?: readonly string[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface FriendFriendSchema {
	readonly friendId: string;
	readonly userId: string;
	readonly targetUserIds?: readonly string[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface FriendSendBoxSchema {
	readonly sendBoxId: string;
	readonly userId: string;
	readonly targetUserIds?: readonly string[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface FriendInboxSchema {
	readonly inboxId: string;
	readonly userId: string;
	readonly fromUserIds?: readonly string[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface FriendBlackListSchema {
	readonly blackListId: string;
	readonly userId: string;
	readonly targetUserIds?: readonly string[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface FriendFollowUserSchema {
	readonly userId: string;
	readonly publicProfile?: string;
	readonly followerProfile?: string;
	/** Loader constructor literal (catalog default: false). */
	readonly withProfile?: boolean;
}
interface FriendFriendUserSchema {
	readonly userId: string;
	readonly publicProfile?: string;
	readonly friendProfile?: string;
	/** Loader constructor literal (catalog default: false). */
	readonly withProfile?: boolean;
}
interface FriendFriendRequestSchema {
	readonly userId: string;
	readonly targetUserId: string;
	readonly publicProfile?: string;
}
interface FriendSendFriendRequestSchema {
	readonly userId: string;
	readonly targetUserId: string;
	readonly publicProfile?: string;
}
interface FriendReceiveFriendRequestSchema {
	readonly userId: string;
	readonly targetUserId: string;
	readonly publicProfile?: string;
}
interface FriendPublicProfileSchema {
	readonly userId: string;
	readonly publicProfile?: string;
}
interface FriendScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface FriendNotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly FriendMobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface FriendMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface FriendLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface FriendTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface FriendTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface FriendModelRegistry {
	Namespace: FriendNamespaceSchema;
	Profile: FriendProfileSchema;
	Follow: FriendFollowSchema;
	Friend: FriendFriendSchema;
	SendBox: FriendSendBoxSchema;
	Inbox: FriendInboxSchema;
	BlackList: FriendBlackListSchema;
	FollowUser: FriendFollowUserSchema;
	FriendUser: FriendFriendUserSchema;
	FriendRequest: FriendFriendRequestSchema;
	SendFriendRequest: FriendSendFriendRequestSchema;
	ReceiveFriendRequest: FriendReceiveFriendRequestSchema;
	PublicProfile: FriendPublicProfileSchema;
	ScriptSetting: FriendScriptSettingSchema;
	NotificationSetting: FriendNotificationSettingSchema;
	MobileNotificationMessage: FriendMobileNotificationMessageSchema;
	LogSetting: FriendLogSettingSchema;
	TransactionSetting: FriendTransactionSettingSchema;
	TransactionSettingV2: FriendTransactionSettingV2Schema;
}
interface GatewayNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: GatewayTransactionSettingV2Schema;
	readonly firebaseProjectId?: string;
	readonly logSetting?: GatewayLogSettingSchema;
}
interface GatewayWebSocketSessionSchema {
	readonly webSocketSessionId: string;
	readonly connectionId: string;
	readonly namespaceName: string;
	readonly userId: string;
	readonly sessionId?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface GatewayFirebaseTokenSchema {
	readonly firebaseTokenId: string;
	readonly userId: string;
	readonly token: string;
	readonly locale?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface GatewaySendNotificationEntrySchema {
	readonly userId: string;
	readonly issuer: string;
	readonly subject: string;
	readonly payload: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly GatewayMobileNotificationMessageSchema[];
}
interface GatewayMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface GatewayLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface GatewayTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface GatewayTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface GatewayModelRegistry {
	Namespace: GatewayNamespaceSchema;
	WebSocketSession: GatewayWebSocketSessionSchema;
	FirebaseToken: GatewayFirebaseTokenSchema;
	SendNotificationEntry: GatewaySendNotificationEntrySchema;
	MobileNotificationMessage: GatewayMobileNotificationMessageSchema;
	LogSetting: GatewayLogSettingSchema;
	TransactionSetting: GatewayTransactionSettingSchema;
	TransactionSettingV2: GatewayTransactionSettingV2Schema;
}
interface GradeNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: GradeTransactionSettingV2Schema;
	readonly changeGradeScript?: GradeScriptSettingSchema;
	readonly logSetting?: GradeLogSettingSchema;
}
interface GradeGradeModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly defaultGrades?: readonly GradeDefaultGradeModelSchema[];
	readonly experienceModelId: string;
	readonly gradeEntries: readonly GradeGradeEntryModelSchema[];
	readonly acquireActionRates?: readonly GradeAcquireActionRateSchema[];
}
interface GradeStatusSchema {
	readonly statusId: string;
	readonly gradeName: string;
	readonly userId: string;
	readonly propertyId: string;
	readonly gradeValue?: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface GradeDefaultGradeModelSchema {
	readonly propertyIdRegex: string;
	readonly defaultGradeValue: number;
}
interface GradeGradeEntryModelSchema {
	readonly metadata?: string;
	readonly rankCapValue: number;
	readonly propertyIdRegex: string;
	readonly gradeUpPropertyIdRegex: string;
}
interface GradeAcquireActionRateSchema {
	readonly name: string;
	readonly mode?: string;
	readonly rates?: readonly number[];
	readonly bigRates?: readonly string[];
}
interface GradeAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface GradeVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface GradeConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface GradeAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface GradeTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface GradeGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface GradeScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface GradeLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface GradeTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface GradeTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface GradeModelRegistry {
	Namespace: GradeNamespaceSchema;
	GradeModel: GradeGradeModelSchema;
	Status: GradeStatusSchema;
	DefaultGradeModel: GradeDefaultGradeModelSchema;
	GradeEntryModel: GradeGradeEntryModelSchema;
	AcquireActionRate: GradeAcquireActionRateSchema;
	AcquireAction: GradeAcquireActionSchema;
	VerifyActionResult: GradeVerifyActionResultSchema;
	ConsumeActionResult: GradeConsumeActionResultSchema;
	AcquireActionResult: GradeAcquireActionResultSchema;
	TransactionResult: GradeTransactionResultSchema;
	GitHubCheckoutSetting: GradeGitHubCheckoutSettingSchema;
	ScriptSetting: GradeScriptSettingSchema;
	LogSetting: GradeLogSettingSchema;
	TransactionSetting: GradeTransactionSettingSchema;
	TransactionSettingV2: GradeTransactionSettingV2Schema;
}
interface GuildNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: GuildTransactionSettingV2Schema;
	readonly changeNotification?: GuildNotificationSettingSchema;
	readonly joinNotification?: GuildNotificationSettingSchema;
	readonly leaveNotification?: GuildNotificationSettingSchema;
	readonly changeMemberNotification?: GuildNotificationSettingSchema;
	readonly changeMemberNotificationIgnoreChangeMetadata?: boolean;
	readonly receiveRequestNotification?: GuildNotificationSettingSchema;
	readonly removeRequestNotification?: GuildNotificationSettingSchema;
	readonly createGuildScript?: GuildScriptSettingSchema;
	readonly updateGuildScript?: GuildScriptSettingSchema;
	readonly joinGuildScript?: GuildScriptSettingSchema;
	readonly receiveJoinRequestScript?: GuildScriptSettingSchema;
	readonly leaveGuildScript?: GuildScriptSettingSchema;
	readonly changeRoleScript?: GuildScriptSettingSchema;
	readonly deleteGuildScript?: GuildScriptSettingSchema;
	readonly logSetting?: GuildLogSettingSchema;
}
interface GuildGuildModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly defaultMaximumMemberCount: number;
	readonly maximumMemberCount: number;
	readonly inactivityPeriodDays?: number;
	readonly roles: readonly GuildRoleModelSchema[];
	readonly guildMasterRole: string;
	readonly guildMemberDefaultRole: string;
	readonly rejoinCoolTimeMinutes?: number;
	readonly maxConcurrentJoinGuilds?: number;
	readonly maxConcurrentGuildMasterCount?: number;
}
interface GuildGuildSchema {
	readonly guildModelName: string;
	readonly displayName: string;
	readonly attribute1?: number;
	readonly attribute2?: number;
	readonly attribute3?: number;
	readonly attribute4?: number;
	readonly attribute5?: number;
	readonly metadata?: string;
	readonly joinPolicy: string;
	readonly customRoles?: readonly GuildRoleModelSchema[];
	readonly guildMemberDefaultRole?: string;
	readonly currentMaximumMemberCount: number;
	readonly members?: readonly GuildMemberSchema[];
}
interface GuildJoinedGuildSchema {
	readonly joinedGuildId: string;
	readonly guildModelName: string;
	readonly guildName: string;
	readonly userId: string;
	readonly createdAt?: string;
	readonly revision?: number;
}
interface GuildLastGuildMasterActivitySchema {
	readonly userId: string;
}
interface GuildRoleModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly policyDocument: string;
}
interface GuildMemberSchema {
	readonly userId: string;
	readonly roleName: string;
	readonly metadata?: string;
}
interface GuildReceiveMemberRequestSchema {
	readonly userId: string;
	readonly targetGuildName: string;
	readonly metadata?: string;
}
interface GuildSendMemberRequestSchema {
	readonly userId: string;
	readonly targetGuildModelName?: string;
	readonly targetGuildName: string;
	readonly metadata?: string;
	readonly createdAt?: string;
}
interface GuildIgnoreUserSchema {
	readonly userId: string;
}
interface GuildVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface GuildConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface GuildAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface GuildTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface GuildTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface GuildTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface GuildNotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly GuildMobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface GuildMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface GuildScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface GuildLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface GuildGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface GuildModelRegistry {
	Namespace: GuildNamespaceSchema;
	GuildModel: GuildGuildModelSchema;
	Guild: GuildGuildSchema;
	JoinedGuild: GuildJoinedGuildSchema;
	LastGuildMasterActivity: GuildLastGuildMasterActivitySchema;
	RoleModel: GuildRoleModelSchema;
	Member: GuildMemberSchema;
	ReceiveMemberRequest: GuildReceiveMemberRequestSchema;
	SendMemberRequest: GuildSendMemberRequestSchema;
	IgnoreUser: GuildIgnoreUserSchema;
	VerifyActionResult: GuildVerifyActionResultSchema;
	ConsumeActionResult: GuildConsumeActionResultSchema;
	AcquireActionResult: GuildAcquireActionResultSchema;
	TransactionResult: GuildTransactionResultSchema;
	TransactionSetting: GuildTransactionSettingSchema;
	TransactionSettingV2: GuildTransactionSettingV2Schema;
	NotificationSetting: GuildNotificationSettingSchema;
	MobileNotificationMessage: GuildMobileNotificationMessageSchema;
	ScriptSetting: GuildScriptSettingSchema;
	LogSetting: GuildLogSettingSchema;
	GitHubCheckoutSetting: GuildGitHubCheckoutSettingSchema;
}
interface IdleNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: IdleTransactionSettingV2Schema;
	readonly receiveScript?: IdleScriptSettingSchema;
	readonly overrideAcquireActionsScriptId?: string;
	readonly logSetting?: IdleLogSettingSchema;
}
interface IdleCategoryModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly rewardIntervalMinutes: number;
	readonly defaultMaximumIdleMinutes: number;
	readonly rewardResetMode?: string;
	readonly acquireActions?: readonly IdleAcquireActionListSchema[];
	readonly idlePeriodScheduleId?: string;
	readonly receivePeriodScheduleId?: string;
}
interface IdleStatusSchema {
	readonly statusId: string;
	readonly categoryName: string;
	readonly userId: string;
	readonly randomSeed?: number;
	readonly idleMinutes: number;
	readonly nextRewardsAt?: string;
	readonly maximumIdleMinutes?: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface IdleVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface IdleConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface IdleAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface IdleTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface IdleConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface IdleAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface IdleAcquireActionListSchema {
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
}
interface IdleTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface IdleTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface IdleScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface IdleLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface IdleGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface IdleModelRegistry {
	Namespace: IdleNamespaceSchema;
	CategoryModel: IdleCategoryModelSchema;
	Status: IdleStatusSchema;
	VerifyActionResult: IdleVerifyActionResultSchema;
	ConsumeActionResult: IdleConsumeActionResultSchema;
	AcquireActionResult: IdleAcquireActionResultSchema;
	TransactionResult: IdleTransactionResultSchema;
	Config: IdleConfigSchema;
	AcquireAction: IdleAcquireActionSchema;
	AcquireActionList: IdleAcquireActionListSchema;
	TransactionSetting: IdleTransactionSettingSchema;
	TransactionSettingV2: IdleTransactionSettingV2Schema;
	ScriptSetting: IdleScriptSettingSchema;
	LogSetting: IdleLogSettingSchema;
	GitHubCheckoutSetting: IdleGitHubCheckoutSettingSchema;
}
interface InboxNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly isAutomaticDeletingEnabled?: boolean;
	readonly transactionSettingV2?: InboxTransactionSettingV2Schema;
	readonly receiveMessageScript?: InboxScriptSettingSchema;
	readonly readMessageScript?: InboxScriptSettingSchema;
	readonly deleteMessageScript?: InboxScriptSettingSchema;
	readonly receiveNotification?: InboxNotificationSettingSchema;
	readonly logSetting?: InboxLogSettingSchema;
}
interface InboxMessageSchema {
	readonly messageId: string;
	readonly name?: string;
	readonly userId: string;
	readonly metadata: string;
	readonly isRead?: boolean;
	readonly readAcquireActions?: readonly TransactionAcquireActionSchema[];
	readonly receivedAt?: string;
	readonly readAt?: string;
	readonly expiresAt?: string;
	readonly revision?: number;
}
interface InboxGlobalMessageSchema {
	readonly name: string;
	readonly metadata: string;
	readonly readAcquireActions?: readonly TransactionAcquireActionSchema[];
	readonly expiresTimeSpan?: InboxTimeSpanSchema;
	readonly messageReceptionPeriodEventId?: string;
}
interface InboxReceivedSchema {
	readonly receivedId: string;
	readonly userId: string;
	readonly receivedGlobalMessageNames?: readonly string[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface InboxTimeSpanSchema {
	readonly days?: number;
	readonly hours?: number;
	readonly minutes?: number;
}
interface InboxAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface InboxConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface InboxVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface InboxConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface InboxAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface InboxTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface InboxScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface InboxNotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly InboxMobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface InboxMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface InboxGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface InboxLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface InboxTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface InboxTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface InboxModelRegistry {
	Namespace: InboxNamespaceSchema;
	Message: InboxMessageSchema;
	GlobalMessage: InboxGlobalMessageSchema;
	Received: InboxReceivedSchema;
	TimeSpan: InboxTimeSpanSchema;
	AcquireAction: InboxAcquireActionSchema;
	Config: InboxConfigSchema;
	VerifyActionResult: InboxVerifyActionResultSchema;
	ConsumeActionResult: InboxConsumeActionResultSchema;
	AcquireActionResult: InboxAcquireActionResultSchema;
	TransactionResult: InboxTransactionResultSchema;
	ScriptSetting: InboxScriptSettingSchema;
	NotificationSetting: InboxNotificationSettingSchema;
	MobileNotificationMessage: InboxMobileNotificationMessageSchema;
	GitHubCheckoutSetting: InboxGitHubCheckoutSettingSchema;
	LogSetting: InboxLogSettingSchema;
	TransactionSetting: InboxTransactionSettingSchema;
	TransactionSettingV2: InboxTransactionSettingV2Schema;
}
interface InventoryNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: InventoryTransactionSettingV2Schema;
	readonly acquireScript?: InventoryScriptSettingSchema;
	readonly overflowScript?: InventoryScriptSettingSchema;
	readonly consumeScript?: InventoryScriptSettingSchema;
	readonly simpleItemAcquireScript?: InventoryScriptSettingSchema;
	readonly simpleItemConsumeScript?: InventoryScriptSettingSchema;
	readonly bigItemAcquireScript?: InventoryScriptSettingSchema;
	readonly bigItemConsumeScript?: InventoryScriptSettingSchema;
	readonly logSetting?: InventoryLogSettingSchema;
}
interface InventoryInventoryModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly initialCapacity: number;
	readonly maxCapacity: number;
	readonly protectReferencedItem?: boolean;
	readonly itemModels?: readonly InventoryItemModelSchema[];
}
interface InventoryItemModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly stackingLimit: number;
	readonly allowMultipleStacks: boolean;
	readonly sortValue: number;
}
interface InventorySimpleInventoryModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly simpleItemModels?: readonly InventorySimpleItemModelSchema[];
}
interface InventorySimpleItemModelSchema {
	readonly name: string;
	readonly metadata?: string;
}
interface InventoryBigInventoryModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly bigItemModels?: readonly InventoryBigItemModelSchema[];
}
interface InventoryBigItemModelSchema {
	readonly name: string;
	readonly metadata?: string;
}
interface InventoryInventorySchema {
	readonly inventoryId: string;
	readonly inventoryName: string;
	readonly userId: string;
	readonly currentInventoryCapacityUsage?: number;
	readonly currentInventoryMaxCapacity: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface InventoryItemSetSchema {
	readonly itemSetId: string;
	readonly name?: string;
	readonly inventoryName: string;
	readonly userId: string;
	readonly itemName: string;
	readonly count: number;
	readonly referenceOf?: readonly string[];
	readonly sortValue: number;
	readonly expiresAt?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
}
interface InventoryReferenceOfSchema {
	readonly referenceOfId: string;
	readonly name: string;
}
interface InventorySimpleInventorySchema {
	readonly inventoryId: string;
	readonly inventoryName: string;
	readonly userId: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface InventorySimpleItemSchema {
	readonly itemId: string;
	readonly userId: string;
	readonly itemName: string;
	readonly count: number;
	readonly revision?: number;
}
interface InventoryBigInventorySchema {
	readonly inventoryId: string;
	readonly inventoryName: string;
	readonly userId: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
}
interface InventoryBigItemSchema {
	readonly itemId: string;
	readonly userId: string;
	readonly itemName: string;
	readonly count: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface InventoryGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface InventoryScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface InventoryLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface InventoryTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface InventoryTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface InventoryAcquireCountSchema {
	readonly itemName: string;
	readonly count: number;
}
interface InventoryConsumeCountSchema {
	readonly itemName: string;
	readonly count: number;
}
interface InventoryHeldCountSchema {
	readonly itemName: string;
	readonly count: number;
}
interface InventoryModelRegistry {
	Namespace: InventoryNamespaceSchema;
	InventoryModel: InventoryInventoryModelSchema;
	ItemModel: InventoryItemModelSchema;
	SimpleInventoryModel: InventorySimpleInventoryModelSchema;
	SimpleItemModel: InventorySimpleItemModelSchema;
	BigInventoryModel: InventoryBigInventoryModelSchema;
	BigItemModel: InventoryBigItemModelSchema;
	Inventory: InventoryInventorySchema;
	ItemSet: InventoryItemSetSchema;
	ReferenceOf: InventoryReferenceOfSchema;
	SimpleInventory: InventorySimpleInventorySchema;
	SimpleItem: InventorySimpleItemSchema;
	BigInventory: InventoryBigInventorySchema;
	BigItem: InventoryBigItemSchema;
	GitHubCheckoutSetting: InventoryGitHubCheckoutSettingSchema;
	ScriptSetting: InventoryScriptSettingSchema;
	LogSetting: InventoryLogSettingSchema;
	TransactionSetting: InventoryTransactionSettingSchema;
	TransactionSettingV2: InventoryTransactionSettingV2Schema;
	AcquireCount: InventoryAcquireCountSchema;
	ConsumeCount: InventoryConsumeCountSchema;
	HeldCount: InventoryHeldCountSchema;
}
interface LimitNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: LimitTransactionSettingV2Schema;
	readonly countUpScript?: LimitScriptSettingSchema;
	readonly logSetting?: LimitLogSettingSchema;
}
interface LimitCounterSchema {
	readonly counterId: string;
	readonly limitName: string;
	readonly name: string;
	readonly userId: string;
	readonly count?: number;
	readonly nextResetAt?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface LimitGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface LimitLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface LimitScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface LimitTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface LimitTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface LimitLimitModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly resetType: string;
	readonly resetDayOfMonth?: number;
	readonly resetDayOfWeek?: string;
	readonly resetHour?: number;
	readonly anchorTimestamp?: string;
	readonly days?: number;
}
interface LimitModelRegistry {
	Namespace: LimitNamespaceSchema;
	Counter: LimitCounterSchema;
	GitHubCheckoutSetting: LimitGitHubCheckoutSettingSchema;
	LogSetting: LimitLogSettingSchema;
	ScriptSetting: LimitScriptSettingSchema;
	TransactionSetting: LimitTransactionSettingSchema;
	TransactionSettingV2: LimitTransactionSettingV2Schema;
	LimitModel: LimitLimitModelSchema;
}
interface LogNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly type?: string;
	readonly gcpCredentialJson?: string;
	readonly bigQueryDatasetName?: string;
	readonly logExpireDays?: number;
	readonly awsRegion?: string;
	readonly awsAccessKeyId?: string;
	readonly awsSecretAccessKey?: string;
	readonly firehoseStreamName?: string;
	readonly firehoseCompressData?: string;
	readonly status?: string;
}
interface LogAccessLogSchema {
	readonly timestamp: string;
	readonly requestId: string;
	readonly service: string;
	readonly method: string;
	readonly userId?: string;
	readonly request: string;
	readonly result: string;
}
interface LogAccessLogCountSchema {
	readonly service?: string;
	readonly method?: string;
	readonly userId?: string;
	readonly count: number;
}
interface LogIssueStampSheetLogSchema {
	readonly timestamp: string;
	readonly transactionId: string;
	readonly service: string;
	readonly method: string;
	readonly userId: string;
	readonly action: string;
	readonly args: string;
	readonly tasks?: readonly string[];
}
interface LogIssueStampSheetLogCountSchema {
	readonly service?: string;
	readonly method?: string;
	readonly userId?: string;
	readonly action?: string;
	readonly count: number;
}
interface LogExecuteStampSheetLogSchema {
	readonly timestamp: string;
	readonly transactionId: string;
	readonly service: string;
	readonly method: string;
	readonly userId: string;
	readonly action: string;
	readonly args: string;
}
interface LogExecuteStampSheetLogCountSchema {
	readonly service?: string;
	readonly method?: string;
	readonly userId?: string;
	readonly action?: string;
	readonly count: number;
}
interface LogExecuteStampTaskLogSchema {
	readonly timestamp: string;
	readonly taskId: string;
	readonly service: string;
	readonly method: string;
	readonly userId: string;
	readonly action: string;
	readonly args: string;
}
interface LogExecuteStampTaskLogCountSchema {
	readonly service?: string;
	readonly method?: string;
	readonly userId?: string;
	readonly action?: string;
	readonly count: number;
}
interface LogInGameLogSchema {
	readonly timestamp: string;
	readonly requestId: string;
	readonly userId?: string;
	readonly tags?: readonly LogInGameLogTagSchema[];
	readonly payload: string;
}
interface LogAccessLogWithTelemetrySchema {
	readonly timestamp: string;
	readonly sourceRequestId: string;
	readonly requestId: string;
	readonly duration: number;
	readonly service: string;
	readonly method: string;
	readonly userId?: string;
	readonly request: string;
	readonly result: string;
	readonly status: string;
}
interface LogInsightSchema {
	readonly host?: string;
	readonly status?: string;
}
interface LogFacetModelSchema {
	readonly field: string;
	readonly type: string;
	readonly displayName: string;
	readonly order?: number;
}
interface LogDashboardSchema {
	readonly displayName: string;
	readonly description?: string;
	readonly payload: string;
}
interface LogAggregationConfigSchema {
	readonly type?: string;
	readonly field?: string;
}
interface LogFacetSchema {
	readonly field: string;
	readonly values?: readonly LogFacetValueCountSchema[];
	readonly range?: LogNumericRangeSchema;
	readonly globalRange?: LogNumericRangeSchema;
}
interface LogFacetValueCountSchema {
	readonly value: string;
	readonly count: number;
}
interface LogLabelSchema {
	readonly key: string;
	readonly value: string;
}
interface LogLogEntrySchema {
	readonly timestamp: string;
	readonly status: string;
	readonly duration?: number;
	readonly line: string;
	readonly labels?: readonly LogLabelSchema[];
}
interface LogNumericRangeSchema {
	readonly min: number;
	readonly max: number;
}
interface LogTimeseriesMetadataSchema {
	readonly keys?: readonly string[];
	readonly groupBy?: readonly string[];
}
interface LogTimeseriesPointSchema {
	readonly timestamp: string;
	readonly values?: readonly LogTimeseriesValueSchema[];
}
interface LogTimeseriesValueSchema {
	readonly key: string;
	readonly value: number;
}
interface LogTraceSchema {
	readonly spans?: readonly LogLogEntrySchema[];
	readonly truncated?: boolean;
}
interface LogMetricModelSchema {
	readonly name: string;
	readonly type: string;
	readonly labels?: readonly string[];
}
interface LogInGameLogTagSchema {
	readonly key: string;
	readonly value: string;
}
interface LogModelRegistry {
	Namespace: LogNamespaceSchema;
	AccessLog: LogAccessLogSchema;
	AccessLogCount: LogAccessLogCountSchema;
	IssueStampSheetLog: LogIssueStampSheetLogSchema;
	IssueStampSheetLogCount: LogIssueStampSheetLogCountSchema;
	ExecuteStampSheetLog: LogExecuteStampSheetLogSchema;
	ExecuteStampSheetLogCount: LogExecuteStampSheetLogCountSchema;
	ExecuteStampTaskLog: LogExecuteStampTaskLogSchema;
	ExecuteStampTaskLogCount: LogExecuteStampTaskLogCountSchema;
	InGameLog: LogInGameLogSchema;
	AccessLogWithTelemetry: LogAccessLogWithTelemetrySchema;
	Insight: LogInsightSchema;
	FacetModel: LogFacetModelSchema;
	Dashboard: LogDashboardSchema;
	AggregationConfig: LogAggregationConfigSchema;
	Facet: LogFacetSchema;
	FacetValueCount: LogFacetValueCountSchema;
	Label: LogLabelSchema;
	LogEntry: LogLogEntrySchema;
	NumericRange: LogNumericRangeSchema;
	TimeseriesMetadata: LogTimeseriesMetadataSchema;
	TimeseriesPoint: LogTimeseriesPointSchema;
	TimeseriesValue: LogTimeseriesValueSchema;
	Trace: LogTraceSchema;
	MetricModel: LogMetricModelSchema;
	InGameLogTag: LogInGameLogTagSchema;
}
interface LoginRewardNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: LoginRewardTransactionSettingV2Schema;
	readonly receiveScript?: LoginRewardScriptSettingSchema;
	readonly logSetting?: LoginRewardLogSettingSchema;
}
interface LoginRewardBonusModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly mode: string;
	readonly periodEventId?: string;
	readonly resetHour?: number;
	readonly repeat?: string;
	readonly rewards?: readonly LoginRewardRewardSchema[];
	readonly missedReceiveRelief?: string;
	readonly missedReceiveReliefVerifyActions?: readonly TransactionVerifyActionSchema[];
	readonly missedReceiveReliefConsumeActions?: readonly TransactionConsumeActionSchema[];
}
interface LoginRewardRewardSchema {
	readonly acquireActions: readonly TransactionAcquireActionSchema[];
}
interface LoginRewardReceiveStatusSchema {
	readonly receiveStatusId: string;
	readonly bonusModelName: string;
	readonly userId: string;
	readonly receivedSteps?: readonly boolean[];
	readonly lastReceivedAt?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface LoginRewardConsumeActionSchema {
	readonly action: string;
	readonly request: string;
}
interface LoginRewardAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface LoginRewardVerifyActionSchema {
	readonly action: string;
	readonly request: string;
}
interface LoginRewardConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface LoginRewardVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface LoginRewardConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface LoginRewardAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface LoginRewardTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface LoginRewardGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface LoginRewardLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface LoginRewardTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface LoginRewardTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface LoginRewardScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface LoginRewardModelRegistry {
	Namespace: LoginRewardNamespaceSchema;
	BonusModel: LoginRewardBonusModelSchema;
	Reward: LoginRewardRewardSchema;
	ReceiveStatus: LoginRewardReceiveStatusSchema;
	ConsumeAction: LoginRewardConsumeActionSchema;
	AcquireAction: LoginRewardAcquireActionSchema;
	VerifyAction: LoginRewardVerifyActionSchema;
	Config: LoginRewardConfigSchema;
	VerifyActionResult: LoginRewardVerifyActionResultSchema;
	ConsumeActionResult: LoginRewardConsumeActionResultSchema;
	AcquireActionResult: LoginRewardAcquireActionResultSchema;
	TransactionResult: LoginRewardTransactionResultSchema;
	GitHubCheckoutSetting: LoginRewardGitHubCheckoutSettingSchema;
	LogSetting: LoginRewardLogSettingSchema;
	TransactionSetting: LoginRewardTransactionSettingSchema;
	TransactionSettingV2: LoginRewardTransactionSettingV2Schema;
	ScriptSetting: LoginRewardScriptSettingSchema;
}
interface LotteryNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: LotteryTransactionSettingV2Schema;
	readonly lotteryTriggerScriptId?: string;
	readonly logSetting?: LotteryLogSettingSchema;
}
interface LotteryLotteryModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly mode: string;
	readonly method: string;
	readonly prizeTableName?: string;
	readonly choicePrizeTableScriptId?: string;
}
interface LotteryPrizeTableSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly prizes: readonly LotteryPrizeSchema[];
}
interface LotteryProbabilitySchema {
	readonly prize: LotteryDrawnPrizeSchema;
	readonly rate: number;
}
interface LotteryPrizeSchema {
	readonly prizeId?: string;
	readonly type: string;
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
	readonly drawnLimit?: number;
	readonly limitFailOverPrizeId?: string;
	readonly prizeTableName?: string;
	readonly weight: number;
}
interface LotteryPrizeLimitSchema {
	readonly prizeId: string;
	readonly drawnCount: number;
}
interface LotteryDrawnPrizeSchema {
	readonly prizeId: string;
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
}
interface LotteryBoxItemSchema {
	readonly prizeId: string;
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
	readonly remaining: number;
	readonly initial: number;
}
interface LotteryBoxItemsSchema {
	readonly boxId: string;
	readonly prizeTableName: string;
	readonly userId: string;
	readonly items?: readonly LotteryBoxItemSchema[];
}
interface LotteryAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface LotteryConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface LotteryVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface LotteryConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface LotteryAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface LotteryTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface LotteryGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface LotteryLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface LotteryTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface LotteryTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface LotteryModelRegistry {
	Namespace: LotteryNamespaceSchema;
	LotteryModel: LotteryLotteryModelSchema;
	PrizeTable: LotteryPrizeTableSchema;
	Probability: LotteryProbabilitySchema;
	Prize: LotteryPrizeSchema;
	PrizeLimit: LotteryPrizeLimitSchema;
	DrawnPrize: LotteryDrawnPrizeSchema;
	BoxItem: LotteryBoxItemSchema;
	BoxItems: LotteryBoxItemsSchema;
	AcquireAction: LotteryAcquireActionSchema;
	Config: LotteryConfigSchema;
	VerifyActionResult: LotteryVerifyActionResultSchema;
	ConsumeActionResult: LotteryConsumeActionResultSchema;
	AcquireActionResult: LotteryAcquireActionResultSchema;
	TransactionResult: LotteryTransactionResultSchema;
	GitHubCheckoutSetting: LotteryGitHubCheckoutSettingSchema;
	LogSetting: LotteryLogSettingSchema;
	TransactionSetting: LotteryTransactionSettingSchema;
	TransactionSettingV2: LotteryTransactionSettingV2Schema;
}
interface MatchmakingNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: MatchmakingTransactionSettingV2Schema;
	readonly enableRating?: boolean;
	readonly enableDisconnectDetection?: string;
	readonly disconnectDetectionTimeoutSeconds?: number;
	readonly createGatheringTriggerType?: string;
	readonly createGatheringTriggerRealtimeNamespaceId?: string;
	readonly createGatheringTriggerScriptId?: string;
	readonly completeMatchmakingTriggerType?: string;
	readonly completeMatchmakingTriggerRealtimeNamespaceId?: string;
	readonly completeMatchmakingTriggerScriptId?: string;
	readonly enableCollaborateSeasonRating?: string;
	readonly collaborateSeasonRatingNamespaceId?: string;
	readonly collaborateSeasonRatingTtl?: number;
	readonly changeRatingScript?: MatchmakingScriptSettingSchema;
	readonly joinNotification?: MatchmakingNotificationSettingSchema;
	readonly leaveNotification?: MatchmakingNotificationSettingSchema;
	readonly completeNotification?: MatchmakingNotificationSettingSchema;
	readonly changeRatingNotification?: MatchmakingNotificationSettingSchema;
	readonly logSetting?: MatchmakingLogSettingSchema;
}
interface MatchmakingGatheringSchema {
	readonly name?: string;
	readonly attributeRanges?: readonly MatchmakingAttributeRangeSchema[];
	readonly capacityOfRoles?: readonly MatchmakingCapacityOfRoleSchema[];
	readonly allowUserIds?: readonly string[];
	readonly metadata?: string;
	readonly expiresAt?: string;
}
interface MatchmakingRatingModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly initialValue?: number;
	readonly volatility?: number;
}
interface MatchmakingSeasonModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly maximumParticipants: number;
	readonly experienceModelId?: string;
	readonly challengePeriodEventId: string;
}
interface MatchmakingSeasonGatheringSchema {
	readonly seasonName: string;
	readonly season: number;
	readonly tier: number;
	readonly name?: string;
	readonly participants?: readonly string[];
}
interface MatchmakingJoinedSeasonGatheringSchema {
	readonly joinedSeasonGatheringId: string;
	readonly userId: string;
	readonly seasonName: string;
	readonly season: number;
	readonly tier: number;
	readonly seasonGatheringName: string;
	readonly createdAt?: string;
}
interface MatchmakingScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface MatchmakingNotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly MatchmakingMobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface MatchmakingMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface MatchmakingLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface MatchmakingTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface MatchmakingTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface MatchmakingGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface MatchmakingAttributeRangeSchema {
	readonly name: string;
	readonly min?: number;
	readonly max?: number;
}
interface MatchmakingCapacityOfRoleSchema {
	readonly roleName?: string;
	readonly roleAliases?: readonly string[];
	readonly capacity: number;
	readonly participants?: readonly MatchmakingPlayerSchema[];
}
interface MatchmakingAttributeSchema {
	readonly name: string;
	readonly value?: number;
}
interface MatchmakingPlayerSchema {
	readonly userId: string;
	readonly attributes?: readonly MatchmakingAttributeSchema[];
	readonly roleName?: string;
	readonly denyUserIds?: readonly string[];
}
interface MatchmakingRatingSchema {
	readonly ratingId: string;
	readonly name: string;
	readonly userId: string;
	readonly rateValue?: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface MatchmakingGameResultSchema {
	readonly rank?: number;
	readonly userId: string;
}
interface MatchmakingBallotSchema {
	readonly userId: string;
	readonly ratingName: string;
	readonly gatheringName: string;
	readonly numberOfPlayer: number;
}
interface MatchmakingSignedBallotSchema {
	readonly body: string;
	readonly signature: string;
}
interface MatchmakingWrittenBallotSchema {
	readonly ballot: MatchmakingBallotSchema;
	readonly gameResults?: readonly MatchmakingGameResultSchema[];
}
interface MatchmakingVoteSchema {
	readonly ratingName: string;
	readonly gatheringName?: string;
	readonly writtenBallots?: readonly MatchmakingWrittenBallotSchema[];
}
interface MatchmakingTimeSpanSchema {
	readonly days?: number;
	readonly hours?: number;
	readonly minutes?: number;
}
interface MatchmakingModelRegistry {
	Namespace: MatchmakingNamespaceSchema;
	Gathering: MatchmakingGatheringSchema;
	RatingModel: MatchmakingRatingModelSchema;
	SeasonModel: MatchmakingSeasonModelSchema;
	SeasonGathering: MatchmakingSeasonGatheringSchema;
	JoinedSeasonGathering: MatchmakingJoinedSeasonGatheringSchema;
	ScriptSetting: MatchmakingScriptSettingSchema;
	NotificationSetting: MatchmakingNotificationSettingSchema;
	MobileNotificationMessage: MatchmakingMobileNotificationMessageSchema;
	LogSetting: MatchmakingLogSettingSchema;
	TransactionSetting: MatchmakingTransactionSettingSchema;
	TransactionSettingV2: MatchmakingTransactionSettingV2Schema;
	GitHubCheckoutSetting: MatchmakingGitHubCheckoutSettingSchema;
	AttributeRange: MatchmakingAttributeRangeSchema;
	CapacityOfRole: MatchmakingCapacityOfRoleSchema;
	Attribute: MatchmakingAttributeSchema;
	Player: MatchmakingPlayerSchema;
	Rating: MatchmakingRatingSchema;
	GameResult: MatchmakingGameResultSchema;
	Ballot: MatchmakingBallotSchema;
	SignedBallot: MatchmakingSignedBallotSchema;
	WrittenBallot: MatchmakingWrittenBallotSchema;
	Vote: MatchmakingVoteSchema;
	TimeSpan: MatchmakingTimeSpanSchema;
}
interface MissionCompleteSchema {
	readonly completeId: string;
	readonly userId: string;
	readonly missionGroupName: string;
	readonly completedMissionTaskNames?: readonly string[];
	readonly receivedMissionTaskNames?: readonly string[];
	readonly nextResetAt?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface MissionNotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly MissionMobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface MissionMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface MissionCounterScopeModelSchema {
	readonly scopeType?: string;
	readonly resetType?: string;
	readonly resetDayOfMonth?: number;
	readonly resetDayOfWeek?: string;
	readonly resetHour?: number;
	readonly conditionName?: string;
	readonly condition?: TransactionVerifyActionSchema;
	readonly anchorTimestamp?: string;
	readonly days?: number;
}
interface MissionNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: MissionTransactionSettingV2Schema;
	readonly missionCompleteScript?: MissionScriptSettingSchema;
	readonly counterIncrementScript?: MissionScriptSettingSchema;
	readonly receiveRewardsScript?: MissionScriptSettingSchema;
	readonly completeNotification: MissionNotificationSettingSchema;
	readonly logSetting?: MissionLogSettingSchema;
}
interface MissionCounterSchema {
	readonly counterId: string;
	readonly userId: string;
	readonly name: string;
	readonly values?: readonly MissionScopedValueSchema[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface MissionCounterModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly scopes?: readonly MissionCounterScopeModelSchema[];
	readonly challengePeriodEventId?: string;
}
interface MissionMissionGroupModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly tasks?: readonly MissionMissionTaskModelSchema[];
	readonly resetType?: string;
	readonly resetDayOfMonth?: number;
	readonly resetDayOfWeek?: string;
	readonly resetHour?: number;
	readonly completeNotificationNamespaceId?: string;
	readonly anchorTimestamp?: string;
	readonly days?: number;
}
interface MissionMissionTaskModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly verifyCompleteType?: string;
	readonly targetCounter?: MissionTargetCounterModelSchema;
	readonly verifyCompleteConsumeActions?: readonly TransactionVerifyActionSchema[];
	readonly completeAcquireActions?: readonly TransactionAcquireActionSchema[];
	readonly challengePeriodEventId?: string;
	readonly premiseMissionTaskName?: string;
}
interface MissionScopedValueSchema {
	readonly scopeType?: string;
	readonly resetType?: string;
	readonly conditionName?: string;
	readonly value?: number;
}
interface MissionTargetCounterModelSchema {
	readonly counterName: string;
	readonly scopeType?: string;
	readonly resetType?: string;
	readonly conditionName?: string;
	readonly value: number;
}
interface MissionAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface MissionConsumeActionSchema {
	readonly action: string;
	readonly request: string;
}
interface MissionVerifyActionSchema {
	readonly action: string;
	readonly request: string;
}
interface MissionConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface MissionVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface MissionConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface MissionAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface MissionTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface MissionLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface MissionGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface MissionScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface MissionTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface MissionTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface MissionModelRegistry {
	Complete: MissionCompleteSchema;
	NotificationSetting: MissionNotificationSettingSchema;
	MobileNotificationMessage: MissionMobileNotificationMessageSchema;
	CounterScopeModel: MissionCounterScopeModelSchema;
	Namespace: MissionNamespaceSchema;
	Counter: MissionCounterSchema;
	CounterModel: MissionCounterModelSchema;
	MissionGroupModel: MissionMissionGroupModelSchema;
	MissionTaskModel: MissionMissionTaskModelSchema;
	ScopedValue: MissionScopedValueSchema;
	TargetCounterModel: MissionTargetCounterModelSchema;
	AcquireAction: MissionAcquireActionSchema;
	ConsumeAction: MissionConsumeActionSchema;
	VerifyAction: MissionVerifyActionSchema;
	Config: MissionConfigSchema;
	VerifyActionResult: MissionVerifyActionResultSchema;
	ConsumeActionResult: MissionConsumeActionResultSchema;
	AcquireActionResult: MissionAcquireActionResultSchema;
	TransactionResult: MissionTransactionResultSchema;
	LogSetting: MissionLogSettingSchema;
	GitHubCheckoutSetting: MissionGitHubCheckoutSettingSchema;
	ScriptSetting: MissionScriptSettingSchema;
	TransactionSetting: MissionTransactionSettingSchema;
	TransactionSettingV2: MissionTransactionSettingV2Schema;
}
interface Money2NamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: Money2TransactionSettingV2Schema;
	readonly currencyUsagePriority: string;
	readonly sharedFreeCurrency: boolean;
	readonly platformSetting: Money2PlatformSettingSchema;
	readonly depositBalanceScript?: Money2ScriptSettingSchema;
	readonly withdrawBalanceScript?: Money2ScriptSettingSchema;
	readonly verifyReceiptScript?: Money2ScriptSettingSchema;
	readonly subscribeScript?: string;
	readonly renewScript?: string;
	readonly unsubscribeScript?: string;
	readonly takeOverScript?: Money2ScriptSettingSchema;
	readonly changeSubscriptionStatusNotification?: Money2NotificationSettingSchema;
	readonly logSetting?: Money2LogSettingSchema;
}
interface Money2WalletSchema {
	readonly walletId: string;
	readonly userId: string;
	readonly slot: number;
	readonly summary: Money2WalletSummarySchema;
	readonly depositTransactions?: readonly Money2DepositTransactionSchema[];
	readonly sharedFreeCurrency: boolean;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface Money2SubscribeTransactionSchema {
	readonly contentName: string;
	readonly transactionId: string;
	readonly store: string;
	readonly userId?: string;
	readonly statusDetail: string;
	readonly expiresAt: string;
	readonly lastAllocatedAt?: string;
	readonly lastTakeOverAt?: string;
}
interface Money2SubscriptionStatusSchema {
	readonly userId?: string;
	readonly contentName: string;
	readonly status: string;
	readonly expiresAt: string;
	readonly detail?: readonly Money2SubscribeTransactionSchema[];
}
interface Money2StoreContentModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly appleAppStore?: Money2AppleAppStoreContentSchema;
	readonly googlePlay?: Money2GooglePlayContentSchema;
}
interface Money2StoreSubscriptionContentModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly scheduleNamespaceId: string;
	readonly triggerName: string;
	readonly triggerExtendMode?: string;
	readonly rollupHour?: number;
	readonly reallocateSpanDays?: number;
	readonly appleAppStore?: Money2AppleAppStoreSubscriptionContentSchema;
	readonly googlePlay?: Money2GooglePlaySubscriptionContentSchema;
}
interface Money2ReceiptSchema {
	readonly Store: string;
	readonly TransactionID: string;
	readonly Payload: string;
}
interface Money2PlatformSettingSchema {
	readonly appleAppStore?: Money2AppleAppStoreSettingSchema;
	readonly googlePlay?: Money2GooglePlaySettingSchema;
	readonly fake?: Money2FakeSettingSchema;
}
interface Money2AppleAppStoreSettingSchema {
	readonly bundleId?: string;
	readonly sharedSecretKey?: string;
	readonly issuerId?: string;
	readonly keyId?: string;
	readonly privateKeyPem?: string;
}
interface Money2GooglePlaySettingSchema {
	readonly packageName?: string;
	readonly publicKey?: string;
}
interface Money2FakeSettingSchema {
	readonly acceptFakeReceipt?: string;
}
interface Money2WalletSummarySchema {
	readonly paid?: number;
	readonly free?: number;
	readonly total?: number;
}
interface Money2DepositTransactionSchema {
	readonly price: number;
	readonly currency?: string;
	readonly count: number;
}
interface Money2VerifyReceiptEventSchema {
	readonly contentName: string;
	readonly platform: string;
	readonly appleAppStoreVerifyReceiptEvent?: Money2AppleAppStoreVerifyReceiptEventSchema;
	readonly googlePlayVerifyReceiptEvent?: Money2GooglePlayVerifyReceiptEventSchema;
}
interface Money2DepositEventSchema {
	readonly slot: number;
	readonly depositTransactions?: readonly Money2DepositTransactionSchema[];
	readonly status: Money2WalletSummarySchema;
}
interface Money2WithdrawEventSchema {
	readonly slot: number;
	readonly withdrawDetails?: readonly Money2DepositTransactionSchema[];
	readonly status: Money2WalletSummarySchema;
}
interface Money2RefundEventSchema {
	readonly contentName: string;
	readonly platform: string;
	readonly appleAppStoreRefundEvent?: Money2AppleAppStoreVerifyReceiptEventSchema;
	readonly googlePlayRefundEvent?: Money2GooglePlayVerifyReceiptEventSchema;
}
interface Money2AppleAppStoreVerifyReceiptEventSchema {
	readonly environment: string;
}
interface Money2GooglePlayVerifyReceiptEventSchema {
	readonly purchaseToken?: string;
}
interface Money2AppleAppStoreContentSchema {
	readonly productId?: string;
}
interface Money2GooglePlayContentSchema {
	readonly productId?: string;
}
interface Money2AppleAppStoreSubscriptionContentSchema {
	readonly subscriptionGroupIdentifier?: string;
}
interface Money2GooglePlaySubscriptionContentSchema {
	readonly productId?: string;
}
interface Money2GooglePlayRealtimeNotificationMessageSchema {
	readonly data: string;
	readonly messageId: string;
	readonly publishTime: string;
}
interface Money2GitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface Money2ScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface Money2NotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly Money2MobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface Money2MobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface Money2LogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface Money2TransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface Money2TransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface Money2ModelRegistry {
	Namespace: Money2NamespaceSchema;
	Wallet: Money2WalletSchema;
	SubscribeTransaction: Money2SubscribeTransactionSchema;
	SubscriptionStatus: Money2SubscriptionStatusSchema;
	StoreContentModel: Money2StoreContentModelSchema;
	StoreSubscriptionContentModel: Money2StoreSubscriptionContentModelSchema;
	Receipt: Money2ReceiptSchema;
	PlatformSetting: Money2PlatformSettingSchema;
	AppleAppStoreSetting: Money2AppleAppStoreSettingSchema;
	GooglePlaySetting: Money2GooglePlaySettingSchema;
	FakeSetting: Money2FakeSettingSchema;
	WalletSummary: Money2WalletSummarySchema;
	DepositTransaction: Money2DepositTransactionSchema;
	VerifyReceiptEvent: Money2VerifyReceiptEventSchema;
	DepositEvent: Money2DepositEventSchema;
	WithdrawEvent: Money2WithdrawEventSchema;
	RefundEvent: Money2RefundEventSchema;
	AppleAppStoreVerifyReceiptEvent: Money2AppleAppStoreVerifyReceiptEventSchema;
	GooglePlayVerifyReceiptEvent: Money2GooglePlayVerifyReceiptEventSchema;
	AppleAppStoreContent: Money2AppleAppStoreContentSchema;
	GooglePlayContent: Money2GooglePlayContentSchema;
	AppleAppStoreSubscriptionContent: Money2AppleAppStoreSubscriptionContentSchema;
	GooglePlaySubscriptionContent: Money2GooglePlaySubscriptionContentSchema;
	GooglePlayRealtimeNotificationMessage: Money2GooglePlayRealtimeNotificationMessageSchema;
	GitHubCheckoutSetting: Money2GitHubCheckoutSettingSchema;
	ScriptSetting: Money2ScriptSettingSchema;
	NotificationSetting: Money2NotificationSettingSchema;
	MobileNotificationMessage: Money2MobileNotificationMessageSchema;
	LogSetting: Money2LogSettingSchema;
	TransactionSetting: Money2TransactionSettingSchema;
	TransactionSettingV2: Money2TransactionSettingV2Schema;
}
interface NewsNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly logSetting?: NewsLogSettingSchema;
}
interface NewsProgressSchema {
	readonly uploadToken: string;
	readonly generated: number;
	readonly patternCount: number;
}
interface NewsOutputSchema {
	readonly text: string;
}
interface NewsViewSchema {
	readonly contents?: readonly NewsContentSchema[];
	readonly removeContents?: readonly NewsContentSchema[];
}
interface NewsContentSchema {
	readonly section: string;
	readonly content: string;
	readonly frontMatter: string;
}
interface NewsNewsSchema {
	readonly section: string;
	readonly content: string;
	readonly title: string;
	readonly scheduleEventId?: string;
	readonly timestamp: string;
	readonly frontMatter: string;
}
interface NewsSetCookieRequestEntrySchema {
	readonly key: string;
	readonly value: string;
}
interface NewsLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface NewsGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface NewsModelRegistry {
	Namespace: NewsNamespaceSchema;
	Progress: NewsProgressSchema;
	Output: NewsOutputSchema;
	View: NewsViewSchema;
	Content: NewsContentSchema;
	News: NewsNewsSchema;
	SetCookieRequestEntry: NewsSetCookieRequestEntrySchema;
	LogSetting: NewsLogSettingSchema;
	GitHubCheckoutSetting: NewsGitHubCheckoutSettingSchema;
}
interface QuestNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: QuestTransactionSettingV2Schema;
	readonly startQuestScript?: QuestScriptSettingSchema;
	readonly completeQuestScript?: QuestScriptSettingSchema;
	readonly failedQuestScript?: QuestScriptSettingSchema;
	readonly logSetting?: QuestLogSettingSchema;
}
interface QuestContentsSchema {
	readonly metadata?: string;
	readonly completeAcquireActions?: readonly TransactionAcquireActionSchema[];
	readonly weight?: number;
}
interface QuestRewardSchema {
	readonly action: string;
	readonly request: string;
	readonly itemId: string;
	readonly value: number;
}
interface QuestProgressSchema {
	readonly progressId: string;
	readonly userId: string;
	readonly transactionId?: string;
	readonly questModelId: string;
	readonly randomSeed: number;
	readonly rewards?: readonly QuestRewardSchema[];
	readonly failedRewards?: readonly QuestRewardSchema[];
	readonly metadata?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface QuestCompletedQuestListSchema {
	readonly completedQuestListId: string;
	readonly userId: string;
	readonly questGroupName: string;
	readonly completeQuestNames?: readonly string[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface QuestQuestGroupModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly quests?: readonly QuestQuestModelSchema[];
	readonly challengePeriodEventId?: string;
}
interface QuestQuestModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly contents?: readonly QuestContentsSchema[];
	readonly challengePeriodEventId?: string;
	readonly firstCompleteAcquireActions?: readonly TransactionAcquireActionSchema[];
	readonly verifyActions?: readonly TransactionVerifyActionSchema[];
	readonly consumeActions?: readonly TransactionConsumeActionSchema[];
	readonly failedAcquireActions?: readonly TransactionAcquireActionSchema[];
	readonly premiseQuestNames?: readonly string[];
}
interface QuestAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface QuestConsumeActionSchema {
	readonly action: string;
	readonly request: string;
}
interface QuestVerifyActionSchema {
	readonly action: string;
	readonly request: string;
}
interface QuestConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface QuestVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface QuestConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface QuestAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface QuestTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface QuestGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface QuestScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface QuestLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface QuestTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface QuestTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface QuestModelRegistry {
	Namespace: QuestNamespaceSchema;
	Contents: QuestContentsSchema;
	Reward: QuestRewardSchema;
	Progress: QuestProgressSchema;
	CompletedQuestList: QuestCompletedQuestListSchema;
	QuestGroupModel: QuestQuestGroupModelSchema;
	QuestModel: QuestQuestModelSchema;
	AcquireAction: QuestAcquireActionSchema;
	ConsumeAction: QuestConsumeActionSchema;
	VerifyAction: QuestVerifyActionSchema;
	Config: QuestConfigSchema;
	VerifyActionResult: QuestVerifyActionResultSchema;
	ConsumeActionResult: QuestConsumeActionResultSchema;
	AcquireActionResult: QuestAcquireActionResultSchema;
	TransactionResult: QuestTransactionResultSchema;
	GitHubCheckoutSetting: QuestGitHubCheckoutSettingSchema;
	ScriptSetting: QuestScriptSettingSchema;
	LogSetting: QuestLogSettingSchema;
	TransactionSetting: QuestTransactionSettingSchema;
	TransactionSettingV2: QuestTransactionSettingV2Schema;
}
interface Ranking2NamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: Ranking2TransactionSettingV2Schema;
	readonly logSetting?: Ranking2LogSettingSchema;
}
interface Ranking2GlobalRankingModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly minimumValue?: number;
	readonly maximumValue?: number;
	readonly sum?: boolean;
	readonly orderDirection: string;
	readonly entryPeriodEventId?: string;
	readonly rankingRewards?: readonly Ranking2RankingRewardSchema[];
	readonly accessPeriodEventId?: string;
	readonly rewardCalculationIndex?: string;
}
interface Ranking2GlobalRankingScoreSchema {
	readonly globalRankingScoreId: string;
	readonly rankingName: string;
	readonly userId: string;
	readonly season: number;
	readonly score: number;
	readonly metadata?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface Ranking2GlobalRankingReceivedRewardSchema {
	readonly globalRankingReceivedRewardId: string;
	readonly rankingName: string;
	readonly userId: string;
	readonly season: number;
	readonly receivedAt?: string;
	readonly revision?: number;
}
interface Ranking2GlobalRankingDataSchema {
	readonly rankingName: string;
	readonly season: number;
	readonly userId: string;
	readonly index?: number;
	readonly rank?: number;
	readonly score: number;
	readonly metadata?: string;
	readonly invertUpdatedAt: number;
}
interface Ranking2ClusterRankingModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly clusterType: string;
	readonly minimumValue?: number;
	readonly maximumValue?: number;
	readonly sum?: boolean;
	readonly orderDirection: string;
	readonly entryPeriodEventId?: string;
	readonly rankingRewards?: readonly Ranking2RankingRewardSchema[];
	readonly accessPeriodEventId?: string;
	readonly rewardCalculationIndex?: string;
}
interface Ranking2ClusterRankingScoreSchema {
	readonly clusterRankingScoreId: string;
	readonly rankingName: string;
	readonly clusterName: string;
	readonly season: number;
	readonly userId: string;
	readonly score: number;
	readonly metadata?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface Ranking2ClusterRankingReceivedRewardSchema {
	readonly clusterRankingReceivedRewardId: string;
	readonly rankingName: string;
	readonly clusterName: string;
	readonly season: number;
	readonly userId: string;
	readonly receivedAt?: string;
	readonly revision?: number;
}
interface Ranking2ClusterRankingDataSchema {
	readonly rankingName: string;
	readonly clusterName: string;
	readonly season: number;
	readonly userId: string;
	readonly index?: number;
	readonly rank?: number;
	readonly score: number;
	readonly metadata?: string;
	readonly invertUpdatedAt: number;
}
interface Ranking2SubscribeRankingModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly minimumValue?: number;
	readonly maximumValue?: number;
	readonly sum?: boolean;
	readonly orderDirection: string;
	readonly entryPeriodEventId?: string;
	readonly accessPeriodEventId?: string;
}
interface Ranking2SubscribeSchema {
	readonly subscribeId: string;
	readonly rankingName: string;
	readonly userId: string;
	readonly targetUserIds?: readonly string[];
	readonly fromUserIds?: readonly string[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface Ranking2SubscribeRankingScoreSchema {
	readonly subscribeRankingScoreId: string;
	readonly rankingName: string;
	readonly season: number;
	readonly userId: string;
	readonly score: number;
	readonly metadata?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface Ranking2SubscribeRankingDataSchema {
	readonly subscribeRankingDataId: string;
	readonly rankingName: string;
	readonly season: number;
	readonly userId: string;
	readonly index?: number;
	readonly rank?: number;
	readonly scorerUserId: string;
	readonly score: number;
	readonly metadata?: string;
	readonly invertUpdatedAt: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface Ranking2SubscribeUserSchema {
	readonly rankingName: string;
	readonly userId: string;
	readonly targetUserId: string;
}
interface Ranking2RankingRewardSchema {
	readonly thresholdRank: number;
	readonly metadata?: string;
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
}
interface Ranking2VerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface Ranking2ConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface Ranking2AcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface Ranking2TransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface Ranking2TransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface Ranking2TransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface Ranking2LogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface Ranking2GitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface Ranking2AcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface Ranking2ConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface Ranking2ModelRegistry {
	Namespace: Ranking2NamespaceSchema;
	GlobalRankingModel: Ranking2GlobalRankingModelSchema;
	GlobalRankingScore: Ranking2GlobalRankingScoreSchema;
	GlobalRankingReceivedReward: Ranking2GlobalRankingReceivedRewardSchema;
	GlobalRankingData: Ranking2GlobalRankingDataSchema;
	ClusterRankingModel: Ranking2ClusterRankingModelSchema;
	ClusterRankingScore: Ranking2ClusterRankingScoreSchema;
	ClusterRankingReceivedReward: Ranking2ClusterRankingReceivedRewardSchema;
	ClusterRankingData: Ranking2ClusterRankingDataSchema;
	SubscribeRankingModel: Ranking2SubscribeRankingModelSchema;
	Subscribe: Ranking2SubscribeSchema;
	SubscribeRankingScore: Ranking2SubscribeRankingScoreSchema;
	SubscribeRankingData: Ranking2SubscribeRankingDataSchema;
	SubscribeUser: Ranking2SubscribeUserSchema;
	RankingReward: Ranking2RankingRewardSchema;
	VerifyActionResult: Ranking2VerifyActionResultSchema;
	ConsumeActionResult: Ranking2ConsumeActionResultSchema;
	AcquireActionResult: Ranking2AcquireActionResultSchema;
	TransactionResult: Ranking2TransactionResultSchema;
	TransactionSetting: Ranking2TransactionSettingSchema;
	TransactionSettingV2: Ranking2TransactionSettingV2Schema;
	LogSetting: Ranking2LogSettingSchema;
	GitHubCheckoutSetting: Ranking2GitHubCheckoutSettingSchema;
	AcquireAction: Ranking2AcquireActionSchema;
	Config: Ranking2ConfigSchema;
}
interface RealtimeNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: RealtimeTransactionSettingV2Schema;
	readonly serverType: string;
	readonly serverSpec: string;
	readonly syncSetting?: RealtimeSyncSettingSchema;
	readonly stateMachineSetting?: RealtimeStateMachineSettingSchema;
	readonly createNotification?: RealtimeNotificationSettingSchema;
	readonly logSetting?: RealtimeLogSettingSchema;
}
interface RealtimeRoomSchema {
	readonly name: string;
	readonly ipAddress?: string;
	readonly port?: number;
	readonly encryptionKey?: string;
	readonly notificationUserIds?: readonly string[];
}
interface RealtimeNotificationSettingSchema {
	readonly gatewayNamespaceId?: string;
	readonly enableTransferMobileNotification?: boolean;
	readonly sound?: string;
	readonly mobileNotificationMessages?: readonly RealtimeMobileNotificationMessageSchema[];
	readonly enable?: string;
}
interface RealtimeMobileNotificationMessageSchema {
	readonly locale?: string;
	readonly title?: string;
	readonly message?: string;
}
interface RealtimeLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface RealtimeTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface RealtimeTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface RealtimeSyncSettingSchema {
	readonly objectCatalog?: string;
}
interface RealtimeStateMachineSettingSchema {
	readonly namespaceId: string;
	readonly version?: number;
}
interface RealtimeModelRegistry {
	Namespace: RealtimeNamespaceSchema;
	Room: RealtimeRoomSchema;
	NotificationSetting: RealtimeNotificationSettingSchema;
	MobileNotificationMessage: RealtimeMobileNotificationMessageSchema;
	LogSetting: RealtimeLogSettingSchema;
	TransactionSetting: RealtimeTransactionSettingSchema;
	TransactionSettingV2: RealtimeTransactionSettingV2Schema;
	SyncSetting: RealtimeSyncSettingSchema;
	StateMachineSetting: RealtimeStateMachineSettingSchema;
}
interface ScheduleNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: ScheduleTransactionSettingV2Schema;
	readonly logSetting?: ScheduleLogSettingSchema;
}
interface ScheduleTriggerSchema {
	readonly triggerId: string;
	readonly name: string;
	readonly userId: string;
	readonly triggeredAt?: string;
	readonly expiresAt: string;
	readonly createdAt?: string;
	readonly revision?: number;
}
interface ScheduleEventSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly scheduleType: string;
	readonly absoluteBegin?: string;
	readonly absoluteEnd?: string;
	readonly relativeTriggerName?: string;
	readonly repeatSetting: ScheduleRepeatSettingSchema;
}
interface ScheduleRepeatSettingSchema {
	readonly repeatType?: string;
	readonly beginDayOfMonth?: number;
	readonly endDayOfMonth?: number;
	readonly beginDayOfWeek?: string;
	readonly endDayOfWeek?: string;
	readonly beginHour?: number;
	readonly endHour?: number;
	readonly anchorTimestamp?: string;
	readonly activeDays?: number;
	readonly inactiveDays?: number;
}
interface ScheduleRepeatScheduleSchema {
	readonly repeatCount: number;
	readonly currentRepeatStartAt?: string;
	readonly currentRepeatEndAt?: string;
	readonly lastRepeatEndAt?: string;
	readonly nextRepeatStartAt?: string;
}
interface ScheduleGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface ScheduleLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface ScheduleTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface ScheduleTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface ScheduleModelRegistry {
	Namespace: ScheduleNamespaceSchema;
	Trigger: ScheduleTriggerSchema;
	Event: ScheduleEventSchema;
	RepeatSetting: ScheduleRepeatSettingSchema;
	RepeatSchedule: ScheduleRepeatScheduleSchema;
	GitHubCheckoutSetting: ScheduleGitHubCheckoutSettingSchema;
	LogSetting: ScheduleLogSettingSchema;
	TransactionSetting: ScheduleTransactionSettingSchema;
	TransactionSettingV2: ScheduleTransactionSettingV2Schema;
}
interface ScriptNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: ScriptTransactionSettingV2Schema;
	readonly logSetting?: ScriptLogSettingSchema;
}
interface ScriptScriptSchema {
	readonly name: string;
	readonly description?: string;
	readonly script: string;
	readonly disableStringNumberToNumber?: boolean;
}
interface ScriptRandomStatusSchema {
	readonly seed: number;
	readonly used?: readonly ScriptRandomUsedSchema[];
}
interface ScriptRandomUsedSchema {
	readonly category: number;
	readonly used: number;
}
interface ScriptAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ScriptConsumeActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ScriptVerifyActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ScriptTransactionSchema {
	readonly transactionId?: string;
	readonly verifyActions?: readonly TransactionVerifyActionSchema[];
	readonly consumeActions?: readonly TransactionConsumeActionSchema[];
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
}
interface ScriptVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface ScriptConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface ScriptAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface ScriptTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface ScriptTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface ScriptTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface ScriptGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface ScriptLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface ScriptModelRegistry {
	Namespace: ScriptNamespaceSchema;
	Script: ScriptScriptSchema;
	RandomStatus: ScriptRandomStatusSchema;
	RandomUsed: ScriptRandomUsedSchema;
	AcquireAction: ScriptAcquireActionSchema;
	ConsumeAction: ScriptConsumeActionSchema;
	VerifyAction: ScriptVerifyActionSchema;
	Transaction: ScriptTransactionSchema;
	VerifyActionResult: ScriptVerifyActionResultSchema;
	ConsumeActionResult: ScriptConsumeActionResultSchema;
	AcquireActionResult: ScriptAcquireActionResultSchema;
	TransactionResult: ScriptTransactionResultSchema;
	TransactionSetting: ScriptTransactionSettingSchema;
	TransactionSettingV2: ScriptTransactionSettingV2Schema;
	GitHubCheckoutSetting: ScriptGitHubCheckoutSettingSchema;
	LogSetting: ScriptLogSettingSchema;
}
interface SeasonRatingNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: SeasonRatingTransactionSettingV2Schema;
	readonly logSetting?: SeasonRatingLogSettingSchema;
}
interface SeasonRatingMatchSessionSchema {
	readonly name?: string;
}
interface SeasonRatingSeasonModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly tiers: readonly SeasonRatingTierModelSchema[];
	readonly experienceModelId: string;
	readonly challengePeriodEventId?: string;
}
interface SeasonRatingTierModelSchema {
	readonly metadata?: string;
	readonly raiseRankBonus: number;
	readonly entryFee: number;
	readonly minimumChangePoint: number;
	readonly maximumChangePoint: number;
}
interface SeasonRatingVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface SeasonRatingConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface SeasonRatingAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface SeasonRatingTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface SeasonRatingTransactionSettingSchema {
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface SeasonRatingTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface SeasonRatingScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface SeasonRatingLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface SeasonRatingGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface SeasonRatingGameResultSchema {
	readonly rank: number;
	readonly userId: string;
}
interface SeasonRatingBallotSchema {
	readonly userId: string;
	readonly seasonName: string;
	readonly sessionName: string;
	readonly numberOfPlayer: number;
}
interface SeasonRatingSignedBallotSchema {
	readonly body: string;
	readonly signature: string;
}
interface SeasonRatingWrittenBallotSchema {
	readonly ballot: SeasonRatingBallotSchema;
	readonly gameResults?: readonly SeasonRatingGameResultSchema[];
}
interface SeasonRatingVoteSchema {
	readonly seasonName: string;
	readonly sessionName: string;
	readonly writtenBallots?: readonly SeasonRatingWrittenBallotSchema[];
}
interface SeasonRatingModelRegistry {
	Namespace: SeasonRatingNamespaceSchema;
	MatchSession: SeasonRatingMatchSessionSchema;
	SeasonModel: SeasonRatingSeasonModelSchema;
	TierModel: SeasonRatingTierModelSchema;
	VerifyActionResult: SeasonRatingVerifyActionResultSchema;
	ConsumeActionResult: SeasonRatingConsumeActionResultSchema;
	AcquireActionResult: SeasonRatingAcquireActionResultSchema;
	TransactionResult: SeasonRatingTransactionResultSchema;
	TransactionSetting: SeasonRatingTransactionSettingSchema;
	TransactionSettingV2: SeasonRatingTransactionSettingV2Schema;
	ScriptSetting: SeasonRatingScriptSettingSchema;
	LogSetting: SeasonRatingLogSettingSchema;
	GitHubCheckoutSetting: SeasonRatingGitHubCheckoutSettingSchema;
	GameResult: SeasonRatingGameResultSchema;
	Ballot: SeasonRatingBallotSchema;
	SignedBallot: SeasonRatingSignedBallotSchema;
	WrittenBallot: SeasonRatingWrittenBallotSchema;
	Vote: SeasonRatingVoteSchema;
}
interface SerialKeyNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: SerialKeyTransactionSettingV2Schema;
	readonly logSetting?: SerialKeyLogSettingSchema;
}
interface SerialKeyIssueJobSchema {
	readonly name?: string;
	readonly metadata?: string;
	readonly issuedCount?: number;
	readonly issueRequestCount: number;
	readonly status?: string;
}
interface SerialKeySerialKeySchema {
	readonly campaignModelName: string;
	readonly code: string;
	readonly metadata?: string;
	readonly status?: string;
	readonly usedUserId?: string;
	readonly usedAt?: string;
}
interface SerialKeyCampaignModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly enableCampaignCode?: boolean;
}
interface SerialKeyLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface SerialKeyTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface SerialKeyTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface SerialKeyGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface SerialKeyModelRegistry {
	Namespace: SerialKeyNamespaceSchema;
	IssueJob: SerialKeyIssueJobSchema;
	SerialKey: SerialKeySerialKeySchema;
	CampaignModel: SerialKeyCampaignModelSchema;
	LogSetting: SerialKeyLogSettingSchema;
	TransactionSetting: SerialKeyTransactionSettingSchema;
	TransactionSettingV2: SerialKeyTransactionSettingV2Schema;
	GitHubCheckoutSetting: SerialKeyGitHubCheckoutSettingSchema;
}
interface ShowcaseNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: ShowcaseTransactionSettingV2Schema;
	readonly buyScript?: ShowcaseScriptSettingSchema;
	readonly logSetting?: ShowcaseLogSettingSchema;
}
interface ShowcaseSalesItemSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly verifyActions?: readonly TransactionVerifyActionSchema[];
	readonly consumeActions?: readonly TransactionConsumeActionSchema[];
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
	readonly bonuses?: readonly ShowcaseBonusSchema[];
}
interface ShowcaseSalesItemGroupSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly salesItems?: readonly ShowcaseSalesItemSchema[];
}
interface ShowcaseShowcaseSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly salesPeriodEventId?: string;
	readonly displayItems?: readonly ShowcaseDisplayItemSchema[];
}
interface ShowcaseDisplayItemSchema {
	readonly displayItemId?: string;
	readonly type: string;
	readonly salesItem?: ShowcaseSalesItemSchema;
	readonly salesItemGroup?: ShowcaseSalesItemGroupSchema;
	readonly salesPeriodEventId?: string;
}
interface ShowcaseRandomShowcaseSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly maximumNumberOfChoice: number;
	readonly displayItems?: readonly ShowcaseRandomDisplayItemModelSchema[];
	readonly baseTimestamp: string;
	readonly resetIntervalHours: number;
	readonly salesPeriodEventId?: string;
}
interface ShowcasePurchaseCountSchema {
	readonly name: string;
	readonly count: number;
}
interface ShowcaseRandomDisplayItemSchema {
	readonly showcaseName: string;
	readonly name?: string;
	readonly metadata?: string;
	readonly verifyActions?: readonly TransactionVerifyActionSchema[];
	readonly consumeActions?: readonly TransactionConsumeActionSchema[];
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
	readonly currentPurchaseCount: number;
	readonly maximumPurchaseCount: number;
}
interface ShowcaseRandomDisplayItemModelSchema {
	readonly name?: string;
	readonly metadata?: string;
	readonly verifyActions?: readonly TransactionVerifyActionSchema[];
	readonly consumeActions?: readonly TransactionConsumeActionSchema[];
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
	readonly stock: number;
	readonly weight: number;
}
interface ShowcaseConsumeActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ShowcaseVerifyActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ShowcaseAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface ShowcaseBonusSchema {
	readonly routeKey: string;
	readonly acquireActions?: readonly TransactionAcquireActionSchema[];
}
interface ShowcaseConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface ShowcaseVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface ShowcaseConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface ShowcaseAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface ShowcaseTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface ShowcaseGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface ShowcaseLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface ShowcaseTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface ShowcaseTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface ShowcaseScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface ShowcaseModelRegistry {
	Namespace: ShowcaseNamespaceSchema;
	SalesItem: ShowcaseSalesItemSchema;
	SalesItemGroup: ShowcaseSalesItemGroupSchema;
	Showcase: ShowcaseShowcaseSchema;
	DisplayItem: ShowcaseDisplayItemSchema;
	RandomShowcase: ShowcaseRandomShowcaseSchema;
	PurchaseCount: ShowcasePurchaseCountSchema;
	RandomDisplayItem: ShowcaseRandomDisplayItemSchema;
	RandomDisplayItemModel: ShowcaseRandomDisplayItemModelSchema;
	ConsumeAction: ShowcaseConsumeActionSchema;
	VerifyAction: ShowcaseVerifyActionSchema;
	AcquireAction: ShowcaseAcquireActionSchema;
	Bonus: ShowcaseBonusSchema;
	Config: ShowcaseConfigSchema;
	VerifyActionResult: ShowcaseVerifyActionResultSchema;
	ConsumeActionResult: ShowcaseConsumeActionResultSchema;
	AcquireActionResult: ShowcaseAcquireActionResultSchema;
	TransactionResult: ShowcaseTransactionResultSchema;
	GitHubCheckoutSetting: ShowcaseGitHubCheckoutSettingSchema;
	LogSetting: ShowcaseLogSettingSchema;
	TransactionSetting: ShowcaseTransactionSettingSchema;
	TransactionSettingV2: ShowcaseTransactionSettingV2Schema;
	ScriptSetting: ShowcaseScriptSettingSchema;
}
interface SkillTreeNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: SkillTreeTransactionSettingV2Schema;
	readonly releaseScript?: SkillTreeScriptSettingSchema;
	readonly restrainScript?: SkillTreeScriptSettingSchema;
	readonly logSetting?: SkillTreeLogSettingSchema;
}
interface SkillTreeNodeModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly releaseVerifyActions?: readonly TransactionVerifyActionSchema[];
	readonly releaseConsumeActions?: readonly TransactionConsumeActionSchema[];
	readonly restrainReturnRate?: number;
	readonly premiseNodeNames?: readonly string[];
}
interface SkillTreeStatusSchema {
	readonly statusId: string;
	readonly userId: string;
	readonly propertyId: string;
	readonly releasedNodeNames?: readonly string[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface SkillTreeConfigSchema {
	readonly key: string;
	readonly value?: string;
}
interface SkillTreeConsumeActionSchema {
	readonly action: string;
	readonly request: string;
}
interface SkillTreeVerifyActionSchema {
	readonly action: string;
	readonly request: string;
}
interface SkillTreeAcquireActionSchema {
	readonly action: string;
	readonly request: string;
}
interface SkillTreeVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface SkillTreeConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface SkillTreeAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface SkillTreeTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface SkillTreeGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface SkillTreeScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface SkillTreeTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface SkillTreeTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface SkillTreeLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface SkillTreeModelRegistry {
	Namespace: SkillTreeNamespaceSchema;
	NodeModel: SkillTreeNodeModelSchema;
	Status: SkillTreeStatusSchema;
	Config: SkillTreeConfigSchema;
	ConsumeAction: SkillTreeConsumeActionSchema;
	VerifyAction: SkillTreeVerifyActionSchema;
	AcquireAction: SkillTreeAcquireActionSchema;
	VerifyActionResult: SkillTreeVerifyActionResultSchema;
	ConsumeActionResult: SkillTreeConsumeActionResultSchema;
	AcquireActionResult: SkillTreeAcquireActionResultSchema;
	TransactionResult: SkillTreeTransactionResultSchema;
	GitHubCheckoutSetting: SkillTreeGitHubCheckoutSettingSchema;
	ScriptSetting: SkillTreeScriptSettingSchema;
	TransactionSetting: SkillTreeTransactionSettingSchema;
	TransactionSettingV2: SkillTreeTransactionSettingV2Schema;
	LogSetting: SkillTreeLogSettingSchema;
}
interface StaminaNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: StaminaTransactionSettingV2Schema;
	readonly overflowTriggerScript?: string;
	readonly logSetting?: StaminaLogSettingSchema;
}
interface StaminaStaminaModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly recoverIntervalMinutes: number;
	readonly recoverValue?: number;
	readonly initialCapacity: number;
	readonly isOverflow: boolean;
	readonly maxCapacity?: number;
	readonly maxStaminaTable?: StaminaMaxStaminaTableSchema;
	readonly recoverIntervalTable?: StaminaRecoverIntervalTableSchema;
	readonly recoverValueTable?: StaminaRecoverValueTableSchema;
}
interface StaminaMaxStaminaTableSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly experienceModelId: string;
	readonly values: readonly number[];
}
interface StaminaRecoverIntervalTableSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly experienceModelId: string;
	readonly values: readonly number[];
}
interface StaminaRecoverValueTableSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly experienceModelId: string;
	readonly values: readonly number[];
}
interface StaminaStaminaSchema {
	readonly staminaId: string;
	readonly staminaName: string;
	readonly userId: string;
	readonly value: number;
	readonly maxValue: number;
	readonly recoverIntervalMinutes?: number;
	readonly recoverValue?: number;
	readonly overflowValue: number;
	readonly nextRecoverAt?: string;
	readonly lastRecoveredAt?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface StaminaGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface StaminaLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface StaminaScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface StaminaTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface StaminaTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface StaminaModelRegistry {
	Namespace: StaminaNamespaceSchema;
	StaminaModel: StaminaStaminaModelSchema;
	MaxStaminaTable: StaminaMaxStaminaTableSchema;
	RecoverIntervalTable: StaminaRecoverIntervalTableSchema;
	RecoverValueTable: StaminaRecoverValueTableSchema;
	Stamina: StaminaStaminaSchema;
	GitHubCheckoutSetting: StaminaGitHubCheckoutSettingSchema;
	LogSetting: StaminaLogSettingSchema;
	ScriptSetting: StaminaScriptSettingSchema;
	TransactionSetting: StaminaTransactionSettingSchema;
	TransactionSettingV2: StaminaTransactionSettingV2Schema;
}
interface StateMachineNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly supportSpeculativeExecution?: string;
	readonly transactionSettingV2?: StateMachineTransactionSettingV2Schema;
	readonly startScript?: StateMachineScriptSettingSchema;
	readonly passScript?: StateMachineScriptSettingSchema;
	readonly errorScript?: StateMachineScriptSettingSchema;
	readonly lowestStateMachineVersion?: string;
	readonly logSetting?: StateMachineLogSettingSchema;
}
interface StateMachineStatusSchema {
	readonly statusId: string;
	readonly userId: string;
	readonly name?: string;
	readonly stateMachineVersion: number;
	readonly enableSpeculativeExecution?: string;
	readonly stateMachineDefinition?: string;
	readonly randomStatus?: StateMachineRandomStatusSchema;
	readonly stacks?: readonly StateMachineStackEntrySchema[];
	readonly variables?: readonly StateMachineVariableSchema[];
	readonly status?: string;
	readonly lastError?: string;
	readonly transitionCount?: number;
	readonly createdAt?: string;
	readonly updatedAt?: string;
}
interface StateMachineStackEntrySchema {
	readonly stateMachineName: string;
	readonly taskName: string;
}
interface StateMachineVariableSchema {
	readonly stateMachineName: string;
	readonly value: string;
}
interface StateMachineTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface StateMachineTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface StateMachineEventSchema {
	readonly eventType: string;
	readonly changeStateEvent?: StateMachineChangeStateEventSchema;
	readonly emitEvent?: StateMachineEmitEventSchema;
}
interface StateMachineChangeStateEventSchema {
	readonly taskName: string;
	readonly hash: string;
	readonly timestamp: string;
}
interface StateMachineEmitEventSchema {
	readonly event: string;
	readonly parameters: string;
	readonly timestamp: string;
}
interface StateMachineRandomStatusSchema {
	readonly seed: number;
	readonly used?: readonly StateMachineRandomUsedSchema[];
}
interface StateMachineRandomUsedSchema {
	readonly category: number;
	readonly used: number;
}
interface StateMachineVerifyActionResultSchema {
	readonly action: string;
	readonly verifyRequest: string;
	readonly statusCode?: number;
	readonly verifyResult?: string;
}
interface StateMachineConsumeActionResultSchema {
	readonly action: string;
	readonly consumeRequest: string;
	readonly statusCode?: number;
	readonly consumeResult?: string;
}
interface StateMachineAcquireActionResultSchema {
	readonly action: string;
	readonly acquireRequest: string;
	readonly statusCode?: number;
	readonly acquireResult?: string;
}
interface StateMachineTransactionResultSchema {
	readonly transactionId: string;
	readonly verifyResults?: readonly unknown[];
	readonly consumeResults?: readonly unknown[];
	readonly acquireResults?: readonly unknown[];
}
interface StateMachineLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface StateMachineScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface StateMachineModelRegistry {
	Namespace: StateMachineNamespaceSchema;
	Status: StateMachineStatusSchema;
	StackEntry: StateMachineStackEntrySchema;
	Variable: StateMachineVariableSchema;
	TransactionSetting: StateMachineTransactionSettingSchema;
	TransactionSettingV2: StateMachineTransactionSettingV2Schema;
	Event: StateMachineEventSchema;
	ChangeStateEvent: StateMachineChangeStateEventSchema;
	EmitEvent: StateMachineEmitEventSchema;
	RandomStatus: StateMachineRandomStatusSchema;
	RandomUsed: StateMachineRandomUsedSchema;
	VerifyActionResult: StateMachineVerifyActionResultSchema;
	ConsumeActionResult: StateMachineConsumeActionResultSchema;
	AcquireActionResult: StateMachineAcquireActionResultSchema;
	TransactionResult: StateMachineTransactionResultSchema;
	LogSetting: StateMachineLogSettingSchema;
	ScriptSetting: StateMachineScriptSettingSchema;
}
interface VersionNamespaceSchema {
	readonly name: string;
	readonly description?: string;
	readonly transactionSettingV2?: VersionTransactionSettingV2Schema;
	readonly assumeUserId: string;
	readonly acceptVersionScript?: VersionScriptSettingSchema;
	readonly checkVersionTriggerScriptId?: string;
	readonly logSetting?: VersionLogSettingSchema;
}
interface VersionVersionModelSchema {
	readonly name: string;
	readonly metadata?: string;
	readonly scope: string;
	readonly type?: string;
	readonly currentVersion?: VersionVersionSchema;
	readonly warningVersion?: VersionVersionSchema;
	readonly errorVersion?: VersionVersionSchema;
	readonly scheduleVersions?: readonly VersionScheduleVersionSchema[];
	readonly needSignature?: boolean;
	readonly signatureKeyId?: string;
	readonly approveRequirement?: string;
}
interface VersionAcceptVersionSchema {
	readonly acceptVersionId: string;
	readonly versionName: string;
	readonly userId: string;
	readonly version: VersionVersionSchema;
	readonly status?: string;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly revision?: number;
}
interface VersionStatusSchema {
	readonly versionModel: VersionVersionModelSchema;
	readonly currentVersion?: VersionVersionSchema;
}
interface VersionTargetVersionSchema {
	readonly versionName: string;
	readonly body?: string;
	readonly signature?: string;
	readonly version?: VersionVersionSchema;
}
interface VersionSignTargetVersionSchema {
	readonly region: string;
	readonly namespaceName: string;
	readonly versionName: string;
	readonly version: VersionVersionSchema;
}
interface VersionScriptSettingSchema {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
interface VersionGitHubCheckoutSettingSchema {
	readonly apiKeyId: string;
	readonly repositoryName: string;
	readonly sourcePath: string;
	readonly referenceType: string;
	readonly commitHash?: string;
	readonly branchName?: string;
	readonly tagName?: string;
}
interface VersionLogSettingSchema {
	readonly loggingNamespaceId: string;
}
interface VersionTransactionSettingSchema {
	readonly enableAutoRun?: boolean;
	readonly enableAtomicCommit?: boolean;
	readonly transactionUseDistributor?: boolean;
	readonly commitScriptResultInUseDistributor?: boolean;
	readonly acquireActionUseJobQueue?: boolean;
	readonly enableSequentialExecution?: boolean;
	readonly distributorNamespaceId?: string;
	readonly queueNamespaceId?: string;
}
interface VersionTransactionSettingV2Schema {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
interface VersionVersionSchema {
	readonly major: number;
	readonly minor: number;
	readonly micro: number;
}
interface VersionScheduleVersionSchema {
	readonly currentVersion: VersionVersionSchema;
	readonly warningVersion: VersionVersionSchema;
	readonly errorVersion: VersionVersionSchema;
	readonly scheduleEventId?: string;
}
interface VersionModelRegistry {
	Namespace: VersionNamespaceSchema;
	VersionModel: VersionVersionModelSchema;
	AcceptVersion: VersionAcceptVersionSchema;
	Status: VersionStatusSchema;
	TargetVersion: VersionTargetVersionSchema;
	SignTargetVersion: VersionSignTargetVersionSchema;
	ScriptSetting: VersionScriptSettingSchema;
	GitHubCheckoutSetting: VersionGitHubCheckoutSettingSchema;
	LogSetting: VersionLogSettingSchema;
	TransactionSetting: VersionTransactionSettingSchema;
	TransactionSettingV2: VersionTransactionSettingV2Schema;
	Version: VersionVersionSchema;
	ScheduleVersion: VersionScheduleVersionSchema;
}
interface Gs2ServiceRegistry {
	account: AccountModelRegistry;
	adReward: AdRewardModelRegistry;
	auth: AuthModelRegistry;
	buff: BuffModelRegistry;
	chat: ChatModelRegistry;
	datastore: DatastoreModelRegistry;
	deploy: DeployModelRegistry;
	dictionary: DictionaryModelRegistry;
	distributor: DistributorModelRegistry;
	enchant: EnchantModelRegistry;
	enhance: EnhanceModelRegistry;
	exchange: ExchangeModelRegistry;
	experience: ExperienceModelRegistry;
	formation: FormationModelRegistry;
	friend: FriendModelRegistry;
	gateway: GatewayModelRegistry;
	grade: GradeModelRegistry;
	guild: GuildModelRegistry;
	idle: IdleModelRegistry;
	inbox: InboxModelRegistry;
	inventory: InventoryModelRegistry;
	limit: LimitModelRegistry;
	log: LogModelRegistry;
	loginReward: LoginRewardModelRegistry;
	lottery: LotteryModelRegistry;
	matchmaking: MatchmakingModelRegistry;
	mission: MissionModelRegistry;
	money2: Money2ModelRegistry;
	news: NewsModelRegistry;
	quest: QuestModelRegistry;
	ranking2: Ranking2ModelRegistry;
	realtime: RealtimeModelRegistry;
	schedule: ScheduleModelRegistry;
	script: ScriptModelRegistry;
	seasonRating: SeasonRatingModelRegistry;
	serialKey: SerialKeyModelRegistry;
	showcase: ShowcaseModelRegistry;
	skillTree: SkillTreeModelRegistry;
	stamina: StaminaModelRegistry;
	stateMachine: StateMachineModelRegistry;
	transaction: TransactionModelRegistry;
	version: VersionModelRegistry;
}
type Gs2ServiceName = keyof Gs2ServiceRegistry;
type ModelNameOf<S extends Gs2ServiceName> = keyof Gs2ServiceRegistry[S] & string;
type ModelSchemaOf<S extends Gs2ServiceName, M extends ModelNameOf<S>> = Gs2ServiceRegistry[S][M];
interface ModelRef<S extends Gs2ServiceName = Gs2ServiceName, M extends ModelNameOf<S> = ModelNameOf<S>> {
	readonly service: S;
	readonly modelName: M;
}
type UntypedBindingRecord = {
	readonly [parameterName: string]: BindingDirective | UntypedBindingRecord;
};
declare class MasterDataResourceBuilder<TSchema = Record<string, unknown>> {
	private _model?;
	private _mountPath?;
	private readonly _bindings;
	private _actionProgram;
	private readonly _actionPropertyBindings;
	private readonly _bindingErrors;
	private readonly _grnFieldMounts;
	private readonly _children;
	private _resolvedRef?;
	private _rowSelection?;
	private _resourceLink?;
	model<S extends Gs2ServiceName, M extends ModelNameOf<S>>(ref: ModelRef<S, M>): MasterDataResourceBuilder<ModelSchemaOf<S, M>>;
	mountLocal(typeName: string): this;
	mountLocal(reference: InlineElementReference): this;
	mountLocal(definition: DomainTypeDefinition): this;
	mountLocal(dependencyType: DependencyDomainTypeRef): this;
	/** Require the dependency declaration id because a single-package build cannot derive it from the name. */
	mountDependency(firstHopPackageId: string, domainTypeName: string, typeId: string): this;
	/** Resolve fan-out names against the child declaration at package compilation so authored forward references remain possible. */
	elementSourceFkFanout(childType: DomainTypeDefinition | string, fkPropertyName: string): this;
	/** Include every row of the mounted type under each ancestor. */
	rowScopeAllRows(): this;
	/** Select a specific ref on its owning domain type to scope rows to an ancestor. */
	rowScopeMatched(input: {
		readonly ancestor: MasterDataResourceReference;
		readonly direction: "childRefToAncestor" | "ancestorRefToChild";
		readonly refType: DomainTypeDefinition | DependencyDomainTypeRef | string;
		readonly propertyName: string;
	}): this;
	resourceLink(ref: MasterDataResourceReference | UserDataResourceReference): this;
	/** Require a published target id; this build can check dependency membership but cannot check target existence without the closure. */
	externalResourceLink(sourcePackageId: string, resourceKind: "masterData" | "userData", resourceId: string): this;
	grnFieldMount(parameterName: string, mountedResource: string | MasterDataResourceReference, keyMappings: readonly {
		readonly grnKeyName: string;
		readonly sourceKeyName: string;
	}[]): this;
	grnKeyBinding(parameterName: string, keyName: string, directive: BindingDirective): this;
	/** Typed catalog bindings and untyped paths must share flattening and error collection. */
	private _applyBindingRecord;
	bindings(record: BindingRecord<TSchema>): this;
	/** Keep an explicit untyped path for overlay names and JSON-blob fields that the catalog schema cannot express. */
	domainPropertyBindings(record: UntypedBindingRecord): this;
	actionProgram(program: DslActionProgramInput | undefined): this;
	actionPropertyProgram(propertyName: string, program: DslActionProgramInput | undefined): this;
	ref(): MasterDataResourceRef;
	addChild(definition: MasterDataResourceDefinition): this;
	addChild(define: (builder: MasterDataResourceBuilder) => void): this;
	addArrayChild(arrayProperty: ArrayPropertyNameOf<TSchema> | (string & {}), definition: MasterDataResourceDefinition): this;
	addArrayChild(arrayProperty: ArrayPropertyNameOf<TSchema> | (string & {}), define: (builder: MasterDataResourceBuilder) => void): this;
	/** Keep resourceRef as a draft because master-to-user links cannot resolve until both resource build passes finish. */
	private buildResourceLinksDraft;
}
export declare function defineMasterDataResource(define: (builder: MasterDataResourceBuilder<Record<string, unknown>>) => void): MasterDataResourceDefinition;
interface UiItemOptions {
	readonly name?: string;
	readonly description?: string;
}
type InheritedPropertySource = Extract<DslUiPropertySourceDto, {
	kind: "inheritedProperty";
}>;
declare function rowElementCondition<TSourceProps extends Record<string, FileDomainPropertyValueDto>>(parentType: DomainTypeDefinition<string, TSourceProps>, list: Extract<keyof TSourceProps, string> | InheritedPropertySource): DslUiConditionDto;
declare function rowElementCondition<TPublished extends Readonly<Record<string, string>>>(parentType: DependencyDomainTypeRef<TPublished>, list: Extract<keyof TPublished, string> | InheritedPropertySource): DslUiConditionDto;
declare function rowElementCondition(parentType: InlineElementReference, list: string | InheritedPropertySource): DslUiConditionDto;
/** Keep UI conditions separate from requirement conditions: these compare value sources rather than testing one property. */
export declare const UiCond: {
	readonly truthy: (source: DslUiValueSourceDto) => DslUiConditionDto;
	readonly eq: (lhs: DslUiValueSourceDto, rhs: DslUiValueSourceDto) => DslUiConditionDto;
	readonly neq: (lhs: DslUiValueSourceDto, rhs: DslUiValueSourceDto) => DslUiConditionDto;
	readonly gt: (lhs: DslUiValueSourceDto, rhs: DslUiValueSourceDto) => DslUiConditionDto;
	readonly gte: (lhs: DslUiValueSourceDto, rhs: DslUiValueSourceDto) => DslUiConditionDto;
	readonly lt: (lhs: DslUiValueSourceDto, rhs: DslUiValueSourceDto) => DslUiConditionDto;
	readonly lte: (lhs: DslUiValueSourceDto, rhs: DslUiValueSourceDto) => DslUiConditionDto;
	readonly and: (...children: readonly DslUiConditionDto[]) => DslUiConditionDto;
	readonly or: (...children: readonly DslUiConditionDto[]) => DslUiConditionDto;
	readonly not: (child: DslUiConditionDto) => DslUiConditionDto;
	/** Resolve the boolean list on the parent row's handler. Dependency refs require a hosted overlay; unavailable inherited names need a published property id and resolved-view validation. */
	readonly rowElement: typeof rowElementCondition;
};
declare class UiComponentBuilder<TProps extends Record<string, FileDomainPropertyValueDto> = Record<string, FileDomainPropertyValueDto>> {
	private readonly _items;
	prop(name: Extract<keyof TProps, string> | "id"): DslUiPropertySourceDto;
	/** Accept a published PropertyId when this package has no usable name for an inherited member. */
	inheritedProp(propertyId: string): InheritedPropertySource;
	lit(value: DslUiLiteralValue): DslUiValueSourceDto;
	/** Address the table through its owning type because prop is scoped to the component target. position is a value on that table's scale, not an element index. */
	bandLower<TSourceProps extends Record<string, FileDomainPropertyValueDto>>(sourceDomainType: DomainTypeDefinition<string, TSourceProps>, tablePropertyName: Extract<keyof TSourceProps, string>, position: DslUiPropertySourceDto): DslUiTableBandSourceDto;
	bandUpper<TSourceProps extends Record<string, FileDomainPropertyValueDto>>(sourceDomainType: DomainTypeDefinition<string, TSourceProps>, tablePropertyName: Extract<keyof TSourceProps, string>, position: DslUiPropertySourceDto): DslUiTableBandSourceDto;
	/** Use published dependency ids because this build cannot load the closure; single-entry and numeric-list checks then require the resolved view. */
	bandLowerById(sourceDomainTypeId: string, tablePropertyId: string, position: DslUiPropertySourceDto): DslUiTableBandSourceDto;
	bandUpperById(sourceDomainTypeId: string, tablePropertyId: string, position: DslUiPropertySourceDto): DslUiTableBandSourceDto;
	label(componentClassName: string, source: DslUiValueSourceDto, options?: UiItemOptions & {
		readonly fallbackText?: string;
	}): this;
	value(componentClassName: string, source: DslUiPropertySourceDto, options?: UiItemOptions): this;
	image(componentClassName: string, source: DslUiValueSourceDto, imageMode: DslUiImageMode, options?: UiItemOptions & {
		readonly fallback?: string;
	}): this;
	/** Keep min optional to preserve zero-based gauges while permitting the same table-band sources as max. */
	gauge(componentClassName: string, current: DslUiValueSourceDto, max: DslUiGaugeBoundSourceDto, options?: UiItemOptions & {
		readonly clamp?: boolean;
		readonly min?: DslUiGaugeBoundSourceDto;
	}): this;
	/** Key arguments by parameter name to prevent duplicate slots before lowering the method name to a stable action key. */
	buttonAction(componentClassName: string, methodName: string, args?: Readonly<Record<string, DslUiValueSourceDto>>, options?: UiItemOptions): this;
	activeToggle(componentClassName: string, condition: DslUiConditionDto, options?: UiItemOptions): this;
	interactable(componentClassName: string, condition: DslUiConditionDto, options?: UiItemOptions): this;
	private pushToggleItem;
	/** Key the source record by placeholder so each placeholder has at most one source slot. */
	templateLabel(componentClassName: string, template: string, sources: Readonly<Record<string, DslUiValueSourceDto>>, options?: UiItemOptions & {
		readonly fallbackText?: string;
	}): this;
}
declare class UserDataResourceBuilder<TSchema = Record<string, unknown>> {
	private _model?;
	/** Present once the link is declared; its ref is resolved at build, where an unresolvable ref is reported. */
	private _linkedMaster?;
	private _mountPath?;
	private readonly _bindings;
	private readonly _bindingErrors;
	private readonly _children;
	private _resolvedRef?;
	private _existencePropertyId?;
	private readonly _grnRefBindings;
	private readonly _decoderBindings;
	private readonly _projectionBindings;
	model<S extends Gs2ServiceName, M extends ModelNameOf<S>>(ref: ModelRef<S, M>): UserDataResourceBuilder<ModelSchemaOf<S, M>>;
	/** Capture refs before the graph is built; location and mount-dependent ids become available during resource construction. */
	ref(): UserDataResourceRef;
	/** Parent-key lookup starts at the linked master's ancestors, so a required parent-key binding on the linked resource itself is unavailable. The link supplies loader identity independently of the target DomainType mount. */
	linkedMasterResourceId(ref: MasterDataResourceReference): this;
	mountType(mountPath: DslDomainTypeMountPathDto): this;
	mountLocal(typeName: string): this;
	mountLocal(definition: DomainTypeDefinition): this;
	mountLocal(dependencyType: DependencyDomainTypeRef): this;
	/** Require the dependency declaration id because a single-package build cannot derive it from the name. */
	mountDependency(firstHopPackageId: string, domainTypeName: string, typeId: string): this;
	existenceProperty(propertyId: string): this;
	/** Retain child property names until compilation can resolve them against the child mount, independently of the resource's own mount. */
	arrayMembershipMapping(parameterName: string, child: DomainTypeDefinition | string | DslDomainTypeMountPathDto, targetKeyPropertyName: string, targetPropertyName: string): this;
	grnRefBinding(parameterName: string, grnFormat: string, keyMappings: readonly {
		readonly extractedKeyName: string;
		readonly target: DomainTypeDefinition | string | DslDomainTypeMountPathDto;
		readonly targetKeyPropertyName: string;
	}[]): this;
	/** Keep GS2 field names verbatim, but resolve destination names separately on the mount type and its inline element type. */
	modelArrayDecodeBinding(parameterName: string, target: DomainTypeDefinition | string | DslDomainTypeMountPathDto, targetListPropertyName: string, fieldMappings: readonly {
		readonly fieldName: string;
		readonly targetPropertyName: string;
	}[], idSourceField?: string): this;
	/** Keep GS2 selector fields verbatim; only destination property names resolve against the target mount. */
	elementProjectionBinding(parameterName: string, target: DomainTypeDefinition | string | DslDomainTypeMountPathDto, entries: readonly {
		readonly selectors: readonly {
			readonly fieldName: string;
			readonly value: JsonValue;
		}[];
		readonly projections: readonly {
			readonly fieldName: string;
			readonly targetPropertyName: string;
		}[];
	}[]): this;
	/** Resolve argument properties on the inline element type, independently of the mount's list property. */
	transformDecodeBinding(parameterName: string, target: DomainTypeDefinition | string | DslDomainTypeMountPathDto, targetListPropertyName: string, entries: readonly {
		readonly transformPackageId: string;
		readonly transformId: string;
		readonly arguments: readonly {
			readonly parameterName: string;
			readonly source: {
				readonly kind: "domainProperty";
				readonly propertyName: string;
			} | {
				readonly kind: "static";
				readonly value: JsonValue;
			};
		}[];
	}[]): this;
	/** Project the resolved key without replacing its own binding; resolve the destination name against the target mount. */
	keyProjectionBinding(parameterName: string, target: DomainTypeDefinition | string | DslDomainTypeMountPathDto, targetPropertyName: string): this;
	bindings(record: BindingRecord<TSchema>): this;
	addChild(definition: UserDataResourceDefinition): this;
	addChild(define: (builder: UserDataResourceBuilder) => void): this;
}
export declare function defineUserDataResource(define: (builder: UserDataResourceBuilder<Record<string, unknown>>) => void): UserDataResourceDefinition;
interface ScriptSettingShape {
	readonly triggerScriptId?: string;
	readonly doneTriggerTargetType?: string;
	readonly doneTriggerScriptId?: string;
	readonly doneTriggerQueueNamespaceId?: string;
}
/** Admit asynchronous script fields only for gs2_script so other targets cannot carry inapplicable script settings. */
export type ScriptSettingOptions = {
	readonly triggerScriptId?: string;
} & ({
	readonly doneTriggerTargetType?: "none" | "aws";
} | {
	readonly doneTriggerTargetType: "gs2_script";
	readonly doneTriggerScriptId: string;
	readonly doneTriggerQueueNamespaceId?: string;
});
/** Leave region and owner as placeholders so deployment supplies environment-specific coordinates. */
export declare function scriptGrn(namespaceName: string, scriptName: string): string;
/** Bind omitted fields explicitly too, so callers get a complete settings block without repeating null bindings. */
export declare function scriptSetting(options?: ScriptSettingOptions): Required<BindingRecord<ScriptSettingShape>>;
interface Fields {
	readonly name: string;
	readonly display?: LocalizedDisplaySnapshotDto;
	readonly propertyDisplay?: Readonly<Record<string, LocalizedDisplaySnapshotDto>>;
	readonly properties: readonly {
		readonly id: string;
		readonly def: PropertyDef;
	}[];
	readonly elementKey: readonly string[] | null;
	readonly actions: readonly {
		readonly methodName: string;
		readonly def: DelegatedActionDef;
	}[];
	readonly sort: {
		readonly key: string | null;
		readonly direction: "asc" | "desc";
	};
}
declare class InlineElementSchemaBuilder<TProps extends Record<string, FileDomainPropertyValueDto> = EmptyTypedProps> {
	private readonly fields;
	constructor(name: string, fields?: Fields);
	property<N extends string, V extends FileDomainPropertyValueDto, R extends boolean>(def: NonReservedPropertyDef<N, V, R>): InlineElementSchemaBuilder<NextDomainTypeProps<TProps, N, V, R>>;
	localizedDisplay(display: LocalizedDisplaySnapshotDto): InlineElementSchemaBuilder<TProps>;
	localizedProperties(propertyDisplay: LocalizedPropertyDisplayMap<TProps>): InlineElementSchemaBuilder<TProps>;
	elementKey(first: Extract<keyof TProps, string>, ...rest: readonly Extract<keyof TProps, string>[]): InlineElementSchemaBuilder<TProps>;
	sortBy(key: Extract<keyof TProps, string> | "id" | null, direction?: "asc" | "desc"): InlineElementSchemaBuilder<TProps>;
	delegatedAction(methodName: string, def: DelegatedActionDef): InlineElementSchemaBuilder<TProps>;
	private buildProperties;
}
export declare function defineInlineElement<TProps extends Record<string, FileDomainPropertyValueDto>>(name: string, define: (builder: InlineElementSchemaBuilder<EmptyTypedProps>) => InlineElementSchemaBuilder<TProps>): InlineElementSchemaBuilder<TProps>;
export declare const GS2: {
	readonly account: {
		readonly Namespace: {
			readonly service: "account";
			readonly modelName: "Namespace";
		};
		readonly Account: {
			readonly service: "account";
			readonly modelName: "Account";
		};
		readonly TakeOver: {
			readonly service: "account";
			readonly modelName: "TakeOver";
		};
		readonly PlatformId: {
			readonly service: "account";
			readonly modelName: "PlatformId";
		};
		readonly DataOwner: {
			readonly service: "account";
			readonly modelName: "DataOwner";
		};
		readonly TakeOverTypeModel: {
			readonly service: "account";
			readonly modelName: "TakeOverTypeModel";
		};
		readonly OpenIdConnectSetting: {
			readonly service: "account";
			readonly modelName: "OpenIdConnectSetting";
		};
		readonly ScopeValue: {
			readonly service: "account";
			readonly modelName: "ScopeValue";
		};
		readonly PlatformUser: {
			readonly service: "account";
			readonly modelName: "PlatformUser";
		};
		readonly BanStatus: {
			readonly service: "account";
			readonly modelName: "BanStatus";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "account";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "account";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "account";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "account";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "account";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly adReward: {
		readonly Namespace: {
			readonly service: "adReward";
			readonly modelName: "Namespace";
		};
		readonly Point: {
			readonly service: "adReward";
			readonly modelName: "Point";
		};
		readonly AdMob: {
			readonly service: "adReward";
			readonly modelName: "AdMob";
		};
		readonly UnityAd: {
			readonly service: "adReward";
			readonly modelName: "UnityAd";
		};
		readonly AppLovinMax: {
			readonly service: "adReward";
			readonly modelName: "AppLovinMax";
		};
		readonly ScriptSetting: {
			readonly service: "adReward";
			readonly modelName: "ScriptSetting";
		};
		readonly NotificationSetting: {
			readonly service: "adReward";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "adReward";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly LogSetting: {
			readonly service: "adReward";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "adReward";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "adReward";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly auth: {
		readonly AccessToken: {
			readonly service: "auth";
			readonly modelName: "AccessToken";
		};
	};
	readonly buff: {
		readonly Namespace: {
			readonly service: "buff";
			readonly modelName: "Namespace";
		};
		readonly BuffTargetModel: {
			readonly service: "buff";
			readonly modelName: "BuffTargetModel";
		};
		readonly BuffTargetAction: {
			readonly service: "buff";
			readonly modelName: "BuffTargetAction";
		};
		readonly BuffTargetGrn: {
			readonly service: "buff";
			readonly modelName: "BuffTargetGrn";
		};
		readonly BuffEntryModel: {
			readonly service: "buff";
			readonly modelName: "BuffEntryModel";
		};
		readonly OverrideBuffRate: {
			readonly service: "buff";
			readonly modelName: "OverrideBuffRate";
		};
		readonly ScriptSetting: {
			readonly service: "buff";
			readonly modelName: "ScriptSetting";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "buff";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "buff";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "buff";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "buff";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly chat: {
		readonly Namespace: {
			readonly service: "chat";
			readonly modelName: "Namespace";
		};
		readonly Room: {
			readonly service: "chat";
			readonly modelName: "Room";
		};
		readonly Message: {
			readonly service: "chat";
			readonly modelName: "Message";
		};
		readonly Subscribe: {
			readonly service: "chat";
			readonly modelName: "Subscribe";
		};
		readonly CategoryModel: {
			readonly service: "chat";
			readonly modelName: "CategoryModel";
		};
		readonly NotificationType: {
			readonly service: "chat";
			readonly modelName: "NotificationType";
		};
		readonly ScriptSetting: {
			readonly service: "chat";
			readonly modelName: "ScriptSetting";
		};
		readonly NotificationSetting: {
			readonly service: "chat";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "chat";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly LogSetting: {
			readonly service: "chat";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "chat";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "chat";
			readonly modelName: "TransactionSettingV2";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "chat";
			readonly modelName: "GitHubCheckoutSetting";
		};
	};
	readonly datastore: {
		readonly Namespace: {
			readonly service: "datastore";
			readonly modelName: "Namespace";
		};
		readonly ScriptSetting: {
			readonly service: "datastore";
			readonly modelName: "ScriptSetting";
		};
		readonly DataObject: {
			readonly service: "datastore";
			readonly modelName: "DataObject";
		};
		readonly DataObjectHistory: {
			readonly service: "datastore";
			readonly modelName: "DataObjectHistory";
		};
		readonly LogSetting: {
			readonly service: "datastore";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "datastore";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "datastore";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly deploy: {
		readonly Stack: {
			readonly service: "deploy";
			readonly modelName: "Stack";
		};
		readonly Resource: {
			readonly service: "deploy";
			readonly modelName: "Resource";
		};
		readonly Event: {
			readonly service: "deploy";
			readonly modelName: "Event";
		};
		readonly Output: {
			readonly service: "deploy";
			readonly modelName: "Output";
		};
		readonly OutputField: {
			readonly service: "deploy";
			readonly modelName: "OutputField";
		};
		readonly ChangeSet: {
			readonly service: "deploy";
			readonly modelName: "ChangeSet";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "deploy";
			readonly modelName: "GitHubCheckoutSetting";
		};
	};
	readonly dictionary: {
		readonly Namespace: {
			readonly service: "dictionary";
			readonly modelName: "Namespace";
		};
		readonly EntryModel: {
			readonly service: "dictionary";
			readonly modelName: "EntryModel";
		};
		readonly Entry: {
			readonly service: "dictionary";
			readonly modelName: "Entry";
		};
		readonly Like: {
			readonly service: "dictionary";
			readonly modelName: "Like";
		};
		readonly Config: {
			readonly service: "dictionary";
			readonly modelName: "Config";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "dictionary";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "dictionary";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "dictionary";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "dictionary";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "dictionary";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly distributor: {
		readonly Namespace: {
			readonly service: "distributor";
			readonly modelName: "Namespace";
		};
		readonly DistributorModel: {
			readonly service: "distributor";
			readonly modelName: "DistributorModel";
		};
		readonly StampSheetResult: {
			readonly service: "distributor";
			readonly modelName: "StampSheetResult";
		};
		readonly BatchRequestPayload: {
			readonly service: "distributor";
			readonly modelName: "BatchRequestPayload";
		};
		readonly BatchResultPayload: {
			readonly service: "distributor";
			readonly modelName: "BatchResultPayload";
		};
		readonly UserDataEntry: {
			readonly service: "distributor";
			readonly modelName: "UserDataEntry";
		};
		readonly AcquireAction: {
			readonly service: "distributor";
			readonly modelName: "AcquireAction";
		};
		readonly ConsumeAction: {
			readonly service: "distributor";
			readonly modelName: "ConsumeAction";
		};
		readonly VerifyAction: {
			readonly service: "distributor";
			readonly modelName: "VerifyAction";
		};
		readonly TransactionResult: {
			readonly service: "distributor";
			readonly modelName: "TransactionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "distributor";
			readonly modelName: "AcquireActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "distributor";
			readonly modelName: "ConsumeActionResult";
		};
		readonly VerifyActionResult: {
			readonly service: "distributor";
			readonly modelName: "VerifyActionResult";
		};
		readonly Config: {
			readonly service: "distributor";
			readonly modelName: "Config";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "distributor";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly DistributeResource: {
			readonly service: "distributor";
			readonly modelName: "DistributeResource";
		};
		readonly LogSetting: {
			readonly service: "distributor";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "distributor";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "distributor";
			readonly modelName: "TransactionSettingV2";
		};
		readonly NotificationSetting: {
			readonly service: "distributor";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "distributor";
			readonly modelName: "MobileNotificationMessage";
		};
	};
	readonly enchant: {
		readonly Namespace: {
			readonly service: "enchant";
			readonly modelName: "Namespace";
		};
		readonly BalanceParameterModel: {
			readonly service: "enchant";
			readonly modelName: "BalanceParameterModel";
		};
		readonly RarityParameterModel: {
			readonly service: "enchant";
			readonly modelName: "RarityParameterModel";
		};
		readonly BalanceParameterStatus: {
			readonly service: "enchant";
			readonly modelName: "BalanceParameterStatus";
		};
		readonly RarityParameterStatus: {
			readonly service: "enchant";
			readonly modelName: "RarityParameterStatus";
		};
		readonly BalanceParameterValueModel: {
			readonly service: "enchant";
			readonly modelName: "BalanceParameterValueModel";
		};
		readonly RarityParameterCountModel: {
			readonly service: "enchant";
			readonly modelName: "RarityParameterCountModel";
		};
		readonly RarityParameterValueModel: {
			readonly service: "enchant";
			readonly modelName: "RarityParameterValueModel";
		};
		readonly BalanceParameterValue: {
			readonly service: "enchant";
			readonly modelName: "BalanceParameterValue";
		};
		readonly RarityParameterValue: {
			readonly service: "enchant";
			readonly modelName: "RarityParameterValue";
		};
		readonly VerifyActionResult: {
			readonly service: "enchant";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "enchant";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "enchant";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "enchant";
			readonly modelName: "TransactionResult";
		};
		readonly Config: {
			readonly service: "enchant";
			readonly modelName: "Config";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "enchant";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "enchant";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "enchant";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "enchant";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "enchant";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly enhance: {
		readonly Namespace: {
			readonly service: "enhance";
			readonly modelName: "Namespace";
		};
		readonly RateModel: {
			readonly service: "enhance";
			readonly modelName: "RateModel";
		};
		readonly UnleashRateModel: {
			readonly service: "enhance";
			readonly modelName: "UnleashRateModel";
		};
		readonly Progress: {
			readonly service: "enhance";
			readonly modelName: "Progress";
		};
		readonly BonusRate: {
			readonly service: "enhance";
			readonly modelName: "BonusRate";
		};
		readonly Material: {
			readonly service: "enhance";
			readonly modelName: "Material";
		};
		readonly UnleashRateEntryModel: {
			readonly service: "enhance";
			readonly modelName: "UnleashRateEntryModel";
		};
		readonly UnleashRecipe: {
			readonly service: "enhance";
			readonly modelName: "UnleashRecipe";
		};
		readonly UnleashMaterial: {
			readonly service: "enhance";
			readonly modelName: "UnleashMaterial";
		};
		readonly UnleashIndividualMaterialSetting: {
			readonly service: "enhance";
			readonly modelName: "UnleashIndividualMaterialSetting";
		};
		readonly UnleashQuantityMaterialSetting: {
			readonly service: "enhance";
			readonly modelName: "UnleashQuantityMaterialSetting";
		};
		readonly UnleashMaterialSelection: {
			readonly service: "enhance";
			readonly modelName: "UnleashMaterialSelection";
		};
		readonly Config: {
			readonly service: "enhance";
			readonly modelName: "Config";
		};
		readonly VerifyActionResult: {
			readonly service: "enhance";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "enhance";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "enhance";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "enhance";
			readonly modelName: "TransactionResult";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "enhance";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "enhance";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "enhance";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "enhance";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "enhance";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly exchange: {
		readonly Namespace: {
			readonly service: "exchange";
			readonly modelName: "Namespace";
		};
		readonly RateModel: {
			readonly service: "exchange";
			readonly modelName: "RateModel";
		};
		readonly IncrementalRateModel: {
			readonly service: "exchange";
			readonly modelName: "IncrementalRateModel";
		};
		readonly Await: {
			readonly service: "exchange";
			readonly modelName: "Await";
		};
		readonly LogCost: {
			readonly service: "exchange";
			readonly modelName: "LogCost";
		};
		readonly LogRate: {
			readonly service: "exchange";
			readonly modelName: "LogRate";
		};
		readonly AcquireAction: {
			readonly service: "exchange";
			readonly modelName: "AcquireAction";
		};
		readonly ConsumeAction: {
			readonly service: "exchange";
			readonly modelName: "ConsumeAction";
		};
		readonly VerifyAction: {
			readonly service: "exchange";
			readonly modelName: "VerifyAction";
		};
		readonly Config: {
			readonly service: "exchange";
			readonly modelName: "Config";
		};
		readonly VerifyActionResult: {
			readonly service: "exchange";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "exchange";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "exchange";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "exchange";
			readonly modelName: "TransactionResult";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "exchange";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "exchange";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "exchange";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "exchange";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "exchange";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly experience: {
		readonly Namespace: {
			readonly service: "experience";
			readonly modelName: "Namespace";
		};
		readonly ExperienceModel: {
			readonly service: "experience";
			readonly modelName: "ExperienceModel";
		};
		readonly Threshold: {
			readonly service: "experience";
			readonly modelName: "Threshold";
		};
		readonly AcquireActionRate: {
			readonly service: "experience";
			readonly modelName: "AcquireActionRate";
		};
		readonly Status: {
			readonly service: "experience";
			readonly modelName: "Status";
		};
		readonly VerifyActionResult: {
			readonly service: "experience";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "experience";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "experience";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "experience";
			readonly modelName: "TransactionResult";
		};
		readonly AcquireAction: {
			readonly service: "experience";
			readonly modelName: "AcquireAction";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "experience";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "experience";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "experience";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "experience";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "experience";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly formation: {
		readonly Namespace: {
			readonly service: "formation";
			readonly modelName: "Namespace";
		};
		readonly FormModel: {
			readonly service: "formation";
			readonly modelName: "FormModel";
		};
		readonly MoldModel: {
			readonly service: "formation";
			readonly modelName: "MoldModel";
		};
		readonly PropertyFormModel: {
			readonly service: "formation";
			readonly modelName: "PropertyFormModel";
		};
		readonly Mold: {
			readonly service: "formation";
			readonly modelName: "Mold";
		};
		readonly Form: {
			readonly service: "formation";
			readonly modelName: "Form";
		};
		readonly PropertyForm: {
			readonly service: "formation";
			readonly modelName: "PropertyForm";
		};
		readonly Slot: {
			readonly service: "formation";
			readonly modelName: "Slot";
		};
		readonly SlotModel: {
			readonly service: "formation";
			readonly modelName: "SlotModel";
		};
		readonly SlotWithSignature: {
			readonly service: "formation";
			readonly modelName: "SlotWithSignature";
		};
		readonly AcquireAction: {
			readonly service: "formation";
			readonly modelName: "AcquireAction";
		};
		readonly Config: {
			readonly service: "formation";
			readonly modelName: "Config";
		};
		readonly VerifyActionResult: {
			readonly service: "formation";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "formation";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "formation";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "formation";
			readonly modelName: "TransactionResult";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "formation";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "formation";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "formation";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "formation";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "formation";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly friend: {
		readonly Namespace: {
			readonly service: "friend";
			readonly modelName: "Namespace";
		};
		readonly Profile: {
			readonly service: "friend";
			readonly modelName: "Profile";
		};
		readonly Follow: {
			readonly service: "friend";
			readonly modelName: "Follow";
		};
		readonly Friend: {
			readonly service: "friend";
			readonly modelName: "Friend";
		};
		readonly SendBox: {
			readonly service: "friend";
			readonly modelName: "SendBox";
		};
		readonly Inbox: {
			readonly service: "friend";
			readonly modelName: "Inbox";
		};
		readonly BlackList: {
			readonly service: "friend";
			readonly modelName: "BlackList";
		};
		readonly FollowUser: {
			readonly service: "friend";
			readonly modelName: "FollowUser";
		};
		readonly FriendUser: {
			readonly service: "friend";
			readonly modelName: "FriendUser";
		};
		readonly FriendRequest: {
			readonly service: "friend";
			readonly modelName: "FriendRequest";
		};
		readonly SendFriendRequest: {
			readonly service: "friend";
			readonly modelName: "SendFriendRequest";
		};
		readonly ReceiveFriendRequest: {
			readonly service: "friend";
			readonly modelName: "ReceiveFriendRequest";
		};
		readonly PublicProfile: {
			readonly service: "friend";
			readonly modelName: "PublicProfile";
		};
		readonly ScriptSetting: {
			readonly service: "friend";
			readonly modelName: "ScriptSetting";
		};
		readonly NotificationSetting: {
			readonly service: "friend";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "friend";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly LogSetting: {
			readonly service: "friend";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "friend";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "friend";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly gateway: {
		readonly Namespace: {
			readonly service: "gateway";
			readonly modelName: "Namespace";
		};
		readonly WebSocketSession: {
			readonly service: "gateway";
			readonly modelName: "WebSocketSession";
		};
		readonly FirebaseToken: {
			readonly service: "gateway";
			readonly modelName: "FirebaseToken";
		};
		readonly SendNotificationEntry: {
			readonly service: "gateway";
			readonly modelName: "SendNotificationEntry";
		};
		readonly MobileNotificationMessage: {
			readonly service: "gateway";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly LogSetting: {
			readonly service: "gateway";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "gateway";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "gateway";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly grade: {
		readonly Namespace: {
			readonly service: "grade";
			readonly modelName: "Namespace";
		};
		readonly GradeModel: {
			readonly service: "grade";
			readonly modelName: "GradeModel";
		};
		readonly Status: {
			readonly service: "grade";
			readonly modelName: "Status";
		};
		readonly DefaultGradeModel: {
			readonly service: "grade";
			readonly modelName: "DefaultGradeModel";
		};
		readonly GradeEntryModel: {
			readonly service: "grade";
			readonly modelName: "GradeEntryModel";
		};
		readonly AcquireActionRate: {
			readonly service: "grade";
			readonly modelName: "AcquireActionRate";
		};
		readonly AcquireAction: {
			readonly service: "grade";
			readonly modelName: "AcquireAction";
		};
		readonly VerifyActionResult: {
			readonly service: "grade";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "grade";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "grade";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "grade";
			readonly modelName: "TransactionResult";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "grade";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "grade";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "grade";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "grade";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "grade";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly guild: {
		readonly Namespace: {
			readonly service: "guild";
			readonly modelName: "Namespace";
		};
		readonly GuildModel: {
			readonly service: "guild";
			readonly modelName: "GuildModel";
		};
		readonly Guild: {
			readonly service: "guild";
			readonly modelName: "Guild";
		};
		readonly JoinedGuild: {
			readonly service: "guild";
			readonly modelName: "JoinedGuild";
		};
		readonly LastGuildMasterActivity: {
			readonly service: "guild";
			readonly modelName: "LastGuildMasterActivity";
		};
		readonly RoleModel: {
			readonly service: "guild";
			readonly modelName: "RoleModel";
		};
		readonly Member: {
			readonly service: "guild";
			readonly modelName: "Member";
		};
		readonly ReceiveMemberRequest: {
			readonly service: "guild";
			readonly modelName: "ReceiveMemberRequest";
		};
		readonly SendMemberRequest: {
			readonly service: "guild";
			readonly modelName: "SendMemberRequest";
		};
		readonly IgnoreUser: {
			readonly service: "guild";
			readonly modelName: "IgnoreUser";
		};
		readonly VerifyActionResult: {
			readonly service: "guild";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "guild";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "guild";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "guild";
			readonly modelName: "TransactionResult";
		};
		readonly TransactionSetting: {
			readonly service: "guild";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "guild";
			readonly modelName: "TransactionSettingV2";
		};
		readonly NotificationSetting: {
			readonly service: "guild";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "guild";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly ScriptSetting: {
			readonly service: "guild";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "guild";
			readonly modelName: "LogSetting";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "guild";
			readonly modelName: "GitHubCheckoutSetting";
		};
	};
	readonly idle: {
		readonly Namespace: {
			readonly service: "idle";
			readonly modelName: "Namespace";
		};
		readonly CategoryModel: {
			readonly service: "idle";
			readonly modelName: "CategoryModel";
		};
		readonly Status: {
			readonly service: "idle";
			readonly modelName: "Status";
		};
		readonly VerifyActionResult: {
			readonly service: "idle";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "idle";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "idle";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "idle";
			readonly modelName: "TransactionResult";
		};
		readonly Config: {
			readonly service: "idle";
			readonly modelName: "Config";
		};
		readonly AcquireAction: {
			readonly service: "idle";
			readonly modelName: "AcquireAction";
		};
		readonly AcquireActionList: {
			readonly service: "idle";
			readonly modelName: "AcquireActionList";
		};
		readonly TransactionSetting: {
			readonly service: "idle";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "idle";
			readonly modelName: "TransactionSettingV2";
		};
		readonly ScriptSetting: {
			readonly service: "idle";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "idle";
			readonly modelName: "LogSetting";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "idle";
			readonly modelName: "GitHubCheckoutSetting";
		};
	};
	readonly inbox: {
		readonly Namespace: {
			readonly service: "inbox";
			readonly modelName: "Namespace";
		};
		readonly Message: {
			readonly service: "inbox";
			readonly modelName: "Message";
		};
		readonly GlobalMessage: {
			readonly service: "inbox";
			readonly modelName: "GlobalMessage";
		};
		readonly Received: {
			readonly service: "inbox";
			readonly modelName: "Received";
		};
		readonly TimeSpan: {
			readonly service: "inbox";
			readonly modelName: "TimeSpan";
		};
		readonly AcquireAction: {
			readonly service: "inbox";
			readonly modelName: "AcquireAction";
		};
		readonly Config: {
			readonly service: "inbox";
			readonly modelName: "Config";
		};
		readonly VerifyActionResult: {
			readonly service: "inbox";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "inbox";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "inbox";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "inbox";
			readonly modelName: "TransactionResult";
		};
		readonly ScriptSetting: {
			readonly service: "inbox";
			readonly modelName: "ScriptSetting";
		};
		readonly NotificationSetting: {
			readonly service: "inbox";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "inbox";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "inbox";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "inbox";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "inbox";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "inbox";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly inventory: {
		readonly Namespace: {
			readonly service: "inventory";
			readonly modelName: "Namespace";
		};
		readonly InventoryModel: {
			readonly service: "inventory";
			readonly modelName: "InventoryModel";
		};
		readonly ItemModel: {
			readonly service: "inventory";
			readonly modelName: "ItemModel";
		};
		readonly SimpleInventoryModel: {
			readonly service: "inventory";
			readonly modelName: "SimpleInventoryModel";
		};
		readonly SimpleItemModel: {
			readonly service: "inventory";
			readonly modelName: "SimpleItemModel";
		};
		readonly BigInventoryModel: {
			readonly service: "inventory";
			readonly modelName: "BigInventoryModel";
		};
		readonly BigItemModel: {
			readonly service: "inventory";
			readonly modelName: "BigItemModel";
		};
		readonly Inventory: {
			readonly service: "inventory";
			readonly modelName: "Inventory";
		};
		readonly ItemSet: {
			readonly service: "inventory";
			readonly modelName: "ItemSet";
		};
		readonly ReferenceOf: {
			readonly service: "inventory";
			readonly modelName: "ReferenceOf";
		};
		readonly SimpleInventory: {
			readonly service: "inventory";
			readonly modelName: "SimpleInventory";
		};
		readonly SimpleItem: {
			readonly service: "inventory";
			readonly modelName: "SimpleItem";
		};
		readonly BigInventory: {
			readonly service: "inventory";
			readonly modelName: "BigInventory";
		};
		readonly BigItem: {
			readonly service: "inventory";
			readonly modelName: "BigItem";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "inventory";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "inventory";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "inventory";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "inventory";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "inventory";
			readonly modelName: "TransactionSettingV2";
		};
		readonly AcquireCount: {
			readonly service: "inventory";
			readonly modelName: "AcquireCount";
		};
		readonly ConsumeCount: {
			readonly service: "inventory";
			readonly modelName: "ConsumeCount";
		};
		readonly HeldCount: {
			readonly service: "inventory";
			readonly modelName: "HeldCount";
		};
	};
	readonly limit: {
		readonly Namespace: {
			readonly service: "limit";
			readonly modelName: "Namespace";
		};
		readonly Counter: {
			readonly service: "limit";
			readonly modelName: "Counter";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "limit";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "limit";
			readonly modelName: "LogSetting";
		};
		readonly ScriptSetting: {
			readonly service: "limit";
			readonly modelName: "ScriptSetting";
		};
		readonly TransactionSetting: {
			readonly service: "limit";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "limit";
			readonly modelName: "TransactionSettingV2";
		};
		readonly LimitModel: {
			readonly service: "limit";
			readonly modelName: "LimitModel";
		};
	};
	readonly log: {
		readonly Namespace: {
			readonly service: "log";
			readonly modelName: "Namespace";
		};
		readonly AccessLog: {
			readonly service: "log";
			readonly modelName: "AccessLog";
		};
		readonly AccessLogCount: {
			readonly service: "log";
			readonly modelName: "AccessLogCount";
		};
		readonly IssueStampSheetLog: {
			readonly service: "log";
			readonly modelName: "IssueStampSheetLog";
		};
		readonly IssueStampSheetLogCount: {
			readonly service: "log";
			readonly modelName: "IssueStampSheetLogCount";
		};
		readonly ExecuteStampSheetLog: {
			readonly service: "log";
			readonly modelName: "ExecuteStampSheetLog";
		};
		readonly ExecuteStampSheetLogCount: {
			readonly service: "log";
			readonly modelName: "ExecuteStampSheetLogCount";
		};
		readonly ExecuteStampTaskLog: {
			readonly service: "log";
			readonly modelName: "ExecuteStampTaskLog";
		};
		readonly ExecuteStampTaskLogCount: {
			readonly service: "log";
			readonly modelName: "ExecuteStampTaskLogCount";
		};
		readonly InGameLog: {
			readonly service: "log";
			readonly modelName: "InGameLog";
		};
		readonly AccessLogWithTelemetry: {
			readonly service: "log";
			readonly modelName: "AccessLogWithTelemetry";
		};
		readonly Insight: {
			readonly service: "log";
			readonly modelName: "Insight";
		};
		readonly FacetModel: {
			readonly service: "log";
			readonly modelName: "FacetModel";
		};
		readonly Dashboard: {
			readonly service: "log";
			readonly modelName: "Dashboard";
		};
		readonly AggregationConfig: {
			readonly service: "log";
			readonly modelName: "AggregationConfig";
		};
		readonly Facet: {
			readonly service: "log";
			readonly modelName: "Facet";
		};
		readonly FacetValueCount: {
			readonly service: "log";
			readonly modelName: "FacetValueCount";
		};
		readonly Label: {
			readonly service: "log";
			readonly modelName: "Label";
		};
		readonly LogEntry: {
			readonly service: "log";
			readonly modelName: "LogEntry";
		};
		readonly NumericRange: {
			readonly service: "log";
			readonly modelName: "NumericRange";
		};
		readonly TimeseriesMetadata: {
			readonly service: "log";
			readonly modelName: "TimeseriesMetadata";
		};
		readonly TimeseriesPoint: {
			readonly service: "log";
			readonly modelName: "TimeseriesPoint";
		};
		readonly TimeseriesValue: {
			readonly service: "log";
			readonly modelName: "TimeseriesValue";
		};
		readonly Trace: {
			readonly service: "log";
			readonly modelName: "Trace";
		};
		readonly MetricModel: {
			readonly service: "log";
			readonly modelName: "MetricModel";
		};
		readonly InGameLogTag: {
			readonly service: "log";
			readonly modelName: "InGameLogTag";
		};
	};
	readonly loginReward: {
		readonly Namespace: {
			readonly service: "loginReward";
			readonly modelName: "Namespace";
		};
		readonly BonusModel: {
			readonly service: "loginReward";
			readonly modelName: "BonusModel";
		};
		readonly Reward: {
			readonly service: "loginReward";
			readonly modelName: "Reward";
		};
		readonly ReceiveStatus: {
			readonly service: "loginReward";
			readonly modelName: "ReceiveStatus";
		};
		readonly ConsumeAction: {
			readonly service: "loginReward";
			readonly modelName: "ConsumeAction";
		};
		readonly AcquireAction: {
			readonly service: "loginReward";
			readonly modelName: "AcquireAction";
		};
		readonly VerifyAction: {
			readonly service: "loginReward";
			readonly modelName: "VerifyAction";
		};
		readonly Config: {
			readonly service: "loginReward";
			readonly modelName: "Config";
		};
		readonly VerifyActionResult: {
			readonly service: "loginReward";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "loginReward";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "loginReward";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "loginReward";
			readonly modelName: "TransactionResult";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "loginReward";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "loginReward";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "loginReward";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "loginReward";
			readonly modelName: "TransactionSettingV2";
		};
		readonly ScriptSetting: {
			readonly service: "loginReward";
			readonly modelName: "ScriptSetting";
		};
	};
	readonly lottery: {
		readonly Namespace: {
			readonly service: "lottery";
			readonly modelName: "Namespace";
		};
		readonly LotteryModel: {
			readonly service: "lottery";
			readonly modelName: "LotteryModel";
		};
		readonly PrizeTable: {
			readonly service: "lottery";
			readonly modelName: "PrizeTable";
		};
		readonly Probability: {
			readonly service: "lottery";
			readonly modelName: "Probability";
		};
		readonly Prize: {
			readonly service: "lottery";
			readonly modelName: "Prize";
		};
		readonly PrizeLimit: {
			readonly service: "lottery";
			readonly modelName: "PrizeLimit";
		};
		readonly DrawnPrize: {
			readonly service: "lottery";
			readonly modelName: "DrawnPrize";
		};
		readonly BoxItem: {
			readonly service: "lottery";
			readonly modelName: "BoxItem";
		};
		readonly BoxItems: {
			readonly service: "lottery";
			readonly modelName: "BoxItems";
		};
		readonly AcquireAction: {
			readonly service: "lottery";
			readonly modelName: "AcquireAction";
		};
		readonly Config: {
			readonly service: "lottery";
			readonly modelName: "Config";
		};
		readonly VerifyActionResult: {
			readonly service: "lottery";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "lottery";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "lottery";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "lottery";
			readonly modelName: "TransactionResult";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "lottery";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "lottery";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "lottery";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "lottery";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly matchmaking: {
		readonly Namespace: {
			readonly service: "matchmaking";
			readonly modelName: "Namespace";
		};
		readonly Gathering: {
			readonly service: "matchmaking";
			readonly modelName: "Gathering";
		};
		readonly RatingModel: {
			readonly service: "matchmaking";
			readonly modelName: "RatingModel";
		};
		readonly SeasonModel: {
			readonly service: "matchmaking";
			readonly modelName: "SeasonModel";
		};
		readonly SeasonGathering: {
			readonly service: "matchmaking";
			readonly modelName: "SeasonGathering";
		};
		readonly JoinedSeasonGathering: {
			readonly service: "matchmaking";
			readonly modelName: "JoinedSeasonGathering";
		};
		readonly ScriptSetting: {
			readonly service: "matchmaking";
			readonly modelName: "ScriptSetting";
		};
		readonly NotificationSetting: {
			readonly service: "matchmaking";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "matchmaking";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly LogSetting: {
			readonly service: "matchmaking";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "matchmaking";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "matchmaking";
			readonly modelName: "TransactionSettingV2";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "matchmaking";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly AttributeRange: {
			readonly service: "matchmaking";
			readonly modelName: "AttributeRange";
		};
		readonly CapacityOfRole: {
			readonly service: "matchmaking";
			readonly modelName: "CapacityOfRole";
		};
		readonly Attribute: {
			readonly service: "matchmaking";
			readonly modelName: "Attribute";
		};
		readonly Player: {
			readonly service: "matchmaking";
			readonly modelName: "Player";
		};
		readonly Rating: {
			readonly service: "matchmaking";
			readonly modelName: "Rating";
		};
		readonly GameResult: {
			readonly service: "matchmaking";
			readonly modelName: "GameResult";
		};
		readonly Ballot: {
			readonly service: "matchmaking";
			readonly modelName: "Ballot";
		};
		readonly SignedBallot: {
			readonly service: "matchmaking";
			readonly modelName: "SignedBallot";
		};
		readonly WrittenBallot: {
			readonly service: "matchmaking";
			readonly modelName: "WrittenBallot";
		};
		readonly Vote: {
			readonly service: "matchmaking";
			readonly modelName: "Vote";
		};
		readonly TimeSpan: {
			readonly service: "matchmaking";
			readonly modelName: "TimeSpan";
		};
	};
	readonly mission: {
		readonly Complete: {
			readonly service: "mission";
			readonly modelName: "Complete";
		};
		readonly NotificationSetting: {
			readonly service: "mission";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "mission";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly CounterScopeModel: {
			readonly service: "mission";
			readonly modelName: "CounterScopeModel";
		};
		readonly Namespace: {
			readonly service: "mission";
			readonly modelName: "Namespace";
		};
		readonly Counter: {
			readonly service: "mission";
			readonly modelName: "Counter";
		};
		readonly CounterModel: {
			readonly service: "mission";
			readonly modelName: "CounterModel";
		};
		readonly MissionGroupModel: {
			readonly service: "mission";
			readonly modelName: "MissionGroupModel";
		};
		readonly MissionTaskModel: {
			readonly service: "mission";
			readonly modelName: "MissionTaskModel";
		};
		readonly ScopedValue: {
			readonly service: "mission";
			readonly modelName: "ScopedValue";
		};
		readonly TargetCounterModel: {
			readonly service: "mission";
			readonly modelName: "TargetCounterModel";
		};
		readonly AcquireAction: {
			readonly service: "mission";
			readonly modelName: "AcquireAction";
		};
		readonly ConsumeAction: {
			readonly service: "mission";
			readonly modelName: "ConsumeAction";
		};
		readonly VerifyAction: {
			readonly service: "mission";
			readonly modelName: "VerifyAction";
		};
		readonly Config: {
			readonly service: "mission";
			readonly modelName: "Config";
		};
		readonly VerifyActionResult: {
			readonly service: "mission";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "mission";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "mission";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "mission";
			readonly modelName: "TransactionResult";
		};
		readonly LogSetting: {
			readonly service: "mission";
			readonly modelName: "LogSetting";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "mission";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "mission";
			readonly modelName: "ScriptSetting";
		};
		readonly TransactionSetting: {
			readonly service: "mission";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "mission";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly money2: {
		readonly Namespace: {
			readonly service: "money2";
			readonly modelName: "Namespace";
		};
		readonly Wallet: {
			readonly service: "money2";
			readonly modelName: "Wallet";
		};
		readonly SubscribeTransaction: {
			readonly service: "money2";
			readonly modelName: "SubscribeTransaction";
		};
		readonly SubscriptionStatus: {
			readonly service: "money2";
			readonly modelName: "SubscriptionStatus";
		};
		readonly StoreContentModel: {
			readonly service: "money2";
			readonly modelName: "StoreContentModel";
		};
		readonly StoreSubscriptionContentModel: {
			readonly service: "money2";
			readonly modelName: "StoreSubscriptionContentModel";
		};
		readonly Receipt: {
			readonly service: "money2";
			readonly modelName: "Receipt";
		};
		readonly PlatformSetting: {
			readonly service: "money2";
			readonly modelName: "PlatformSetting";
		};
		readonly AppleAppStoreSetting: {
			readonly service: "money2";
			readonly modelName: "AppleAppStoreSetting";
		};
		readonly GooglePlaySetting: {
			readonly service: "money2";
			readonly modelName: "GooglePlaySetting";
		};
		readonly FakeSetting: {
			readonly service: "money2";
			readonly modelName: "FakeSetting";
		};
		readonly WalletSummary: {
			readonly service: "money2";
			readonly modelName: "WalletSummary";
		};
		readonly DepositTransaction: {
			readonly service: "money2";
			readonly modelName: "DepositTransaction";
		};
		readonly VerifyReceiptEvent: {
			readonly service: "money2";
			readonly modelName: "VerifyReceiptEvent";
		};
		readonly DepositEvent: {
			readonly service: "money2";
			readonly modelName: "DepositEvent";
		};
		readonly WithdrawEvent: {
			readonly service: "money2";
			readonly modelName: "WithdrawEvent";
		};
		readonly RefundEvent: {
			readonly service: "money2";
			readonly modelName: "RefundEvent";
		};
		readonly AppleAppStoreVerifyReceiptEvent: {
			readonly service: "money2";
			readonly modelName: "AppleAppStoreVerifyReceiptEvent";
		};
		readonly GooglePlayVerifyReceiptEvent: {
			readonly service: "money2";
			readonly modelName: "GooglePlayVerifyReceiptEvent";
		};
		readonly AppleAppStoreContent: {
			readonly service: "money2";
			readonly modelName: "AppleAppStoreContent";
		};
		readonly GooglePlayContent: {
			readonly service: "money2";
			readonly modelName: "GooglePlayContent";
		};
		readonly AppleAppStoreSubscriptionContent: {
			readonly service: "money2";
			readonly modelName: "AppleAppStoreSubscriptionContent";
		};
		readonly GooglePlaySubscriptionContent: {
			readonly service: "money2";
			readonly modelName: "GooglePlaySubscriptionContent";
		};
		readonly GooglePlayRealtimeNotificationMessage: {
			readonly service: "money2";
			readonly modelName: "GooglePlayRealtimeNotificationMessage";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "money2";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "money2";
			readonly modelName: "ScriptSetting";
		};
		readonly NotificationSetting: {
			readonly service: "money2";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "money2";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly LogSetting: {
			readonly service: "money2";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "money2";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "money2";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly news: {
		readonly Namespace: {
			readonly service: "news";
			readonly modelName: "Namespace";
		};
		readonly Progress: {
			readonly service: "news";
			readonly modelName: "Progress";
		};
		readonly Output: {
			readonly service: "news";
			readonly modelName: "Output";
		};
		readonly View: {
			readonly service: "news";
			readonly modelName: "View";
		};
		readonly Content: {
			readonly service: "news";
			readonly modelName: "Content";
		};
		readonly News: {
			readonly service: "news";
			readonly modelName: "News";
		};
		readonly SetCookieRequestEntry: {
			readonly service: "news";
			readonly modelName: "SetCookieRequestEntry";
		};
		readonly LogSetting: {
			readonly service: "news";
			readonly modelName: "LogSetting";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "news";
			readonly modelName: "GitHubCheckoutSetting";
		};
	};
	readonly quest: {
		readonly Namespace: {
			readonly service: "quest";
			readonly modelName: "Namespace";
		};
		readonly Contents: {
			readonly service: "quest";
			readonly modelName: "Contents";
		};
		readonly Reward: {
			readonly service: "quest";
			readonly modelName: "Reward";
		};
		readonly Progress: {
			readonly service: "quest";
			readonly modelName: "Progress";
		};
		readonly CompletedQuestList: {
			readonly service: "quest";
			readonly modelName: "CompletedQuestList";
		};
		readonly QuestGroupModel: {
			readonly service: "quest";
			readonly modelName: "QuestGroupModel";
		};
		readonly QuestModel: {
			readonly service: "quest";
			readonly modelName: "QuestModel";
		};
		readonly AcquireAction: {
			readonly service: "quest";
			readonly modelName: "AcquireAction";
		};
		readonly ConsumeAction: {
			readonly service: "quest";
			readonly modelName: "ConsumeAction";
		};
		readonly VerifyAction: {
			readonly service: "quest";
			readonly modelName: "VerifyAction";
		};
		readonly Config: {
			readonly service: "quest";
			readonly modelName: "Config";
		};
		readonly VerifyActionResult: {
			readonly service: "quest";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "quest";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "quest";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "quest";
			readonly modelName: "TransactionResult";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "quest";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "quest";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "quest";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "quest";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "quest";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly ranking2: {
		readonly Namespace: {
			readonly service: "ranking2";
			readonly modelName: "Namespace";
		};
		readonly GlobalRankingModel: {
			readonly service: "ranking2";
			readonly modelName: "GlobalRankingModel";
		};
		readonly GlobalRankingScore: {
			readonly service: "ranking2";
			readonly modelName: "GlobalRankingScore";
		};
		readonly GlobalRankingReceivedReward: {
			readonly service: "ranking2";
			readonly modelName: "GlobalRankingReceivedReward";
		};
		readonly GlobalRankingData: {
			readonly service: "ranking2";
			readonly modelName: "GlobalRankingData";
		};
		readonly ClusterRankingModel: {
			readonly service: "ranking2";
			readonly modelName: "ClusterRankingModel";
		};
		readonly ClusterRankingScore: {
			readonly service: "ranking2";
			readonly modelName: "ClusterRankingScore";
		};
		readonly ClusterRankingReceivedReward: {
			readonly service: "ranking2";
			readonly modelName: "ClusterRankingReceivedReward";
		};
		readonly ClusterRankingData: {
			readonly service: "ranking2";
			readonly modelName: "ClusterRankingData";
		};
		readonly SubscribeRankingModel: {
			readonly service: "ranking2";
			readonly modelName: "SubscribeRankingModel";
		};
		readonly Subscribe: {
			readonly service: "ranking2";
			readonly modelName: "Subscribe";
		};
		readonly SubscribeRankingScore: {
			readonly service: "ranking2";
			readonly modelName: "SubscribeRankingScore";
		};
		readonly SubscribeRankingData: {
			readonly service: "ranking2";
			readonly modelName: "SubscribeRankingData";
		};
		readonly SubscribeUser: {
			readonly service: "ranking2";
			readonly modelName: "SubscribeUser";
		};
		readonly RankingReward: {
			readonly service: "ranking2";
			readonly modelName: "RankingReward";
		};
		readonly VerifyActionResult: {
			readonly service: "ranking2";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "ranking2";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "ranking2";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "ranking2";
			readonly modelName: "TransactionResult";
		};
		readonly TransactionSetting: {
			readonly service: "ranking2";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "ranking2";
			readonly modelName: "TransactionSettingV2";
		};
		readonly LogSetting: {
			readonly service: "ranking2";
			readonly modelName: "LogSetting";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "ranking2";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly AcquireAction: {
			readonly service: "ranking2";
			readonly modelName: "AcquireAction";
		};
		readonly Config: {
			readonly service: "ranking2";
			readonly modelName: "Config";
		};
	};
	readonly realtime: {
		readonly Namespace: {
			readonly service: "realtime";
			readonly modelName: "Namespace";
		};
		readonly Room: {
			readonly service: "realtime";
			readonly modelName: "Room";
		};
		readonly NotificationSetting: {
			readonly service: "realtime";
			readonly modelName: "NotificationSetting";
		};
		readonly MobileNotificationMessage: {
			readonly service: "realtime";
			readonly modelName: "MobileNotificationMessage";
		};
		readonly LogSetting: {
			readonly service: "realtime";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "realtime";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "realtime";
			readonly modelName: "TransactionSettingV2";
		};
		readonly SyncSetting: {
			readonly service: "realtime";
			readonly modelName: "SyncSetting";
		};
		readonly StateMachineSetting: {
			readonly service: "realtime";
			readonly modelName: "StateMachineSetting";
		};
	};
	readonly schedule: {
		readonly Namespace: {
			readonly service: "schedule";
			readonly modelName: "Namespace";
		};
		readonly Trigger: {
			readonly service: "schedule";
			readonly modelName: "Trigger";
		};
		readonly Event: {
			readonly service: "schedule";
			readonly modelName: "Event";
		};
		readonly RepeatSetting: {
			readonly service: "schedule";
			readonly modelName: "RepeatSetting";
		};
		readonly RepeatSchedule: {
			readonly service: "schedule";
			readonly modelName: "RepeatSchedule";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "schedule";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "schedule";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "schedule";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "schedule";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly script: {
		readonly Namespace: {
			readonly service: "script";
			readonly modelName: "Namespace";
		};
		readonly Script: {
			readonly service: "script";
			readonly modelName: "Script";
		};
		readonly RandomStatus: {
			readonly service: "script";
			readonly modelName: "RandomStatus";
		};
		readonly RandomUsed: {
			readonly service: "script";
			readonly modelName: "RandomUsed";
		};
		readonly AcquireAction: {
			readonly service: "script";
			readonly modelName: "AcquireAction";
		};
		readonly ConsumeAction: {
			readonly service: "script";
			readonly modelName: "ConsumeAction";
		};
		readonly VerifyAction: {
			readonly service: "script";
			readonly modelName: "VerifyAction";
		};
		readonly Transaction: {
			readonly service: "script";
			readonly modelName: "Transaction";
		};
		readonly VerifyActionResult: {
			readonly service: "script";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "script";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "script";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "script";
			readonly modelName: "TransactionResult";
		};
		readonly TransactionSetting: {
			readonly service: "script";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "script";
			readonly modelName: "TransactionSettingV2";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "script";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "script";
			readonly modelName: "LogSetting";
		};
	};
	readonly seasonRating: {
		readonly Namespace: {
			readonly service: "seasonRating";
			readonly modelName: "Namespace";
		};
		readonly MatchSession: {
			readonly service: "seasonRating";
			readonly modelName: "MatchSession";
		};
		readonly SeasonModel: {
			readonly service: "seasonRating";
			readonly modelName: "SeasonModel";
		};
		readonly TierModel: {
			readonly service: "seasonRating";
			readonly modelName: "TierModel";
		};
		readonly VerifyActionResult: {
			readonly service: "seasonRating";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "seasonRating";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "seasonRating";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "seasonRating";
			readonly modelName: "TransactionResult";
		};
		readonly TransactionSetting: {
			readonly service: "seasonRating";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "seasonRating";
			readonly modelName: "TransactionSettingV2";
		};
		readonly ScriptSetting: {
			readonly service: "seasonRating";
			readonly modelName: "ScriptSetting";
		};
		readonly LogSetting: {
			readonly service: "seasonRating";
			readonly modelName: "LogSetting";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "seasonRating";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly GameResult: {
			readonly service: "seasonRating";
			readonly modelName: "GameResult";
		};
		readonly Ballot: {
			readonly service: "seasonRating";
			readonly modelName: "Ballot";
		};
		readonly SignedBallot: {
			readonly service: "seasonRating";
			readonly modelName: "SignedBallot";
		};
		readonly WrittenBallot: {
			readonly service: "seasonRating";
			readonly modelName: "WrittenBallot";
		};
		readonly Vote: {
			readonly service: "seasonRating";
			readonly modelName: "Vote";
		};
	};
	readonly serialKey: {
		readonly Namespace: {
			readonly service: "serialKey";
			readonly modelName: "Namespace";
		};
		readonly IssueJob: {
			readonly service: "serialKey";
			readonly modelName: "IssueJob";
		};
		readonly SerialKey: {
			readonly service: "serialKey";
			readonly modelName: "SerialKey";
		};
		readonly CampaignModel: {
			readonly service: "serialKey";
			readonly modelName: "CampaignModel";
		};
		readonly LogSetting: {
			readonly service: "serialKey";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "serialKey";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "serialKey";
			readonly modelName: "TransactionSettingV2";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "serialKey";
			readonly modelName: "GitHubCheckoutSetting";
		};
	};
	readonly showcase: {
		readonly Namespace: {
			readonly service: "showcase";
			readonly modelName: "Namespace";
		};
		readonly SalesItem: {
			readonly service: "showcase";
			readonly modelName: "SalesItem";
		};
		readonly SalesItemGroup: {
			readonly service: "showcase";
			readonly modelName: "SalesItemGroup";
		};
		readonly Showcase: {
			readonly service: "showcase";
			readonly modelName: "Showcase";
		};
		readonly DisplayItem: {
			readonly service: "showcase";
			readonly modelName: "DisplayItem";
		};
		readonly RandomShowcase: {
			readonly service: "showcase";
			readonly modelName: "RandomShowcase";
		};
		readonly PurchaseCount: {
			readonly service: "showcase";
			readonly modelName: "PurchaseCount";
		};
		readonly RandomDisplayItem: {
			readonly service: "showcase";
			readonly modelName: "RandomDisplayItem";
		};
		readonly RandomDisplayItemModel: {
			readonly service: "showcase";
			readonly modelName: "RandomDisplayItemModel";
		};
		readonly ConsumeAction: {
			readonly service: "showcase";
			readonly modelName: "ConsumeAction";
		};
		readonly VerifyAction: {
			readonly service: "showcase";
			readonly modelName: "VerifyAction";
		};
		readonly AcquireAction: {
			readonly service: "showcase";
			readonly modelName: "AcquireAction";
		};
		readonly Bonus: {
			readonly service: "showcase";
			readonly modelName: "Bonus";
		};
		readonly Config: {
			readonly service: "showcase";
			readonly modelName: "Config";
		};
		readonly VerifyActionResult: {
			readonly service: "showcase";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "showcase";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "showcase";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "showcase";
			readonly modelName: "TransactionResult";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "showcase";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "showcase";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "showcase";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "showcase";
			readonly modelName: "TransactionSettingV2";
		};
		readonly ScriptSetting: {
			readonly service: "showcase";
			readonly modelName: "ScriptSetting";
		};
	};
	readonly skillTree: {
		readonly Namespace: {
			readonly service: "skillTree";
			readonly modelName: "Namespace";
		};
		readonly NodeModel: {
			readonly service: "skillTree";
			readonly modelName: "NodeModel";
		};
		readonly Status: {
			readonly service: "skillTree";
			readonly modelName: "Status";
		};
		readonly Config: {
			readonly service: "skillTree";
			readonly modelName: "Config";
		};
		readonly ConsumeAction: {
			readonly service: "skillTree";
			readonly modelName: "ConsumeAction";
		};
		readonly VerifyAction: {
			readonly service: "skillTree";
			readonly modelName: "VerifyAction";
		};
		readonly AcquireAction: {
			readonly service: "skillTree";
			readonly modelName: "AcquireAction";
		};
		readonly VerifyActionResult: {
			readonly service: "skillTree";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "skillTree";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "skillTree";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "skillTree";
			readonly modelName: "TransactionResult";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "skillTree";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly ScriptSetting: {
			readonly service: "skillTree";
			readonly modelName: "ScriptSetting";
		};
		readonly TransactionSetting: {
			readonly service: "skillTree";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "skillTree";
			readonly modelName: "TransactionSettingV2";
		};
		readonly LogSetting: {
			readonly service: "skillTree";
			readonly modelName: "LogSetting";
		};
	};
	readonly stamina: {
		readonly Namespace: {
			readonly service: "stamina";
			readonly modelName: "Namespace";
		};
		readonly StaminaModel: {
			readonly service: "stamina";
			readonly modelName: "StaminaModel";
		};
		readonly MaxStaminaTable: {
			readonly service: "stamina";
			readonly modelName: "MaxStaminaTable";
		};
		readonly RecoverIntervalTable: {
			readonly service: "stamina";
			readonly modelName: "RecoverIntervalTable";
		};
		readonly RecoverValueTable: {
			readonly service: "stamina";
			readonly modelName: "RecoverValueTable";
		};
		readonly Stamina: {
			readonly service: "stamina";
			readonly modelName: "Stamina";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "stamina";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "stamina";
			readonly modelName: "LogSetting";
		};
		readonly ScriptSetting: {
			readonly service: "stamina";
			readonly modelName: "ScriptSetting";
		};
		readonly TransactionSetting: {
			readonly service: "stamina";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "stamina";
			readonly modelName: "TransactionSettingV2";
		};
	};
	readonly stateMachine: {
		readonly Namespace: {
			readonly service: "stateMachine";
			readonly modelName: "Namespace";
		};
		readonly Status: {
			readonly service: "stateMachine";
			readonly modelName: "Status";
		};
		readonly StackEntry: {
			readonly service: "stateMachine";
			readonly modelName: "StackEntry";
		};
		readonly Variable: {
			readonly service: "stateMachine";
			readonly modelName: "Variable";
		};
		readonly TransactionSetting: {
			readonly service: "stateMachine";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "stateMachine";
			readonly modelName: "TransactionSettingV2";
		};
		readonly Event: {
			readonly service: "stateMachine";
			readonly modelName: "Event";
		};
		readonly ChangeStateEvent: {
			readonly service: "stateMachine";
			readonly modelName: "ChangeStateEvent";
		};
		readonly EmitEvent: {
			readonly service: "stateMachine";
			readonly modelName: "EmitEvent";
		};
		readonly RandomStatus: {
			readonly service: "stateMachine";
			readonly modelName: "RandomStatus";
		};
		readonly RandomUsed: {
			readonly service: "stateMachine";
			readonly modelName: "RandomUsed";
		};
		readonly VerifyActionResult: {
			readonly service: "stateMachine";
			readonly modelName: "VerifyActionResult";
		};
		readonly ConsumeActionResult: {
			readonly service: "stateMachine";
			readonly modelName: "ConsumeActionResult";
		};
		readonly AcquireActionResult: {
			readonly service: "stateMachine";
			readonly modelName: "AcquireActionResult";
		};
		readonly TransactionResult: {
			readonly service: "stateMachine";
			readonly modelName: "TransactionResult";
		};
		readonly LogSetting: {
			readonly service: "stateMachine";
			readonly modelName: "LogSetting";
		};
		readonly ScriptSetting: {
			readonly service: "stateMachine";
			readonly modelName: "ScriptSetting";
		};
	};
	readonly transaction: {
		readonly AcquireAction: {
			readonly service: "transaction";
			readonly modelName: "AcquireAction";
		};
		readonly ConsumeAction: {
			readonly service: "transaction";
			readonly modelName: "ConsumeAction";
		};
		readonly VerifyAction: {
			readonly service: "transaction";
			readonly modelName: "VerifyAction";
		};
		readonly Config: {
			readonly service: "transaction";
			readonly modelName: "Config";
		};
	};
	readonly version: {
		readonly Namespace: {
			readonly service: "version";
			readonly modelName: "Namespace";
		};
		readonly VersionModel: {
			readonly service: "version";
			readonly modelName: "VersionModel";
		};
		readonly AcceptVersion: {
			readonly service: "version";
			readonly modelName: "AcceptVersion";
		};
		readonly Status: {
			readonly service: "version";
			readonly modelName: "Status";
		};
		readonly TargetVersion: {
			readonly service: "version";
			readonly modelName: "TargetVersion";
		};
		readonly SignTargetVersion: {
			readonly service: "version";
			readonly modelName: "SignTargetVersion";
		};
		readonly ScriptSetting: {
			readonly service: "version";
			readonly modelName: "ScriptSetting";
		};
		readonly GitHubCheckoutSetting: {
			readonly service: "version";
			readonly modelName: "GitHubCheckoutSetting";
		};
		readonly LogSetting: {
			readonly service: "version";
			readonly modelName: "LogSetting";
		};
		readonly TransactionSetting: {
			readonly service: "version";
			readonly modelName: "TransactionSetting";
		};
		readonly TransactionSettingV2: {
			readonly service: "version";
			readonly modelName: "TransactionSettingV2";
		};
		readonly Version: {
			readonly service: "version";
			readonly modelName: "Version";
		};
		readonly ScheduleVersion: {
			readonly service: "version";
			readonly modelName: "ScheduleVersion";
		};
	};
};
interface TransactionSettingV2Shape {
	readonly distributorNamespaceId?: string;
	readonly enableParallelExecution?: boolean;
}
/**
 * Require every output binding so an omitted override still yields a complete settings block. Actions run one at a
 * time by default, so an action can work on what an earlier one in the same transaction wrote.
 */
export declare function transactionSettingV2(overrides?: BindingRecord<TransactionSettingV2Shape>): Required<BindingRecord<TransactionSettingV2Shape>>;
/**
 * A resource reference for callbacks that receive one. Declared as an alias so the published declarations do not
 * present the internal class as a value export, which the runtime does not provide.
 */
type MasterDataResourceRef$1 = MasterDataResourceRef;
/** Localized label, description, and unit that display entries and property metadata accept. */
export type LocalizedDisplay = LocalizedDisplaySnapshotDto;
/**
 * Result of `PackageBuilder.build()`. A package module exports it for GS2 Studio, which validates the package and
 * writes its files; the DSL defines no members on it.
 */
export type BuiltPackage = object;
type PropertyValues = Record<string, FileDomainPropertyValueDto>;
/**
 * Authoring surface of `definePackage(...)`. Each member returns the builder so calls chain until `build()`.
 * Members are function-typed properties so parameters are compared strictly against the internal builder.
 */
export interface PackageBuilder {
	readonly display: (entry: PackageDisplayEntryDraft) => PackageBuilder;
	readonly displayType: (definition: DomainTypeDefinition | string, entry: PackageDisplayEntryDraft) => PackageBuilder;
	readonly dependency: (packageId: string, spec: string) => PackageBuilder;
	readonly domainType: {
		(name: string, cb: (builder: DomainTypeBuilder) => void): PackageBuilder;
		(definition: DomainTypeDefinition): PackageBuilder;
	};
	readonly overlayTypeSpec: (name: string, options: OverlayTypeSpecOptions) => PackageBuilder;
	readonly delegatedAction: {
		<TName extends string>(definition: DomainTypeDefinition<TName, PropertyValues> | TName, methodName: string, def: DelegatedActionDef): PackageBuilder;
		(dependencyType: DependencyDomainTypeRef, methodName: string, def: DelegatedActionDef): PackageBuilder;
	};
	readonly instance: {
		(typeName: string, id: string, values: PropertyValues): PackageBuilder;
		<TName extends string, TProps extends PropertyValues>(definition: LocalDomainTypeDefinition<TName, TProps>, id: string, values: TProps): PackageBuilder;
		(dependencyType: DependencyDomainTypeRef, id: string, values: PropertyValues): PackageBuilder;
	};
	readonly overlayInstance: (typeNameOrDefinition: string | OverlayDomainTypeDefinition | DependencyDomainTypeRef, sourceInstanceId: string, options?: {
		readonly overrides?: PropertyValues;
		readonly suppressed?: boolean;
	}) => PackageBuilder;
	readonly actionTransform: (name: string, cb: (builder: ActionTransformBuilder) => void) => PackageBuilder;
	readonly uiComponent: {
		(typeName: string, cb: (ui: UiComponentBuilder) => void): PackageBuilder;
		(reference: InlineElementReference, cb: (ui: UiComponentBuilder) => void): PackageBuilder;
		<TName extends string, TProps extends PropertyValues, TPublished extends PropertyValues>(definition: DomainTypeDefinition<TName, TProps, TPublished>, cb: (ui: UiComponentBuilder<TProps & TPublished>) => void): PackageBuilder;
		<TPublished extends Readonly<Record<string, string>>>(dependencyType: DependencyDomainTypeRef<TPublished>, cb: (ui: UiComponentBuilder<{
			readonly [K in keyof TPublished & string]: FileDomainPropertyValueDto;
		}>) => void): PackageBuilder;
	};
	readonly codeTemplate: (outputFileName: string, templateSource: string) => PackageBuilder;
	readonly masterDataResource: {
		(cb: (builder: MasterDataResourceBuilder) => void): PackageBuilder;
		(definition: MasterDataResourceDefinition): PackageBuilder;
	};
	readonly userDataResource: {
		(cb: (builder: UserDataResourceBuilder) => void): PackageBuilder;
		(definition: UserDataResourceDefinition): PackageBuilder;
	};
	readonly build: () => BuiltPackage;
}
export declare const definePackage: (name: string, version: string) => PackageBuilder;

export {
	MasterDataResourceRef$1 as MasterDataResourceRef,
};

export {};
