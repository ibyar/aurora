
import { TemplateRef } from '../linker/template-ref.js';
import { ViewContainerRef } from '../linker/view-container-ref.js';

/**
 * A structural directive selector as '*if' '*for'
 */
export class StructuralDirective {
	constructor(
		protected templateRef: TemplateRef,
		protected viewContainerRef: ViewContainerRef,
	) { }
}

/**
 * An attributes directive selector as '[class] [style]'
 */
export class AttributeDirective {
	constructor(protected el: HTMLElement) { }
}
