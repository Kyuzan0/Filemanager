/**
 * Toast Notification Module Tests
 * Tests for public/assets/js/modules/toast.js
 *
 * toast.js is a non-module script that attaches functions to window.
 */

describe('Toast Notification System', () => {
    beforeAll(() => {
        // Load the toast module (attaches to window)
        require('../public/assets/js/modules/toast.js');
    });

    beforeEach(() => {
        // Clean up any existing toast containers
        document.querySelectorAll('.toast-container').forEach(el => el.remove());
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        document.querySelectorAll('.toast-container').forEach(el => el.remove());
    });

    describe('window exports', () => {
        test('showToast is available on window', () => {
            expect(typeof window.showToast).toBe('function');
        });

        test('showSuccess is available on window', () => {
            expect(typeof window.showSuccess).toBe('function');
        });

        test('showError is available on window', () => {
            expect(typeof window.showError).toBe('function');
        });

        test('showWarning is available on window', () => {
            expect(typeof window.showWarning).toBe('function');
        });

        test('showInfo is available on window', () => {
            expect(typeof window.showInfo).toBe('function');
        });
    });

    describe('showToast()', () => {
        test('creates toast container on first use', () => {
            window.showToast('success', 'Test message');
            const container = document.querySelector('.toast-container');
            expect(container).not.toBeNull();
        });

        test('creates toast element with correct class', () => {
            const toast = window.showToast('error', 'Error message');
            expect(toast.classList.contains('toast')).toBe(true);
            expect(toast.classList.contains('toast-error')).toBe(true);
        });

        test('displays message text', () => {
            const toast = window.showToast('info', 'Hello World');
            const message = toast.querySelector('.toast-message');
            expect(message.textContent).toBe('Hello World');
        });

        test('displays custom title', () => {
            const toast = window.showToast('success', 'msg', 'Custom Title');
            const title = toast.querySelector('.toast-title');
            expect(title.textContent).toBe('Custom Title');
        });

        test('uses default title when not specified', () => {
            const toast = window.showToast('success', 'msg');
            const title = toast.querySelector('.toast-title');
            expect(title.textContent).toBe('Berhasil');
        });

        test('has close button', () => {
            const toast = window.showToast('info', 'msg');
            const closeBtn = toast.querySelector('.toast-close');
            expect(closeBtn).not.toBeNull();
        });

        test('has role="alert" for accessibility', () => {
            const toast = window.showToast('warning', 'msg');
            expect(toast.getAttribute('role')).toBe('alert');
        });

        test('auto-dismisses after duration', () => {
            const toast = window.showToast('success', 'msg', null, 1000);

            jest.advanceTimersByTime(1000);
            // After dismiss, toast gets 'removing' class
            expect(toast.classList.contains('removing')).toBe(true);

            // After animation (300ms), toast is removed from DOM
            jest.advanceTimersByTime(300);
            expect(toast.parentNode).toBeNull();
        });

        test('close button removes toast', () => {
            const toast = window.showToast('info', 'msg');
            const closeBtn = toast.querySelector('.toast-close');

            closeBtn.click();
            expect(toast.classList.contains('removing')).toBe(true);

            jest.advanceTimersByTime(300);
            expect(toast.parentNode).toBeNull();
        });
    });

    describe('Toast with actions', () => {
        test('renders action buttons', () => {
            const actions = [
                { label: 'Undo', callback: jest.fn() },
                { label: 'Retry', callback: jest.fn() }
            ];
            const toast = window.showToast('success', 'msg', null, null, actions);

            const btns = toast.querySelectorAll('.toast-action-btn');
            expect(btns.length).toBe(2);
            expect(btns[0].textContent).toBe('Undo');
            expect(btns[1].textContent).toBe('Retry');
        });

        test('adds toast-has-actions class', () => {
            const actions = [{ label: 'Undo', callback: jest.fn() }];
            const toast = window.showToast('success', 'msg', null, null, actions);
            expect(toast.classList.contains('toast-has-actions')).toBe(true);
        });

        test('action button click calls callback', () => {
            const callback = jest.fn();
            const actions = [{ label: 'Undo', callback }];
            const toast = window.showToast('success', 'msg', null, null, actions);

            const btn = toast.querySelector('.toast-action-btn');
            btn.click();
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('action button is disabled after click', () => {
            const callback = jest.fn();
            const actions = [{ label: 'Undo', callback }];
            const toast = window.showToast('success', 'msg', null, null, actions);

            const btn = toast.querySelector('.toast-action-btn');
            btn.click();
            expect(btn.disabled).toBe(true);
        });

        test('uses longer duration (6s) when actions present', () => {
            const actions = [{ label: 'Undo', callback: jest.fn() }];
            const toast = window.showToast('success', 'msg', null, null, actions);
            const container = document.querySelector('.toast-container');

            // Should NOT be dismissed at 3s (default)
            jest.advanceTimersByTime(3000);
            expect(toast.classList.contains('removing')).toBe(false);

            // Should be dismissed at 6s
            jest.advanceTimersByTime(3000);
            expect(toast.classList.contains('removing')).toBe(true);
        });
    });

    describe('Convenience functions', () => {
        test('showSuccess creates success toast', () => {
            const toast = window.showSuccess('Done!');
            expect(toast.classList.contains('toast-success')).toBe(true);
        });

        test('showError creates error toast', () => {
            const toast = window.showError('Failed!');
            expect(toast.classList.contains('toast-error')).toBe(true);
        });

        test('showWarning creates warning toast', () => {
            const toast = window.showWarning('Careful!');
            expect(toast.classList.contains('toast-warning')).toBe(true);
        });

        test('showInfo creates info toast', () => {
            const toast = window.showInfo('FYI');
            expect(toast.classList.contains('toast-info')).toBe(true);
        });

        test('showSuccess uses custom title', () => {
            const toast = window.showSuccess('msg', 'My Title');
            const title = toast.querySelector('.toast-title');
            expect(title.textContent).toBe('My Title');
        });

        test('showError uses "Error" as default title', () => {
            const toast = window.showError('msg');
            const title = toast.querySelector('.toast-title');
            expect(title.textContent).toBe('Error');
        });
    });

    describe('Multiple toasts', () => {
        test('multiple toasts are added to the DOM', () => {
            const t1 = window.showToast('success', 'msg1');
            const t2 = window.showToast('error', 'msg2');
            const t3 = window.showToast('info', 'msg3');

            // All toasts should be in the DOM
            expect(t1.parentNode).not.toBeNull();
            expect(t2.parentNode).not.toBeNull();
            expect(t3.parentNode).not.toBeNull();

            // All toasts share the same parent container
            expect(t1.parentNode).toBe(t2.parentNode);
            expect(t2.parentNode).toBe(t3.parentNode);
        });
    });
});
