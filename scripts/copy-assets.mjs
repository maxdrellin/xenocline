#!/usr/bin/env node
/**
 * Copy static assets (md, yaml files) from src to dist
 * Replaces the copyfiles dependency with native Node.js fs.cp
 */
import { cp, readdir, mkdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src');
const distDir = join(rootDir, 'dist');

const extensions = ['.md', '.yaml', '.yml'];

async function findFiles(dir, baseDir = dir) {
    const files = [];
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await findFiles(fullPath, baseDir));
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push({
                src: fullPath,
                dest: join(distDir, relative(baseDir, fullPath))
            });
        }
    }
    return files;
}

async function copyAssets() {
    const files = await findFiles(srcDir);
    
    for (const { src, dest } of files) {
        await mkdir(dirname(dest), { recursive: true });
        await cp(src, dest);
    }
}

copyAssets();

