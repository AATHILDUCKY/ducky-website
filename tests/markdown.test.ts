import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { normalizeMarkdownFences } from '../lib/markdown-tools';
import { codeLanguage, highlightCode } from '../lib/syntax';
import { Markdown } from '../components/markdown';
test('apostrophe code fences normalize without changing Python triple quotes inside backtick fences', () => {
  assert.equal(
    normalizeMarkdownFences("'''python\nprint('hello')\n'''"),
    "```python\nprint('hello')\n```",
  );
  const python = "```python\ntext = '''\nhello\n'''\n```";
  assert.equal(normalizeMarkdownFences(python), python);
});
test('language aliases resolve predictably and unknown or oversized code remains plain readable text', () => {
  for (const [alias, name] of Object.entries({
    js: 'javascript',
    tsx: 'typescript',
    py: 'python',
    sh: 'bash',
    html: 'xml',
    yml: 'yaml',
    'c++': 'cpp',
    code: 'plaintext',
  }))
    assert.equal(codeLanguage(alias), name);
  assert.equal(codeLanguage('untrusted-language'), 'plaintext');
  assert.ok(highlightCode('const answer = 42;', 'javascript').some((n) => n.type === 'element'));
  const large = 'x'.repeat(40001);
  assert.equal(highlightCode(large, 'javascript')[0].type, 'text');
});
test('published code is escaped, highlighted, labeled, and copyable alongside GFM tables', () => {
  const html = renderToStaticMarkup(
    createElement(Markdown, {
      content:
        "'''javascript\nconst text = '<script>alert(1)</script>';\n'''\n\n| Item | Value |\n| --- | --- |\n| A | 1 |",
    }),
  );
  assert.ok(html.includes('hljs-keyword'));
  assert.ok(html.includes('Copy code'));
  assert.ok(html.includes('language-javascript'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert('));
  assert.ok(html.includes('<table>'));
});
