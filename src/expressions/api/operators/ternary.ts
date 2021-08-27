import type { NodeDeserializer, ExpressionNode } from '../expression.js';
import type { Stack } from '../../scope/stack.js';
import { AbstractExpressionNode } from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';

@Deserializer('ConditionalExpression')
export class ConditionalExpressionNode extends AbstractExpressionNode {
	static fromJSON(node: ConditionalExpressionNode, deserializer: NodeDeserializer): ConditionalExpressionNode {
		return new ConditionalExpressionNode(
			deserializer(node.test),
			deserializer(node.alternate),
			deserializer(node.consequent)
		);
	}
	constructor(private test: ExpressionNode, private alternate: ExpressionNode, private consequent: ExpressionNode) {
		super();
	}
	getTest() {
		return this.test;
	}
	getAlternate() {
		return this.alternate;
	}
	getConsequent() {
		return this.consequent;
	}
	set(stack: Stack, value: any) {
		throw new Error(`TernaryNode#set() has no implementation.`);
	}
	get(stack: Stack) {
		return this.test.get(stack) ? this.consequent.get(stack) : this.alternate.get(stack);
	}
	entry(): string[] {
		return [...this.test.entry(), ...this.alternate.entry(), ...this.consequent.entry()];
	}
	event(parent?: string): string[] {
		return [];
	}
	toString() {
		return `${this.test.toString()} ? (${this.alternate.toString()}):(${this.consequent.toString()})`;
	}
	toJson(): object {
		return {
			test: this.test.toJSON(),
			alternate: this.alternate.toJSON(),
			consequent: this.consequent.toJSON()
		};
	}
}
