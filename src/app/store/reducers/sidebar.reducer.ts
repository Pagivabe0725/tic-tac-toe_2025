import { createReducer, on } from '@ngrx/store';
import { modifySidebar } from '../actions/sidebar-modify.action';

/**
 * Reducer that manages the open/closed state of the sidebar.
 *
 * The state is represented as a boolean:
 * - `true`  → sidebar is open
 * - `false` → sidebar is closed
 *
 * The reducer reacts to the {@link modifySidebar} action and
 * updates the state with the provided `isOpen` value.
 *
 * @param state - Current sidebar open state.
 * @param action - Action containing the next sidebar state.
 * @returns Updated sidebar open state.
 */
export const sidebarReducer = createReducer(
  false,
  on(modifySidebar, (_, action) => action.isOpen),
);
