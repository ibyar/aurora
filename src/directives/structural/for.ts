import { Directive, Input, StructuralDirective } from '@ibyar/core';

export class ForContext<T> {
	constructor(public $implicit: T, public forOf: T[], public index: number, public count: number) { }

	get first(): boolean {
		return this.index === 0;
	}

	get last(): boolean {
		return this.index === this.count - 1;
	}

	get even(): boolean {
		return this.index % 2 === 0;
	}

	get odd(): boolean {
		return !this.even;
	}
}

@Directive({
	selector: '*forOf',
})
export class ForOfDirective<T> extends StructuralDirective {

	private _forOf: T[] | null | undefined;

	@Input('of')
	set forOf(forOf: T[] | null | undefined) {
		this._forOf = forOf;
		this._updateUI();
	}

	private _updateUI() {
		this.viewContainerRef.clear();
		if (!this._forOf) {
			return;
		}
		this._forOf.forEach((value, index, array) => {
			const context = new ForContext<T>(value, array, index, array.length);
			this.viewContainerRef.createEmbeddedView(this.templateRef, context);
		});
	}

}

@Directive({
	selector: '*forAwait',
})
export class ForAwaitDirective<T> extends StructuralDirective {

	private _forAwait: AsyncIterable<T> | null | undefined;

	@Input('of')
	set forAwait(forAwait: AsyncIterable<T> | null | undefined) {
		this._forAwait = forAwait;
		this._updateUI();
	}

	private async _updateUI() {
		this.viewContainerRef.clear();
		if (!this._forAwait) {
			return;
		}
		const previousContext: ForContext<T>[] = [];
		const asList: T[] = [];
		let index = 0;
		for await (const iterator of this._forAwait) {
			asList.push(iterator);
			const context = new ForContext<T>(iterator, asList, index, asList.length);
			const view = this.viewContainerRef.createEmbeddedView(this.templateRef, context);
			previousContext.forEach(c => c.count = asList.length);
			previousContext.push(view.context);
			index++;
		}
	}

}

@Directive({
	selector: '*forIn',
})
export class ForInDirective<T = { [key: PropertyKey]: any }> extends StructuralDirective {

	private _forIn: T | null | undefined;

	@Input('in')
	set forIn(forIn: T | null | undefined) {
		this._forIn = forIn;
		this._updateUI();
	}

	private _updateUI() {
		this.viewContainerRef.clear();
		if (!this._forIn) {
			return;
		}
		const keys = Object.keys(this._forIn) as PropertyKey[];
		keys.forEach((key, index, array) => {
			const context = new ForContext<PropertyKey>(key, array, index, array.length);
			this.viewContainerRef.createEmbeddedView(this.templateRef, context);
		});
	}

}
