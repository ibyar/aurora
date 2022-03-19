import type { CanDeclareExpression, ExpressionEventPath, ExpressionNode, NodeDeserializer } from '../expression.js';
import type { Scope } from '../../scope/scope.js';
import type { Stack } from '../../scope/stack.js';
import { AbstractExpressionNode } from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';

@Deserializer('RestElement')
export class RestElement extends AbstractExpressionNode implements CanDeclareExpression {
	static fromJSON(node: RestElement, deserializer: NodeDeserializer): RestElement {
		return new RestElement(deserializer(node.argument) as CanDeclareExpression);
	}
	constructor(private argument: CanDeclareExpression) {
		super();
	}
	getArgument() {
		return this.argument;
	}
	shareVariables(scopeList: Scope<any>[]): void {
		this.argument.shareVariables(scopeList);
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
