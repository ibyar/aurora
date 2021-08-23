import type { NodeDeserializer, ExpressionNode, NodeExpressionClass } from '../expression.js';

type FromJSON = (node: ExpressionNode, deserializer: NodeDeserializer) => ExpressionNode;

const DeserializerMap: Map<string, FromJSON> = new Map();


export function Deserializer(type: string): Function {
	return (target: NodeExpressionClass<ExpressionNode>) => {
		DeserializerMap.set(type, target.fromJSON);
		Reflect.set(target, 'type', type)
		return target;
	};
}

export function serializeNode(node: ExpressionNode) {
	return JSON.stringify(node);
}


/**
 * convert from json expression `JSON.stringify(node)` or `serializeNode` to `ExpressionNode`
 * @param node as type `NodeJsonType`
 * @returns ExpressionNode
 */
export function deserialize(node: ExpressionNode) {
	const fromJSON = DeserializerMap.get((<any>node).type);
	if (fromJSON) {
		return fromJSON(node, deserialize);
	} else {
		throw new Error(`Couldn't find Expression class for name: ${JSON.stringify(node)}.`);
	}
}

export function deserializeNode(node: string) {
	const exp = JSON.parse(node);
	return deserialize(exp);
}
