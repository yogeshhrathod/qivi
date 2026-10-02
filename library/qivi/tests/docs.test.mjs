import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

test('documented React examples typecheck against the built public package', () => {
  const markdown = readFileSync(new URL('../docs/performance.md', import.meta.url), 'utf8');
  const examples = [...markdown.matchAll(/```tsx\n([\s\S]*?)```/g)];
  assert.ok(examples.length >= 3);
  for (const [i, match] of examples.entries()) {
    const filename = fileURLToPath(new URL(`../docs/example-${i}.tsx`, import.meta.url));
    const options = { strict: true, skipLibCheck: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (path, languageVersion, ...rest) => path === filename ? ts.createSourceFile(path, match[1], languageVersion, true, ts.ScriptKind.TSX) : getSourceFile(path, languageVersion, ...rest);
    const program = ts.createProgram([filename], options, host);
    const errors = ts.getPreEmitDiagnostics(program);
    assert.equal(errors.length, 0, ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: p => p, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }));
  }
});
