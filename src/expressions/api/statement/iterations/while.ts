import type { NodeDeserializer, ExpressionNode } from '../../expression.js';
import type { Stack } from '../../scope.js';
import { AbstractExpressionNode, ReturnValue } from '../../abstract.js';
import { Deserializer } from '../../deserialize/deserialize.js';
import { TerminateNode } from '../controlflow/terminate.js';

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
			deserializer(node.body)
		);
	}
	constructor(private test: ExpressionNode, private body: ExpressionNode) {
		super();
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
			if (TerminateNode.ContinueSymbol === result) {
				continue;
			}
			if (TerminateNode.BreakSymbol === result) {
				break;
			}
			if (result instanceof ReturnValue) {
				stack.clearTo(whileBlock);
				return result;
			}
		}
		stack.clearTo(whileBlock);
		return void 0;
	}
	entry(): string[] {
		return [];
	}
	event(parent?: string): string[] {
		return this.test.event();
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
			deserializer(node.body)
		);
	}
	constructor(private test: ExpressionNode, private body: ExpressionNode) {
		super();
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
			if (TerminateNode.ContinueSymbol === result) {
				continue;
			}
			if (TerminateNode.BreakSymbol === result) {
				break;
			}
			if (result instanceof ReturnValue) {
				stack.clearTo(whileBlock);
				return result;
			}
		} while (this.test.get(stack));
		stack.clearTo(whileBlock);
		return void 0;
	}
	entry(): string[] {
		return [];
	}
	event(parent?: string): string[] {
		return [];
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
