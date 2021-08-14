import type { NodeDeserializer, ExpressionNode } from '../expression.js';
import { AbstractExpressionNode } from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';
import { StackProvider } from '../scope.js';

@Deserializer('property')
export class ObjectLiteralPropertyNode extends AbstractExpressionNode {
	static fromJSON(node: ObjectLiteralPropertyNode, deserializer: NodeDeserializer): ObjectLiteralPropertyNode {
		return new ObjectLiteralPropertyNode(deserializer(node.name), deserializer(node.value));
	}
	constructor(protected name: ExpressionNode, protected value: ExpressionNode) {
		super();
	}
	getName() {
		return this.name;
	}
	getValue() {
		return this.value;
	}
	set(stack: StackProvider, value: any) {
		throw new Error('ObjectLiteralPropertyNode#set() has no implementation');
	}
	get(stack: StackProvider, thisContext: ThisType<any>): any {
		const name = this.name.get(stack);
		const value = this.value.get(stack);
		Object.defineProperty(thisContext, name, { value, configurable: true, enumerable: true, writable: true });
		return value;
	}
	entry(): string[] {
		return this.name.entry().concat(this.value.entry());
	}
	event(): string[] {
		return this.name.event().concat(this.value.event());
	}
	toString(): string {
		return `${this.name.toString()}: ${this.value.toString()}`;
	}
	toJson(): object {
		return {
			// type: this.type,
			name: this.name.toJSON(),
			value: this.value.toJSON()
		};
	}
}

@Deserializer('set')
export class SetPropertyNode extends ObjectLiteralPropertyNode {
	static fromJSON(node: SetPropertyNode, deserializer: NodeDeserializer): SetPropertyNode {
		return new SetPropertyNode(deserializer(node.name), deserializer(node.value));
	}
	set(stack: StackProvider, value: any) {
		return true;
	}
	get(stack: StackProvider, thisContext: ThisType<any>): (v: any) => void {
		const name = this.name.get(stack);
		const set: (v: any) => void = this.value.get(stack);
		Object.defineProperty(thisContext, name, { set, configurable: true, enumerable: true });
		return set;
	}
}

@Deserializer('get')
export class GetPropertyNode extends ObjectLiteralPropertyNode {
	static fromJSON(node: GetPropertyNode, deserializer: NodeDeserializer): GetPropertyNode {
		return new GetPropertyNode(deserializer(node.name), deserializer(node.value));
	}
	set(stack: StackProvider, value: any) {
		return true;
	}
	get(stack: StackProvider, thisContext: ThisType<any>): () => any {
		const name = this.name.get(stack);
		const get: () => any = this.value.get(stack);
		Object.defineProperty(thisContext, name, { get, configurable: true, enumerable: true });
		return get;
	}
}

@Deserializer('object')
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
	set(stack: StackProvider) {
		throw new Error('LiteralObjectNode#set() has no implementation.');
	}
	get(stack: StackProvider) {
		const newObject = Object.create(null);
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
