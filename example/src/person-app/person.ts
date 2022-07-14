import {
	Component, EventEmitter, HostBinding, HostListener,
	Input, OnInit, Optional, Output, SelfSkip, Service,
	View, ViewChild, ViewChildren
} from '@ibyar/aurora';

@Service({ provideIn: 'root' })
export class LogService {
	constructor() { }
	info(message: string) {
		let date = new Date();
		console.log(
			`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} -- ${message}`
		);
	}
}

export interface Person {
	name: string;
	age: number;
}

@Component({
	selector: 'person-view',
	template: `
			<p id="p-name" #nameArea class="{{className}}" onclick="onResize()">
				Person name is {{person.name}}
			</p>
			<p id="p-age" #ageArea>your age is: {{person.age}}, born in Year of {{yearOfBirth}}</p>
			<button class="btn btn-outline-primary" (click)="addOneYear()">Add OneYear</button>
			<div *if="person.age >= 18">
				Can have license
				<p>Data</p>
			</div>`
})
export class PersonModel implements OnInit {

	@Input()
	person: Person = {
		name: 'Delilah',
		age: 24
	};

	@Output() open: EventEmitter<any> = new EventEmitter();
	@Output('select') _select: EventEmitter<any> = new EventEmitter();


	className: string = 'p1 m1';

	@View() view: HTMLElement;

	@ViewChild(HTMLParagraphElement, { id: 'p-name' })
	childName!: HTMLParagraphElement;

	@ViewChild(HTMLParagraphElement, { id: 'p-age' })
	childAge!: HTMLParagraphElement;

	@ViewChildren(HTMLParagraphElement) children: HTMLParagraphElement[];


	@HostBinding('class.valid')
	valid: boolean;

	@HostBinding('class.invalid')
	invalid: boolean;

	constructor(@Optional() private service: LogService, @SelfSkip() private service2: LogService) { }

	onInit(): void {
		console.log('onInit', this);
		this.open.emit('init data');
	}

	get yearOfBirth() {
		return 2021 - this.person.age;
	}

	@HostListener('window:load', ['$event'])
	onLoad(e: Event) {
		console.log(this, e);
	}

	@HostListener('window:resize', ['$event'])
	onResize(e: Event) {
		console.log(this, e);
	}

	@HostListener('click', ['$event.target'])
	onClick(target: HTMLElement) {
		console.log('target', target);
		this._select.emit(this.person);
	}

	@HostListener('select')
	onClose(data: any) {
		console.log('select', data);
	}

	@HostListener('person.age')
	personChange() {
		console.log('age change', this.person.age);
	}

	@Input()
	set resize(msg: string) {
		console.log(this, msg);
	}

	collectData(@Optional() data: Object, @SelfSkip('GG') ddd: Person, @SelfSkip() p: Person): string[] {
		return [];
	}

	addOneYear() {
		this.person.age++;
	}
}

@Component({
	selector: 'person-edit',
	template: `<form #form>
					<input if="show" type="text" [(value)]="person.name" />
					<input type="number" [(value)]="person.age" />
					<input type="button" (click)="printPerson()" value="Save" />
				</form>`
})
export class PersonEdit {
	@Input()
	person: Person;

	@Input()
	show = true;

	@Output()
	save = new EventEmitter<Person>();

	printPerson() {
		console.log(this.person);
		this.save.emit(this.person);
	}
}


@Component({
	selector: 'progress-bar',
	template: '<progress [min]="min" [max]="max" [value]="value" ></progress>'
})
export class ProgressBar {

	@Input()
	min: number;

	@Input()
	max: number;

	@Input()
	value: number;

}
