import {
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  inject,
  Input,
  input,
  InputSignal,
  Output,
} from '@angular/core';
import { Theme } from '../../../services/theme.service';
import { LastMove } from '../../../utils/interfaces/last-move.interface';
import { Store } from '@ngrx/store';
import { modifyGameInfo } from '../../../store/actions/game-info-modify.action';
import { GameInfo } from '../../../utils/interfaces/game-info.interface';

/**
 * GameFieldCell component represents a single cell within the game board grid.
 *
 * Responsibilities:
 *  - Displays the current markup ('x', 'o', or empty).
 *  - Applies dynamic styling based on content, hover state, and last move.
 *  - Emits click events when a cell is selected, if allowed.
 *
 * Uses Angular Signals API for reactivity.
 */
@Component({
  selector: 'button[appGameFieldCell]',
  imports: [],
  templateUrl: './game-field-cell.html',
  styleUrl: './game-field-cell.scss',
})
export class GameFieldCell {
  /** Theme service for responsive styling and dynamic layout. */
  protected theme: Theme = inject(Theme);

  /** NgRx store instance for dispatching state updates. */
  #store: Store = inject(Store);

  /**
   * Current cell markup.
   * Can be:
   *  - 'x' for X player,
   *  - 'o' for O player,
   *  - undefined for empty.
   */
  markup: InputSignal<GameInfo['actualMarkup']> = input.required();

  /** Last move performed in the game. */
  lastMove: InputSignal<LastMove | undefined> = input.required();

  /** Y-coordinate of this cell in the board grid. Required input. */
  @Input({ required: true }) column!: number;

  /** X-coordinate of this cell in the board grid. Required input. */
  @Input({ required: true }) row!: number;

  /** Determines whether clicking this cell is currently allowed. */
  clickPermission: InputSignal<boolean> = input.required();

  /**
   * Event emitted when the cell is clicked.
   * Emits an object with the cell coordinates: `{ xCoordinate, yCoordinate }`.
   */
  @Output() setPosition = new EventEmitter<{
    column: number;
    row: number;
  }>();

  /**
   * Dynamically sets the cursor style.
   * - 'pointer' if cell is empty and clicking is allowed,
   * - 'default' otherwise.
   */
  @HostBinding('style.cursor')
  get cursor(): string {
    return this.markup() || !this.clickPermission() ? 'default' : 'pointer';
  }

  /**
   * Applies a CSS class to enable hover scaling animation for empty cells.
   */
  @HostBinding('class')
  get scale(): string | null {
    return this.markup() || !this.clickPermission() ? null : 'own-cell-hover';
  }

  /**
   * Applies a CSS class to emphasize the last move cell with a border animation.
   */
  @HostBinding('class')
  get emphasize(): string | null {
    const move = this.lastMove();
    return move?.row === this.row && move?.column === this.column
      ? 'own-animated-border'
      : null;
  }

  /**
   * Handles user click events on the cell.
   * Updates the NgRx store with the lastMove if the cell is empty and clickable.
   *
   * @event
   */
  @HostListener('click')
  fill(): void {
    if (!this.markup() && this.clickPermission()) {
      this.#store.dispatch(
        modifyGameInfo({
          lastMove: { row: this.row, column: this.column },
        }),
      );

      // Optional: emit the coordinates to parent components if needed
      // this.setPosition.emit({ xCoordinate: this.xCoordinate, yCoordinate: this.yCoordinate });
    }
  }
}
