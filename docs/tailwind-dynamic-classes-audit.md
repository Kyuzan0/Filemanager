# Tailwind Dynamic Classes Audit

Summary
This document lists places in the codebase where Tailwind utility classes are added dynamically (via classList.add, innerHTML templates, className assignments, or string templates). These are the classes that will be missed by PurgeCSS/Content-based purging if you later re-enable a local Tailwind build. I grouped findings by file and highlighted the exact utilities that are either arbitrary (bracket-style) or dynamically constructed.

Methodology
- Scanned JS modules for classList.add, innerHTML assignments and other dynamic DOM APIs.
- Focused on classes that are:
  - Arbitrary (bracket-based), e.g. `min-w-[36px]`
  - Dynamic or programmatically added strings, e.g. `hover:bg-blue-600`
  - InnerHTML templates that may contain class attributes
- Referenced code locations for quick inspection.

Findings (file -> notable classes / patterns)

- [`assets/js/modules/pagination.js`](assets/js/modules/pagination.js:211)
  - classList.add usage: 'w-9', 'h-9', 'inline-flex', 'items-center', 'justify-center', 'rounded-md', 'border', 'bg-transparent', 'text-gray-700', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-200'
  - Hover utilities: 'hover:bg-blue-600', 'hover:text-white'
  - Arbitrary class: 'min-w-[36px]' (bracket syntax)

- [`assets/js/modules/uiRenderer.js`](assets/js/modules/uiRenderer.js:164, 464)
  - Many classList.add usages across rows/buttons: 'group','hover:bg-gray-50','cursor-default','transition-colors'
  - Buttons use: 'inline-flex','items-center','justify-center','w-8','h-8','rounded-md','border','bg-blue-50','text-blue-600','transition','hover:bg-blue-600','hover:text-white'
  - Icon insertion sometimes uses innerHTML with SVG strings: see `icon.innerHTML = iconInfo.svg` (uiRenderer.js:275)

- [`assets/js/modules/modals.js`](assets/js/modules/modals.js:56, 296, 377, 483, 601, 951)
  - Overlays and dialogs get utility classes: 'tw-overlay', 'visible', 'bg-white', 'rounded-lg', 'shadow-lg', 'p-4', 'max-w-3xl', 'max-w-lg', 'max-w-md', 'max-w-4xl', 'w-full'
  - Viewer uses innerHTML for content (`viewer.innerHTML = ''` and sometimes `viewer.innerHTML = '<p ...>'`) (modals.js:846, 911)

- [`assets/js/modules/pagination.js`](assets/js/modules/pagination.js:162-186)
  - container.classList.add with many utilities including 'flex','flex-wrap','items-center','justify-between','gap-4','p-3'
  - `paginationContainer.innerHTML = ''` (templates cleared then DOM built)

- [`assets/js/modules/fileIcons.js`](assets/js/modules/fileIcons.js:95)
  - className created dynamically: `className: \`file ${kind}\`` — watch dynamic `kind` expansions if re-enable purge.

- [`assets/js/modules/moveOverlay.js`](assets/js/modules/moveOverlay.js:232, 696)
  - icon.innerHTML/backtick templates with SVG markup; many UI classes added with classList.add('btn') etc.
  - innerHTML used frequently for small SVG snippets.

- [`assets/js/modules/logManager.js`](assets/js/modules/logManager.js:442)
  - classList.add with dynamic string template: `log-action-${log.action}`

- [`assets/js/modules/appInitializer.js`](assets/js/modules/appInitializer.js:564, 1174, 1255, 1967)
  - innerHTML used for error, log rows, and helper views
  - elements.previewLineNumbersInner.innerHTML built dynamically (line numbers)

- Multiple modules (eventHandlers, fileOperations, dragDrop, virtualScroll, etc.)
  - Repeated use of classList.add with utilities like 'error', 'visible', 'is-new', 'dirty', 'drop-target', 'drag-over', 'spinner', 'btn' and many color/spacing utilities.

Why this matters
- When you re-enable a Tailwind build + purge, any class strings that only appear at runtime (via JS) can be removed from the generated CSS unless you safelist them in tailwind.config.js or refactor the code so the class names exist in source files as static text.
- Arbitrary classes (bracket form) are especially brittle because purge tools may not see the bracket form if they only scan HTML/JS; you should safelist such patterns or avoid them.

Recommended Safelist (to put in tailwind.config.js)
- Exact classes (non-exhaustive example; include all you rely on):
  [
    'tw-overlay','visible','modal-open','is-new','dirty','drop-target','drag-over','spinner',
    'btn','row-action','pagination-container','pagination-btn','pagination-number','pagination-ellipsis',
    'item-select','form-checkbox','item-link','item-icon','badge','badge-new','preview-viewer-wrapper',
    'inline-flex','items-center','justify-center','rounded-md','border','bg-transparent','bg-blue-50',
    'bg-blue-600','text-blue-600','text-white','text-gray-700','text-gray-500','hover:bg-blue-50',
    'hover:bg-blue-600','hover:text-white','hover:text-blue-700'
  ]

- Regex/safelist patterns for bracketed/arbitrary classes (Tailwind supports patterns):
  - /^min-w-\[.*\]$/  // e.g. min-w-[36px]
  - /^w-\[.*\]$/     // arbitrary widths if any
  - /^\w+-\[.*\]$/   // generic bracketed utilities
  - /^text-[a-z0-9-]+$/i  // if you use dynamically generated color names (use specific list if possible)

Concrete tailwind.config.js snippet (example)
module.exports = {
  // ...
  safelist: [
    'tw-overlay','visible','modal-open','is-new','dirty','drop-target','drag-over','spinner',
    'btn','row-action','pagination-container','pagination-btn','pagination-number','pagination-ellipsis',
    'inline-flex','items-center','justify-center','rounded-md','border','bg-transparent','bg-blue-50',
    'bg-blue-600','text-blue-600','text-white','text-gray-700','text-gray-500','hover:bg-blue-50',
    'hover:bg-blue-600','hover:text-white','hover:text-blue-700'
  ],
  safelistPatterns: [
    /^min-w-\[.*\]$/,
    /^\w+-\[\d+px\]$/,      // explicit pixel shorthand pattern
    /^\w+-\[.*\]$/
  ]
};

Refactor suggestions (preferred over large safelist)
- Replace innerHTML templates that include class attributes with DOM APIs + classList.add to keep classes visible in source. (You already largely do this — good.)
- Avoid constructing class names from unbounded variables (e.g. `` `log-action-${log.action}` ``) unless action values are enumerated; if enumerated, add each possible class to safelist.
- For bracket classes:
  - Where possible, replace bracket utilities with a small set of pre-defined classes (e.g. use `min-w-9` or `min-w-[36px]` → replace by a custom utility like `.min-w-36` defined in CSS).
  - Or add explicit bracket values to safelist patterns.

Next steps I can take now
- Produce a complete, machine-readable list of all discovered dynamic classes and bracket occurrences (CSV/JSON) so you can paste into tailwind.config.js safelist.
- Optionally apply a patch to tailwind.config.js to include a conservative safelist and patterns (I can add it as a minimal helpful default).
- Or refactor specific innerHTML occurrences to safer DOM construction alternatives.

Which of the next steps do you want me to perform now?
- Create a JSON safelist file with all discovered classes and bracket patterns for direct copy into `tailwind.config.js` (recommended first step).
- Apply a conservative safelist directly into [`tailwind.config.js`](tailwind.config.js:1).
- Start refactoring innerHTML occurrences to DOM APIs (I can convert the most critical ones first).
