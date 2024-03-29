import type {
	NodeDeserializer, ExpressionNode, ExpressionEventPath,
	VisitNodeType, SourceLocation
} from '../expression.js';
import type { Stack } from '../../scope/stack.js';
import { AbstractExpressionNode } from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';

@Deserializer('ConditionalExpression')
export class ConditionalExpression extends AbstractExpressionNode {
	static fromJSON(node: ConditionalExpression, deserializer: NodeDeserializer): ConditionalExpression {
		return new ConditionalExpression(
			deserializer(node.test),
			deserializer(node.alternate),
			deserializer(node.consequent),
			node.range,
			node.loc
		);
	}
	static visit(node: ConditionalExpression, visitNode: VisitNodeType): void {
		visitNode(node.test);
		visitNode(node.alternate);
		visitNode(node.consequent);
	}
	constructor(
		private test: ExpressionNode,
		private alternate: ExpressionNode,
		private consequent: ExpressionNode,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
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
		throw new Error(`ConditionalExpression#set() has no implementation.`);
	}
	get(stack: Stack) {
		return this.test.get(stack) ? this.consequent.get(stack) : this.alternate.get(stack);
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.test.dependency(computed)
			.concat(
				this.alternate.dependency(computed),
				this.consequent.dependency(computed)
			);
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.test.dependencyPath(computed)
			.concat(
				this.alternate.dependencyPath(computed),
				this.consequent.dependencyPath(computed)
			);
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
