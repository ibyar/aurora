import type { Scope } from './scope.js';

export class FunctionProxyHandler<T extends Function> implements ProxyHandler<T> {
	constructor(private thisContext: any) { }
	apply(targetFunc: T, thisArg: any, argArray: any[]): any {
		return targetFunc.apply(this.thisContext, argArray);
	}
}

/**
 * crete new proxy handler object as scoped context
 */
export class ScopeProxyHandler<T extends object> implements ProxyHandler<T> {
	private proxyMap = new Map<PropertyKey, T>();
	private proxyValueMap = new WeakMap<object, object>();
	constructor(private scope: Scope<T>) { }
	has(model: T, propertyKey: PropertyKey): boolean {
		return this.scope.has(propertyKey);
	}
	get(model: T, propertyKey: PropertyKey, receiver: any): any {
		if (this.proxyMap.has(propertyKey)) {
			return this.proxyMap.get(propertyKey);
		}
		const value = this.scope.get(propertyKey);
		if (typeof value === 'object') {
			const scope = this.scope.getScope(propertyKey);
			if (scope) {
				const proxy = new Proxy(value, new ScopeProxyHandler(scope));
				this.proxyMap.set(propertyKey, proxy);
				this.proxyValueMap.set(proxy, value);
				return proxy;
			}
		} else if (typeof value === 'function') {
			const proxy = new Proxy(value, new FunctionProxyHandler(this.scope.getContext()));
			this.proxyMap.set(propertyKey, proxy);
			this.proxyValueMap.set(proxy, value);
			return proxy;
		}
		return value;
	}
	set(model: T, propertyKey: PropertyKey, value: any, receiver: any): boolean {
		if (this.proxyValueMap.has(value)) {
			value = this.proxyValueMap.get(value);
		}
		return this.scope.set(propertyKey, value);
	}
	deleteProperty(model: T, propertyKey: string | symbol): boolean {
		const isDelete = Reflect.deleteProperty(model, propertyKey);
		if (isDelete) {
			this.scope.set(propertyKey, undefined);
			if (this.proxyMap.has(propertyKey)) {
				this.proxyMap.delete(propertyKey);
			}
		}
		return isDelete;
	}
}

export type RevocableProxy<T> = {
	proxy: T;
	revoke: () => void;
};

export function createRevocableProxyForContext<T extends object>(context: T, scope: Scope<T>): RevocableProxy<T> {
	return Proxy.revocable<T>(context, new ScopeProxyHandler(scope));
}

export function createProxyForContext<T extends object>(context: T, scope: Scope<T>): T {
	return new Proxy<T>(context, new ScopeProxyHandler(scope));
}
