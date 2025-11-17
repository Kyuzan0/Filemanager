/* REMOVED: project uses Tailwind CDN now.
  This file kept as a historical marker. Delete it if you want to remove all build traces.
*/

module.exports = {
  // Minimal safelist to protect dynamic classes discovered during CDN migration audit.
  // Keep this file as a marker and update the arrays if you re-enable local Tailwind build.
  safelist: [
    'tw-overlay','visible','modal-open','is-new','dirty','drop-target','drag-over','spinner',
    'btn','pagination-container','pagination-btn','pagination-number','pagination-ellipsis',
    'inline-flex','items-center','justify-center','rounded-md','border','bg-transparent',
    'bg-blue-50','bg-blue-600','text-blue-600','text-white','text-gray-700','text-gray-500',
    'hover:bg-blue-50','hover:bg-blue-600','hover:text-white','hover:text-blue-700'
  ],
  safelistPatterns: [
    /^min-w-\[.*\]$/,
    /^\w+-\[\d+px\]$/,
    /^\w+-\[.*\]$/
  ]
};