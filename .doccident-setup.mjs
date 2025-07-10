/* eslint-disable no-console */
import { transform } from '@babel/core';
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
        '@maxdrellin/xenocline': Xenocline
    },
    transformCode: (code) => {
        // Transform TypeScript code to JavaScript for doccident documentation testing
        const transformedCode = transform(code, {
            filename: 'test.ts',
            presets: ['@babel/preset-typescript'],
            plugins: [
                '@babel/plugin-transform-typescript',
                '@babel/plugin-transform-modules-commonjs'
            ],
            comments: true // Preserve comments
        })?.code;

        return transformedCode;
    }
}
