/**
 * Jest Configuration
 * ===================
 * Configuration for running tests in the File Manager project
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',
    
    // Root directory for tests
    roots: ['<rootDir>/tests'],
    
    // Test file patterns
    testMatch: [
        '**/*.test.js',
        '**/*.spec.js'
    ],
    
    // Setup files to run before tests
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    // Coverage configuration
    collectCoverageFrom: [
        'assets/js/modules/**/*.js',
        '!assets/js/modules/**/*.min.js',
        '!assets/js/vendor/**'
    ],
    
    // Coverage thresholds (start low, increase over time)
    coverageThreshold: {
        global: {
            branches: 10,
            functions: 10,
            lines: 10,
            statements: 10
        }
    },
    
    // Coverage output directory
    coverageDirectory: 'coverage',
    
    // Reporter configuration
    reporters: ['default'],
    
    // Verbose output
    verbose: true,
    
    // Module file extensions
    moduleFileExtensions: ['js', 'json'],
    
    // Transform configuration (for ES modules if needed)
    transform: {},
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Test timeout
    testTimeout: 10000,
    
    // Globals
    globals: {
        'window': true,
        'document': true
    }
};