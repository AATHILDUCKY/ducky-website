import { Children, isValidElement, createElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import { codeLanguage, highlightCode } from '@/lib/syntax';
import { normalizeMarkdownFences } from '@/lib/markdown-tools';
import type { RootContent } from 'hast';
function tokens(nodes: RootContent[]): ReactNode {
  return nodes.map((node, index) =>
    node.type === 'text'
      ? node.value
      : node.type === 'element'
        ? createElement(
            node.tagName,
            {
              key: index,
              className: Array.isArray(node.properties.className)
                ? node.properties.className.join(' ')
                : undefined,
            },
            tokens(node.children as RootContent[]),
          )
        : null,
  );
}
function CodePre({ children }: { children?: ReactNode }) {
  const element = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: ReactNode }>(element))
    return <pre>{children}</pre>;
  const code = String(element.props.children || '').replace(/\n$/, '');
  const language = codeLanguage((element.props.className || '').replace('language-', ''));
  return (
    <CodeBlock code={code} language={language}>
      <code className={'hljs language-' + language}>{tokens(highlightCode(code, language))}</code>
    </CodeBlock>
  );
}
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ pre: CodePre }}>
        {normalizeMarkdownFences(content)}
      </ReactMarkdown>
    </div>
  );
}
