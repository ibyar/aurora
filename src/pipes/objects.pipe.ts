import { Pipe, PipeTransform } from '@ibyar/core';

@Pipe({
	name: 'json'
})
export class JSONPipe implements PipeTransform<object, string>{
	transform(obj: object, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string {
		return JSON.stringify(obj, replacer, space);
	}
}


@Pipe({
	name: 'toJson'
})
export class ToJSONPipe implements PipeTransform<string, any>{
	transform(text: string, reviver?: ((this: any, key: string, value: any) => any)): any {
		return JSON.parse(text, reviver);
	}
}


type StringKey<V> = { [key: string]: V };
type NumberKey<V> = { [key: number]: V };

export interface KeyValue<K, V> {
	key: K
	value: V
}

export type CompareFn<K, V> = (a: KeyValue<K, V>, b: KeyValue<K, V>) => number;

@Pipe({
	name: 'keyvalue'
})
export class KeyValuePipe<K, V> implements PipeTransform<StringKey<V> | NumberKey<V> | Map<K, V>, KeyValue<K, V>[]>{
	transform(obj: StringKey<V> | NumberKey<V> | Map<K, V> | Array<V>, compareFn?: CompareFn<K, V>): KeyValue<K, V>[] {
		let pair: KeyValue<K, V>[] = [];
		if (obj instanceof Map) {
			obj.forEach((value, key) => pair.push({ key: key, value: value }));
		} else if (obj instanceof Array) {
			obj.forEach((value, index) => pair.push({ key: index as any, value: value }));
		} else {
			Object.keys(obj).forEach(key => pair.push({ key: key as any, value: Reflect.get(obj, key) }));
		}
		if (compareFn) {
			pair = pair.sort(compareFn);
		}
		return pair;
	}
}
