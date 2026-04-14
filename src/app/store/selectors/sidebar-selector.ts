import { createFeatureSelector, createSelector } from '@ngrx/store';

/**
 * Feature selector that selects the sidebar state from the global store.
 *
 * The sidebar state is stored as a boolean:
 * - `true`  → sidebar is open
 * - `false` → sidebar is closed
 */
export const selectSidebarState = createFeatureSelector<boolean>('sidebar');

/**
 * Selector that returns the current sidebar open/closed state.
 *
 * This selector is typically used by components to reactively
 * control sidebar visibility.
 *
 * @param state - Sidebar feature state.
 * @returns Boolean indicating whether the sidebar is open.
 */
export const selectSidebar = createSelector(
  selectSidebarState,
  (state) => state,
);
