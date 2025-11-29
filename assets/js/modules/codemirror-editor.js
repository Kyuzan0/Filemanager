/**
 * CodeMirror 6 Editor Integration
 * Provides syntax highlighting for code files in the preview modal
 */

// CodeMirror Editor Instance
let cmEditor = null;
let cmEditorView = null;

// Language extension mapping based on file extension
const LANGUAGE_MAP = {
  // JavaScript/TypeScript
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'javascript',
  'tsx': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  
  // Web
  'html': 'html',
  'htm': 'html',
  'xml': 'xml',
  'svg': 'xml',
  'css': 'css',
  'scss': 'css',
  'less': 'css',
  
  // Backend
  'php': 'php',
  'py': 'python',
  'rb': 'python', // Ruby uses Python-like highlighting as fallback
  
  // Data
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  
  // Markdown
  'md': 'markdown',
  'markdown': 'markdown',
  
  // SQL
  'sql': 'sql',
  
  // Shell
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  'bat': 'shell',
  'cmd': 'shell',
  'ps1': 'shell',
  
  // Config files
  'ini': 'ini',
  'conf': 'ini',
  'cfg': 'ini',
  'env': 'ini',
  'htaccess': 'ini',
  'gitignore': 'ini',
  
  // C-like
  'c': 'cpp',
  'cpp': 'cpp',
  'h': 'cpp',
  'hpp': 'cpp',
  'java': 'java',
  
  // Other
  'log': 'text',
  'txt': 'text'
};

// Get language mode from file extension
function getLanguageFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return LANGUAGE_MAP[ext] || 'text';
}

// Initialize CodeMirror with dynamic imports
async function initCodeMirror(container, content, filename, onChange) {
  // Destroy existing editor if any
  if (cmEditorView) {
    cmEditorView.destroy();
    cmEditorView = null;
  }
  
  const language = getLanguageFromExtension(filename);
  
  try {
    // Dynamic import of CodeMirror modules
    const { EditorState } = await import('https://esm.sh/@codemirror/state@6');
    const { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } = await import('https://esm.sh/@codemirror/view@6');
    const { defaultKeymap, history, historyKeymap, indentWithTab } = await import('https://esm.sh/@codemirror/commands@6');
    const { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } = await import('https://esm.sh/@codemirror/language@6');
    const { closeBrackets, closeBracketsKeymap } = await import('https://esm.sh/@codemirror/autocomplete@6');
    const { searchKeymap, highlightSelectionMatches } = await import('https://esm.sh/@codemirror/search@6');
    
    // Get language extension
    let langExtension = [];
    try {
      langExtension = await getLanguageExtension(language);
    } catch (e) {
      console.warn('Failed to load language extension:', e);
    }
    
    // Check if dark mode
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Create dark theme
    const darkTheme = EditorView.theme({
      '&': {
        backgroundColor: '#1a2332',
        color: '#e2e8f0'
      },
      '.cm-content': {
        caretColor: '#60a5fa',
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
        fontSize: '14px'
      },
      '.cm-cursor': {
        borderLeftColor: '#60a5fa'
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: '#334155'
      },
      '.cm-activeLine': {
        backgroundColor: '#1e293b'
      },
      '.cm-gutters': {
        backgroundColor: '#0f172a',
        color: '#64748b',
        border: 'none',
        borderRight: '1px solid #334155'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#1e293b'
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 16px'
      },
      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px'
      }
    }, { dark: true });
    
    // Create light theme
    const lightTheme = EditorView.theme({
      '&': {
        backgroundColor: '#ffffff',
        color: '#1f2937'
      },
      '.cm-content': {
        caretColor: '#2563eb',
        fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
        fontSize: '14px'
      },
      '.cm-cursor': {
        borderLeftColor: '#2563eb'
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: '#dbeafe'
      },
      '.cm-activeLine': {
        backgroundColor: '#f1f5f9'
      },
      '.cm-gutters': {
        backgroundColor: '#f8fafc',
        color: '#94a3b8',
        border: 'none',
        borderRight: '1px solid #e2e8f0'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#f1f5f9'
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px 0 16px'
      },
      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px'
      }
    }, { dark: false });
    
    // Syntax highlighting theme (VS Code-like)
    const syntaxTheme = await createSyntaxHighlightingTheme(isDarkMode);
    
    // Build extensions array
    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab
      ]),
      isDarkMode ? darkTheme : lightTheme,
      syntaxTheme,
      ...langExtension,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping
    ];
    
    // Create editor state
    const state = EditorState.create({
      doc: content,
      extensions
    });
    
    // Create editor view
    cmEditorView = new EditorView({
      state,
      parent: container
    });
    
    // Focus editor
    cmEditorView.focus();
    
    return cmEditorView;
    
  } catch (error) {
    console.error('Failed to initialize CodeMirror:', error);
    // Fallback to plain textarea
    container.innerHTML = `<textarea class="preview-editor-fallback" spellcheck="false">${escapeHtml(content)}</textarea>`;
    const textarea = container.querySelector('textarea');
    if (textarea && onChange) {
      textarea.addEventListener('input', () => onChange(textarea.value));
    }
    return null;
  }
}

