import {
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  InputSignal,
  OnInit,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { CellCoordinate } from '../../../utils/interfaces/celll-coordinate.interface';
import { GameFieldCell } from '../game-field-cell/game-field-cell';
import { LastMove } from '../../../utils/interfaces/last-move.interface';
import { Store } from '@ngrx/store';
import {
  selectActualBoard,
  selectActualMarkup,
} from '../../../store/selectors/game-info.selector';
import { modifyGameInfo } from '../../../store/actions/game-info-modify.action';
import { GameSettings } from '../../../utils/interfaces/game-settings.interface';
import { GameInfo } from '../../../utils/interfaces/game-info.interface';

/**
 * Board component responsible for rendering the interactive game grid,
 * synchronizing it with NgRx state, and updating the internal signal-based
 * representation of the board.
 *
 * The component:
 *  - creates an empty N×N board based on the `size` input,
 *  - hydrates the board from store if a saved board exists,
 *  - updates store state whenever a cell is changed,
 *  - automatically applies moves based on the incoming `lastMove`,
 *  - keeps accessibility labels updated for each cell.
 */
@Component({
  selector: 'div[appBoard], section[appBoard]',
  imports: [GameFieldCell],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board implements OnInit {
  /** Injected NgRx store instance. */
  #store: Store = inject(Store);

  /** Reactive selector for the stored board state (NgRx -> signal). */
  #storedBoard = this.#store.selectSignal(selectActualBoard);

  /** Size of the board (NxN). Required input. */
  size: InputSignal<GameSettings['size']> = input.required();

  /** Whether clicking cells is currently allowed. */
  clickPermission: InputSignal<boolean> = input.required();

  /** The last move performed externally (e.g., AI or another player). */
  lastMove: InputSignal<LastMove | undefined> = input.required();

  /** Used to detect changes in lastMove. */
  private previousLastMove: LastMove | undefined;

  /** Current step number from parent or store. */
  step: InputSignal<number> = input.required();

  /**
   * Computed base structure of the board:
   * creates a `size × size` matrix filled with empty strings.
   */
  #cellStructure: Signal<string[][]> = computed(() => {
    const size = this.size();
    return Array.from({ length: size }, () =>
      Array.from({ length: size }, () => 'e'),
    );
  });

  /** WritableSignal storing the actual game board matrix. */
  #gameField: WritableSignal<string[][] | undefined> = signal(undefined);

  /**
   * Public readonly signal exposing the board content.
   * Can be used in templates for reactive binding.
   */
  get gameField(): Signal<string[][] | undefined> {
    return this.#gameField.asReadonly();
  }

  /**
   * Normalizes a raw cell content string to a valid `GameInfo['actualMarkup']` value.
   *
   * This method performs a type assertion to treat the incoming string as a
   * game markup ('x' or 'o'). It assumes that the caller guarantees the validity
   * of the provided content.
   *
   * Used to keep template logic simple and type-safe when rendering board cells.
   *
   * @param content Raw cell content value.
   * @returns The content cast as a game markup.
   */
  protected formatFieldContent(content: string): GameInfo['actualMarkup'] {
    return content ==='e' ? undefined : content as GameInfo['actualMarkup'] 
  }

  /**
   * Applies CSS grid layout properties dynamically based on board size.
   */
  @HostBinding('style')
  get gridTemplate(): Partial<CSSStyleDeclaration> {
    return {
      gridTemplateRows: `repeat(${this.size()}, 1fr)`,
      gridTemplateColumns: `repeat(${this.size()}, 1fr)`,
    };
  }

  /** Stores the initial lastMove when the component initializes. */
  ngOnInit(): void {
    this.previousLastMove = this.lastMove();
  }

  constructor() {
    /**
     * Effect 1:
     * Synchronizes the board with stored state.
     * If NgRx has a saved board, it is used; otherwise a fresh empty board.
     */
    effect(() => {
      const storedBoard = this.#storedBoard();
      const cellStructure = this.#cellStructure().map((row) => [...row]);
      this.#gameField.set(storedBoard ? storedBoard : cellStructure);
    });

    /**
     * Effect 2:
     * Whenever the step changes:
     *  - update whose turn it is (actualMarkup),
     *  - persist the current board to store.
     */
    effect(() => {
      if (this.step()) {
        this.#store.dispatch(
          modifyGameInfo({ actualMarkup: this.step() % 2 === 0 ? 'o' : 'x' }),
        );
        this.#store.dispatch(modifyGameInfo({ actualBoard: this.gameField() }));
      }
    });

    /**
     * Effect 3:
     * When lastMove changes externally, the corresponding cell is updated.
     */
    effect(() => {
      const lastMove = this.lastMove();
      if (lastMove && lastMove !== this.previousLastMove) {
        this.setCell({
          row: lastMove.row,
          column: lastMove.column,
        });
      }
    });
  }

  /**
   * Returns a descriptive aria-label string for screen readers,
   * indicating the content and the coordinates of a specific cell.
   *
   * @param coordinates Cell coordinates (row/column).
   * @returns A descriptive accessibility label.
   */
  protected getAriaLabelText(coordinates: CellCoordinate): string {
    const content =
      this.gameField()![coordinates.xCoordinate][coordinates.yCoordinate];
    const contentName = !content
      ? 'empty'
      : content === 'x'
        ? 'cross'
        : 'circle';
    return `${contentName} at row ${coordinates.xCoordinate + 1}, column ${
      coordinates.yCoordinate + 1
    }.`;
  }

  /**
   * Writes a markup ('x' or 'o') into the given cell and updates the step count.
   *
   * This method:
   *  - updates the local board signal immutably,
   *  - writes the current player's symbol into the selected cell,
   *  - increments the actualStep in NgRx store,
   *  - tracks lastMove to prevent duplicate writes via effects.
   *
   * @param coordinates Cell position where the symbol should be placed.
   */
  protected setCell(coordinates: { row: number; column: number }): void {
    this.#gameField.update((prev) => {
      const newField = prev!.map((row) => [...row]);
      newField[coordinates.row][coordinates.column] =
        this.#store.selectSignal(selectActualMarkup)()!;
      return newField;
    });

    this.#store.dispatch(modifyGameInfo({ actualStep: this.step() + 1 }));
    this.previousLastMove = this.lastMove();
  }
}
