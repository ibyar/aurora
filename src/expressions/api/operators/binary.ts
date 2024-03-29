import type { EvaluateNode, EvaluateType } from './types.js';
import type { Stack } from '../../scope/stack.js';
import type { NodeDeserializer, VisitNodeType } from '../expression.js';
import { InfixExpressionNode } from '../abstract.js';
import { Deserializer } from '../deserialize/deserialize.js';

export type BinaryOperator =
	'==' | '!=' | '===' | '!=='
	| '<' | '<=' | '>' | '>='
	| '<<' | '>>' | '>>>'
	| '+' | '-' | '*' | '/' | '%'
	| '|' | '^' | '&' | 'in'
	| 'instanceof'
	| '**' | '%%' | '>?' | '<?' | '<=>';

@Deserializer('BinaryExpression')
export class BinaryExpression extends InfixExpressionNode<BinaryOperator> {
	static fromJSON(node: BinaryExpression, deserializer: NodeDeserializer): BinaryExpression {
		return new BinaryExpression(
			node.operator,
			deserializer(node.left),
			deserializer(node.right),
			node.range,
			node.loc
		);
	}
	static visit(node: BinaryExpression, visitNode: VisitNodeType): void {
		visitNode(node.left);
		visitNode(node.right);
	}
	static Evaluations: EvaluateType = {
		'==': (evalNode: EvaluateNode) => { return evalNode.left == evalNode.right; },
		'!=': (evalNode: EvaluateNode) => { return evalNode.left != evalNode.right; },

		'===': (evalNode: EvaluateNode) => { return evalNode.left === evalNode.right; },
		'!==': (evalNode: EvaluateNode) => { return evalNode.left !== evalNode.right; },

		'<': (evalNode: EvaluateNode) => { return evalNode.left < evalNode.right; },
		'<=': (evalNode: EvaluateNode) => { return evalNode.left <= evalNode.right; },

		'>': (evalNode: EvaluateNode) => { return evalNode.left > evalNode.right; },
		'>=': (evalNode: EvaluateNode) => { return evalNode.left >= evalNode.right; },

		'*': (evalNode: EvaluateNode) => { return evalNode.left * evalNode.right; },
		'/': (evalNode: EvaluateNode) => { return evalNode.left / evalNode.right; },
		'%': (evalNode: EvaluateNode) => { return evalNode.left % evalNode.right; },

		'+': (evalNode: EvaluateNode) => { return evalNode.left + evalNode.right; },
		'-': (evalNode: EvaluateNode) => { return evalNode.left - evalNode.right; },

		'in': (evalNode: EvaluateNode) => { return evalNode.left in evalNode.right; },
		'instanceof': (evalNode: EvaluateNode) => { return evalNode.left instanceof evalNode.right; },

		'<<': (evalNode: EvaluateNode) => { return evalNode.left << evalNode.right; },
		'>>': (evalNode: EvaluateNode) => { return evalNode.left >> evalNode.right; },
		'>>>': (evalNode: EvaluateNode) => { return evalNode.left >>> evalNode.right; },

		'&': (evalNode: EvaluateNode) => { return evalNode.left & evalNode.right; },
		'^': (evalNode: EvaluateNode) => { return evalNode.left ^ evalNode.right; },
		'|': (evalNode: EvaluateNode) => { return evalNode.left | evalNode.right; },

		'**': (evalNode: EvaluateNode) => { return evalNode.left ** evalNode.right; },
		'%%': (evalNode: EvaluateNode) => { return ((evalNode.left % evalNode.right) + evalNode.right) % evalNode.right; },
		'>?': (evalNode: EvaluateNode) => { return evalNode.left > evalNode.right ? evalNode.left : evalNode.right; },
		'<?': (evalNode: EvaluateNode) => { return evalNode.left > evalNode.right ? evalNode.right : evalNode.left; },
		'<=>': (evalNode: EvaluateNode) => {
			if ((evalNode.left === null || evalNode.right === null) || (typeof evalNode.left != typeof evalNode.right)) {
				return null;
			}
			if (typeof evalNode.left === 'string') {
				return evalNode.left.localeCompare(evalNode.right);
			} else {
				if (evalNode.left > evalNode.right) {
					return 1;
				} else if (evalNode.left < evalNode.right) {
					return -1;
				}
				return 0;
			}
		}
	};
	set(context: object, value: any) {
		throw new Error(`BinaryExpression#set() for operator:(${this.operator}) has no implementation.`);
	}
	get(stack: Stack): any {
		const evalNode: EvaluateNode = {
			left: this.left.get(stack),
			right: this.right.get(stack)
		};
		return BinaryExpression.Evaluations[this.operator](evalNode);
	}
}
