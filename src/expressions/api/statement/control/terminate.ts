import type { ExpressionEventPath, ExpressionNode, VisitNodeType } from '../../expression.js';
import type { Scope } from '../../../scope/scope.js';
import type { Stack } from '../../../scope/stack.js';
import { AbstractExpressionNode } from '../../abstract.js';
import { Deserializer } from '../../deserialize/deserialize.js';

/**
 * The break statement terminates the current loop, switch, or label statement
 * and transfers program control to the statement following the terminated statement.
 * 
 * The continue statement terminates execution of the statements in the current iteration of the current or labeled loop,
 * and continues execution of the loop with the next iteration.
 *
 */
class TerminateStatement extends AbstractExpressionNode {

	constructor(protected symbol: Symbol, protected label?: ExpressionNode) {
		super();
	}
	getSymbol() {
		return this.symbol;
	}
	getLabel() {
		this.label;
	}
	shareVariables(scopeList: Scope<any>[]): void { }
	set(stack: Stack, value: any) {
		throw new Error(`TerminateStatement#set() has no implementation.`);
	}
	get(stack: Stack) {
		return this.symbol;
	}
	dependency(computed?: true): ExpressionNode[] {
		return [];
	}
	dependencyPath(computed?: true): ExpressionEventPath[] {
		return [];
	}
	toString(): string {
		return this.symbol.description!;
	}
	toJson(): object {
		return { symbol: this.symbol.description, label: this.label };
	}
}

@Deserializer('BreakStatement')
export class BreakStatement extends TerminateStatement {
	static readonly BreakSymbol: Symbol;
	static readonly BREAK_INSTANCE: BreakStatement;
	static {
		const symbol = Symbol.for('break');
		const instance = Object.freeze(new this(symbol)) as BreakStatement;
		Reflect.set(this, 'BreakSymbol', symbol);
		Reflect.set(this, 'BREAK_INSTANCE', instance);
	}
	static fromJSON(node: BreakStatement): BreakStatement {
		return BreakStatement.BREAK_INSTANCE;
	}
	static visit(node: BreakStatement, visitNode: VisitNodeType): void {
		node.label && visitNode(node.label);
	}
}

@Deserializer('ContinueStatement')
export class ContinueStatement extends TerminateStatement {
	static readonly ContinueSymbol = Symbol.for('continue');
	static readonly CONTINUE_INSTANCE: ContinueStatement;
	static {
		const instance = Object.freeze(new this(this.ContinueSymbol)) as ContinueStatement;
		Reflect.set(this, 'CONTINUE_INSTANCE', instance);
	}
	static fromJSON(node: ContinueStatement): ContinueStatement {
		return ContinueStatement.CONTINUE_INSTANCE;
	}
	static visit(node: ContinueStatement, visitNode: VisitNodeType): void {
		node.label && visitNode(node.label);
	}
}
