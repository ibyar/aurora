import type { NodeDeserializer, ExpressionNode, CanDeclareVariable } from '../expression.js';
import { AbstractExpressionNode } from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';
import { ScopeType, Stack } from '../scope.js';

@Deserializer('Property')
export class ObjectLiteralPropertyNode extends AbstractExpressionNode implements CanDeclareVariable {
	static fromJSON(node: ObjectLiteralPropertyNode, deserializer: NodeDeserializer): ObjectLiteralPropertyNode {
		return new ObjectLiteralPropertyNode(deserializer(node.key), deserializer(node.value), node.kind);
	}
	constructor(protected key: ExpressionNode, protected value: ExpressionNode, protected kind: 'init' | 'get' | 'set') {
		super();
	}
	getKey() {
		return this.key;
	}
	getValue() {
		return this.value;
	}
	set(stack: Stack, value: any) {
		this.key.set(stack, value);
	}
	get(stack: Stack, thisContext: ThisType<any>): any {
		const name = this.key.get(stack);
		let value: any;
		switch (this.kind) {
			case 'get':
				const get: () => any = this.value.get(stack);
				Object.defineProperty(thisContext, name, { get, configurable: true, enumerable: true });
				value = get;
				break;
			case 'set':
				const set: (v: any) => void = this.value.get(stack);
				Object.defineProperty(thisContext, name, { set, configurable: true, enumerable: true });
				value = set;
				break;
			default:
			case 'init':
				value = this.value.get(stack);
				Object.defineProperty(thisContext, name, { value, configurable: true, enumerable: true, writable: true });
				break;
		}
		return value;
	}
	declareVariable(stack: Stack, scopeType: ScopeType, objectValue: any): void {
		const propertyName = this.key.get(stack);
		const propertyValue = objectValue[propertyName];
		const variableName = this.value.get(stack);
		stack.declareVariable(variableName, scopeType, propertyValue);
	}
	entry(): string[] {
		return this.key.entry().concat(this.value.entry());
	}
	event(): string[] {
		return this.key.event().concat(this.value.event());
	}
	toString(): string {
		return `${this.key.toString()}: ${this.value.toString()}`;
	}
	toJson(): object {
		return {
			key: this.key.toJSON(),
			value: this.value.toJSON(),
			kind: this.kind
		};
	}
}

@Deserializer('ObjectExpression')
export class ObjectLiteralNode extends AbstractExpressionNode {
	static fromJSON(node: ObjectLiteralNode, deserializer: NodeDeserializer): ObjectLiteralNode {
		return new ObjectLiteralNode(node.properties.map(deserializer));
	}
	constructor(private properties: ExpressionNode[]) {
		super();
	}
	getProperties() {
		return this.properties;
	}
	set(stack: Stack) {
		throw new Error('ObjectLiteralNode#set() has no implementation.');
	}
	get(stack: Stack) {
		const newObject = {};
		for (const property of this.properties) {
			property.get(stack, newObject);
		}
		return newObject;
	}
	entry(): string[] {
		return this.properties.flatMap(property => property.entry());
	}
	event(parent?: string): string[] {
		return this.properties.flatMap(property => property.event());
	}
	toString() {
		return `{ ${this.properties.map(item => item.toString()).join(', ')} }`;
	}
	toJson(): object {
		return {
			properties: this.properties.map(item => item.toJSON())
		};
	}
}

@Deserializer('ObjectPattern')
export class ObjectPatternNode extends AbstractExpressionNode implements CanDeclareVariable {
	static fromJSON(node: ObjectPatternNode, deserializer: NodeDeserializer): ObjectPatternNode {
		return new ObjectPatternNode(node.properties.map(deserializer));
	}
	constructor(private properties: ExpressionNode[]) {
		super();
	}
	getProperties() {
		return this.properties;
	}
	set(stack: Stack, objectValue: any) {
		throw new Error('ObjectPatternNode#set() has no implementation.');
	}
	get(scopeProvider: Stack, objectValue: any) {
		this.declareVariable(scopeProvider, 'block', objectValue);
	}
	declareVariable(stack: Stack, scopeType: ScopeType, objectValue: any): void {
		for (const property of this.properties as ObjectLiteralPropertyNode[]) {
			property.declareVariable(stack, scopeType, objectValue);
		}
	}
	entry(): string[] {
		return this.properties.flatMap(property => property.entry());
	}
	event(parent?: string): string[] {
		return this.properties.flatMap(property => property.event());
	}
	toString() {
		return `{ ${this.properties.map(item => item.toString()).join(', ')} }`;
	}
	toJson(): object {
		return {
			properties: this.properties.map(item => item.toJSON())
		};
	}
}