// Get language extension based on language type
async function getLanguageExtension(language) {
  try {
    switch (language) {
      case 'javascript': {
        const { javascript } = await import('https://esm.sh/@codemirror/lang-javascript@6');
        return [javascript({ jsx: true, typescript: true })];
      }
      case 'html': {
        const { html } = await import('https://esm.sh/@codemirror/lang-html@6');
        return [html()];
      }
      case 'css': {
        const { css } = await import('https://esm.sh/@codemirror/lang-css@6');
        return [css()];
      }
      case 'json': {
        const { json } = await import('https://esm.sh/@codemirror/lang-json@6');
        return [json()];
      }
      case 'markdown': {
        const { markdown } = await import('https://esm.sh/@codemirror/lang-markdown@6');
        return [markdown()];
      }
      case 'python': {
        const { python } = await import('https://esm.sh/@codemirror/lang-python@6');
        return [python()];
      }
      case 'php': {
        const { php } = await import('https://esm.sh/@codemirror/lang-php@6');
        return [php()];
      }
      case 'sql': {
        const { sql } = await import('https://esm.sh/@codemirror/lang-sql@6');
        return [sql()];
      }
      case 'xml': {
        const { xml } = await import('https://esm.sh/@codemirror/lang-xml@6');
        return [xml()];
      }
      case 'cpp':
      case 'java': {
        const { cpp } = await import('https://esm.sh/@codemirror/lang-cpp@6');
        return [cpp()];
      }
      case 'yaml': {
        const { yaml } = await import('https://esm.sh/@codemirror/lang-yaml@6');
        return [yaml()];
      }
      default:
        return [];
    }
  } catch (e) {
    console.warn(`Failed to load language extension for ${language}:`, e);
    return [];
  }
}

