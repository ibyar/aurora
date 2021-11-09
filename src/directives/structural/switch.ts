import { Directive, Input } from '@ibyar/core';
import { DOMChild, DOMDirectiveNode, DOMParentNode } from '@ibyar/elements';
import { ExpressionNode, JavaScriptParser, SwitchStatement } from '@ibyar/expressions';
import { AbstractStructuralDirective } from './structural.js';


@Directive({
	selector: '*case',
})
@Directive({
	selector: '*default',
})
export class DefaultSwitchCaseDirective {

}

@Directive({
	selector: '*switch',
})
export class SwitchDirective extends AbstractStructuralDirective {

	@Input('switch')
	expression: string;

	caseElements: DOMDirectiveNode[] = [];
	caseExpressions: ExpressionNode[] = [];
	defaultElement: DOMDirectiveNode;

	getStatement() {
		return `switch(${this.expression}) { }`;
	}
	getCallback(switchNode: ExpressionNode): () => void {
		const directiveChildren = (this.node as DOMParentNode).children as DOMDirectiveNode[];
		for (const child of directiveChildren) {
			if (child.name === '*case') {
				this.caseElements.push(child);
			} else if (child.name === '*default') {
				if (this.defaultElement) {
					throw new Error(`syntax error: multiple default directive in switch case ${this.expression}`);
				}
				this.defaultElement = child;
			}
		}
		for (const directive of this.caseElements) {
			this.caseExpressions.push(JavaScriptParser.parse(String(directive.value)));
		}
		this.directiveStack.pushFunctionScope();
		let callback: () => void;
		if (switchNode instanceof SwitchStatement) {
			callback = () => {
				const expressionValue = switchNode.getDiscriminant().get(this.directiveStack);
				let child: DOMDirectiveNode | undefined;
				for (let i = 0; i < this.caseExpressions.length; i++) {
					const value = this.caseExpressions[i].get(this.directiveStack);
					if (value === expressionValue) {
						child = this.caseElements[i];
						break;
					}
				}
				if (!child) {
					if (this.defaultElement) {
						child = this.defaultElement;
					} else {
						return;
					}
				}
				this.appendNodeToParent(child.node, this.directiveStack);
			};
		} else {
			throw new Error(`syntax error: ${this.expression}`);
		}
		return callback;
	}
}
