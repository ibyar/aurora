import type {
	DeclarationExpression, ExpressionEventPath, ExpressionNode,
	NodeDeserializer, SourceLocation, VisitNodeType
} from '../expression.js';
import type { Stack } from '../../scope/stack.js';
import { AbstractExpressionNode } from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';

@Deserializer('RestElement')
export class RestElement extends AbstractExpressionNode implements DeclarationExpression {
	static fromJSON(node: RestElement, deserializer: NodeDeserializer): RestElement {
		return new RestElement(
			deserializer(node.argument) as DeclarationExpression,
			node.range,
			node.loc
		);
	}
	static visit(node: RestElement, visitNode: VisitNodeType): void {
		visitNode(node.argument);
	}
	constructor(
		private argument: DeclarationExpression,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getArgument() {
		return this.argument;
	}
	set(stack: Stack, value: any) {
		throw new Error('RestElement#set() Method has no implementation.');
	}
	get(stack: Stack): void {
		throw new Error('RestElement#get() Method has no implementation.');
	}
	declareVariable(stack: Stack, propertyValue?: any): any {
		this.argument.declareVariable(stack, propertyValue);
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.argument.dependency(computed);
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.argument.dependencyPath(computed);
	}
	toString(): string {
		return `...${this.argument.toString()}`;
	}
	toJson(): object {
		return { argument: this.argument.toJSON() };
	}
}
