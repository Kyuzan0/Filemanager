/**
 * CodeMirror 6 Editor Integration (Local Bundle Version)
 * Provides syntax highlighting for code files in the preview modal
 * Uses locally bundled CodeMirror for instant loading (no CDN delays)
 */

let cmEditorView = null;

const LANGUAGE_MAP = {
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'javascript',
  'tsx': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'html': 'html',
  'htm': 'html',
  'xml': 'xml',
  'svg': 'xml',
  'css': 'css',
  'scss': 'css',
  'less': 'css',
  'php': 'php',
  'py': 'python',
  'rb': 'python',
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'md': 'markdown',
  'markdown': 'markdown',
  'sql': 'sql',
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  'bat': 'shell',
  'cmd': 'shell',
  'ps1': 'shell',
  'ini': 'ini',
  'conf': 'ini',
  'cfg': 'ini',
  'env': 'ini',
  'htaccess': 'ini',
  'gitignore': 'ini',
  'c': 'cpp',
  'cpp': 'cpp',
  'h': 'cpp',
  'hpp': 'cpp',
  'java': 'java',
  'log': 'text',
  'txt': 'text'
};

function getLanguageFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return LANGUAGE_MAP[ext] || 'text';
}

function getLanguageExtension(language) {
  if (!window.CM || !window.CM.languages) return [];
  
  const langs = window.CM.languages;
  
  try {
    switch (language) {
      case 'javascript':
        return [langs.javascript({ jsx: true, typescript: true })];
      case 'html':
        return [langs.html()];
      case 'css':
        return [langs.css()];
      case 'json':
        return [langs.json()];
      case 'markdown':
        return [langs.markdown()];
      case 'python':
        return [langs.python()];
      case 'php':
        return [langs.php()];
      case 'sql':
        return [langs.sql()];
      case 'xml':
        return [langs.xml()];
      case 'cpp':
      case 'java':
        return [langs.cpp()];
      case 'yaml':
        return [langs.yaml()];
      default:
        return [];
    }
  } catch (e) {
    console.warn('Failed to load language extension for ' + language + ':', e);
    return [];
  }
}

function createSyntaxHighlightingTheme(isDark) {
  const CM = window.CM;
  if (!CM || !CM.HighlightStyle || !CM.tags) return null;
  
  const HighlightStyle = CM.HighlightStyle;
  const syntaxHighlighting = CM.syntaxHighlighting;
  const tags = CM.tags;
  
  const darkColors = {
    keyword: '#c586c0',
    string: '#ce9178',
    number: '#b5cea8',
    comment: '#6a9955',
    variable: '#9cdcfe',
    functionName: '#dcdcaa',
    type: '#4ec9b0',
    operator: '#d4d4d4',
    tag: '#569cd6',
    attribute: '#9cdcfe',
    property: '#9cdcfe',
    constant: '#4fc1ff',
    regexp: '#d16969',
    punctuation: '#d4d4d4',
    definition: '#dcdcaa'
  };
  
  const lightColors = {
    keyword: '#af00db',
    string: '#a31515',
    number: '#098658',
    comment: '#008000',
    variable: '#001080',
    functionName: '#795e26',
    type: '#267f99',
    operator: '#000000',
    tag: '#800000',
    attribute: '#ff0000',
    property: '#001080',
    constant: '#0000ff',
    regexp: '#811f3f',
    punctuation: '#000000',
    definition: '#795e26'
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
    { tag: tags.function(tags.variableName), color: colors.functionName },
    { tag: tags.definition(tags.function(tags.variableName)), color: colors.functionName },
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

function initCodeMirror(container, content, filename, onChange) {
  if (!window.CM || !window.CM_LOADED) {
    console.error('[CodeMirror] Bundle not loaded! Make sure codemirror.min.js is included before this script.');
    container.innerHTML = '<textarea class="preview-editor-fallback" spellcheck="false">' + escapeHtml(content) + '</textarea>';
    const textarea = container.querySelector('textarea');
    if (textarea && onChange) {
      textarea.addEventListener('input', function() { onChange(textarea.value); });
    }
    return null;
  }
  
  if (cmEditorView) {
    cmEditorView.destroy();
    cmEditorView = null;
  }
  
  const CM = window.CM;
  const language = getLanguageFromExtension(filename);
  
  try {
    let langExtension = [];
    try {
      langExtension = getLanguageExtension(language);
    } catch (e) {
      console.warn('Failed to load language extension:', e);
    }
    
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const darkTheme = CM.EditorView.theme({
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
    
    const lightTheme = CM.EditorView.theme({
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
    
    const syntaxTheme = createSyntaxHighlightingTheme(isDarkMode);
    const wordWrapEnabled = localStorage.getItem('fileManagerWordWrap') === 'true';
    
    const extensions = [
      CM.lineNumbers(),
      CM.highlightActiveLineGutter(),
      CM.highlightSpecialChars(),
      CM.history(),
      CM.foldGutter(),
      CM.drawSelection(),
      CM.dropCursor(),
      CM.EditorState.allowMultipleSelections.of(true),
      CM.indentOnInput(),
      CM.syntaxHighlighting(CM.defaultHighlightStyle, { fallback: true }),
      CM.bracketMatching(),
      CM.closeBrackets(),
      CM.rectangularSelection(),
      CM.crosshairCursor(),
      CM.highlightActiveLine(),
      CM.highlightSelectionMatches(),
      CM.keymap.of([
        ...CM.closeBracketsKeymap,
        ...CM.defaultKeymap,
        ...CM.searchKeymap,
        ...CM.historyKeymap,
        ...CM.foldKeymap,
        CM.indentWithTab
      ]),
      isDarkMode ? darkTheme : lightTheme
    ];
    
    if (syntaxTheme) {
      extensions.push(syntaxTheme);
    }
    
    if (langExtension.length > 0) {
      extensions.push(...langExtension);
    }
    
    extensions.push(CM.EditorView.updateListener.of(function(update) {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    }));
    
    if (wordWrapEnabled) {
      extensions.push(CM.EditorView.lineWrapping);
    }
    
    const state = CM.EditorState.create({
      doc: content,
      extensions: extensions
    });
    
    cmEditorView = new CM.EditorView({
      state: state,
      parent: container
    });
    
    cmEditorView.state.wordWrapEnabled = wordWrapEnabled;
    cmEditorView.focus();
    
    console.log('[CodeMirror] Editor initialized successfully (local bundle)');
    return cmEditorView;
    
  } catch (error) {
    console.error('Failed to initialize CodeMirror:', error);
    container.innerHTML = '<textarea class="preview-editor-fallback" spellcheck="false">' + escapeHtml(content) + '</textarea>';
    const textarea = container.querySelector('textarea');
    if (textarea && onChange) {
      textarea.addEventListener('input', function() { onChange(textarea.value); });
    }
    return null;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getEditorContent() {
  if (cmEditorView) {
    return cmEditorView.state.doc.toString();
  }
  const fallback = document.querySelector('.preview-editor-fallback');
  return fallback ? fallback.value : '';
}

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

function destroyEditor() {
  if (cmEditorView) {
    cmEditorView.destroy();
    cmEditorView = null;
  }
}

function isEditorInitialized() {
  return cmEditorView !== null;
}

function focusEditor() {
  if (cmEditorView) {
    cmEditorView.focus();
  }
}

window.CodeMirrorEditor = {
  init: initCodeMirror,
  getContent: getEditorContent,
  setContent: setEditorContent,
  destroy: destroyEditor,
  isInitialized: isEditorInitialized,
  focus: focusEditor,
  getLanguage: getLanguageFromExtension
};
