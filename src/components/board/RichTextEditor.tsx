import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, Strikethrough, Link2, List, Heading,
  Underline as UnderlineIcon, Minus
} from 'lucide-react';
import styles from './TaskModal.module.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlur: () => void;
}

export function RichTextEditor({ content, onChange, onBlur }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Add description...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: () => {
      onBlur();
    }
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== content && !editor.isFocused) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    
    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={styles.descriptionWrapper}>
      <div className={styles.descriptionToolbar}>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          className={`${styles.toolbarBtn} ${editor.isActive('bold') ? styles.toolbarBtnActive : ''}`} 
          title="Bold"
        ><Bold size={14} /></button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          className={`${styles.toolbarBtn} ${editor.isActive('italic') ? styles.toolbarBtnActive : ''}`} 
          title="Italic"
        ><Italic size={14} /></button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleUnderline().run()} 
          className={`${styles.toolbarBtn} ${editor.isActive('underline') ? styles.toolbarBtnActive : ''}`} 
          title="Underline"
        ><UnderlineIcon size={14} /></button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleStrike().run()} 
          className={`${styles.toolbarBtn} ${editor.isActive('strike') ? styles.toolbarBtnActive : ''}`} 
          title="Strikethrough"
        ><Strikethrough size={14} /></button>
        
        <div className={styles.toolbarDivider} />
        
        <button 
          type="button" 
          onClick={addLink} 
          className={`${styles.toolbarBtn} ${editor.isActive('link') ? styles.toolbarBtnActive : ''}`} 
          title="Link"
        ><Link2 size={14} /></button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          className={`${styles.toolbarBtn} ${editor.isActive('bulletList') ? styles.toolbarBtnActive : ''}`} 
          title="List"
        ><List size={14} /></button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
          className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 3 }) ? styles.toolbarBtnActive : ''}`} 
          title="Heading"
        ><Heading size={14} /></button>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().setHorizontalRule().run()} 
          className={styles.toolbarBtn} 
          title="Divider"
        ><Minus size={14} /></button>
      </div>
      
      <div className={styles.editorContent}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
