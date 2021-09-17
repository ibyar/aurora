import { ReactiveScope, ScopeType } from '@ibyar/expressions';


export class ElementModelReactiveScope<T extends { [key: PropertyKey]: any }> extends ReactiveScope<T> {
	static for<T extends object>(context: T, type: ScopeType) {
		return new ElementModelReactiveScope(context, type);
	}
	static blockScopeFor<T extends object>(context: T) {
		return new ElementModelReactiveScope(context, 'block');
	}
	static functionScopeFor<T extends object>(context: T) {
		return new ElementModelReactiveScope(context, 'function');
	}
	static classScopeFor<T extends object>(context: T) {
		return new ElementModelReactiveScope(context, 'class');
	}
	static moduleScopeFor<T extends object>(context: T) {
		return new ElementModelReactiveScope(context, 'module');
	}
	static globalScopeFor<T extends object>(context: T) {
		return new ElementModelReactiveScope(context, 'global');
	}
	get(propertyKey: PropertyKey): any {
		let value = Reflect.get(this.context, propertyKey);
		if (typeof value === 'function') {
			value = (value as Function).bind(this.context);
		}
		return value;
	}
}