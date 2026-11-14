import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import diff from 'highlight.js/lib/languages/diff';
import powershell from 'highlight.js/lib/languages/powershell';
import plaintext from 'highlight.js/lib/languages/plaintext';
export const syntax = createLowlight({
  javascript,
  typescript,
  python,
  bash,
  json,
  css,
  xml,
  sql,
  yaml,
  go,
  rust,
  java,
  c,
  cpp,
  csharp,
  php,
  dockerfile,
  diff,
  powershell,
  plaintext,
});
const aliases: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  html: 'xml',
  svg: 'xml',
  yml: 'yaml',
  'c++': 'cpp',
  'c#': 'csharp',
  ps1: 'powershell',
  docker: 'dockerfile',
  text: 'plaintext',
  txt: 'plaintext',
  code: 'plaintext',
};
export const codeLanguages = [
  ['plaintext', 'Plain text'],
  ['javascript', 'JavaScript / JSX'],
  ['typescript', 'TypeScript / TSX'],
  ['python', 'Python'],
  ['bash', 'Bash / Shell'],
  ['json', 'JSON'],
  ['css', 'CSS'],
  ['xml', 'HTML / XML'],
  ['sql', 'SQL'],
  ['yaml', 'YAML'],
  ['go', 'Go'],
  ['rust', 'Rust'],
  ['java', 'Java'],
  ['c', 'C'],
  ['cpp', 'C++'],
  ['csharp', 'C#'],
  ['php', 'PHP'],
  ['dockerfile', 'Dockerfile'],
  ['diff', 'Diff'],
  ['powershell', 'PowerShell'],
] as const;
for (const [alias, name] of Object.entries(aliases)) syntax.registerAlias(name, alias);
export function codeLanguage(value: string) {
  const name = (value || 'plaintext').toLowerCase();
  return aliases[name] || (syntax.registered(name) ? name : 'plaintext');
}
export function highlightCode(code: string, language: string) {
  // Avoid expensive parsing on exceptionally large blocks; content remains readable and copyable.
  return syntax.highlight(code.length > 40000 ? 'plaintext' : codeLanguage(language), code)
    .children;
}
