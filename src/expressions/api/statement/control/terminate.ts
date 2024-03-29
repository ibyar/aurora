import type {
	ExpressionEventPath, ExpressionNode, NodeDeserializer,
	SourceLocation, VisitNodeType
} from '../../expression.js';
import type { Stack } from '../../../scope/stack.js';
import { AbstractExpressionNode } from '../../abstract.js';
import { Deserializer } from '../../deserialize/deserialize.js';
import { Identifier } from '../../definition/values.js';

export type TerminateType = 'break' | 'continue';

export class TerminateReturnType {
	constructor(public type: TerminateType, public label?: string) { }
};



/**
 * The break statement terminates the current loop, switch, or label statement
 * and transfers program control to the statement following the terminated statement.
 * 
 * The continue statement terminates execution of the statements in the current iteration of the current or labeled loop,
 * and continues execution of the loop with the next iteration.
 *
 */
abstract class TerminateStatement extends AbstractExpressionNode {

	constructor(
		protected label?: Identifier,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}
	getLabel() {
		this.label;
	}
	set(stack: Stack, value: any) {
		throw new Error(`TerminateStatement#set() has no implementation.`);
	}
	get(stack: Stack): TerminateReturnType {
		return new TerminateReturnType(this.getType(), this.label?.get(stack));
	}
	dependency(computed?: true): ExpressionNode[] {
		return [];
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return [];
	}
	toString(): string {
		return `${this.getType()}${this.label ? ` ${this.label.toString()}` : ''};`;
	}
	toJson(): object {
		return { label: this.label?.toJSON() };
	}

	abstract getType(): TerminateType;
}

@Deserializer('BreakStatement')
export class BreakStatement extends TerminateStatement {
	static fromJSON(node: BreakStatement, deserializer: NodeDeserializer): BreakStatement {
		return new BreakStatement(
			node.label ? deserializer(node.label) as Identifier : void 0,
			node.range,
			node.loc
		);
	}
	static visit(node: BreakStatement, visitNode: VisitNodeType): void {
		node.label && visitNode(node.label);
	}
	getType(): 'break' {
		return 'break';
	}
}

@Deserializer('ContinueStatement')
export class ContinueStatement extends TerminateStatement {
	static fromJSON(node: ContinueStatement, deserializer: NodeDeserializer): ContinueStatement {
		return new ContinueStatement(
			node.label && deserializer(node.label) as Identifier,
			node.range,
			node.loc
		);
	}
	static visit(node: ContinueStatement, visitNode: VisitNodeType): void {
		node.label && visitNode(node.label);
	}
	getType(): 'continue' {
		return 'continue';
	}
}

@Deserializer('LabeledStatement')
export class LabeledStatement extends AbstractExpressionNode {
	static fromJSON(node: LabeledStatement, deserializer: NodeDeserializer): LabeledStatement {
		return new LabeledStatement(
			deserializer(node.label) as Identifier,
			deserializer(node.body),
			node.range,
			node.loc
		);
	}
	static visit(node: LabeledStatement, visitNode: VisitNodeType): void {
		visitNode(node.label);
		visitNode(node.body);
	}
	constructor(
		private label: Identifier,
		private body: ExpressionNode,
		range?: [number, number],
		loc?: SourceLocation) {
		super(range, loc);
	}

	getLabel() {
		return this.label;
	}
	getBody() {
		return this.body;
	}
	set(stack: Stack, value: any) {
		throw new Error('LabeledStatement#set() not implemented.');
	}
	get(stack: Stack) {
		return this.body.get(stack);
	}
	dependency(computed?: true | undefined): ExpressionNode[] {
		return this.body.dependency(computed);
	}
	dependencyPath(computed?: true | undefined): ExpressionEventPath[] {
		return this.body.dependencyPath(computed);
	}
	toString(): string {
		return `${this.label.toString()}:\n${this.body.toString()}`;
	}
	toJson() {
		return {
			label: this.label.toJSON(),
			body: this.body.toJSON()
		};
	}
}
