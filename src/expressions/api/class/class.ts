import type {
	DeclarationExpression, ExpressionEventPath,
	ExpressionNode, NodeDeserializer, VisitNodeType
} from '../expression.js';
import { ClassScope } from '../../scope/scope.js';
import { __decorate } from 'tslib';
import { Stack } from '../../scope/stack.js';
import { AbstractExpressionNode } from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';
import { Identifier } from '../definition/values.js';
import { FunctionExpression } from '../definition/function.js';
import { BlockStatement } from '../statement/control/block.js';
import { TypeOf } from '../utils.js';
import { Decorator } from './decorator.js';
import { CallExpression } from '../computing/call.js';

const TEMP_CLASS_NAME: unique symbol = Symbol('TempClassName');
const STACK: unique symbol = Symbol('Stack');

const GET_PARAMETERS: unique symbol = Symbol('GetParameters');

const CONSTRUCTOR: unique symbol = Symbol('Constructor');
const PRIVATE_SYMBOL: unique symbol = Symbol('Private');
const INSTANCE_PRIVATE_SYMBOL: unique symbol = Symbol('InstancePrivate');
const STATIC_INITIALIZATION_BLOCK: unique symbol = Symbol('StaticBlock');

interface ClassConstructor {
	/**
	 * A reference to the prototype.
	 */
	readonly prototype: ClassInstance;

	[GET_PARAMETERS](args: any[]): any[];
	[STATIC_INITIALIZATION_BLOCK]: Function[];
	[PRIVATE_SYMBOL]: Record<PropertyKey, any>;
	[INSTANCE_PRIVATE_SYMBOL]: Record<PropertyKey, any>;
	[CONSTRUCTOR]: Function;
	[key: string]: any;
}

declare var ClassInstance: ClassConstructor;
interface ClassInstance {
	[PRIVATE_SYMBOL]: Record<PropertyKey, any>;
	[STACK]: Stack;
	[key: string]: any;
}


/**
 * A `super` pseudo-expression.
 */
@Deserializer('Super')
export class Super extends AbstractExpressionNode {
	static INSTANCE = new Super();
	static fromJSON(node: Super): Super {
		return Super.INSTANCE;
	}
	constructor() {
		super();
	}
	set(stack: Stack, value: any) {
		throw new Error('Super.#set() Method not implemented.');
	}
	get(stack: Stack, thisContext?: any) {
		return stack.get('super');
	}
	dependency(computed?: true): ExpressionNode[] {
		throw new Error('Super.#dependency() Method not implemented.');
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		throw new Error('Super.#dependencyPath() Method not implemented.');
	}

	toString(): string {
		return `super`;
	}
	toJson(): { [key: string]: any; } {
		return {};
	}
}

/**
 * MetaProperty node represents
 * - `new.target` meta property in ES2015.
 * - `import.meta` meta property in ES2030.
 * 
 * In the future, it will represent other meta properties as well.
 */
@Deserializer('MetaProperty')
export class MetaProperty extends AbstractExpressionNode {

	public static NewTarget = new MetaProperty(new Identifier('new'), new Identifier('target'));

	public static ImportMeta = new MetaProperty(new Identifier('import'), new Identifier('meta'));

	private static getJsonName(identifier: ExpressionNode): string {
		return Reflect.get(identifier, 'name');
	}

