import { createAction, props } from '@ngrx/store';

/**
 * Action that updates the sidebar open/closed state.
 *
 * Dispatched when the main theme sidebar visibility changes.
 * The reducer should use this value to toggle the sidebar UI.
 *
 * @param isOpen - Indicates whether the sidebar should be open.
 */
export const modifySidebar = createAction(
  '[Sidebar] Set open',
  props<{ isOpen: boolean }>(),
);