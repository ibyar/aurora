import { AfterViewInit, Component, ExpressionNode, JavaScriptAppParser, OnInit, Scope, ScopeContext, Stack, ViewChild } from '@ibyar/aurora';
import { debounceTime, distinctUntilChanged, fromEvent, map } from 'rxjs';

const styles = `
	.content {
		flex: 1;
		display: flex;
	}

	.box {
		display: flex;
		min-height: min-content;
	}

	.column {
		padding: 20px;
		border-right: 1px solid #999;
		overflow-y: auto;
	}

	.column > pre, textarea {
		height: 750px;
		overflow: unset !important;
	}
`;

@Component({
	selector: 'expression-editor',
	template: `
		<div class="content w-100 h-100">
			<div class="box">
				<div class="column">Selector</div>
				<div class="column"><textarea #editor cols="40" rows="700">...</textarea></div>
				<div class="column">
					<div class="d-flex flex-column">
						<pre class="text-success">{{str}}</pre>
						<button class="btn btn-outline-primary" (click)="executeCode()">Run</button>
						<pre class="text-secondary" #logs></pre>
						<pre class="text-danger" #error></pre>
					</div>
				</div>
				<div class="column"><pre>{{ast}}</pre></div>
			</div>
		</div>
		`,
	styles: styles,
})
export class ExpressionEditorComponent implements OnInit, AfterViewInit {

	ast = '';
	str = '';

	node: ExpressionNode;

	@ViewChild('editor')
	editor: HTMLTextAreaElement;

	@ViewChild('logs')
	logs: HTMLPreElement;

	@ViewChild('error')
	error: HTMLPreElement;

	onInit(): void {
		import('./expression.spec.js')
			.then(module => this.loadCode(module.default))
			.then(code => this.editor.value = code!);
	}

	afterViewInit(): void {
		fromEvent(this.editor, 'change')
			.pipe(
				map(() => this.editor.value),
				debounceTime(400),
				distinctUntilChanged(),
			).subscribe(code => this.loadCode(code))
	}

	loadCode(code: string | null | undefined) {
		if (!code) {
			this.ast = '';
			this.str = '';
			return;
		}
		try {
			const node = JavaScriptAppParser.parse(code);
			this.ast = JSON.stringify(node.toJSON(), undefined, 2);
			this.str = node.toString();
			this.node = node;
		} catch (e: any) {
			this.error.innerText = e.stack;
			throw e;
		}
		return code;
	}

	executeCode() {
		this.logs.innerText = '';
		this.error.innerText = '';
		try {
			const mockConsole = {
				log: (...data: any[]): void => {
					this.logs.innerText += data.join('\t') + '\n';
					console.log(...data);
				},
			};
			mockConsole.log('run code...');
			const context: ScopeContext = { console: mockConsole };
			const stack = new Stack(Scope.for(context));
			this.node.get(stack);
		} catch (e: any) {
			this.error.innerText = e.stack;
			throw e;
		}
	}

}