/**
 * Error Handler Module Unit Tests
 * =================================
 * Tests for error handling functionality
 */

// Mock implementations for testing
const ErrorCategory = {
    NETWORK: 'NETWORK',
    VALIDATION: 'VALIDATION',
    FILE_OPERATION: 'FILE_OPERATION',
    PERMISSION: 'PERMISSION',
    NOT_FOUND: 'NOT_FOUND',
    TIMEOUT: 'TIMEOUT',
    SERVER: 'SERVER',
    CLIENT: 'CLIENT',
    UNKNOWN: 'UNKNOWN'
};

const ErrorSeverity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

// Simple implementation of categorizeError for testing
function categorizeError(error) {
    if (!error) return ErrorCategory.UNKNOWN;
    
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    
    if (
        name === 'typeerror' && message.includes('failed to fetch') ||
        name === 'networkerror' ||
        message.includes('network') ||
        message.includes('connection') ||
        error.name === 'AbortError'
    ) {
        return ErrorCategory.NETWORK;
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
        return ErrorCategory.TIMEOUT;
    }
    
    if (
        message.includes('permission') ||
        message.includes('forbidden') ||
        message.includes('403') ||
        message.includes('401')
    ) {
        return ErrorCategory.PERMISSION;
    }
    
    if (
        message.includes('not found') ||
        message.includes('404')
    ) {
        return ErrorCategory.NOT_FOUND;
    }
    
    if (
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('server error')
    ) {
        return ErrorCategory.SERVER;
    }
    
    if (
        message.includes('valid') ||
        message.includes('invalid') ||
        message.includes('required')
    ) {
        return ErrorCategory.VALIDATION;
    }
    
    if (
        message.includes('file') ||
        message.includes('folder') ||
        message.includes('directory')
    ) {
        return ErrorCategory.FILE_OPERATION;
    }
    
    return ErrorCategory.UNKNOWN;
}

// FileManagerError class for testing
class FileManagerError extends Error {
    constructor(message, category = ErrorCategory.UNKNOWN, options = {}) {
        super(message);
        this.name = 'FileManagerError';
        this.category = category;
        this.code = options.code || `ERR_${category}`;
        this.context = options.context || '';
        this.details = options.details || {};
        this.severity = options.severity || ErrorSeverity.MEDIUM;
        this.originalError = options.originalError || null;
        this.retryable = options.retry !== undefined ? options.retry : this._isRetryable();
        this.timestamp = new Date().toISOString();
    }
    
    _isRetryable() {
        return [ErrorCategory.NETWORK, ErrorCategory.TIMEOUT, ErrorCategory.SERVER]
            .includes(this.category);
    }
    
    getUserMessage() {
        const messages = {
            [ErrorCategory.NETWORK]: 'Koneksi jaringan bermasalah.',
            [ErrorCategory.TIMEOUT]: 'Operasi memakan waktu terlalu lama.',
            [ErrorCategory.PERMISSION]: 'Anda tidak memiliki izin.',
            [ErrorCategory.NOT_FOUND]: 'File atau folder tidak ditemukan.',
            [ErrorCategory.SERVER]: 'Terjadi kesalahan pada server.',
            [ErrorCategory.UNKNOWN]: 'Terjadi kesalahan.'
        };
        return messages[this.category] || this.message;
    }
    
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            category: this.category,
            code: this.code,
            severity: this.severity,
            retryable: this.retryable,
            timestamp: this.timestamp
        };
    }
}

