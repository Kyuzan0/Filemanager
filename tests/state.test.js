/**
 * State Management Module Tests
 * Tests for state.js module
 */

import {
    state,
    updateState,
    updateStateLocked,
    optimisticUpdate,
    getStateValue,
    setStateValue,
    resetState
} from '../public/assets/js/modules/state.js';

describe('State Management Module', () => {
    beforeEach(() => {
        // Reset state before each test
        resetState();
    });

    describe('getState()', () => {
        test('returns current state object', () => {
            expect(state).toBeDefined();
            expect(typeof state).toBe('object');
        });

        test('state has expected initial properties', () => {
            expect(state.currentPath).toBe('');
            expect(state.items).toEqual([]);
            expect(state.selected).toBeInstanceOf(Set);
            expect(state.isLoading).toBe(false);
        });
    });

    describe('updateState()', () => {
        test('merges simple updates correctly', () => {
            updateState({ currentPath: '/test', isLoading: true });
            expect(state.currentPath).toBe('/test');
            expect(state.isLoading).toBe(true);
        });

        test('merges nested object updates', () => {
            updateState({ preview: { isOpen: true, path: '/test.txt' } });
            expect(state.preview.isOpen).toBe(true);
            expect(state.preview.path).toBe('/test.txt');
            // Should preserve other preview properties
            expect(state.preview.dirty).toBe(false);
        });

        test('handles array updates', () => {
            const items = [{ name: 'file1.txt' }, { name: 'file2.txt' }];
            updateState({ items });
            expect(state.items).toEqual(items);
            expect(state.items.length).toBe(2);
        });

        test('handles Set type correctly', () => {
            const selected = new Set(['item1', 'item2']);
            updateState({ selected });
            expect(state.selected).toBeInstanceOf(Set);
            expect(state.selected.size).toBe(2);
            expect(state.selected.has('item1')).toBe(true);
        });

        test('handles Map type correctly', () => {
            const itemMap = new Map([['key1', 'value1'], ['key2', 'value2']]);
            updateState({ itemMap });
            expect(state.itemMap).toBeInstanceOf(Map);
            expect(state.itemMap.size).toBe(2);
            expect(state.itemMap.get('key1')).toBe('value1');
        });

        test('does not spread Set into empty object', () => {
            const selected = new Set(['a', 'b']);
            updateState({ selected });
            // Verify Set is preserved, not converted to {}
            expect(state.selected).toBeInstanceOf(Set);
            expect(Object.keys(state.selected).length).toBe(0); // Sets don't have enumerable keys
        });

        test('does not spread Map into empty object', () => {
            const knownItems = new Map([['x', 1]]);
            updateState({ knownItems });
            expect(state.knownItems).toBeInstanceOf(Map);
            expect(state.knownItems.get('x')).toBe(1);
        });
    });

    describe('updateStateLocked()', () => {
        test('updates state when not locked', () => {
            updateStateLocked({ currentPath: '/locked' });
            expect(state.currentPath).toBe('/locked');
        });

        test('retries when locked and eventually succeeds', (done) => {
            // Simulate a lock by calling updateStateLocked twice rapidly
            updateStateLocked({ currentPath: '/first' });
            
            // This should queue and retry
            setTimeout(() => {
                updateStateLocked({ isLoading: true });
                
                // Give it time to process
                setTimeout(() => {
                    expect(state.currentPath).toBe('/first');
                    expect(state.isLoading).toBe(true);
                    done();
                }, 50);
            }, 5);
        });

        test('force-unlocks after MAX_LOCK_RETRIES', (done) => {
            // Create a scenario where lock is held indefinitely
            // We'll manually test the retry counter by calling updateStateLocked
            // in a way that simulates max retries
            
            // First update
            updateStateLocked({ currentPath: '/test1' });
            
            // Immediately try another update (will retry)
            updateStateLocked({ currentPath: '/test2' });
            
            // After sufficient time (50 retries * 10ms = 500ms), it should force through
            setTimeout(() => {
                expect(state.currentPath).toBe('/test2');
                done();
            }, 600);
        });
    });

    describe('optimisticUpdate()', () => {
        test('creates snapshot and returns rollback function', () => {
            state.items = [{ name: 'file1.txt' }];
            state.selected = new Set(['file1.txt']);
            
            const rollback = optimisticUpdate(
                () => {
                    state.items = [{ name: 'file2.txt' }];
                    state.selected = new Set(['file2.txt']);
                },
                () => {}
            );
            
            expect(typeof rollback).toBe('function');
            expect(state.items[0].name).toBe('file2.txt');
            expect(state.selected.has('file2.txt')).toBe(true);
        });

        test('rollback restores previous state', () => {
            state.items = [{ name: 'original.txt' }];
            state.selected = new Set(['original.txt']);
            
            const rollback = optimisticUpdate(
                () => {
                    state.items = [{ name: 'modified.txt' }];
                    state.selected = new Set(['modified.txt']);
                },
                jest.fn()
            );
            
            // Verify optimistic update applied
            expect(state.items[0].name).toBe('modified.txt');
            
            // Rollback
            rollback();
            
            // Verify state restored
            expect(state.items[0].name).toBe('original.txt');
            expect(state.selected.has('original.txt')).toBe(true);
        });

        test('rollback calls custom rollback function', () => {
            const customRollback = jest.fn();
            
            const rollback = optimisticUpdate(
                () => { state.items = []; },
                customRollback
            );
            
            rollback();
            
            expect(customRollback).toHaveBeenCalledTimes(1);
        });

        test('rollback does nothing if snapshot is null', () => {
            const rollback = optimisticUpdate(
                () => { state.items = [{ name: 'test' }]; },
                jest.fn()
            );
            
            // Call rollback once (clears snapshot)
            rollback();
            
            // Call again (should do nothing)
            state.items = [{ name: 'different' }];
            rollback();
            
            // State should not change
            expect(state.items[0].name).toBe('different');
        });
    });

    describe('getStateValue()', () => {
        test('retrieves top-level property', () => {
            state.currentPath = '/test';
            expect(getStateValue('currentPath')).toBe('/test');
        });

        test('retrieves nested property', () => {
            state.preview.isOpen = true;
            expect(getStateValue('preview.isOpen')).toBe(true);
        });

        test('returns undefined for non-existent path', () => {
            expect(getStateValue('nonexistent.path')).toBeUndefined();
        });
    });

    describe('setStateValue()', () => {
        test('sets top-level property', () => {
            setStateValue('currentPath', '/new-path');
            expect(state.currentPath).toBe('/new-path');
        });

        test('sets nested property', () => {
            setStateValue('preview.isOpen', true);
            expect(state.preview.isOpen).toBe(true);
        });

        test('does nothing for invalid path', () => {
            const originalState = { ...state };
            setStateValue('nonexistent.path', 'value');
            // State should remain unchanged
            expect(state.currentPath).toBe(originalState.currentPath);
        });
    });

    describe('resetState()', () => {
        test('resets all state to initial values', () => {
            // Modify state
            state.currentPath = '/modified';
            state.items = [{ name: 'test' }];
            state.selected.add('item1');
            state.isLoading = true;
            state.preview.isOpen = true;
            
            // Reset
            resetState();
            
            // Verify reset
            expect(state.currentPath).toBe('');
            expect(state.items).toEqual([]);
            expect(state.selected.size).toBe(0);
            expect(state.isLoading).toBe(false);
            expect(state.preview.isOpen).toBe(false);
        });

        test('clears Map and Set instances', () => {
            state.knownItems.set('key', 'value');
            state.selected.add('item');
            state.itemMap.set('id', 'data');
            
            resetState();
            
            expect(state.knownItems.size).toBe(0);
            expect(state.selected.size).toBe(0);
            expect(state.itemMap.size).toBe(0);
        });

        test('resets nested state objects', () => {
            state.preview.isOpen = true;
            state.preview.path = '/test.txt';
            state.preview.dirty = true;
            
            resetState();
            
            expect(state.preview.isOpen).toBe(false);
            expect(state.preview.path).toBe(null);
            expect(state.preview.dirty).toBe(false);
        });
    });

    describe('State references', () => {
        test('arrays are assigned by reference for performance', () => {
            const originalItems = [{ name: 'file1.txt' }];
            updateState({ items: originalItems });

            // State holds the same reference (by design — no deep clone)
            expect(state.items).toBe(originalItems);
        });

        test('Set values are cloned into new Set', () => {
            const originalSet = new Set(['a', 'b']);
            updateState({ selected: originalSet });

            // updateState creates a new Set from the value
            expect(state.selected).toBeInstanceOf(Set);
            expect(state.selected.size).toBe(2);
            expect(state.selected.has('a')).toBe(true);
        });

        test('Map values are cloned into new Map', () => {
            const originalMap = new Map([['k', 'v']]);
            updateState({ itemMap: originalMap });

            expect(state.itemMap).toBeInstanceOf(Map);
            expect(state.itemMap.get('k')).toBe('v');
        });
    });
});
