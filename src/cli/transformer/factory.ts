import ts from 'typescript/lib/tsserverlibrary.js';
import { ToCamelCase } from '@ibyar/core/node.js';
import { ClassInfo } from './modules.js';


export function convertToProperties(json: { [key: string]: any }): ts.ObjectLiteralElementLike[] {
	const keys = Object.keys(json);
	return keys.map(key => createProperty(key, json[key]));
}

export function createProperty(name: string, value: any): ts.ObjectLiteralElementLike {
	return ts.factory.createPropertyAssignment(name, createInitializer(value));
}

export function createInitializer(value: any): ts.Expression {
	if (Array.isArray(value)) {
		const elements = value.map(createInitializer);
		return ts.factory.createArrayLiteralExpression(elements);
	}
	switch (typeof value) {
		case 'string': return ts.factory.createStringLiteral(value);
		case 'number': return ts.factory.createNumericLiteral(value);
		case 'bigint': return ts.factory.createBigIntLiteral(value.toString());
		case 'boolean': return value ? ts.factory.createTrue() : ts.factory.createFalse();
		case 'object': {
			if (!value) {
				return ts.factory.createNull();
			}
			const properties = convertToProperties(value);
			return ts.factory.createObjectLiteralExpression(properties);
		};
	}
	return ts.factory.createNull();
}


export function createInterfaceType(viewName: string, extendsType: string) {
	const identifier = ts.factory.createIdentifier(extendsType);
	const expressionWithTypeArguments = ts.factory.createExpressionWithTypeArguments(identifier, undefined);
	const heritageClause = ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [expressionWithTypeArguments]);
	return ts.factory.createInterfaceDeclaration(undefined, viewName, undefined, [heritageClause], []);
	// const exportModifier: ts.ModifierSyntaxKind = ts.SyntaxKind.ExportKeyword;
	// const modifier = ts.factory.createModifier(exportModifier);
	// return ts.factory.createInterfaceDeclaration([modifier], viewName, undefined, [heritageClause], []);
}

export function createTypeLiteral(typeName: string) {
	const members: ts.TypeElement[] = [
		ts.factory.createConstructSignature(undefined, [], ts.factory.createTypeReferenceNode(typeName)),
		ts.factory.createPropertySignature(
			[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
			'prototype',
			undefined,
			ts.factory.createTypeReferenceNode(typeName)
		),
	];
	return ts.factory.createTypeLiteralNode(members);
}

/**
 * create view constructor interface of Type `T`
 * 
 * ```ts
 * interface ConstructorOfView<T> {
 * 	new(): T;
 * 	readonly prototype: T;
 * }
 * ```
 */
export function createConstructorOfViewInterfaceDeclaration() {
	const typeParameter = ts.factory.createTypeParameterDeclaration(undefined, 'T');
	const members: ts.TypeElement[] = [
		ts.factory.createConstructSignature(undefined, [], ts.factory.createTypeReferenceNode('T')),
		ts.factory.createPropertySignature(
			[ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
			'prototype',
			undefined,
			ts.factory.createTypeReferenceNode('T')
		),
	];
	return ts.factory.createInterfaceDeclaration(undefined, 'ConstructorOfView', [typeParameter], undefined, members);
}

export function createStaticPropertyViewType(typeName: string) {
	const typeArgument = ts.factory.createTypeReferenceNode(typeName);
	return ts.factory.createTypeReferenceNode('ConstructorOfView', [typeArgument]);
}


export function generateStatements(sourceText: string, scriptTarget = ts.ScriptTarget.ES2020, scriptKind = ts.ScriptKind.TS): ts.NodeArray<ts.Statement> {
	return ts.createSourceFile('temp', sourceText, scriptTarget, false, scriptKind).statements;
}

export function generateNode<T = ts.Node>(sourceText: string, scriptTarget = ts.ScriptTarget.ES2020, scriptKind = ts.ScriptKind.TS): T {
	return generateStatements(sourceText, scriptTarget, scriptKind)[0] as T;
}

/**
 * declare global {
	interface HTMLElementTagNameMap {
		'user-view': HTMLUserViewElement;
	}
}
 */

export function updateGlobalHTMLElementTagNameMap(views: { tagName: string, viewName: string }[]): ts.NodeArray<ts.Statement> {
	const sourceCode = `
		declare global {
			interface HTMLElementTagNameMap {
				${views.map(view => `['${view.tagName}']: ${view.viewName};`).join('\n')}
			}
		}`;
	return generateStatements(sourceCode);
}

export function updateModule(classes: ClassInfo[]): ts.NodeArray<ts.Statement> {

	const viewClassDeclarations = classes.map(c => {
		const inputs = Object.keys(c.inputs);
		const outputs = Object.keys(c.outputs).map(output => 'on' + ToCamelCase(output));
		const attributes = [...inputs, ...outputs].map(s => `'${s}'`).join(' | ');
		const interfaceBody = `
			public static observedAttributes: [${attributes}];

			${inputs.map(input => `public ${input}: ${c.inputs[input]};`).join('\n')}

			${Object.keys(c.outputs).map(output => `public on${ToCamelCase(output)}: ${c.outputs[output]};`).join('\n')}
			
		`;
		// need to fix @FormValue type;
		return c.views.map(view => `
			declare class ${view.viewName} extends ${view.extendsType} {
				${interfaceBody.trim()}
			}
			declare interface ${view.viewName} extends ${view.formAssociated ? `BaseFormAssociatedComponent<${c.name}>, ` : ''}BaseComponent<${c.name}> {}
		`);
	});
	const views = classes.flatMap(c => c.views.map(v => ({ tagName: v.selector, viewName: v.viewName })));
	const sourceCode = `
		import { BaseComponent, BaseFormAssociatedComponent, ConstructorOfView } from '@ibyar/core';
		${viewClassDeclarations.join('\n')}
		declare global {
			interface HTMLElementTagNameMap {
				${views.map(view => `['${view.tagName}']: ${view.viewName};`).join('\n')}
			}
		}`;
	return generateStatements(sourceCode);
}