	static fromJSON(node: MetaProperty, deserializer: NodeDeserializer<any>): MetaProperty {
		if (MetaProperty.getJsonName(node.meta) === 'new' && MetaProperty.getJsonName(node.property) === 'target') {
			return MetaProperty.NewTarget;
		}
		else if (MetaProperty.getJsonName(node.meta) === 'import' && MetaProperty.getJsonName(node.property) === 'meta') {
			return MetaProperty.ImportMeta;
		}
		return new MetaProperty(
			deserializer(node.meta),
			deserializer(node.property)
		);
	}
	static visit(node: MetaProperty, visitNode: VisitNodeType): void {
		visitNode(node.meta);
		visitNode(node.property);
	}
	constructor(private meta: Identifier, private property: Identifier) {
		super();
	}
	getMeta() {
		return this.meta;
	}
	getProperty() {
		return this.property;
	}
	get(stack: Stack) {
		const metaRef = this.meta.get(stack);
		if (metaRef === undefined || metaRef === null) {
			throw new TypeError(`Cannot read meta property '${this.property.toString()}' of ${metaRef}, reading [${this.toString()}]`);
		}
		return this.property.get(stack, metaRef);
	}
	set(stack: Stack, value: any) {
		throw new Error(`MetaProperty#set() has no implementation.`);
	}
	dependency(computed?: true | undefined): ExpressionNode[] {
		return [];
	}
	dependencyPath(computed?: true | undefined): ExpressionEventPath[] {
		return [];
	}
	toString(): string {
		return `${this.meta.toString()}.${this.property.toString()}`;
	}
	toJson(): { [key: string]: any; } {
		return {
			meta: this.meta.toJSON(),
			property: this.property.toJSON(),
		};
	}
}

/**
 * A private identifier refers to private class elements. For a private name `#a`, its name is `a`.
 */
@Deserializer('PrivateIdentifier')
export class PrivateIdentifier extends Identifier {
	static fromJSON(node: PrivateIdentifier): PrivateIdentifier {
		return new PrivateIdentifier(
			node.name as string
		);
	}
	get(stack: Stack, thisContext: ClassInstance) {
		return thisContext[PRIVATE_SYMBOL][this.name];
	}
	toString(): string {
		return `#${this.name}`;
	}
}

/**
 * A static block static { } is a block statement serving as an additional static initializer.
 */
@Deserializer('StaticBlock')
export class StaticBlock extends BlockStatement {
	static fromJSON(node: StaticBlock, deserializer: NodeDeserializer<any>): StaticBlock {
		return new StaticBlock(deserializer(node.body));
	}
	constructor(body: ExpressionNode[]) {
		super(body);
	}
	get(stack: Stack, classConstructor?: ClassConstructor): void {
		const constructor = classConstructor!;
		constructor[STATIC_INITIALIZATION_BLOCK].push(
			() => {
				const scope = new ClassScope(constructor);
				stack.pushScope(scope);
				try {
					super.get(stack);
				} finally {
					stack.clearTo(scope);
				}
			}
		);
	}
	toString(): string {
		return `static ${super.toString()}`;
	}
	toJson(): object {
		return {
			body: this.body.map(node => node.toJSON())
		};
	}
}

export abstract class AbstractDefinition extends AbstractExpressionNode {
	protected 'static': boolean;
	constructor(
		protected key: ExpressionNode | PrivateIdentifier,
		protected decorators: Decorator[],
		protected computed: boolean,
		isStatic: boolean,
		protected value?: ExpressionNode,) {
		super();
		this.static = isStatic;
	}
	getKey() {
		return this.key;
	}
	getValue() {
		return this.value;
	}
	isComputed() {
		return this.computed;
	}
	isStatic() {
		return this.static;
	}
	getDecorators() {
		return this.decorators;
	}
	set(stack: Stack, value: any) {
		throw new Error('AbstractDefinition.#set() Method not implemented.');
	}
	dependency(computed?: true): ExpressionNode[] {
		return [];
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return [];
	}
	getTarget(classConstructor: ClassConstructor) {
		return this.static
			? (this.key instanceof PrivateIdentifier ? classConstructor[PRIVATE_SYMBOL] : classConstructor)
			: (this.key instanceof PrivateIdentifier ? classConstructor[INSTANCE_PRIVATE_SYMBOL] : classConstructor.prototype);
	}
	getKeyName(stack: Stack) {
		switch (true) {
			case this.computed:
				return (this.key as ExpressionNode).get(stack);
			case this.key instanceof Identifier:
			case this.key instanceof PrivateIdentifier:
				return (this.key as Identifier | PrivateIdentifier).getName() as string;
			default: return this.key.toString();
		}
	}
	get(stack: Stack, classConstructor: ClassConstructor): void {
		const target = this.getTarget(classConstructor);
		const scope = stack.pushBlockScopeFor(target);
		this.afterClassConstruct(stack, classConstructor, target);
		stack.clearTo(scope);
	}
	abstract afterClassConstruct(stack: Stack, classConstructor: ClassConstructor, target: Record<PropertyKey, any>): void;
	abstract toString(): string;
	abstract toJson(): { [key: string]: any; };
}

