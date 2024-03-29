import type {
	NodeDeserializer, ExpressionNode, ExpressionEventPath,
	VisitNodeType, SourceLocation
} from '../expression.js';
import type { Context } from '../../scope/scope.js';
import type { Stack } from '../../scope/stack.js';
import { Deserializer } from '../deserialize/deserialize.js';
import { AbstractExpressionNode } from '../abstract.js';
import { MemberExpression } from '../definition/member.js';
import { Literal } from '../definition/values.js';

export type UnaryOperator = '-' | '+' | '~' | '!' | 'void' | 'delete' | 'typeof';
@Deserializer('UnaryExpression')
export class UnaryExpression extends AbstractExpressionNode {
	static fromJSON(node: UnaryExpression, deserializer: NodeDeserializer): UnaryExpression {
		return new UnaryExpression(
			node.operator,
			deserializer(node.argument),
			node.range,
			node.loc
		);
	}
	static visit(node: UnaryExpression, visitNode: VisitNodeType): void {
		visitNode(node.argument);
	}
	static Evaluations: { [key: string]: (value: any) => any } = {
		'+': (value: string) => { return +value; },
		'-': (value: number) => { return -value; },
		'~': (value: number) => { return ~value; },
		'!': (value: any) => { return !value; },
		'void': (value: any) => { return void value; },
		'typeof': (value: any) => { return typeof value; },
	};
	constructor(
		private operator: UnaryOperator,
		private argument: ExpressionNode,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getOperator() {
		return this.operator;
	}
	getArgument() {
		return this.argument;
	}
	set(stack: Stack, value: any) {
		return this.argument.set(stack, value);
	}
	get(stack: Stack, thisContext?: any) {
		switch (this.operator) {
			case 'delete': return this.executeDelete(stack, thisContext);
			default:
				const value = this.argument.get(stack);
				return UnaryExpression.Evaluations[this.operator](value);
		}
	}
	private executeDelete(stack: Stack, thisContext?: any): boolean {
		if (this.argument instanceof MemberExpression) {
			const scope = this.argument.findScope<Context>(stack);
			let propertyKey: PropertyKey;
			const right = this.argument.getProperty();
			if (right instanceof MemberExpression) {
				// [Symbol.asyncIterator]
				propertyKey = this.argument.getProperty().get(stack);
			} else if (right instanceof Literal) {
				// x[10], x['string'], x.name
				propertyKey = right.getValue();
			} else {
				// x[u == 3 ? 'y': 'n']
				propertyKey = this.argument.getProperty().get(stack);
			}
			return scope.delete(propertyKey);
		}
		return false;
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.argument.dependency(computed);
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.argument.dependencyPath(computed);
	}
	toString() {
		switch (this.operator) {
			case 'void':
			case 'delete':
			case 'typeof':
				return `${this.operator} ${this.argument.toString()}`;
			default:
				return `${this.operator}${this.argument.toString()}`;
		}
	}
	toJson(): object {
		return {
			operator: this.operator,
			argument: this.argument.toJSON(),
			prefix: true
		};
	}
}
