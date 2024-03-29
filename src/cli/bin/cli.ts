#!/usr/bin/env node

import { exit } from 'process';

const CLI_VERSION = '1.0.1';

const args = process.argv;
const inputs = args.slice(2);

const showHelp = inputs.includes('-h') || inputs.includes('--help');
const printVersion = inputs.includes('-v') || inputs.includes('--version');

const runBuild = inputs.includes('-b') || inputs.includes('--build');
const generateTypes = inputs.includes('-gt') || inputs.includes('--generate-types');

if (showHelp) {
	const help =
		`
Version ${CLI_VERSION}
Usage: ibyar [options]

Examples:
    ibyar
    ibyar -b
    ibyar -gt
    ibyar -v
    ibyar --help

Options:
    -b      --build             compile the project source code with ibyar transformers
    -gt     --generate-types    generate "web-types.json" files, and typescript
	                            definitions '.d.ts' files. 
	                            you can import this file later in your "index.ts" 
								or "polyfills.ts" file, so any editor "VS Code" can
								support autocomplete easily,
    -h      --help              print help message
    -v      --version           output the version number`;
	console.log(help);
	exit();
}


if (printVersion) {
	console.log(CLI_VERSION);
	exit();
}

if (runBuild) {
	import('../compiler/compiler.js').then(module => {
		if (process.argv.includes('-w') || process.argv.includes('--watch')) {
			module.compileAndWatchArgs();
		} else {
			module.compileArgs();
		}
	});
}

if (generateTypes) {
	console.log('generate types not supported yet.');
}
