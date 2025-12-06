/**
 * Jest Test Setup
 * ================
 * Global test setup and configuration for File Manager tests
 */

// Mock browser globals
global.window = {
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    showToast: jest.fn(),
    location: {
        href: 'http://localhost/Filemanager/',
        hostname: 'localhost'
    },
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    },
    dispatchEvent: jest.fn()
};

global.document = {
    createElement: jest.fn(() => ({
        textContent: '',
        innerHTML: '',
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn()
        },
        style: {}
    })),
    getElementById: jest.fn(() => null),
    querySelector: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    },
    dispatchEvent: jest.fn()
};

global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail || null;
    }
};

// Mock fetch
global.fetch = jest.fn();

// Mock AbortController
global.AbortController = class AbortController {
    constructor() {
        this.signal = { aborted: false };
    }
    abort() {
        this.signal.aborted = true;
    }
};

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => [{ duration: 100 }]),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
};

// Console setup - capture but don't suppress
const originalConsole = { ...console };

beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset fetch mock
    global.fetch.mockReset();
});

afterEach(() => {
    // Cleanup after each test
});

// Export for use in tests
module.exports = {
    originalConsole
};