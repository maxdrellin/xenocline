import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: false,
        environment: 'node',
        setupFiles: ['tests/setup.ts'],
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/*.spec.ts'],
            thresholds: {
                branches: 86,
                functions: 68,
                lines: 89,
                statements: 89,
            },
        },
        testTimeout: 30000,
    },
});

