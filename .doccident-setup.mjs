/* eslint-disable no-console */
import { transformSync } from '@swc/core';
// eslint-disable-next-line import/extensions
import * as Xenocline from './dist/xenocline.js';

export default {
    "globals": {
        "exports": {
            "Xenocline": Xenocline
        },
        "console": {
            "log": console.log,
            "error": console.error,
            "warn": console.warn,
            "info": console.info,
            "debug": console.debug
        }
    },
    "require": {
        '@girverket/xenocline': Xenocline
    },
    transformCode: (code) => {
        // Transform TypeScript code to JavaScript for doccident documentation testing
        const result = transformSync(code, {
            filename: 'test.ts',
            jsc: {
                parser: {
                    syntax: 'typescript',
                },
                target: 'es2024',
            },
            module: {
                type: 'commonjs',
            },
        });

        return result?.code;
    }
}
