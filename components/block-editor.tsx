'use client';
import { isImageFile } from '@/lib/image-upload';
import { useEffect, useRef, useState } from 'react';
import {
  useEditor,
  EditorContent,
  useEditorState,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from '@tiptap/react';
import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Plus,
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code2,
  Minus,
  Table2,
  Link2,
  ImagePlus,
  Undo2,
  Redo2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  Check,
  X,
  Text,
} from 'lucide-react';
import { syntax, codeLanguages, codeLanguage } from '@/lib/syntax';
import { looksLikeMarkdown, normalizeMarkdownFences } from '@/lib/markdown-tools';
export type BlockEditorHandle = { insertImage: (url: string, alt: string) => void };
type Props = {
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
  onChooseImage: () => void;
  onError: (message: string) => void;
  onReady: (handle: BlockEditorHandle | null) => void;
  disabled?: boolean;
};
function EditableCode({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <NodeViewWrapper className="block-code" spellCheck={false}>
      <div className="block-code-header" contentEditable={false}>
        <label>
          <Code2 size={15} />
          <select
            aria-label="Code language"
            value={codeLanguage(node.attrs.language || 'plaintext')}
            onChange={(e) => updateAttributes({ language: e.target.value })}
          >
            {codeLanguages.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(node.textContent);
              setCopied(true);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => setCopied(false), 1800);
            } catch {
              setCopied(false);
            }
          }}
          aria-label={copied ? 'Code copied' : 'Copy code'}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <NodeViewContent<'code'> as="code" className="hljs" />
      </pre>
    </NodeViewWrapper>
  );
}
const HighlightedCode = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(EditableCode);
  },
}).configure({
  lowlight: syntax,
  defaultLanguage: 'plaintext',
  enableTabIndentation: true,
  tabSize: 2,
});
const SafeImage = Image.extend({
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) =>
          /^\/media\/[0-9a-f-]{36}$/i.test((element as HTMLElement).getAttribute('src') || '')
            ? null
            : false,
      },
    ];
  },
}).configure({ allowBase64: false });
function formattingState(e: Editor | null) {
  return e
    ? {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        strike: e.isActive('strike'),
        heading2: e.isActive('heading', { level: 2 }),
        heading3: e.isActive('heading', { level: 3 }),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        task: e.isActive('taskList'),
        quote: e.isActive('blockquote'),
        code: e.isActive('codeBlock'),
        table: e.isActive('table'),
        link: e.isActive('link'),
        undo: e.can().undo(),
        redo: e.can().redo(),
        index: e.state.selection.$from.index(0),
        blocks: e.state.doc.childCount,
      }
    : null;
}
export default function BlockEditor({
  value,
  onChange,
  onUpload,
  onChooseImage,
  onError,
  onReady,
  disabled = false,
}: Props) {
  const callbacks = useRef({ onChange, onUpload, onError, onReady });
  callbacks.current = { onChange, onUpload, onError, onReady };
  const currentEditor = useRef<Editor | null>(null);
  const [inserter, setInserter] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false },
      }),
      Markdown,
      HighlightedCode,
      SafeImage,
      Placeholder.configure({ placeholder: 'Write your story, paste Markdown, or add a block…' }),
      TableKit.configure({ table: { resizable: false } }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: normalizeMarkdownFences(value),
    contentType: 'markdown',
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'tiptap prose block-document',
        role: 'textbox',
        'aria-label': 'Writeup block editor',
        'aria-multiline': 'true',
        spellcheck: 'true',
      },
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.files || []).find((f) => isImageFile(f));
        if (file) {
          event.preventDefault();
          callbacks.current.onUpload(file);
          return true;
        }
        const text = event.clipboardData?.getData('text/plain');
        const active = currentEditor.current;
        if (text && active && !active.isActive('codeBlock') && looksLikeMarkdown(text)) {
          event.preventDefault();
          if (text.length > 200000) {
            callbacks.current.onError(
              'Paste a smaller section. Writeups support up to 200,000 characters.',
            );
            return true;
          }
          active.commands.insertContent(normalizeMarkdownFences(text), { contentType: 'markdown' });
          return true;
        }
        return false;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const file = Array.from(event.dataTransfer?.files || []).find((f) => isImageFile(f));
        if (!file) return false;
        event.preventDefault();
        callbacks.current.onUpload(file);
        return true;
      },
    },
    onUpdate: ({ editor }) => callbacks.current.onChange(editor.getMarkdown()),
  });
  currentEditor.current = editor;
  useEffect(() => {
    if (editor && editor.getMarkdown() !== normalizeMarkdownFences(value))
      editor.commands.setContent(normalizeMarkdownFences(value), {
        contentType: 'markdown',
        emitUpdate: false,
      });
  }, [value, editor]);
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useEffect(() => {
    if (!editor) return;
    callbacks.current.onReady({
      insertImage: (src, alt) => {
        editor.chain().focus().setImage({ src, alt }).run();
      },
    });
    return () => callbacks.current.onReady(null);
  }, [editor]);
  const state =
    useEditorState({ editor, selector: ({ editor: e }) => formattingState(e) }) ??
    formattingState(editor);
  useEffect(() => {
    if (!inserter && !linkOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInserter(false);
        setLinkOpen(false);
        editor?.commands.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [inserter, linkOpen, editor]);
  if (!editor || !state)
    return <div className="block-editor-loading">Preparing your writing space…</div>;
  const commands = [
    {
      label: 'Paragraph',
      icon: Text,
      description: 'Start with a thought.',
      run: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: 'Heading',
      icon: Heading2,
      description: 'Give your story structure.',
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Bullet list',
      icon: List,
      description: 'A clear list of ideas.',
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Checklist',
      icon: ListTodo,
      description: 'Steps, tasks, and progress.',
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: 'Quote',
      icon: Quote,
      description: 'Make a passage stand out.',
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: 'Code block',
      icon: Code2,
      description: 'Code with language highlighting.',
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: 'Image',
      icon: ImagePlus,
      description: 'Upload an optimized image.',
      run: onChooseImage,
    },
    {
      label: 'Table',
      icon: Table2,
      description: 'Compare information in columns.',
      run: () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      label: 'Divider',
      icon: Minus,
      description: 'A little breathing room.',
      run: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];
  function moveBlock(direction: number) {
    const { state, view } = editor!;
    const index = state.selection.$from.index(0);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= state.doc.childCount) return;
    let from = 0;
    for (let i = 0; i < index; i++) from += state.doc.child(i).nodeSize;
    const node = state.doc.child(index);
    const adjacent = state.doc.child(nextIndex);
    const to = direction < 0 ? from - adjacent.nodeSize : from + adjacent.nodeSize;
    const tr = state.tr.delete(from, from + node.nodeSize).insert(to, node);
    tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(to + 1, tr.doc.content.size))));
    view.dispatch(tr.scrollIntoView());
    view.focus();
  }
  function removeBlock() {
    const { $from } = editor!.state.selection;
    const index = $from.index(0);
    let from = 0;
    for (let i = 0; i < index; i++) from += editor!.state.doc.child(i).nodeSize;
    editor!
      .chain()
      .focus()
      .deleteRange({ from, to: from + editor!.state.doc.child(index).nodeSize })
      .run();
  }
  const toolbar = [
    {
      label: 'Bold',
      icon: Bold,
      active: state.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      active: state.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Strikethrough',
      icon: Strikethrough,
      active: state.strike,
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: 'Heading 2',
      icon: Heading2,
      active: state.heading2,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Heading 3',
      icon: Heading3,
      active: state.heading3,
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'Bullet list',
      icon: List,
      active: state.bullet,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      active: state.ordered,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Checklist',
      icon: ListTodo,
      active: state.task,
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: 'Quote',
      icon: Quote,
      active: state.quote,
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: 'Code block',
      icon: Code2,
      active: state.code,
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: 'Link',
      icon: Link2,
      active: state.link,
      run: () => {
        setLink(editor.getAttributes('link').href || '');
        setLinkOpen(true);
        setInserter(false);
      },
    },
    { label: 'Upload inline image', icon: ImagePlus, active: false, run: onChooseImage },
  ];
  return (
    <div className="block-editor-shell">
      <div className="block-toolbar" role="toolbar" aria-label="Block formatting">
        <button
          className="block-add"
          type="button"
          aria-label="Add block"
          aria-expanded={inserter}
          onClick={() => {
            setInserter(!inserter);
            setLinkOpen(false);
          }}
          disabled={disabled}
        >
          <Plus size={17} />
          <span>Add block</span>
        </button>
        <div className="block-format-buttons">
          {toolbar.map(({ label, icon: Icon, active, run }) => (
            <button
              type="button"
              key={label}
              aria-label={label}
              title={label}
              aria-pressed={active}
              disabled={disabled}
              onClick={run}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
        <div className="block-history">
          <button
            type="button"
            aria-label="Undo"
            title="Undo"
            disabled={!state.undo || disabled}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={17} />
          </button>
          <button
            type="button"
            aria-label="Redo"
            title="Redo"
            disabled={!state.redo || disabled}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={17} />
          </button>
        </div>
      </div>
      {inserter && (
        <section className="block-inserter" aria-label="Choose a block">
          <header>
            <div>
              <strong>Build your writeup.</strong>
              <span>Choose a block to add at your cursor.</span>
            </div>
            <button
              type="button"
              aria-label="Close block inserter"
              onClick={() => setInserter(false)}
            >
              <X size={18} />
            </button>
          </header>
          <div>
            {commands.map(({ label, icon: Icon, description, run }) => (
              <button
                type="button"
                key={label}
                onClick={() => {
                  run();
                  setInserter(false);
                }}
              >
                <Icon size={22} />
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      {linkOpen && (
        <form
          className="block-link-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!/^(https?:\/\/|mailto:|\/[^/]|#[\w-])/.test(link) || /[\s\\]/.test(link)) {
              callbacks.current.onError(
                'Use an https:// URL, /page, #section, or mailto: address.',
              );
              return;
            }
            editor.chain().focus().extendMarkRange('link').setLink({ href: link }).run();
            setLinkOpen(false);
          }}
        >
          <label>
            Link destination
            <input
              aria-label="Link destination"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
              autoFocus
            />
          </label>
          <button className="button button-small" type="submit">
            Apply link
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setLinkOpen(false);
            }}
          >
            Remove link
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Close link editor"
            onClick={() => setLinkOpen(false)}
          >
            <X size={17} />
          </button>
        </form>
      )}
      <EditorContent editor={editor} />
      {state.table && (
        <div className="block-table-actions">
          <span>Table</span>
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>
            + Row
          </button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            + Column
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>
            Remove row
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>
            Remove column
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteTable().run()}>
            Remove table
          </button>
        </div>
      )}
      <div className="block-selection-bar">
        <span>
          Block {state.index + 1} of {state.blocks}
        </span>
        <div>
          <button
            type="button"
            aria-label="Move selected block up"
            disabled={state.index === 0 || disabled}
            onClick={() => moveBlock(-1)}
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            aria-label="Move selected block down"
            disabled={state.index >= state.blocks - 1 || disabled}
            onClick={() => moveBlock(1)}
          >
            <ArrowDown size={15} />
          </button>
          <button
            type="button"
            aria-label="Remove selected block"
            disabled={disabled}
            onClick={removeBlock}
          >
            <Trash2 size={15} />
          </button>
        </div>
        <span>Markdown paste supported</span>
      </div>
    </div>
  );
}
