"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { useCallback, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  ChevronDown,
} from "lucide-react";

const TEMPLATE_VARIABLES = [
  { key: "firstName", label: "名" },
  { key: "lastName", label: "姓" },
  { key: "fullName", label: "全名" },
  { key: "email", label: "邮箱" },
  { key: "companyName", label: "公司名" },
  { key: "position", label: "职位" },
];

export const DEFAULT_TEMPLATE_HTML = `<p>Hi {{firstName}},</p>
<p></p>
<p>我注意到贵公司 {{companyName}} 在行业中的发展，对您的业务方向非常感兴趣。</p>
<p></p>
<p>我们专注于帮助企业在海外市场获取精准客户，提升业务转化率。希望能有机会与您交流，探讨合作的可能性。</p>
<p></p>
<p>期待您的回复！</p>
<p></p>
<p>Best regards,<br>{{fullName}}</p>`;

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "输入邮件正文..." }: RichTextEditorProps) {
  const [showVarMenu, setShowVarMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-[var(--color-accent)] underline" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: false }),
    ],
    content: value || "",
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none text-[var(--color-fg)] [&_p]:my-1 [&_a]:text-[var(--color-accent)]",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("输入链接地址：", "https://");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const insertVariable = useCallback(
    (varKey: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(`{{${varKey}}}`).run();
      setShowVarMenu(false);
    },
    [editor],
  );

  if (!editor) return null;

  const ToolButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
          : "text-[var(--color-muted-fg)] hover:text-[var(--color-fg)] hover:bg-[var(--color-subtle)]"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] overflow-hidden">
      <div className="flex items-center gap-0.5 p-2 border-b border-[var(--color-glass-border)] bg-[var(--color-subtle)]/50 flex-wrap">
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="加粗">
          <Bold size={16} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="斜体">
          <Italic size={16} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="下划线">
          <UnderlineIcon size={16} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="高亮">
          <Highlighter size={16} />
        </ToolButton>

        <div className="w-px h-5 bg-[var(--color-glass-border)] mx-1" />

        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="无序列表">
          <List size={16} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="有序列表">
          <ListOrdered size={16} />
        </ToolButton>

        <div className="w-px h-5 bg-[var(--color-glass-border)] mx-1" />

        <ToolButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="左对齐">
          <AlignLeft size={16} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="居中">
          <AlignCenter size={16} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="右对齐">
          <AlignRight size={16} />
        </ToolButton>

        <div className="w-px h-5 bg-[var(--color-glass-border)] mx-1" />

        <ToolButton onClick={addLink} active={editor.isActive("link")} title="插入链接">
          <LinkIcon size={16} />
        </ToolButton>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowVarMenu((v) => !v)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
          >
            {"{{变量}}"} <ChevronDown size={12} />
          </button>
          {showVarMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-surface)] shadow-xl py-1">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--color-fg)] hover:bg-[var(--color-subtle)] transition-colors"
                >
                  <span className="font-mono text-[var(--color-accent)]">{`{{${v.key}}}`}</span>
                  <span className="ml-2 text-[var(--color-muted-fg)]">{v.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
