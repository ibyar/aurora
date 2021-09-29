import {
	BaseNode, DOMDirectiveNode, DOMElementNode, DOMFragmentNode, DOMNode,
	DOMParentNode, ElementAttribute, LiveAttribute, LiveTextContent
} from '@ibyar/elements';
import { AssignmentExpression, ExpressionNode, JavaScriptParser } from '@ibyar/expressions';
import { HTMLNodeAssignmentExpression, TextNodeAssignmentExpression } from './update.js';

const ThisTextContent = JavaScriptParser.parse('this.textContent');
function parseLiveText(text: LiveTextContent<ExpressionNode>) {
	text.expression = new TextNodeAssignmentExpression(ThisTextContent, JavaScriptParser.parse(text.value));
}

function convertToMemberAccessStyle(source: string) {
	const dashSplits = source.split('-');
	if (dashSplits.length === 1) {
		return source;
	}
	return dashSplits[0] + dashSplits.splice(1).map(s => (s[0].toUpperCase() + s.substring(1))).join('');
}

/**
 * warp js code with `()` if necessary
 * 
 * `{name: 'alex'}` will be `({name: 'alex'})`
 * 
 * @param params 
 */
function checkAndValidateObjectSyntax(source: string) {
	if (source.startsWith('{')) {
		return `(${source})`;
	}
	return source;
}
function parseLiveAttribute(attr: LiveAttribute<ExpressionNode>) {
	const elementSource = `this.${convertToMemberAccessStyle(attr.name)}`;
	const elementExpression = JavaScriptParser.parse(elementSource);
	const modelExpression = JavaScriptParser.parse(checkAndValidateObjectSyntax(attr.value));

	attr.expression = new HTMLNodeAssignmentExpression(elementExpression, modelExpression);
	attr.callbackExpression = new AssignmentExpression('=', modelExpression, elementExpression);
}

function parseLiveAttributeUpdateElement(attr: LiveAttribute<ExpressionNode>) {
	const elementSource = `this.${convertToMemberAccessStyle(attr.name)}`;
	const elementExpression = JavaScriptParser.parse(elementSource);
	const modelExpression = JavaScriptParser.parse(checkAndValidateObjectSyntax(attr.value));
	attr.expression = new HTMLNodeAssignmentExpression(elementExpression, modelExpression);
}

function parseOutputExpression(attr: ElementAttribute<string, string, ExpressionNode>) {
	attr.expression = JavaScriptParser.parse(attr.value);
}

function parseElementAttribute(attr: ElementAttribute<string, any, ExpressionNode>) {
	attr.expression = JavaScriptParser.parse('this.' + convertToMemberAccessStyle(attr.name));
}


function parseBaseNode(base: BaseNode<ExpressionNode>) {
	base.inputs?.forEach(parseLiveAttributeUpdateElement);
	base.outputs?.forEach(parseOutputExpression);
	base.twoWayBinding?.forEach(parseLiveAttribute);
	base.templateAttrs?.forEach(parseLiveAttribute);
	base.attributes?.forEach(parseElementAttribute);
	parseDomParentNode(base);
}

function parseChild(child: DOMNode<ExpressionNode>) {
	if (child instanceof DOMElementNode) {
		// DomElementNode
		parseBaseNode(child);
	} else if (child instanceof DOMDirectiveNode) {
		// DomDirectiveNode
		parseDomParentNode(child);
	} else if (child instanceof LiveTextContent) {
		parseLiveText(child);
	}
}
function parseDomParentNode(parent: DOMParentNode<ExpressionNode>) {
	parent.children?.forEach(parseChild);
}

export function buildExpressionNodes(node: DOMNode<ExpressionNode>) {
	if (node instanceof DOMFragmentNode) {
		parseDomParentNode(node);
	} else {
		parseChild(node);
	}
}
