/**
 * Breadcrumb Renderer Module
 * Handles breadcrumb navigation rendering for the File Manager application
 */

/**
 * Renders breadcrumbs navigation
 * @param {HTMLElement} breadcrumbsEl - Breadcrumbs container element
 * @param {Array} breadcrumbs - Breadcrumb data array
 * @param {Function} navigateTo - Navigation function
 */
export function renderBreadcrumbs(breadcrumbsEl, breadcrumbs, navigateTo) {
    if (!breadcrumbsEl) return;
    
    // Clear children safely to avoid HTML parsing side-effects
    while (breadcrumbsEl.firstChild) {
        breadcrumbsEl.removeChild(breadcrumbsEl.firstChild);
    }
    
    breadcrumbs.forEach((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const element = document.createElement(isLast ? 'span' : 'a');
        element.textContent = crumb.label;

        if (!isLast) {
            element.href = '#';
            element.classList.add('breadcrumb-link', 'text-primary', 'hover:underline', 'cursor-pointer');
            element.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo(crumb.path);
            });
        } else {
            element.classList.add('breadcrumb-current', 'text-gray-600', 'dark:text-gray-300');
        }

        breadcrumbsEl.appendChild(element);

        if (!isLast) {
            const separator = document.createElement('span');
            separator.classList.add('breadcrumb-separator', 'mx-2', 'text-gray-400');
            separator.textContent = '\u203A'; // › character
            separator.setAttribute('aria-hidden', 'true');
            breadcrumbsEl.appendChild(separator);
        }
    });
}

/**
 * Creates a breadcrumb trail from a path
 * @param {string} path - Current path
 * @param {string} rootLabel - Label for root directory
 * @returns {Array} - Array of breadcrumb objects
 */
export function createBreadcrumbTrail(path, rootLabel = 'Root') {
    const breadcrumbs = [
        { label: rootLabel, path: '' }
    ];
    
    if (!path) return breadcrumbs;
    
    const parts = path.split('/').filter(Boolean);
    let currentPath = '';
    
    parts.forEach((part) => {
        currentPath += (currentPath ? '/' : '') + part;
        breadcrumbs.push({
            label: part,
            path: currentPath
        });
    });
    
    return breadcrumbs;
}

/**
 * Creates a compact breadcrumb trail for mobile view
 * Shows only root and current folder, with ellipsis for middle paths
 * @param {string} path - Current path
 * @param {string} rootLabel - Label for root directory
 * @param {number} maxVisible - Maximum number of visible breadcrumbs
 * @returns {Array} - Array of breadcrumb objects
 */
export function createCompactBreadcrumbTrail(path, rootLabel = 'Root', maxVisible = 3) {
    const fullTrail = createBreadcrumbTrail(path, rootLabel);
    
    if (fullTrail.length <= maxVisible) {
        return fullTrail;
    }
    
    // Show first, ellipsis indicator, and last (maxVisible - 1) items
    const result = [fullTrail[0]];
    
    // Add ellipsis placeholder
    result.push({
        label: '...',
        path: null, // null indicates this is not clickable
        isEllipsis: true
    });
    
    // Add last items
    const lastItems = fullTrail.slice(-(maxVisible - 1));
    result.push(...lastItems);
    
    return result;
}

/**
 * Renders compact breadcrumbs with dropdown for hidden paths
 * @param {HTMLElement} breadcrumbsEl - Breadcrumbs container element
 * @param {Array} breadcrumbs - Full breadcrumb data array
 * @param {Function} navigateTo - Navigation function
 * @param {number} maxVisible - Maximum visible breadcrumbs before collapsing
 */