// Create syntax highlighting theme (VS Code-like colors)
async function createSyntaxHighlightingTheme(isDark) {
  const { HighlightStyle, syntaxHighlighting } = await import('https://esm.sh/@codemirror/language@6');
  const { tags } = await import('https://esm.sh/@lezer/highlight@1');
  
  // VS Code Dark+ inspired colors
  const darkColors = {
    keyword: '#c586c0',      // Purple - if, else, function, etc.
    string: '#ce9178',       // Orange - strings
    number: '#b5cea8',       // Light green - numbers
    comment: '#6a9955',      // Green - comments
    variable: '#9cdcfe',     // Light blue - variables
    function: '#dcdcaa',     // Yellow - functions
    type: '#4ec9b0',         // Cyan - types/classes
    operator: '#d4d4d4',     // Light gray - operators
    tag: '#569cd6',          // Blue - HTML tags
    attribute: '#9cdcfe',    // Light blue - attributes
    property: '#9cdcfe',     // Light blue - properties
    constant: '#4fc1ff',     // Bright blue - constants
    regexp: '#d16969',       // Red - regex
    punctuation: '#d4d4d4',  // Light gray - brackets etc.
    definition: '#dcdcaa'    // Yellow - definitions
  };
  
  // VS Code Light+ inspired colors
  const lightColors = {
    keyword: '#af00db',      // Purple
    string: '#a31515',       // Red
    number: '#098658',       // Green
    comment: '#008000',      // Green
    variable: '#001080',     // Dark blue
    function: '#795e26',     // Brown
    type: '#267f99',         // Teal
    operator: '#000000',     // Black
    tag: '#800000',          // Dark red
    attribute: '#ff0000',    // Red
    property: '#001080',     // Dark blue
    constant: '#0000ff',     // Blue
    regexp: '#811f3f',       // Dark red
    punctuation: '#000000',  // Black
    definition: '#795e26'    // Brown
  };
  
  const colors = isDark ? darkColors : lightColors;
  
  const highlightStyles = HighlightStyle.define([
    { tag: tags.keyword, color: colors.keyword, fontWeight: 'bold' },
    { tag: tags.controlKeyword, color: colors.keyword, fontWeight: 'bold' },
    { tag: tags.moduleKeyword, color: colors.keyword, fontWeight: 'bold' },
    { tag: tags.operatorKeyword, color: colors.keyword },
    { tag: tags.definitionKeyword, color: colors.keyword },
    
    { tag: tags.string, color: colors.string },
    { tag: tags.special(tags.string), color: colors.string },
    { tag: tags.regexp, color: colors.regexp },
    
    { tag: tags.number, color: colors.number },
    { tag: tags.integer, color: colors.number },
    { tag: tags.float, color: colors.number },
    
    { tag: tags.comment, color: colors.comment, fontStyle: 'italic' },
    { tag: tags.lineComment, color: colors.comment, fontStyle: 'italic' },
    { tag: tags.blockComment, color: colors.comment, fontStyle: 'italic' },
    { tag: tags.docComment, color: colors.comment, fontStyle: 'italic' },
    
    { tag: tags.variableName, color: colors.variable },
    { tag: tags.definition(tags.variableName), color: colors.definition },
    { tag: tags.local(tags.variableName), color: colors.variable },
    { tag: tags.special(tags.variableName), color: colors.constant },
    
    { tag: tags.function(tags.variableName), color: colors.function },
    { tag: tags.definition(tags.function(tags.variableName)), color: colors.function },
    
    { tag: tags.propertyName, color: colors.property },
    { tag: tags.definition(tags.propertyName), color: colors.property },
    { tag: tags.special(tags.propertyName), color: colors.property },
    
    { tag: tags.typeName, color: colors.type },
    { tag: tags.className, color: colors.type },
    { tag: tags.namespace, color: colors.type },
    
    { tag: tags.tagName, color: colors.tag },
    { tag: tags.attributeName, color: colors.attribute },
    { tag: tags.attributeValue, color: colors.string },
    
    { tag: tags.operator, color: colors.operator },
    { tag: tags.punctuation, color: colors.punctuation },
    { tag: tags.bracket, color: colors.punctuation },
    { tag: tags.angleBracket, color: colors.punctuation },
    { tag: tags.squareBracket, color: colors.punctuation },
    { tag: tags.paren, color: colors.punctuation },
    { tag: tags.brace, color: colors.punctuation },
    
    { tag: tags.constant(tags.name), color: colors.constant },
    { tag: tags.standard(tags.name), color: colors.constant },
    { tag: tags.bool, color: colors.constant },
    { tag: tags.null, color: colors.constant },
    
    { tag: tags.self, color: colors.keyword },
    { tag: tags.atom, color: colors.constant },
    { tag: tags.unit, color: colors.number },
    
    { tag: tags.heading, color: colors.keyword, fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.link, color: colors.string, textDecoration: 'underline' },
    { tag: tags.url, color: colors.string },
    
    { tag: tags.meta, color: colors.comment },
    { tag: tags.processingInstruction, color: colors.keyword },
    
    { tag: tags.invalid, color: '#ff0000', textDecoration: 'underline wavy' }
  ]);
  
  return syntaxHighlighting(highlightStyles);
}

// Escape HTML for fallback textarea
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Get editor content
function getEditorContent() {
  if (cmEditorView) {
    return cmEditorView.state.doc.toString();
  }
  // Fallback textarea
  const fallback = document.querySelector('.preview-editor-fallback');
  return fallback ? fallback.value : '';
}

// Set editor content
function setEditorContent(content) {
  if (cmEditorView) {
    cmEditorView.dispatch({
      changes: { from: 0, to: cmEditorView.state.doc.length, insert: content }
    });
  } else {
    const fallback = document.querySelector('.preview-editor-fallback');
    if (fallback) fallback.value = content;
  }
}

// Destroy editor
function destroyEditor() {
  if (cmEditorView) {
    cmEditorView.destroy();
    cmEditorView = null;
  }
}

// Check if editor is initialized
function isEditorInitialized() {
  return cmEditorView !== null;
}

// Re-focus editor
function focusEditor() {
  if (cmEditorView) {
    cmEditorView.focus();
  }
}

// Export functions to global scope
window.CodeMirrorEditor = {
  init: initCodeMirror,
  getContent: getEditorContent,
  setContent: setEditorContent,
  destroy: destroyEditor,
  isInitialized: isEditorInitialized,
  focus: focusEditor,
  getLanguage: getLanguageFromExtension
};