export type MethodDefinitionKind = 'constructor' | 'method' | 'set' | 'get';

/**
 * - When key is a PrivateIdentifier, computed must be false and kind can not be "constructor".
 */
@Deserializer('MethodDefinition')
export class MethodDefinition extends AbstractDefinition {
	static fromJSON(node: MethodDefinition, deserializer: NodeDeserializer<any>): MethodDefinition {
		return new MethodDefinition(
			node.kind,
			deserializer(node.key),
			deserializer(node.value),
			node.decorators.map(deserializer),
			node.computed,
			node.static
		);
	}
	static visit(node: MethodDefinition, visitNode: VisitNodeType): void {
		visitNode(node.key);
		visitNode(node.value);
		node.decorators.forEach(visitNode);
	}
	declare protected value: FunctionExpression;
	afterInstanceConstruct: any;
	constructor(
		private kind: MethodDefinitionKind,
		key: ExpressionNode | PrivateIdentifier,
		value: FunctionExpression,
		decorators: Decorator[],
		computed: boolean,
		isStatic: boolean) {
		super(key, decorators, computed, isStatic, value);
	}
	getKind() {
		return this.kind;
	}
	getValue() {
		return this.value;
	}
	afterClassConstruct(stack: Stack, classConstructor: ClassConstructor, target: Record<PropertyKey, any>): void {
		if (this.kind === 'constructor') {
			this.initConstructor(stack, classConstructor);
			return;
		}
		const name: string = this.getKeyName(stack);
		const value = this.value?.get(stack);
		switch (this.kind) {
			case 'method':
				target[name] = value;
				break;
			case 'set':
				Object.defineProperty(target, name, {
					configurable: true,
					enumerable: false,
					set: value as (v: any) => void,
				});
				break;
			case 'get':
				Object.defineProperty(target, name, {
					configurable: true,
					enumerable: false,
					get: value as () => any,
				});
				break;
			default:
				break;
		}
		const decorators = this.decorators.map(decorator => decorator.get(stack));
		decorators.length && __decorate(decorators, target, name, null);
	}
	private initConstructor(stack: Stack, classConstructor: ClassConstructor) {
		const body = (this.value.getBody() as BlockStatement).getBody();
		let superIndex = body
			.findIndex(call => call instanceof CallExpression && Super.INSTANCE === call.getCallee());
		if (superIndex === -1) {
			superIndex = body.length;
		}
		const superCall = body[superIndex] as CallExpression | undefined;

		const blockBeforeSuper = new BlockStatement(body.slice(0, superIndex));
		const blockAfterSuper = new BlockStatement(body.slice(superIndex + 1));

		if (superCall) {
			classConstructor[GET_PARAMETERS] = function (this: ClassConstructor, params: any[]) {
				const scope = stack.pushBlockScope();
				this.value.setParameter(stack, params);
				blockBeforeSuper.get(stack);
				const parameters = superCall.getCallParameters(stack);
				stack.clearTo(scope);
				return parameters;
			};
		}

		classConstructor[CONSTRUCTOR] = function (this: ClassInstance, params: any[]) {
			const scope = this[STACK].pushBlockScope();
			blockAfterSuper.get(this[STACK]);
			stack.clearTo(scope);
		};
	}
	toString(): string {
		let str = this.decorators.map(decorator => decorator.toString()).join(' ');
		if (str.length) {
			str += ' ';
		}
		if (this.static) {
			str += 'static ';
		}
		const methodName = this.key.toString();
		switch (this.kind) {
			case 'get':
				str += 'get ' + methodName;
				break;
			case 'set':
				str += 'set ' + methodName;
				break;
			case 'method':
				if (this.value.getAsync() && this.value.getGenerator()) {
					str += 'async *';
				}
				else if (this.value.getAsync()) {
					str += 'async ';
				} else if (this.value.getGenerator()) {
					str += '*';
				}
				str += methodName;
				break;
			case 'constructor':
				str += 'constructor';
				break;
			default:
				break;
		}
		str += this.value.paramsAndBodyToString();
		return str;
	}
	toJson(): { [key: string]: any; } {
		return {
			kind: this.kind,
			key: this.key.toJSON(),
			value: this.value.toJSON(),
			decorators: this.decorators.map(decorator => decorator.toJSON()),
			computed: this.computed,
			static: this.static,
		};
	}
}



