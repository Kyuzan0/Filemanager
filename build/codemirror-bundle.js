/**
 * CodeMirror 6 Bundle Source
 * This file imports all required CodeMirror modules and exports them for bundling
 * Run: npm run build:codemirror to generate the bundle
 */

// Core modules
import { EditorState } from '@codemirror/state';
import { 
  EditorView, 
  keymap, 
  lineNumbers, 
  highlightActiveLineGutter, 
  highlightSpecialChars, 
  drawSelection, 
  dropCursor, 
  rectangularSelection, 
  crosshairCursor, 
  highlightActiveLine 
} from '@codemirror/view';
import { 
  defaultKeymap, 
  history, 
  historyKeymap, 
  indentWithTab 
} from '@codemirror/commands';
import { 
  indentOnInput, 
  syntaxHighlighting, 
  defaultHighlightStyle, 
  bracketMatching, 
  foldGutter, 
  foldKeymap,
  HighlightStyle
} from '@codemirror/language';
import { 
  closeBrackets, 
  closeBracketsKeymap 
} from '@codemirror/autocomplete';
import { 
  searchKeymap, 
  highlightSelectionMatches 
} from '@codemirror/search';
import { tags } from '@lezer/highlight';

// Language extensions
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { cpp } from '@codemirror/lang-cpp';
import { yaml } from '@codemirror/lang-yaml';

// Export everything as a global object
window.CM = {
  // State
  EditorState,
  
  // View
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  
  // Commands
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  
  // Language
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  
  // Autocomplete
  closeBrackets,
  closeBracketsKeymap,
  
  // Search
  searchKeymap,
  highlightSelectionMatches,
  
  // Highlight tags
  tags,
  
  // Language extensions
  languages: {
    javascript,
    html,
    css,
    json,
    markdown,
    python,
    php,
    sql,
    xml,
    cpp,
    yaml
  }
};

// Mark as loaded
window.CM_LOADED = true;
console.log('[CodeMirror] Bundle loaded successfully');