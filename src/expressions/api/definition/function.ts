import type {
	DeclarationExpression, ExpressionEventPath, ExpressionNode,
	NodeDeserializer, SourceLocation, VisitNodeType
} from '../expression.js';
import { Stack } from '../../scope/stack.js';
import {
	AbstractExpressionNode, AwaitPromise, ReturnValue,
	YieldDelegateValue, YieldValue
} from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';
import { Identifier } from './values.js';
import { TerminateReturnType } from '../statement/control/terminate.js';
import { RestElement } from '../computing/rest.js';
import { BlockStatement } from '../statement/control/block.js';

@Deserializer('AssignmentPattern')
export class AssignmentPattern extends AbstractExpressionNode implements DeclarationExpression {
	static fromJSON(node: AssignmentPattern, deserializer: NodeDeserializer): AssignmentPattern {
		return new AssignmentPattern(
			deserializer(node.left) as DeclarationExpression,
			deserializer(node.right),
			node.range,
			node.loc
		);
	}
	static visit(node: AssignmentPattern, visitNode: VisitNodeType): void {
		visitNode(node.left);
		visitNode(node.right);
	}
	constructor(
		private left: DeclarationExpression,
		private right: ExpressionNode,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getLeft() {
		return this.left;
	}
	getRight() {
		return this.right;
	}
	set(stack: Stack, value?: Function) {
		throw new Error('AssignmentPattern#set() has no implementation.');
	}
	get(stack: Stack) {
		throw new Error('AssignmentPattern#get() has no implementation.');
	}
	declareVariable(stack: Stack, value?: any) {
		if (value === undefined) {
			value = this.right.get(stack);
		}
		this.left.declareVariable(stack, value);
	}
	dependency(computed?: true): ExpressionNode[] {
		return [this.right];
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.right.dependencyPath(computed) || [];
	}
	toString(): string {
		return `${this.left.toString()} = ${this.right.toString()}`;
	}
	toJson(): object {
		return {
			left: this.left.toJSON(),
			right: this.right.toJSON()
		};
	}
}

@Deserializer('FunctionExpression')
export class FunctionExpression extends AbstractExpressionNode {
	static fromJSON(node: FunctionExpression, deserializer: NodeDeserializer): FunctionExpression {
		return new FunctionExpression(
			node.params.map(deserializer) as DeclarationExpression[],
			deserializer(node.body),
			node.async,
			node.generator,
			node.id ? deserializer(node.id) as Identifier : void 0,
			node.range,
			node.loc
		);
	}
	static visit(node: FunctionExpression, visitNode: VisitNodeType): void {
		node.id && visitNode(node.id);
		node.params.forEach(visitNode);
		visitNode(node.body);
	}
	constructor(
		protected params: DeclarationExpression[],
		protected body: ExpressionNode,
		protected async: boolean,
		protected generator: boolean,
		protected id?: Identifier,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getParams() {
		return this.params;
	}
	getBody() {
		return this.body;
	}
	getGenerator() {
		return this.generator;
	}
	getId() {
		return this.id;
	}
	getAsync() {
		return this.async;
	}
	set(stack: Stack, value: Function) {
		throw new Error(`${this.constructor.name}#set() has no implementation.`);
	}
	defineFunctionArguments(stack: Stack, args: any[]) {
		const rest = this.params[this.params.length - 1] instanceof RestElement;
		const limit = rest ? this.params.length - 1 : this.params.length;
		for (let i = 0; i < limit; i++) {
			this.params[i].declareVariable(stack, args[i]);
		}
		if (rest) {
			this.params[limit].declareVariable(stack, args.slice(limit));
		}
	}
	get(stack: Stack) {
		// freeze scopes
		stack = stack.copyStack();
		let func: Function;
		if (this.async && this.generator) {
			func = this.getAsyncGeneratorFunction(stack);
		} else if (this.async) {
			func = this.getAsyncFunction(stack);
		} else if (this.generator) {
			func = this.getGeneratorFunction(stack);
		} else {
			func = this.getFunction(stack);
		}
		// this.id?.declareVariable(stack, func);
		return func;
	}
	private getAsyncFunction(gStack: Stack) {
		const self = this;
		return async function (this: any, ...args: any[]) {
			const stack = gStack.copyStack();
			stack.pushBlockScope();
			stack.declareVariable('this', this);
			stack.declareVariable('super', this?.constructor?.prototype);
			self.defineFunctionArguments(stack, args);
			let returnValue: any;
			const statements = (self.body as BlockStatement).getBody();
			for (const statement of statements) {
				returnValue = statement.get(stack);
				if (stack.awaitPromise?.length > 0) {
					for (const awaitRef of stack.awaitPromise) {
						const awaitValue = await awaitRef.promise;
						if (awaitRef.declareVariable) {
							awaitRef.node.declareVariable(stack, awaitValue);
						} else {
							awaitRef.node.set(stack, awaitValue);
						}
					}
					stack.awaitPromise.splice(0);
				}
				else if (stack.forAwaitAsyncIterable) {
					for await (let iterator of stack.forAwaitAsyncIterable.iterable) {
						const result = stack.forAwaitAsyncIterable.forAwaitBody(iterator);
						if (result instanceof TerminateReturnType) {
							if (result.type === 'continue') {
								continue;
							} else {
								break;
							}
						}
						else if (result instanceof ReturnValue) {
							returnValue = result;
							break;
						}
					}
					stack.forAwaitAsyncIterable = undefined;
				}
				if (returnValue instanceof ReturnValue) {
					returnValue = returnValue.value;
					if (returnValue instanceof AwaitPromise) {
						returnValue = await returnValue.promise;
					}
					return returnValue;
				}
			}
		};

	}
	private getGeneratorFunction(gStack: Stack) {
		const self = this;
		return function* (this: any, ...args: any[]) {
			const stack = gStack.copyStack();
			stack.pushBlockScope();
			stack.declareVariable('this', this);
			stack.declareVariable('super', this?.constructor?.prototype);
			self.defineFunctionArguments(stack, args);
			let returnValue: any;
			const statements = (self.body as BlockStatement).getBody();
			for (const statement of statements) {
				returnValue = statement.get(stack);
				if (returnValue instanceof ReturnValue) {
					return returnValue.value;
				} else if (returnValue instanceof YieldValue) {
					yield returnValue.value;
				} else if (returnValue instanceof YieldDelegateValue) {
					yield* returnValue.value;
				}
			}
		};
	}
	private getAsyncGeneratorFunction(gStack: Stack) {
		const self = this;
		return async function* (this: any, ...args: any[]) {
			const stack = gStack.copyStack();
			stack.pushBlockScope();
			stack.declareVariable('this', this);
			stack.declareVariable('super', this?.constructor?.prototype);
			self.defineFunctionArguments(stack, args);
			let returnValue: any;
			const statements = (self.body as BlockStatement).getBody();
			for (const statement of statements) {
				returnValue = statement.get(stack);
				if (stack.awaitPromise?.length > 0) {
					for (const awaitRef of stack.awaitPromise) {
						const awaitValue = await awaitRef.promise;
						if (awaitRef.declareVariable) {
							awaitRef.node.declareVariable(stack, awaitValue);
						} else {
							awaitRef.node.set(stack, awaitValue);
						}
					}
					stack.awaitPromise.splice(0);
				}
				else if (stack.forAwaitAsyncIterable) {
					for await (let iterator of stack.forAwaitAsyncIterable.iterable) {
						const result = stack.forAwaitAsyncIterable.forAwaitBody(iterator);
						if (result instanceof TerminateReturnType) {
							if (result.type === 'continue') {
								continue;
							} else {
								break;
							}
						}
						else if (result instanceof ReturnValue) {
							returnValue = returnValue.value;
							if (returnValue instanceof AwaitPromise) {
								return await returnValue.promise;
							} else if (returnValue instanceof YieldValue) {
								yield returnValue.value;
							} else if (returnValue instanceof YieldDelegateValue) {
								yield* returnValue.value;
							}
							return returnValue;
						}
					}
					stack.forAwaitAsyncIterable = undefined;
				}
				if (returnValue instanceof ReturnValue) {
					returnValue = returnValue.value;
					if (returnValue instanceof AwaitPromise) {
						return await returnValue.promise;
					}
					return returnValue;
				}
			}
		};
	}
	private getFunction(gStack: Stack) {
		const self = this;
		return function (this: any, ...args: any[]) {
			const stack = gStack.copyStack();
			stack.pushBlockScope();
			stack.declareVariable('this', this);
			stack.declareVariable('super', this?.constructor?.prototype);
			self.defineFunctionArguments(stack, args);
			let returnValue: any;
			const statements = (self.body as BlockStatement).getBody();
			for (const statement of statements) {
				returnValue = statement.get(stack);
				if (returnValue instanceof ReturnValue) {
					return returnValue.value;
				}
			}
		};
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.params.flatMap(param => param.dependency());
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.params.flatMap(param => param.dependencyPath(computed));
	}
	toString(): string {
		let declare: string = 'function ';
		if (this.async && this.generator) {
			declare = 'async function* ';
		} else if (this.async) {
			declare = 'async function ';
		} else if (this.generator) {
			declare = 'function* ';
		}
		return `${declare}${this.id?.toString() || ''}${this.paramsAndBodyToString()}`;
	}
	paramsAndBodyToString() {
		return `(${this.params.map(param => param.toString()).join(', ')}) ${this.body.toString()}`;
	}
	toJson(): object {
		return {
			params: this.params.map(param => param.toJSON()),
			body: this.body.toJSON(),
			async: this.async,
			id: this.id?.toJSON(),
			generator: this.generator
		};
	}
}

@Deserializer('FunctionDeclaration')
export class FunctionDeclaration extends FunctionExpression implements DeclarationExpression {
	static fromJSON(node: FunctionDeclaration, deserializer: NodeDeserializer): FunctionDeclaration {
		return new FunctionDeclaration(
			node.params.map(deserializer) as DeclarationExpression[],
			deserializer(node.body),
			node.async,
			node.generator,
			deserializer(node.id) as Identifier,
			node.range,
			node.loc
		);
	}
	static visit(node: FunctionDeclaration, visitNode: VisitNodeType): void {
		visitNode(node.id);
		node.params.forEach(visitNode);
		visitNode(node.body);
	}
	declare protected id: Identifier;
	constructor(
		params: DeclarationExpression[],
		body: ExpressionNode,
		async: boolean,
		generator: boolean,
		id: Identifier,
		range?: [number, number],
		loc?: SourceLocation) {
		super(params, body, async, generator, id, range, loc);
	}
	override get(stack: Stack): Function {
		const func = super.get(stack);
		this.declareVariable(stack, func);
		return func;
	}
	declareVariable(stack: Stack, value: Function) {
		this.id.declareVariable(stack, value);
	}
}


@Deserializer('ArrowFunctionExpression')
export class ArrowFunctionExpression extends AbstractExpressionNode {
	static fromJSON(node: ArrowFunctionExpression, deserializer: NodeDeserializer): ArrowFunctionExpression {
		return new ArrowFunctionExpression(
			node.params.map(deserializer) as DeclarationExpression[],
			Array.isArray(node.body)
				? node.body.map(deserializer)
				: deserializer(node.body),
			node.expression,
			node.async,
			node.range,
			node.loc
		);
	}
	static visit(node: ArrowFunctionExpression, visitNode: VisitNodeType): void {
		node.params.forEach(visitNode);
		Array.isArray(node.body)
			? node.body.forEach(visitNode)
			: visitNode(node.body);
	}
	private generator = false;
	constructor(
		private params: DeclarationExpression[],
		private body: ExpressionNode | ExpressionNode[],
		private expression: boolean,
		private async: boolean,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getParams() {
		return this.params;
	}
	getBody() {
		return this.body;
	}
	getExpression() {
		return this.expression;
	}
	set(stack: Stack, value: Function) {
		throw new Error('ArrowFunctionExpression#set() has no implementation.');
	}
	private setParameter(stack: Stack, args: any[]) {
		const rest = this.params[this.params.length - 1] instanceof RestElement;
		const limit = rest ? this.params.length - 1 : this.params.length;
		for (let i = 0; i < limit; i++) {
			this.params[i].declareVariable(stack, args[i]);
		}
		if (rest) {
			this.params[limit].declareVariable(stack, args.slice(limit));
		}
	}
	get(stack: Stack) {
		// freeze stack
		stack = stack.copyStack();
		return this.async ? this.getAsyncArrowFunction(stack) : this.getArrowFunction(stack);
	}
	private getAsyncArrowFunction(gStack: Stack) {
		async (...args: any[]) => {
			const stack = gStack.copyStack();
			stack.pushBlockScope();
			this.setParameter(stack, args);
			let returnValue: any;
			const statements = Array.isArray(this.body) ? this.body : [this.body];
			for (const state of statements) {
				returnValue = state.get(stack);
				if (stack.awaitPromise?.length > 0) {
					for (const awaitRef of stack.awaitPromise) {
						const awaitValue = await awaitRef.promise;
						if (awaitRef.declareVariable) {
							awaitRef.node.declareVariable(stack, awaitValue);
						} else {
							awaitRef.node.set(stack, awaitValue);
						}
					}
					stack.awaitPromise.splice(0);
				}
				else if (stack.forAwaitAsyncIterable) {
					for await (let iterator of stack.forAwaitAsyncIterable.iterable) {
						const result = stack.forAwaitAsyncIterable.forAwaitBody(iterator);
						if (result instanceof TerminateReturnType) {
							if (result.type === 'continue') {
								continue;
							} else {
								break;
							}
						}
						else if (result instanceof ReturnValue) {
							returnValue = result;
							break;
						}
					}
					stack.forAwaitAsyncIterable = undefined;
				}
				if (returnValue instanceof ReturnValue) {
					returnValue = returnValue.value;
					if (returnValue instanceof AwaitPromise) {
						return await returnValue.promise;
					}
				}
			}
			if (this.expression) {
				return returnValue;
			}
		};
	}
	private getArrowFunction(gStack: Stack) {
		return (...args: any[]) => {
			const stack = gStack.copyStack();
			stack.pushBlockScope();
			this.setParameter(stack, args);
			let returnValue: any;
			const statements = Array.isArray(this.body) ? this.body : [this.body];
			for (const statement of statements) {
				returnValue = statement.get(stack);
				if (returnValue instanceof ReturnValue) {
					return returnValue.value;
				}
			}
			if (this.expression) {
				return returnValue;
			}
		};
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.params.flatMap(param => param.dependency());
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.params.flatMap(param => param.dependencyPath(computed));
	}
	toString(): string {
		let str = this.async ? 'async ' : '';
		if (this.params.length === 1) {
			str += this.params[0].toString();
		} else {
			str += `(${this.params.map(param => param.toString()).join(', ')})`;
		}
		str += ' => ';
		str += this.body.toString();
		return str;
	}
	toJson(): object {
		return {
			params: this.params.map(param => param.toJSON()),
			body: Array.isArray(this.body) ? this.body.map(item => item.toJSON()) : this.body.toJSON(),
			expression: true,
			async: this.async,
			generator: this.generator
		};
	}
}
