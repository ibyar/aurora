import type {
	NodeDeserializer, ExpressionNode,
	ExpressionEventPath, VisitNodeType, SourceLocation,
} from '../expression.js';
import type { Stack } from '../../scope/stack.js';
import { AbstractExpressionNode } from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';
import { isDeclarationExpression } from '../utils.js';

@Deserializer('ExpressionStatement')
export class ExpressionStatement extends AbstractExpressionNode {
	static fromJSON(node: ExpressionStatement, deserializer: NodeDeserializer): ExpressionStatement {
		return new ExpressionStatement(
			node.body.map(deserializer),
			node.range,
			node.loc
		);
	}
	static visit(node: ExpressionStatement, visitNode: VisitNodeType): void {
		node.body.forEach(visitNode);
	}
	constructor(
		private body: ExpressionNode[],
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getBody() {
		return this.body;
	}
	set(stack: Stack, value: any) {
		throw new Error(`ExpressionStatement#set() has no implementation.`);
	}
	get(stack: Stack) {
		let value;
		this.body.forEach(node => value = node.get(stack));
		return value;
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.body.flatMap(exp => exp.dependency(computed));
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.body.flatMap(node => node.dependencyPath(computed));
	}
	toString(): string {
		return this.body
			.map(node => ({ insert: !isDeclarationExpression(node), string: node.toString() }))
			.map(ref => `${ref.string}${ref.insert ? ';' : ''}`)
			.join('\n');
	}
	toJson(): object {
		return { body: this.body.map(exp => exp.toJSON()) };
	}
}