export function renderCompactBreadcrumbs(breadcrumbsEl, breadcrumbs, navigateTo, maxVisible = 3) {
    if (!breadcrumbsEl) return;
    
    // Clear existing content
    while (breadcrumbsEl.firstChild) {
        breadcrumbsEl.removeChild(breadcrumbsEl.firstChild);
    }
    
    if (breadcrumbs.length <= maxVisible) {
        // Use standard rendering for short paths
        renderBreadcrumbs(breadcrumbsEl, breadcrumbs, navigateTo);
        return;
    }
    
    // Render first item
    const firstItem = breadcrumbs[0];
    const firstLink = document.createElement('a');
    firstLink.href = '#';
    firstLink.textContent = firstItem.label;
    firstLink.classList.add('breadcrumb-link', 'text-primary', 'hover:underline', 'cursor-pointer');
    firstLink.addEventListener('click', (event) => {
        event.preventDefault();
        navigateTo(firstItem.path);
    });
    breadcrumbsEl.appendChild(firstLink);
    
    // Add separator
    const sep1 = document.createElement('span');
    sep1.classList.add('breadcrumb-separator', 'mx-2', 'text-gray-400');
    sep1.textContent = '\u203A';
    sep1.setAttribute('aria-hidden', 'true');
    breadcrumbsEl.appendChild(sep1);
    
    // Render dropdown for hidden items
    const hiddenItems = breadcrumbs.slice(1, -(maxVisible - 1));
    if (hiddenItems.length > 0) {
        const dropdownContainer = document.createElement('div');
        dropdownContainer.classList.add('breadcrumb-dropdown', 'relative', 'inline-block');
        
        const dropdownBtn = document.createElement('button');
        dropdownBtn.type = 'button';
        dropdownBtn.classList.add('breadcrumb-dropdown-btn', 'text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300', 'px-1');
        dropdownBtn.textContent = '...';
        dropdownBtn.setAttribute('aria-expanded', 'false');
        dropdownBtn.setAttribute('aria-haspopup', 'true');
        
        const dropdownMenu = document.createElement('div');
        dropdownMenu.classList.add('breadcrumb-dropdown-menu', 'absolute', 'left-0', 'mt-1', 'bg-white', 'dark:bg-gray-800', 'rounded-md', 'shadow-lg', 'border', 'border-gray-200', 'dark:border-gray-700', 'py-1', 'z-50', 'hidden', 'min-w-[150px]');
        
        hiddenItems.forEach((item) => {
            const menuItem = document.createElement('a');
            menuItem.href = '#';
            menuItem.classList.add('block', 'px-4', 'py-2', 'text-sm', 'text-gray-700', 'dark:text-gray-200', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
            menuItem.textContent = item.label;
            menuItem.addEventListener('click', (event) => {
                event.preventDefault();
                dropdownMenu.classList.add('hidden');
                dropdownBtn.setAttribute('aria-expanded', 'false');
                navigateTo(item.path);
            });
            dropdownMenu.appendChild(menuItem);
        });
        
        // Toggle dropdown
        dropdownBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isHidden = dropdownMenu.classList.contains('hidden');
            dropdownMenu.classList.toggle('hidden', !isHidden);
            dropdownBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdownMenu.classList.add('hidden');
            dropdownBtn.setAttribute('aria-expanded', 'false');
        });
        
        dropdownContainer.appendChild(dropdownBtn);
        dropdownContainer.appendChild(dropdownMenu);
        breadcrumbsEl.appendChild(dropdownContainer);
        
        // Add separator after dropdown
        const sep2 = document.createElement('span');
        sep2.classList.add('breadcrumb-separator', 'mx-2', 'text-gray-400');
        sep2.textContent = '\u203A';
        sep2.setAttribute('aria-hidden', 'true');
        breadcrumbsEl.appendChild(sep2);
    }
    
    // Render last items
    const lastItems = breadcrumbs.slice(-(maxVisible - 1));
    lastItems.forEach((item, index) => {
        const isLast = index === lastItems.length - 1;
        
        if (isLast) {
            const span = document.createElement('span');
            span.classList.add('breadcrumb-current', 'text-gray-600', 'dark:text-gray-300');
            span.textContent = item.label;
            breadcrumbsEl.appendChild(span);
        } else {
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = item.label;
            link.classList.add('breadcrumb-link', 'text-primary', 'hover:underline', 'cursor-pointer');
            link.addEventListener('click', (event) => {
                event.preventDefault();
                navigateTo(item.path);
            });
            breadcrumbsEl.appendChild(link);
            
            const sep = document.createElement('span');
            sep.classList.add('breadcrumb-separator', 'mx-2', 'text-gray-400');
            sep.textContent = '\u203A';
            sep.setAttribute('aria-hidden', 'true');
            breadcrumbsEl.appendChild(sep);
        }
    });
}

/**
 * Updates the page title based on current breadcrumb
 * @param {Array} breadcrumbs - Breadcrumb data array
 * @param {string} baseTitle - Base application title
 */
export function updatePageTitle(breadcrumbs, baseTitle = 'File Manager') {
    if (!breadcrumbs || breadcrumbs.length === 0) {
        document.title = baseTitle;
        return;
    }
    
    const currentFolder = breadcrumbs[breadcrumbs.length - 1].label;
    document.title = `${currentFolder} - ${baseTitle}`;
}

/**
 * Gets the parent path from breadcrumbs
 * @param {Array} breadcrumbs - Breadcrumb data array
 * @returns {string} - Parent path or empty string for root
 */
export function getParentPath(breadcrumbs) {
    if (!breadcrumbs || breadcrumbs.length <= 1) {
        return '';
    }
    
    return breadcrumbs[breadcrumbs.length - 2].path;
}