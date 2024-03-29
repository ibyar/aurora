import type {
	NodeDeserializer, ExpressionNode, ExpressionEventPath,
	VisitNodeType, SourceLocation
} from '../expression.js';
import type { Stack } from '../../scope/stack.js';
import { AbstractExpressionNode } from '../abstract.js';
import { SpreadElement } from './spread.js';
import { Deserializer } from '../deserialize/deserialize.js';

@Deserializer('NewExpression')
export class NewExpression extends AbstractExpressionNode {
	static fromJSON(node: NewExpression, deserializer: NodeDeserializer): NewExpression {
		return new NewExpression(
			deserializer(node.className),
			node.arguments?.map(deserializer),
			node.range,
			node.loc
		);
	}
	static visit(node: NewExpression, visitNode: VisitNodeType): void {
		visitNode(node.className);
		node.arguments?.forEach(visitNode);
	}
	private arguments?: ExpressionNode[];
	constructor(
		private className: ExpressionNode,
		parameters?: ExpressionNode[],
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
		this.arguments = parameters;
	}
	getClassName() {
		return this.className;
	}
	getArguments() {
		return this.arguments;
	}
	set(stack: Stack, value: any) {
		throw new Error(`NewExpression#set() has no implementation.`);
	}
	get(stack: Stack) {
		const classRef = this.className.get(stack);
		let value: any;
		if (this.arguments) {
			if (this.arguments.length > 0) {
				const parameters: any[] = [];
				for (const param of this.arguments) {
					if (param instanceof SpreadElement) {
						const paramScope = stack.pushBlockScopeFor(parameters);
						param.get(stack);
						stack.clearTo(paramScope);
						break;
					} else {
						parameters.push(param.get(stack));
					}
				}
				value = new classRef(...parameters);
			} else {
				value = new classRef();
			}
		} else {
			value = new classRef;
		}
		return value;
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.className.dependency(computed)
			.concat(this.arguments?.flatMap(parm => parm.dependency(computed)) || []);
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.className.dependencyPath(computed)
			.concat(this.arguments?.flatMap(param => param.dependencyPath(computed)) || []);
	}
	toString(): string {
		const parameters = this.arguments ? `(${this.arguments?.map(arg => arg.toString()).join(', ')})` : '';
		return `new ${this.className.toString()}${parameters}`;
	}
	toJson(): object {
		return {
			className: this.className.toJSON(),
			arguments: this.arguments?.map(arg => arg.toJSON())
		};
	}
}