/**
 * - When key is a PrivateIdentifier, computed must be false.
 */
@Deserializer('PropertyDefinition')
export class PropertyDefinition extends AbstractDefinition {
	static fromJSON(node: PropertyDefinition, deserializer: NodeDeserializer<any>): PropertyDefinition {
		return new PropertyDefinition(
			deserializer(node.key),
			node.decorators.map(deserializer),
			node.computed,
			node.static,
			node.value && deserializer(node.value)
		);
	}
	static visit(node: PropertyDefinition, visitNode: VisitNodeType): void {
		visitNode(node.key);
		node.value && visitNode(node.value);
	}
	constructor(
		key: ExpressionNode | PrivateIdentifier,
		decorators: Decorator[],
		computed: boolean,
		isStatic: boolean,
		value?: ExpressionNode) {
		super(key, decorators, computed, isStatic, value);
	}
	afterClassConstruct(stack: Stack, classConstructor: ClassConstructor, target: Record<PropertyKey, any>): void {
		const name: string = this.getKeyName(stack);
		const value = this.value?.get(stack);
		Object.defineProperty(target, name, { writable: true, enumerable: true, configurable: true, value });
		const decorators = this.decorators.map(decorator => decorator.get(stack));
		decorators.length && __decorate(decorators, target, name, null);
	}
	defineProperty(stack: Stack, instance: Record<PropertyKey, any>): void {
		const name: string = this.getKeyName(stack);
		const value = this.value?.get(stack);
		// TODO: check if reactive scope need to know about defining the class properties.
		const target = this.key instanceof PrivateIdentifier ? instance[PRIVATE_SYMBOL] : instance;
		Object.defineProperty(target, name, { writable: true, enumerable: true, configurable: true, value });
		const decorators = this.decorators.map(decorator => decorator.get(stack));
		decorators.length && __decorate(decorators, instance, name, null);
	}
	toString(): string {
		const decorators = this.decorators.map(decorator => decorator.toString()).join('\n');
		const name = this.computed ? `[${this.key.toString()}]` : this.key.toString();
		return `${decorators.length ? decorators + ' ' : ''}${this.static ? 'static ' : ''}${name}${this.value ? ` = ${this.value.toString()}` : ''};`
	}
	toJson(): { [key: string]: any; } {
		return {
			key: this.key.toJSON(),
			value: this.value?.toJSON(),
			decorators: this.decorators.map(decorator => decorator.toJSON()),
			computed: this.computed,
			static: this.static,
		};
	}
}



@Deserializer('AccessorProperty')
export class AccessorProperty extends AbstractDefinition {
	static fromJSON(node: AccessorProperty, deserializer: NodeDeserializer): AccessorProperty {
		return new AccessorProperty(
			deserializer(node.key),
			node.decorators.map(deserializer) as Decorator[],
			node.computed,
			node.static,
			node.value ? deserializer(node.value) : void 0
		);
	}
	static visit(node: AccessorProperty, visitNode: VisitNodeType): void {
		visitNode(node.key);
		node.value && visitNode(node.value);
		node.decorators.forEach(visitNode);
	}
	constructor(
		key: ExpressionNode,
		decorators: Decorator[],
		computed: boolean,
		isStatic: boolean,
		value?: ExpressionNode) {
		super(key, decorators, computed, isStatic, value);
	}
	afterClassConstruct(stack: Stack, classConstructor: ClassConstructor, target: Record<PropertyKey, any>): void {
		const name = this.getKeyName(stack);
		const initValue = this.value?.get(stack);
		Object.defineProperty(
			target[INSTANCE_PRIVATE_SYMBOL],
			name,
			{ writable: true, enumerable: true, configurable: true, value: initValue }
		);
		Object.defineProperty(target, name, {
			configurable: true,
			enumerable: false,
			set: function (this: ClassInstance, value: any) {
				this[PRIVATE_SYMBOL][name] = value;
			},
			get: function (this: ClassInstance) {
				return this[PRIVATE_SYMBOL][name];
			},
		});
		const decorators = this.decorators.map(decorator => decorator.get(stack));
		decorators.length && __decorate(decorators, target, name, null);
	}
	toString(): string {
		const decorators = this.decorators.map(decorator => decorator.toString()).join('\n');
		const name = this.computed ? `[${this.key.toString()}]` : this.key.toString();
		return `${decorators.length ? decorators.concat(' ') : ''}${this.static ? 'static ' : ''}accessor ${name}${this.value ? ` = ${this.value.toString()}` : ''};`
	}
	toJson(): { [key: string]: any; } {
		return {
			key: this.key.toJSON(),
			decorators: this.decorators.map(decorator => decorator.toJSON()),
			computed: this.computed,
			static: this.static,
			value: this.value?.toJSON(),
		};
	}
}


