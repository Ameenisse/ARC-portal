import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Heading2, Heading3, 
  List, ListOrdered, Image as ImageIcon, Link as LinkIcon, 
  AlignRight, AlignLeft, Sparkles, Upload, 
  Eye, Edit3, Trash2, Quote, AlertCircle, Check
} from 'lucide-react';

interface RichDocEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
  dir?: 'rtl' | 'ltr';
}

export const RichDocEditor: React.FC<RichDocEditorProps> = ({
  value,
  onChange,
  placeholder = 'މަޒުމޫނު ނުވަތަ ލިޔުން މިތަނުގައި ލިޔުއްވާ ނުވަތަ އެމް.އެސް ވޯރޑް (MS Word) އިން ކޮޕީކޮށް ސީދާ ޕޭސްޓް (Paste) ކުރައްވާ...',
  minHeight = '280px',
  label = 'ބްލޮގް ތަފްޞީލް / ލިޔުން (Blog Article Content with Images & Text)',
  dir = 'rtl'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [textDir, setTextDir] = useState<'rtl' | 'ltr'>(dir);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageAlign, setImageAlign] = useState<'center' | 'full' | 'right' | 'left'>('center');
  const [isDragging, setIsDragging] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  // Sync value from prop into editor ref without resetting caret during typing
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Only update if fundamentally different (avoids cursor jump)
      if (!editorRef.current.innerHTML && value) {
        editorRef.current.innerHTML = value;
      } else if (!value && editorRef.current.innerHTML) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [value]);

  // Initial load
  useEffect(() => {
    if (editorRef.current && value && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  const triggerChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === '<br>' || html === '<p><br></p>' ? '' : html);
    }
  };

  // Helper to insert HTML safely at selection or end
  const insertHtmlAtSelection = (htmlSnippet: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Check if range is inside the editor
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const tempEl = document.createElement('div');
        tempEl.innerHTML = htmlSnippet;
        const frag = document.createDocumentFragment();
        let node: ChildNode | null;
        let lastNode: ChildNode | null = null;
        while ((node = tempEl.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        triggerChange();
        return;
      }
    }

    // Fallback: append at the end
    editorRef.current.innerHTML += htmlSnippet;
    triggerChange();
  };

  // Clean MS Word / Office HTML
  const cleanWordHtml = (rawHtml: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');

      // Remove Word specific elements
      const tagsToRemove = ['o:p', 'xml', 'script', 'style', 'meta', 'link', 'v:shapetype'];
      tagsToRemove.forEach(tag => {
        doc.querySelectorAll(tag).forEach(el => el.remove());
      });

      // Format all images
      doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        if (src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://')) {
          img.className = 'max-w-full h-auto rounded-xl my-3 shadow-md border border-slate-700/60 block mx-auto object-contain';
          img.setAttribute('loading', 'lazy');
        } else if (src.startsWith('file:///')) {
          // Local file link from Word that cannot be loaded by browser
          // Leave it or flag it
          img.setAttribute('data-file-ref', src);
        }
      });

      // Preserve paragraphs, headers, bold, italics, lists, blockquotes
      return doc.body.innerHTML;
    } catch {
      return rawHtml;
    }
  };

  // Handle Paste (Text + Images from MS Word, Docs, Clipboard)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboard = e.clipboardData;
    if (!clipboard) return;

    // Check for image files in clipboard (e.g. copied image or screenshot or Word image item)
    const files = Array.from(clipboard.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      e.preventDefault();
      imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            const imageBox = `
              <div class="my-4 text-center select-none" data-image-box="true">
                <img src="${dataUrl}" class="max-w-full h-auto rounded-xl mx-auto shadow-md border border-slate-700/80 block" alt="Pasted Image" />
              </div>
              <p><br></p>
            `;
            insertHtmlAtSelection(imageBox);
            setPasteNotice('ފޮޓޯ ކާމިޔާބުކަމާއެކު ޕޭސްޓް ކުރެވިއްޖެ!');
            setTimeout(() => setPasteNotice(null), 3000);
          }
        };
        reader.readAsDataURL(file);
      });
      return;
    }

    // Check for rich HTML (from MS Word, Google Docs, or web page)
    const html = clipboard.getData('text/html');
    if (html && html.trim().length > 0) {
      e.preventDefault();
      const cleaned = cleanWordHtml(html);
      
      // Insert cleaned HTML
      insertHtmlAtSelection(cleaned);
      setPasteNotice('އެމް.އެސް ވޯރޑް (MS Word) ގެ ލިޔުމާއި ފޯމެޓިންގ ޕޭސްޓް ކުރެވިއްޖެ!');
      setTimeout(() => setPasteNotice(null), 3500);
      return;
    }

    // Plain text paste fallback
    const plainText = clipboard.getData('text/plain');
    if (plainText) {
      e.preventDefault();
      const formattedText = plainText
        .split('\n\n')
        .map(p => `<p class="my-2">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
      insertHtmlAtSelection(formattedText);
      triggerChange();
    }
  };

  // Drag and Drop Images
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            const imageBox = `
              <div class="my-4 text-center select-none" data-image-box="true">
                <img src="${dataUrl}" class="max-w-full h-auto rounded-xl mx-auto shadow-md border border-slate-700/80 block" alt="Dropped Image" />
              </div>
              <p><br></p>
            `;
            insertHtmlAtSelection(imageBox);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Toolbar action helpers using document.execCommand
  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    triggerChange();
  };

  // Format block for Headings / Paragraphs
  const setBlockFormat = (tag: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('formatBlock', false, `<${tag}>`);
    triggerChange();
  };

  // Insert Callout Box
  const insertCalloutBox = () => {
    const callout = `
      <div class="my-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-100 flex items-start gap-3">
        <span class="text-emerald-400 text-lg select-none">💡</span>
        <div class="flex-1">
          <strong class="text-white block mb-1">މުހިންމު ނުކުތާ:</strong>
          <span>ތަފްޞީލް މިތަނުގައި ލިޔުއްވާ...</span>
        </div>
      </div>
      <p><br></p>
    `;
    insertHtmlAtSelection(callout);
  };

  // Handle local image file upload
  const handleLocalImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const imageBox = `
            <figure class="my-4 text-center select-none" data-image-box="true">
              <img src="${dataUrl}" class="max-w-full h-auto rounded-xl mx-auto shadow-md border border-slate-700/80 block" alt="Uploaded Image" />
              <figcaption class="text-xs text-slate-400 mt-1.5 font-medium">ފޮޓޯގެ ތަފްޞީލް...</figcaption>
            </figure>
            <p><br></p>
          `;
          insertHtmlAtSelection(imageBox);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Insert Image via Modal (URL + Caption + Alignment)
  const handleInsertImageUrl = () => {
    if (!imageUrl.trim()) return;

    const alignClass = 
      imageAlign === 'full' ? 'w-full' :
      imageAlign === 'right' ? 'ml-auto' :
      imageAlign === 'left' ? 'mr-auto' : 'mx-auto';

    const imageMarkup = `
      <figure class="my-4 text-center select-none" data-image-box="true">
        <img src="${imageUrl.trim()}" alt="${imageCaption || 'Health Image'}" class="max-w-full h-auto rounded-xl ${alignClass} shadow-md border border-slate-700/80 block" />
        ${imageCaption ? `<figcaption class="text-xs text-slate-400 mt-1.5 font-medium">${imageCaption}</figcaption>` : ''}
      </figure>
      <p><br></p>
    `;
    insertHtmlAtSelection(imageMarkup);
    setImageUrl('');
    setImageCaption('');
    setShowImageModal(false);
  };

  // Clear Content
  const handleClear = () => {
    if (window.confirm('މަޒުމޫނުގެ ހުރިހާ ލިޔުމަކާއި ފޮޓޯތަކެއް ފޮހެލަން ބޭނުންފުޅުތޯ؟')) {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        triggerChange();
      }
    }
  };

  return (
    <div className="space-y-2 w-full">
      {/* Label and Guide Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="block text-xs font-bold text-slate-200">
          {label}
        </label>
        
        {/* Editor / Preview Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'edit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>އެޑިޓަރ (Editor)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'preview'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>ޕްރިވިއު (Preview)</span>
          </button>
        </div>
      </div>

      {/* MS Word / Google Docs Pasting Instructions Banner */}
      <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/30 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-emerald-200">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-white">އެމް.އެސް ވޯރޑް (MS Word) ނުވަތަ ޑޮކްސް އިން ސީދާ ޕޭސްޓް ކުރެއްވޭނެ: </span>
          <span>ޑޮކިއުމެންޓުން ލިޔުމާއި ފޮޓޯތައް ކޮޕީކޮށްލުމަށްފަހު މިތަނަށް <strong>Ctrl + V</strong> އިން ޕޭސްޓް ކުރައްވާ. ފޮޓޯތަކާއި ޕެރެގްރާފްތައް އެހުރިގޮތަށް އަޅުއްވައިދޭނެއެވެ.</span>
        </div>
      </div>

      {/* Paste Success Notice */}
      {pasteNotice && (
        <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{pasteNotice}</span>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden focus-within:border-emerald-500/80 transition-colors shadow-inner">
        
        {/* FORMATTING TOOLBAR (Only shown in edit mode) */}
        {activeTab === 'edit' && (
          <div className="p-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center gap-1.5 text-slate-300 select-none">
            
            {/* Text Style: Headings */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setBlockFormat('p')}
                title="އާދައިގެ ޕެރެގްރާފް (Normal Text)"
                className="px-2 py-1 rounded text-xs font-medium hover:bg-slate-800 hover:text-white transition-colors"
              >
                P
              </button>
              <button
                type="button"
                onClick={() => setBlockFormat('h2')}
                title="ބޮޑު ސުރުޚީ 2 (Heading 2)"
                className="px-2 py-1 rounded text-xs font-bold hover:bg-slate-800 hover:text-emerald-400 transition-colors"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => setBlockFormat('h3')}
                title="ކުޑަ ސުރުޚީ 3 (Heading 3)"
                className="px-2 py-1 rounded text-xs font-bold hover:bg-slate-800 hover:text-emerald-400 transition-colors"
              >
                H3
              </button>
            </div>

            {/* Basic Styles: B, I, U */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => executeCommand('bold')}
                title="ބޯލްޑް (Bold - Ctrl+B)"
                className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('italic')}
                title="އިޓަލިކް (Italic - Ctrl+I)"
                className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('underline')}
                title="އަންޑަރލައިން (Underline - Ctrl+U)"
                className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Underline className="w-4 h-4" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => executeCommand('insertUnorderedList')}
                title="ބުލެޓް ލިސްޓް (Bullet List)"
                className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('insertOrderedList')}
                title="ނަންބަރު ލިސްޓް (Numbered List)"
                className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={insertCalloutBox}
                title="މުހިންމު ނޯޓް / ކޯޓް ބޮކްސް (Callout Box)"
                className="p-1.5 rounded hover:bg-slate-800 hover:text-emerald-400 transition-colors"
              >
                <Quote className="w-4 h-4" />
              </button>
            </div>

            {/* Image Box Actions */}
            <div className="flex items-center gap-1 bg-emerald-950/50 p-1 rounded-lg border border-emerald-500/30 text-emerald-300">
              {/* Device Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="ކޮމްޕިއުޓަރުން ފޮޓޯ އަޅުއްވާ (Upload Image File)"
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>ފޮޓޯ އަޕްލޯޑް</span>
              </button>

              {/* URL / Box Modal */}
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                title="ފޮޓޯ ޔޫ.އާރް.އެލް / ކެޕްޝަން ބޮކްސް (Image Box)"
                className="p-1.5 rounded hover:bg-emerald-600/30 hover:text-white transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleLocalImageSelect}
              />
            </div>

            {/* Alignment / Direction */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTextDir(prev => prev === 'rtl' ? 'ltr' : 'rtl');
                  executeCommand(textDir === 'rtl' ? 'justifyLeft' : 'justifyRight');
                }}
                title={textDir === 'rtl' ? 'ދިވެހި ތާނަ (RTL)' : 'English (LTR)'}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                {textDir === 'rtl' ? <AlignRight className="w-3.5 h-3.5 text-emerald-400" /> : <AlignLeft className="w-3.5 h-3.5 text-blue-400" />}
                <span>{textDir === 'rtl' ? 'RTL' : 'LTR'}</span>
              </button>
            </div>

            {/* Clear Button */}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                title="ހުރިހާ ލިޔުމެއް ފޮހެލުން"
                className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* EDIT VIEW (Interactive contentEditable with image support) */}
        {activeTab === 'edit' ? (
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              dir={textDir}
              onInput={triggerChange}
              onBlur={triggerChange}
              onPaste={handlePaste}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ minHeight }}
              className={`p-4 sm:p-5 text-sm sm:text-base text-slate-100 font-sans leading-relaxed focus:outline-none overflow-y-auto max-h-[500px] custom-scrollbar ${
                isDragging ? 'border-2 border-dashed border-emerald-400 bg-emerald-950/20' : ''
              }`}
              data-placeholder={placeholder}
            />

            {/* Drop Zone overlay hint when dragging file over */}
            {isDragging && (
              <div className="absolute inset-0 bg-slate-950/90 border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center pointer-events-none text-emerald-400 gap-2">
                <Upload className="w-8 h-8 animate-bounce" />
                <span className="font-bold text-sm">ފޮޓޯ މިތަނަށް ދޫކޮށްލައްވާ (Drop Image Here)</span>
              </div>
            )}
          </div>
        ) : (
          /* PREVIEW VIEW */
          <div 
            dir={textDir}
            style={{ minHeight }}
            className="p-6 text-slate-200 text-sm sm:text-base leading-loose max-h-[500px] overflow-y-auto custom-scrollbar rich-article-content"
          >
            {value && value.trim().length > 0 ? (
              <div dangerouslySetInnerHTML={{ __html: value }} />
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                އަދި އެއްވެސް ލިޔުމެއް ނެތެވެ. "އެޑިޓަރ" ޓެބަށް ބަދަލުވެވަޑައިގެން ލިޔުއްވާ ނުވަތަ އެމް.އެސް ވޯރޑުން ޕޭސްޓް ކުރައްވާ.
              </div>
            )}
          </div>
        )}

        {/* BOTTOM STATUS FOOTER */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>📷 ފޮޓޯ، ޑޮކިއުމެންޓް ޓެކްސްޓް އަދި ކެޕްޝަން ބޮކްސް ހިމެނޭ</span>
            <span className="text-slate-600">•</span>
            <span>ޑްރެގް & ޑްރޮޕް ސަޕޯޓްކުރޭ</span>
          </div>
          <div className="text-slate-500">
            {value ? `${value.replace(/<[^>]*>/g, '').length} އަކުރު` : 'ހުސް'}
          </div>
        </div>
      </div>

      {/* POPUP MODAL: Insert Image by URL + Caption */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-extrabold text-base text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>ފޮޓޯ / އިމޭޖް ބޮކްސް އަޅުއްވާ</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Image URL */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                ފޮޓޯ ޔޫ.އާރް.އެލް (Image URL) <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                dir="ltr"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Optional Caption */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                ކެޕްޝަން / ފޮޓޯގެ ތަފްޞީލް (Caption - Optional)
              </label>
              <input
                type="text"
                placeholder="މިސާލަކަށް: ހެނދުނުގެ ކަސްރަތު ކުރިއަށްދާ ގޮތް"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Alignment */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">
                ފޮޓޯ ހުންނަންވީ ތަން (Alignment)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['center', 'full', 'right'] as const).map(align => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => setImageAlign(align)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      imageAlign === align
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {align === 'center' ? 'މެދުގައި (Center)' : align === 'full' ? 'ފުޅާކޮށް (Full)' : 'ކަނާތުގައި (Right)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                ކެންސަލް
              </button>
              <button
                type="button"
                onClick={handleInsertImageUrl}
                disabled={!imageUrl.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
              >
                އަޅުއްވާ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
