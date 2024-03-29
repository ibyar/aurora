import type {
	NodeDeserializer, ExpressionNode, ExpressionEventPath,
	VisitNodeType, SourceLocation
} from '../../expression.js';
import type { Stack } from '../../../scope/stack.js';
import { AbstractExpressionNode, ReturnValue } from '../../abstract.js';
import { Deserializer } from '../../deserialize/deserialize.js';
import { TerminateReturnType } from '../control/terminate.js';

/**
 * The while statement creates a loop that executes a specified
 * statement as long as the test condition evaluates to true.
 * The condition is evaluated before executing the statement.
 * 
 */
@Deserializer('WhileStatement')
export class WhileNode extends AbstractExpressionNode {
	static fromJSON(node: WhileNode, deserializer: NodeDeserializer): WhileNode {
		return new WhileNode(
			deserializer(node.test),
			deserializer(node.body),
			node.range,
			node.loc
		);
	}
	static visit(node: WhileNode, visitNode: VisitNodeType): void {
		visitNode(node.body);
		visitNode(node.test);
	}
	constructor(
		private test: ExpressionNode,
		private body: ExpressionNode,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getTest() {
		return this.test;
	}
	getBody() {
		return this.body;
	}
	set(stack: Stack, value: any) {
		throw new Error(`WhileNode#set() has no implementation.`);
	}
	get(stack: Stack) {
		const condition = this.test.get(stack);
		const whileBlock = stack.pushBlockScope();
		while (condition) {
			const result = this.body.get(stack);
			// useless case, as it at the end of for statement
			// an array/block statement, should return last signal
			if (result instanceof TerminateReturnType) {
				if (result.type === 'continue') {
					continue;
				} else {
					break;
				}
			}
			if (result instanceof ReturnValue) {
				stack.clearTo(whileBlock);
				return result;
			}
		}
		stack.clearTo(whileBlock);
		return void 0;
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.test.dependency(computed).concat(this.body.dependency(computed));
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.test.dependencyPath(computed).concat(this.body.dependencyPath(computed));
	}
	toString(): string {
		return `while (${this.test.toString()}) ${this.body.toString()}`;
	}
	toJson(): object {
		return {
			test: this.test.toJSON(),
			body: this.body.toJSON()
		};
	}
}

@Deserializer('DoWhileStatement')
export class DoWhileNode extends AbstractExpressionNode {
	static fromJSON(node: DoWhileNode, deserializer: NodeDeserializer): DoWhileNode {
		return new DoWhileNode(
			deserializer(node.test),
			deserializer(node.body),
			node.range,
			node.loc
		);
	}
	static visit(node: DoWhileNode, visitNode: VisitNodeType): void {
		visitNode(node.test);
		visitNode(node.body);
	}
	constructor(
		private test: ExpressionNode,
		private body: ExpressionNode,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getTest() {
		return this.test;
	}
	getBody() {
		return this.body;
	}
	set(stack: Stack, value: any) {
		throw new Error(`WhileNode#set() has no implementation.`);
	}
	get(stack: Stack) {
		const whileBlock = stack.pushBlockScope();
		do {
			const result = this.body.get(stack);
			// useless case, as it at the end of for statement
			// an array/block statement, should return last signal
			if (result instanceof TerminateReturnType) {
				if (result.type === 'continue') {
					continue;
				} else {
					break;
				}
			}
			if (result instanceof ReturnValue) {
				stack.clearTo(whileBlock);
				return result;
			}
		} while (this.test.get(stack));
		stack.clearTo(whileBlock);
		return void 0;
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.body.dependency(computed).concat(this.test.dependency(computed));
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.body.dependencyPath(computed).concat(this.test.dependencyPath(computed));
	}
	toString(): string {
		return `do {${this.body.toString()}} while (${this.test.toString()})`;
	}
	toJson(): object {
		return {
			test: this.test.toJSON(),
			body: this.body.toJSON()
		};
	}
}