@Deserializer('ClassBody')
export class ClassBody extends AbstractExpressionNode {
	static fromJSON(node: ClassBody, deserializer: NodeDeserializer<any>): ClassBody {
		return new ClassBody(
			node.body.map(deserializer)
		);
	}
	static visit(node: ClassBody, visitNode: VisitNodeType): void {
		node.body.forEach(visitNode);
	}
	constructor(private body: (MethodDefinition | PropertyDefinition | AccessorProperty | StaticBlock)[]) {
		super();
	}
	getBody() {
		return this.body;
	}
	set(stack: Stack, value: any) {
		throw new Error('Method not implemented.');
	}
	get(stack: Stack, classConstructor: ClassConstructor) {
		this.body.filter(definition => !(definition instanceof PropertyDefinition))
			.forEach(definition => definition.get(stack, classConstructor));

		this.body.filter(definition => definition instanceof PropertyDefinition && definition.isStatic())
			.forEach(definition => definition.get(stack, classConstructor));
	}
	afterInstanceConstruct(stack: Stack, instance: Record<string, any>) {
		(this.body.filter(definition => definition instanceof PropertyDefinition && !definition.isStatic()) as PropertyDefinition[])
			.forEach(definition => definition.defineProperty(stack, instance));
	}
	dependency(computed?: true): ExpressionNode[] {
		throw new Error('Method not implemented.');
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		throw new Error('Method not implemented.');
	}
	toString(): string {
		return this.body.map(definition => `\t${definition.toString()}`).join('\n');
	}
	toJson(): { [key: string]: any; } {
		return {
			body: this.body.map(method => method.toJSON())
		};
	}
}

export class Class extends AbstractExpressionNode {
	constructor(
		protected body: ClassBody,
		protected decorators: Decorator[],
		protected id?: Identifier,
		protected superClass?: ExpressionNode) {
		super();
	}
	getBody() {
		return this.body;
	}
	getDecorators() {
		return this.decorators;
	}
	getId() {
		return this.id;
	}
	getSuperClass() {
		return this.superClass;
	}
	set(stack: Stack) {
		throw new Error(`Class.#set() has no implementation.`);
	}
	get(stack: Stack) {
		// freeze stack
		stack = stack.copyStack();
		const className = this.id?.getName() as string | undefined;
		const parentClass = this.superClass?.get(stack) as TypeOf<any> | undefined ?? class { };
		let classConstructor: ClassConstructor = this.createClass(stack, parentClass, className);
		// build class body

		stack.pushBlockScopeFor({
			'this': classConstructor,
			'super': parentClass
		});
		this.body.get(stack, classConstructor);

		// apply class decorators
		const decorators = this.decorators.map(decorator => decorator.get(stack));
		classConstructor = __decorate(decorators, classConstructor);

		// run static initialization block
		classConstructor[STATIC_INITIALIZATION_BLOCK].forEach(block => block());
		Reflect.deleteProperty(classConstructor, STATIC_INITIALIZATION_BLOCK);

		return classConstructor;
	}

