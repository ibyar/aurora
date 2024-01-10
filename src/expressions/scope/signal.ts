import { ReactiveScope } from './scope.js';

type CleanupFn = () => void;
type CleanupRegister = (cleanupFn?: CleanupFn) => void;

function compute<T>(updateFn: () => T): T | unknown {
	try {
		return updateFn();
	} catch (error) {
		return error;
	}
}

export class SignalScope extends ReactiveScope<Array<any>> {

	private state: number[][] = [];
	private watch = true;

	constructor() {
		super([]);
	}

	createSignal<T>(initValue: T): Signal<T> {
		const signal = new Signal<T>(this, this.getContext().length, initValue);
		Signal.bindFn(signal);
		return signal;
	}
	createSignalFn<T>(initValue: T) {
		const signal = new Signal<T>(this, this.getContext().length, initValue);
		return Signal.writable(signal);
	}

	createLazy<T>(updateFn: () => T): Lazy<T> {
		const lazy = new Lazy<T>(this, this.getContext().length, updateFn);
		Lazy.bindFn(lazy);
		return lazy;
	}

	createLazyFn<T>(updateFn: () => T) {
		const lazy = new Lazy<T>(this, this.getContext().length, updateFn);
		return Lazy.lazy(lazy);
	}

	createComputed<T>(updateFn: () => T): Computed<T> {
		const index = this.getContext().length;
		this.watchState();
		const value = compute(updateFn);
		const computed = new Computed<T>(this, index, value as T);
		Computed.bindFn(computed);
		const observeComputed = () => {
			this.watchState();
			const value = compute(updateFn);
			const state = this.readState();
			this.restoreState();
			Object.keys(subscriptions)
				.filter(index => !state.includes(+index))
				.forEach(index => subscriptions[index].pause());
			state.forEach(index => {
				subscriptions[index]?.resume();
				subscriptions[index] ??= this.subscribe(index, observeComputed);
			});
			this.set(index, value);
		};
		const subscriptions = this.observeState(observeComputed);
		this.restoreState();
		return computed;
	}

	createComputedFn<T>(updateFn: () => T) {
		const computed = this.createComputed(updateFn);
		return Computed.computed(computed);
	}

	createEffect(effectFn: (onCleanup?: CleanupFn) => void): { destroy(): void } {
		let cleanupFn: (() => void) | undefined;
		let isCleanupRegistered = false;
		const cleanupRegister: CleanupRegister = onClean => {
			cleanupFn = onClean;
			isCleanupRegistered = true;
		};
		const callback = () => {
			isCleanupRegistered = false;
			const error = compute(() => effectFn(cleanupRegister)) as any;
			if (error instanceof Error) {
				console.error(error);
			}
			if (!isCleanupRegistered) {
				cleanupFn = undefined;
			}
		};
		this.watchState();
		callback();
		const observeComputed = () => {
			cleanupFn?.();
			this.watchState();
			callback();
			const state = this.readState();
			this.restoreState();
			Object.keys(subscriptions)
				.filter(index => !state.includes(+index))
				.forEach(index => subscriptions[index].pause());
			state.forEach(index => {
				subscriptions[index]?.resume();
				subscriptions[index] ??= this.subscribe(index, observeComputed);
			});
		};
		const subscriptions = this.observeState(observeComputed);
		this.restoreState();
		return {
			destroy: () => {
				Object.values(subscriptions).forEach(sub => sub.unsubscribe());
				cleanupFn?.();
			},
		};
	}

	watchState() {
		this.state.push([]);
	}

	untrack() {
		this.watch = false;
	}

	observeIndex(index: number) {
		if (this.watch) {
			this.state.at(-1)?.push(index);
		}
	}

	track() {
		this.watch = true;
	}

	readState() {
		return this.state.at(-1) ?? [];
	}

	observeState(updateFn: () => void) {
		return Object.fromEntries(this.readState().map(index => [index, this.subscribe(index, updateFn)]));
	}

	restoreState() {
		this.state.pop();
	}

}

export abstract class ReactiveNode<T> {
	abstract get(): T;
}

const SIGNAL = Symbol('Signal');

export interface Reactive<T> {
	[SIGNAL]: ReactiveNode<T>;
}

export function isReactive<T = any>(value: unknown): value is Reactive<T> {
	const node = (value as Partial<Reactive<T>>)[SIGNAL];
	return node !== undefined && node instanceof ReactiveNode;
}


export class Computed<T> extends ReactiveNode<T> {

	static bindFn<T>(instance: Computed<T>) {
		instance.get = instance.get.bind(instance);
	}

	static computed<T>(instance: Computed<T>) {
		const fn = () => instance.get();
		(fn as any)[SIGNAL] = instance;
		return fn;
	}

	#index: number;
	#scope: SignalScope;

	constructor(scope: SignalScope, index: number, initValue: T) {
		super();
		this.#scope = scope;
		this.#index = index;
		scope.set(index, initValue);
	}

	get(): T {
		this.#scope.observeIndex(this.#index);
		return this.#scope.get(this.#index);
	}

}

export class Lazy<T> extends ReactiveNode<T> {

	static bindFn<T>(instance: Lazy<T>) {
		instance.get = instance.get.bind(instance);
	}

	static lazy<T>(instance: Lazy<T>) {
		const fn = () => instance.get();
		(fn as any)[SIGNAL] = instance;
		return fn;
	}

	#index: number;
	#scope: SignalScope;
	#updateFn: () => T;

	constructor(scope: SignalScope, index: number, updateFn: () => T) {
		super();
		this.#scope = scope;
		this.#index = index;
		this.#updateFn = updateFn;
		scope.set(index, compute(updateFn) as T);
	}

	override get(): T {
		const value = compute(this.#updateFn);
		this.#scope.set(this.#index, value);
		this.#scope.observeIndex(this.#index);
		return this.#scope.get(this.#index);
	}

}

export class Signal<T> extends ReactiveNode<T> {

	static bindFn<T>(instance: Signal<T>) {
		instance.get = instance.get.bind(instance);
		instance.set = instance.set.bind(instance);
		instance.update = instance.update.bind(instance);
	}

	static writable<T>(instance: Signal<T>) {
		const fn = () => instance.get();
		fn.set = (value: T) => instance.set(value);
		fn.update = (updateFn: (value: T) => T) => instance.update(updateFn);
		(fn as any)[SIGNAL] = instance;
		return fn;
	}

	#index: number;
	#scope: SignalScope;

	constructor(scope: SignalScope, index: number, initValue: T) {
		super();
		this.#scope = scope;
		this.#index = index;
		scope.set(index, initValue);
	}

	get(): T {
		this.#scope.observeIndex(this.#index);
		return this.#scope.get(this.#index);
	}

	set(value: T) {
		this.#scope.set(this.#index, value);
	}

	update(updateFn: (value: T) => T): void {
		this.set(updateFn(this.get()));
	}

}
