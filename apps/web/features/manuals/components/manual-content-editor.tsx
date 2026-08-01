"use client";

import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
};

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  children,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "bg-[#3157f6] text-white"
          : "text-[#687185] hover:bg-[#eef2ff] hover:text-[#3157f6]"
      }`}
    >
      {children}
    </button>
  );
}

export function ManualContentEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const onChangeRef = useRef(onChange);
  const externalValueRef = useRef(value);
  const canonicalValueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: value,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": "치료태그 매뉴얼 내용",
        class:
          "min-h-[420px] px-5 py-4 text-sm leading-7 text-[#454c60] outline-none " +
          "[&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-extrabold " +
          "[&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold " +
          "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-bold " +
          "[&_p]:my-2 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#64b5f6] " +
          "[&_blockquote]:bg-[#edf6ff] [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-[#596175] " +
          "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 " +
          "[&_li]:my-1 [&_hr]:my-6 [&_hr]:border-[#e1e5ed]",
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      externalValueRef.current = value;
      canonicalValueRef.current = currentEditor.getMarkdown();
    },
    onUpdate: ({ editor: currentEditor }) => {
      const markdown = currentEditor.getMarkdown();
      onChangeRef.current(
        markdown === canonicalValueRef.current
          ? externalValueRef.current
          : markdown,
      );
    },
  });

  useEffect(() => {
    if (!editor || editor.getMarkdown() === value) return;
    externalValueRef.current = value;
    editor.commands.setContent(value, {
      contentType: "markdown",
      emitUpdate: false,
    });
    canonicalValueRef.current = editor.getMarkdown();
  }, [editor, value]);

  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
      canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
      isBold: currentEditor?.isActive("bold") ?? false,
      isBulletList: currentEditor?.isActive("bulletList") ?? false,
      isHeading1: currentEditor?.isActive("heading", { level: 1 }) ?? false,
      isHeading2: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      isHeading3: currentEditor?.isActive("heading", { level: 3 }) ?? false,
      isItalic: currentEditor?.isActive("italic") ?? false,
      isOrderedList: currentEditor?.isActive("orderedList") ?? false,
      isStrike: currentEditor?.isActive("strike") ?? false,
      isUnderline: currentEditor?.isActive("underline") ?? false,
    }),
  });

  if (!editor) {
    return (
      <div className="min-h-[476px] animate-pulse rounded-xl border border-[#e1e5ed] bg-[#fafbfc]" />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white focus-within:border-[#7187f6] focus-within:ring-2 focus-within:ring-[#3157f6]/10">
      <div
        role="toolbar"
        aria-label="내용 서식 도구"
        className="flex flex-wrap items-center gap-1 border-b border-[#e1e5ed] bg-[#fcfcfd] px-3 py-2"
      >
        <ToolbarButton
          label="실행 취소"
          disabled={!editorState?.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="다시 실행"
          disabled={!editorState?.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-[#e0e4ec]" />
        <ToolbarButton
          label="굵게"
          active={editorState?.isBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="밑줄"
          active={editorState?.isUnderline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="취소선"
          active={editorState?.isStrike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="기울임"
          active={editorState?.isItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-[#e0e4ec]" />
        <ToolbarButton
          label="글머리 목록"
          active={editorState?.isBulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="번호 목록"
          active={editorState?.isOrderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-6 w-px bg-[#e0e4ec]" />
        <ToolbarButton
          label="제목 1"
          active={editorState?.isHeading1}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="제목 2"
          active={editorState?.isHeading2}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="제목 3"
          active={editorState?.isHeading3}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="인용문"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="구분선"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" />
        </ToolbarButton>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