	private createClass(stack: Stack, parentClass: TypeOf<any>, className: string | symbol = TEMP_CLASS_NAME) {
		const body = this.body;
		const ClassDeclaration = class extends parentClass {
			static [GET_PARAMETERS](args: any[]): any[] {
				return args;
			}
			static [STATIC_INITIALIZATION_BLOCK]: Function[] = [];
			static [PRIVATE_SYMBOL]: { [key: string | number | symbol]: any } = {};
			static [INSTANCE_PRIVATE_SYMBOL] = {};
			static [CONSTRUCTOR](): void { }

			[PRIVATE_SYMBOL]: { [key: string | number | symbol]: any } = {};

			[STACK]: Stack;
			constructor(...params: any[]) {
				const parameters = ClassDeclaration[GET_PARAMETERS](params);
				super(...parameters);
				this[PRIVATE_SYMBOL] = Object.assign(this[PRIVATE_SYMBOL], ClassDeclaration[INSTANCE_PRIVATE_SYMBOL]);
				const instanceStack = stack.copyStack();

				instanceStack.pushScope(ClassScope.scopeForThis(this));
				instanceStack.declareVariable('super', parentClass.prototype);
				instanceStack.declareVariable('new', { target: new.target });
				instanceStack.declareVariable(PRIVATE_SYMBOL, this[PRIVATE_SYMBOL]);
				instanceStack.lastScope().getContextProxy = () => this;
				instanceStack.pushReactiveScope();
				this[STACK] = instanceStack;

				// init fields and methods values
				body.afterInstanceConstruct(instanceStack, this);

				// continue class constructor execution
				ClassDeclaration[CONSTRUCTOR]();
			}
		};
		Reflect.set(ClassDeclaration, 'name', className);
		return ClassDeclaration;
	}
	dependency(computed?: true): ExpressionNode[] {
		throw new Error('Method not implemented.');
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		throw new Error('Method not implemented.');
	}
	toString() {
		const decorators = this.decorators.map(decorator => decorator.toString()).join('\n');
		let classDeclaration = 'class ';
		if (this.id) {
			classDeclaration += this.id.toString();
		}
		if (this.superClass) {
			classDeclaration += ' extends ' + this.superClass.toString();
		}
		return `${decorators}${classDeclaration} {\n${this.body.toString()}\n}`;
	}
	toJson(): object {
		return {
			body: this.body.toJSON(),
			decorators: this.decorators.map(decorator => decorator.toJSON()),
			id: this.id?.toJSON(),
			superClass: this.superClass?.toJSON(),
		};
	}
}

@Deserializer('ClassDeclaration')
export class ClassDeclaration extends Class implements DeclarationExpression {
	static fromJSON(node: ClassDeclaration, deserializer: NodeDeserializer<any>): ClassDeclaration {
		return new ClassDeclaration(
			deserializer(node.body),
			deserializer(node.id),
			node.superClass && deserializer(node.superClass)
		);
	}
	static visit(node: ClassDeclaration, visitNode: VisitNodeType): void {
		visitNode(node.body);
		node.decorators.forEach(visitNode);
		visitNode(node.id);
		node.superClass && visitNode(node.superClass);
	}
	declare protected id: Identifier;
	constructor(body: ClassBody, decorators: Decorator[], id: Identifier, superClass?: ExpressionNode) {
		super(body, decorators, id, superClass);
	}
	declareVariable(stack: Stack, propertyValue?: any) {
		stack.declareVariable(this.id.getName(), propertyValue);
	}
	getDeclarationName(): string {
		return this.id.getDeclarationName()!;
	}

	override get(stack: Stack) {
		const classConstructor = super.get(stack);
		this.id.declareVariable(stack, classConstructor);
		return classConstructor;
	}
}

@Deserializer('ClassExpression')
export class ClassExpression extends Class {
	static fromJSON(node: ClassExpression, deserializer: NodeDeserializer<any>): ClassExpression {
		return new ClassExpression(
			deserializer(node.body),
			node.superClass && deserializer(node.superClass)
		);
	}
	static visit(node: ClassExpression, visitNode: VisitNodeType): void {
		visitNode(node.body);
		node.decorators.forEach(visitNode);
		node.id && visitNode(node.id);
		node.superClass && visitNode(node.superClass);
	}

}