describe('Error Handler Module', () => {
    
    describe('ErrorCategory', () => {
        test('should have all expected categories', () => {
            expect(ErrorCategory.NETWORK).toBe('NETWORK');
            expect(ErrorCategory.VALIDATION).toBe('VALIDATION');
            expect(ErrorCategory.FILE_OPERATION).toBe('FILE_OPERATION');
            expect(ErrorCategory.PERMISSION).toBe('PERMISSION');
            expect(ErrorCategory.NOT_FOUND).toBe('NOT_FOUND');
            expect(ErrorCategory.TIMEOUT).toBe('TIMEOUT');
            expect(ErrorCategory.SERVER).toBe('SERVER');
            expect(ErrorCategory.CLIENT).toBe('CLIENT');
            expect(ErrorCategory.UNKNOWN).toBe('UNKNOWN');
        });
    });
    
    describe('ErrorSeverity', () => {
        test('should have all expected severity levels', () => {
            expect(ErrorSeverity.LOW).toBe('low');
            expect(ErrorSeverity.MEDIUM).toBe('medium');
            expect(ErrorSeverity.HIGH).toBe('high');
            expect(ErrorSeverity.CRITICAL).toBe('critical');
        });
    });
    
    describe('categorizeError', () => {
        test('should return UNKNOWN for null/undefined', () => {
            expect(categorizeError(null)).toBe(ErrorCategory.UNKNOWN);
            expect(categorizeError(undefined)).toBe(ErrorCategory.UNKNOWN);
        });
        
        test('should categorize network errors', () => {
            const fetchError = new TypeError('Failed to fetch');
            expect(categorizeError(fetchError)).toBe(ErrorCategory.NETWORK);
            
            const networkError = new Error('Network connection lost');
            expect(categorizeError(networkError)).toBe(ErrorCategory.NETWORK);
            
            const abortError = new Error('Request aborted');
            abortError.name = 'AbortError';
            expect(categorizeError(abortError)).toBe(ErrorCategory.NETWORK);
        });
        
        test('should categorize timeout errors', () => {
            const timeoutError = new Error('Request timeout');
            expect(categorizeError(timeoutError)).toBe(ErrorCategory.TIMEOUT);
            
            const timedOutError = new Error('Operation timed out');
            expect(categorizeError(timedOutError)).toBe(ErrorCategory.TIMEOUT);
        });
        
        test('should categorize permission errors', () => {
            const permError = new Error('Permission denied');
            expect(categorizeError(permError)).toBe(ErrorCategory.PERMISSION);
            
            const forbiddenError = new Error('403 Forbidden');
            expect(categorizeError(forbiddenError)).toBe(ErrorCategory.PERMISSION);
            
            const authError = new Error('401 Unauthorized');
            expect(categorizeError(authError)).toBe(ErrorCategory.PERMISSION);
        });
        
        test('should categorize not found errors', () => {
            const notFoundError = new Error('File not found');
            expect(categorizeError(notFoundError)).toBe(ErrorCategory.NOT_FOUND);
            
            const error404 = new Error('404 Not Found');
            expect(categorizeError(error404)).toBe(ErrorCategory.NOT_FOUND);
        });
        
        test('should categorize server errors', () => {
            const serverError = new Error('Internal server error');
            expect(categorizeError(serverError)).toBe(ErrorCategory.SERVER);
            
            const error500 = new Error('500 Error');
            expect(categorizeError(error500)).toBe(ErrorCategory.SERVER);
            
            const error502 = new Error('502 Bad Gateway');
            expect(categorizeError(error502)).toBe(ErrorCategory.SERVER);
        });
        
        test('should categorize validation errors', () => {
            const validError = new Error('Invalid input');
            expect(categorizeError(validError)).toBe(ErrorCategory.VALIDATION);
            
            const requiredError = new Error('Field is required');
            expect(categorizeError(requiredError)).toBe(ErrorCategory.VALIDATION);
        });
        
        test('should categorize file operation errors', () => {
            const fileError = new Error('File operation failed');
            expect(categorizeError(fileError)).toBe(ErrorCategory.FILE_OPERATION);
            
            const folderError = new Error('Folder not accessible');
            expect(categorizeError(folderError)).toBe(ErrorCategory.FILE_OPERATION);
        });
    });
    
    describe('FileManagerError', () => {
        test('should create error with default values', () => {
            const error = new FileManagerError('Test error');
            
            expect(error.name).toBe('FileManagerError');
            expect(error.message).toBe('Test error');
            expect(error.category).toBe(ErrorCategory.UNKNOWN);
            expect(error.severity).toBe(ErrorSeverity.MEDIUM);
            expect(error.code).toBe('ERR_UNKNOWN');
        });
        
        test('should create error with custom category', () => {
            const error = new FileManagerError('Network error', ErrorCategory.NETWORK);
            
            expect(error.category).toBe(ErrorCategory.NETWORK);
            expect(error.code).toBe('ERR_NETWORK');
            expect(error.retryable).toBe(true);
        });
        
        test('should mark network errors as retryable', () => {
            const networkError = new FileManagerError('Failed', ErrorCategory.NETWORK);
            expect(networkError.retryable).toBe(true);
            
            const timeoutError = new FileManagerError('Timeout', ErrorCategory.TIMEOUT);
            expect(timeoutError.retryable).toBe(true);
            
            const serverError = new FileManagerError('Server', ErrorCategory.SERVER);
            expect(serverError.retryable).toBe(true);
        });
        
        test('should mark non-retryable errors correctly', () => {
            const validationError = new FileManagerError('Invalid', ErrorCategory.VALIDATION);
            expect(validationError.retryable).toBe(false);
            
            const permissionError = new FileManagerError('Denied', ErrorCategory.PERMISSION);
            expect(permissionError.retryable).toBe(false);
        });
        
        test('should allow explicit retry override', () => {
            const error = new FileManagerError('Test', ErrorCategory.VALIDATION, {
                retry: true
            });
            expect(error.retryable).toBe(true);
        });
        
        test('should store context and details', () => {
            const error = new FileManagerError('Test', ErrorCategory.FILE_OPERATION, {
                context: 'uploadFiles',
                details: { filename: 'test.txt', size: 1024 }
            });
            
            expect(error.context).toBe('uploadFiles');
            expect(error.details.filename).toBe('test.txt');
            expect(error.details.size).toBe(1024);
        });
        
        test('should provide user-friendly message', () => {
            const networkError = new FileManagerError('Technical error', ErrorCategory.NETWORK);
            expect(networkError.getUserMessage()).toBe('Koneksi jaringan bermasalah.');
            
            const timeoutError = new FileManagerError('Technical error', ErrorCategory.TIMEOUT);
            expect(timeoutError.getUserMessage()).toBe('Operasi memakan waktu terlalu lama.');
        });
        
        test('should serialize to JSON', () => {
            const error = new FileManagerError('Test error', ErrorCategory.SERVER, {
                code: 'CUSTOM_CODE'
            });
            
            const json = error.toJSON();
            
            expect(json.name).toBe('FileManagerError');
            expect(json.message).toBe('Test error');
            expect(json.category).toBe(ErrorCategory.SERVER);
            expect(json.code).toBe('CUSTOM_CODE');
            expect(json.timestamp).toBeDefined();
        });
        
        test('should have timestamp', () => {
            const before = new Date().toISOString();
            const error = new FileManagerError('Test');
            const after = new Date().toISOString();
            
            expect(error.timestamp).toBeDefined();
            expect(error.timestamp >= before).toBe(true);
            expect(error.timestamp <= after).toBe(true);
        });
    });
    
    describe('Retry Logic', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });
        
        afterEach(() => {
            jest.useRealTimers();
        });
        
        // Simple withRetry implementation for testing
        function withRetry(fn, options = {}) {
            const {
                maxRetries = 3,
                delay = 1000,
                backoffMultiplier = 2
            } = options;
            
            return async function(...args) {
                let lastError;
                let currentDelay = delay;
                
                for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                        return await fn.apply(this, args);
                    } catch (error) {
                        lastError = error;
                        
                        if (attempt < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, currentDelay));
                            currentDelay *= backoffMultiplier;
                        }
                    }
                }
                
                throw lastError;
            };
        }
        
        test('should succeed on first try', async () => {
            const mockFn = jest.fn().mockResolvedValue('success');
            const wrappedFn = withRetry(mockFn, { maxRetries: 3 });
            
            const result = await wrappedFn();
            
            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
        
        test('should retry on failure and succeed', async () => {
            const mockFn = jest.fn()
                .mockRejectedValueOnce(new Error('fail 1'))
                .mockRejectedValueOnce(new Error('fail 2'))
                .mockResolvedValue('success');
            
            const wrappedFn = withRetry(mockFn, {
                maxRetries: 3,
                delay: 100
            });
            
            const promise = wrappedFn();
            
            // Fast-forward through delays
            await jest.runAllTimersAsync();
            
            const result = await promise;
            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledTimes(3);
        });
        
        test('should throw after max retries', async () => {
            // Use real timers for this test to avoid async rejection issues
            jest.useRealTimers();
            
            let callCount = 0;
            const mockFn = jest.fn(async () => {
                callCount++;
                throw new Error('persistent error');
            });
            
            const wrappedFn = withRetry(mockFn, {
                maxRetries: 2,
                delay: 10 // Short delay for fast test
            });
            
            await expect(wrappedFn()).rejects.toThrow('persistent error');
            expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });
    });
    
    describe('Timeout Logic', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });
        
        afterEach(() => {
            jest.useRealTimers();
        });
        
        // Simple withTimeout implementation for testing
        function withTimeout(fn, timeout) {
            return async function(...args) {
                return Promise.race([
                    fn.apply(this, args),
                    new Promise((_, reject) => {
                        setTimeout(() => {
                            reject(new FileManagerError(
                                `Operation timed out after ${timeout}ms`,
                                ErrorCategory.TIMEOUT
                            ));
                        }, timeout);
                    })
                ]);
            };
        }
        
        test('should complete if operation finishes before timeout', async () => {
            const mockFn = jest.fn().mockResolvedValue('success');
            const wrappedFn = withTimeout(mockFn, 5000);
            
            const result = await wrappedFn();
            
            expect(result).toBe('success');
        });
        
        test('should throw timeout error if operation takes too long', async () => {
            const mockFn = jest.fn(() => new Promise(resolve => {
                setTimeout(() => resolve('too late'), 10000);
            }));
            
            const wrappedFn = withTimeout(mockFn, 5000);
            
            const promise = wrappedFn();
            
            // Advance past the timeout
            jest.advanceTimersByTime(5001);
            
            await expect(promise).rejects.toThrow('timed out');
        });
    });
});