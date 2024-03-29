
import type {
	NodeDeserializer, ExpressionNode, ExpressionEventPath,
	VisitNodeType, SourceLocation
} from '../../expression.js';
import type { Stack } from '../../../scope/stack.js';
import { AbstractExpressionNode } from '../../abstract.js';
import { Deserializer } from '../../deserialize/deserialize.js';
import { TerminateReturnType } from './terminate.js';
import { Identifier } from '../../definition/values.js';


@Deserializer('SwitchCase')
export class SwitchCase extends AbstractExpressionNode {
	static fromJSON(node: SwitchCase, deserializer: NodeDeserializer): SwitchCase {
		return new SwitchCase(
			deserializer(node.test),
			deserializer(node.consequent),
			node.range,
			node.loc
		);
	}
	static visit(node: SwitchCase, visitNode: VisitNodeType): void {
		visitNode(node.test);
		visitNode(node.consequent);
	}
	constructor(
		protected test: ExpressionNode,
		protected consequent: ExpressionNode,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getTest() {
		return this.test;
	}
	getConsequent() {
		return this.consequent;
	}
	set(stack: Stack, value: any) {
		throw new Error(`SwitchCase#set() has no implementation.`);
	}
	get(stack: Stack) {
		return this.consequent.get(stack);
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.test.dependency(computed).concat(this.consequent.dependency(computed));
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.test.dependencyPath(computed).concat(this.consequent.dependencyPath(computed));
	}
	toString(): string {
		return `case ${this.test.toString()}: ${this.consequent.toString()};`;
	}
	toJson(): object {
		return {
			test: this.test.toJSON(),
			consequent: this.consequent.toJSON()
		};
	}
}

@Deserializer('default')
export class DefaultExpression extends SwitchCase {
	static fromJSON(node: DefaultExpression, deserializer: NodeDeserializer): DefaultExpression {
		return new DefaultExpression(
			deserializer(node.consequent),
			node.range,
			node.loc
		);
	}
	static visit(node: DefaultExpression, visitNode: VisitNodeType): void {
		visitNode(node.consequent);
	}
	constructor(
		block: ExpressionNode,
		range?: [number, number],
		loc?: SourceLocation) {
		super(new Identifier('default'), block, range, loc);
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.consequent.dependency(computed);
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.consequent.dependencyPath(computed);
	}
	toString(): string {
		return `default: ${this.consequent.toString()};`;
	}
	toJson(): object {
		return {
			consequent: this.consequent.toJSON()
		};
	}
}

/**
 * The switch statement evaluates an expression, matching the expression's value to a case clause,
 * and executes statements associated with that case,
 * as well as statements in cases that follow the matching case.
 * 
 */
@Deserializer('SwitchStatement')
export class SwitchStatement extends AbstractExpressionNode {
	static fromJSON(node: SwitchStatement, deserializer: NodeDeserializer): SwitchStatement {
		return new SwitchStatement(
			deserializer(node.discriminant),
			node.cases.map(deserializer) as SwitchCase[],
			node.range,
			node.loc
		);
	}
	static visit(node: SwitchStatement, visitNode: VisitNodeType): void {
		visitNode(node.discriminant);
		node.cases.forEach(visitNode);
	}
	constructor(
		private discriminant: ExpressionNode,
		private cases: SwitchCase[],
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getDiscriminant() {
		return this.discriminant;
	}
	getCases() {
		return this.cases;
	}
	set(stack: Stack, value: any) {
		throw new Error(`SwitchStatement#set() has no implementation.`);
	}
	get(stack: Stack) {
		// need to fix statements execution and support default case
		// stack = stack.newStack();
		const result = this.discriminant.get(stack);
		const values = this.cases.map(item => item.getTest().get(stack));
		let startIndex = values.findIndex(item => result === item);
		if (startIndex === -1) {
			// search for default statement
			startIndex = this.cases.findIndex(item => item instanceof DefaultExpression);
			if (startIndex === -1) {
				return;
			}
		}
		const caseBlock = stack.pushBlockScope();
		for (let index = startIndex; index < this.cases.length; index++) {
			const returnValue = this.cases[index].get(stack);
			if (result instanceof TerminateReturnType) {
				if (result.type === 'continue') {
					continue;
				} else {
					break;
				}
			}
		}
		stack.clearTo(caseBlock);
		return void 0;
	}
	dependency(computed?: true): ExpressionNode[] {
		return this.discriminant.dependency(computed).concat(this.cases.flatMap(expCase => expCase.dependency(computed)));
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return this.discriminant.dependencyPath(computed).concat(this.cases.flatMap(expCase => expCase.dependencyPath(computed)));
	}
	toString(): string {
		return `switch (${this.discriminant.toString()}) {${this.cases.map(item => item.toString())}`;
	}
	toJson(): object {
		return {
			discriminant: this.discriminant.toJSON(),
			cases: this.cases.map(item => item.toJSON())
		};
	}
}
