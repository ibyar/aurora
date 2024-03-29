import { ScopeSubscription } from '@ibyar/expressions';

export function createDestroySubscription(unsubscribe: () => void, pause?: () => void, resume?: () => void): ScopeSubscription<void> {
	return {
		pause(): void {
			pause?.();
		},
		resume(): void {
			resume?.();
		},
		unsubscribe(): void {
			unsubscribe();
		},
	} as ScopeSubscription<void>;
}
