import { Directive } from '@ibyar/core';
import { ExpressionNode, ForAwaitOfNode, ForInNode, ForNode, ForOfNode } from '@ibyar/expressions';
import { AbstractStructuralDirective } from './structural';

@Directive({
	selector: '*for',
})
export class ForDirective<T> extends AbstractStructuralDirective<T> {

	getStatement() {
		if (/^await ?\(.*\)$/g.test(this.directive.directiveValue)) {
			return `for ${this.directive.directiveValue} { }`;
		} else if (/^await *[cl]$/g.test(this.directive.directiveValue)) {
			const statement = this.directive.directiveValue.substring(5);
			return `for await(${statement}) { }`;
		} else {
			return `for(${this.directive.directiveValue}) { }`;
		}
	}
	getCallback(forNode: ExpressionNode): () => void | Promise<void> {
		let callback: () => void | Promise<void>;
		if (forNode instanceof ForNode) {
			callback = this.handelForNode(forNode);
		} else if (forNode instanceof ForOfNode) {
			callback = this.handelForOfNode(forNode);
		} else if (forNode instanceof ForInNode) {
			callback = this.handelForInNode(forNode);
		} else if (forNode instanceof ForAwaitOfNode) {
			callback = this.handelForAwaitOfNode(forNode);
		} else {
			throw new Error(`syntax error: ${this.directive.directiveValue}`);
		}
		return callback;
	}

	handelForNode(forNode: ForNode) {
		return () => {
			for (
				forNode.getInit()?.get(this.directiveStack);
				forNode.getTest()?.get(this.directiveStack) ?? true;
				forNode.getUpdate()?.get(this.directiveStack)
			) {
				// insert/remove
				this.updateView(this.directiveStack);
			}
		};
	}
	handelForOfNode(forOfNode: ForOfNode): () => void {
		return () => {
			const iterable = <any[]>forOfNode.getRight().get(this.directiveStack);
			for (const iterator of iterable) {
				const stack = this.directiveStack.newStack();
				forOfNode.getLeft().set(stack, iterator);
				this.updateView(stack);
			}
		};
	}
	handelForInNode(forInNode: ForInNode): () => void {
		return () => {
			const iterable = <object>forInNode.getRight().get(this.directiveStack);
			for (const iterator in iterable) {
				const stack = this.directiveStack.newStack();
				forInNode.getLeft().set(stack, iterator);
				this.updateView(stack);
			}
		};
	}
	handelForAwaitOfNode(forAwaitOfNode: ForAwaitOfNode): () => Promise<any> {
		return async () => {
			const iterable: AsyncIterable<any> = forAwaitOfNode.getRight().get(this.directiveStack);
			for await (const iterator of iterable) {
				const stack = this.directiveStack.newStack();
				forAwaitOfNode.getLeft().set(stack, iterator);
				this.updateView(stack);
			}
		};
	}
	onRender(node: ExpressionNode, callback: () => void | Promise<void>) {
		if (!(node instanceof ForAwaitOfNode)) {
			this.renderDOMChild(node, callback);
		} else {
			this.renderAwaitDOMChild(node, callback as () => Promise<void>);
		}
	}
}
