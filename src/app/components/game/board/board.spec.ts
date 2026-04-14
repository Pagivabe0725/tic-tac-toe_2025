import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Board } from './board';
import {
  InputSignal,
  provideZonelessChangeDetection,
  signal,
  WritableSignal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import {
  randomBetween,
  randomNumber,
} from '../../../utils/test/functions/random-values.function';
import { createBoard } from '../../../utils/test/functions/creators.functions';
import { GameSettings } from '../../../utils/interfaces/game-settings.interface';
import { LastMove } from '../../../utils/interfaces/last-move.interface';
import {
  selectActualBoard,
  selectActualMarkup,
} from '../../../store/selectors/game-info.selector';
import { By } from '@angular/platform-browser';
import { provideMockStore } from '@ngrx/store/testing';
import { modifyGameInfo } from '../../../store/actions/game-info-modify.action';
import { GameInfo } from '../../../utils/interfaces/game-info.interface';

/**
 * @fileoverview
 * Defines the `Board` component, which represents the main interactive game grid.
 *
 * The component is responsible for:
 *  - rendering an N×N board using a CSS grid layout,
 *  - managing the board state via Angular signals,
 *  - synchronizing board data with the NgRx store,
 *  - reacting to external inputs such as board size, step changes, and last moves,
 *  - dispatching state updates back to the store,
 *  - ensuring accessibility by providing screen-reader-friendly ARIA labels.
 *
 * The implementation relies on signal-based reactivity and NgRx selectors
 * to keep the UI and application state consistent and predictable.
 */

describe('Board', () => {
  /** Instance of the Board component under test. */
  let component: Board;

  /** Angular test fixture providing access to the component instance and DOM. */
  let fixture: ComponentFixture<Board>;

  /** Size of the board used in the current test case (NxN). */
  let size: number;

  /** Local representation of the game board used for assertions. */
  let board: string[][];

  /** Writable signal mocking the board state selected from the NgRx store. */
  let actualBoardSignal: WritableSignal<string[][] | undefined>;

  /** Fallback signal returned for selectors not explicitly handled in tests. */
  let defaultSignal: WritableSignal<unknown>;

  /** Injected NgRx Store instance, spied and controlled during tests. */
  let store: Store;

  const setBoard = (newSize: number) => {
    size = newSize;
    board = createBoard(size);
    actualBoardSignal.set(board);
  };

  beforeEach(async () => {
    size = randomBetween(3, 9);
    board = createBoard(size);
    await TestBed.configureTestingModule({
      imports: [Board],
      providers: [
        provideZonelessChangeDetection(),
        provideMockStore({
          initialState: {},
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(Store);

    actualBoardSignal = signal<string[][] | undefined>(board);
    defaultSignal = signal<unknown>(undefined);

    spyOn(store, 'selectSignal').and.callFake(((selector: any) => {
      if (selector === selectActualBoard) {
        return actualBoardSignal;
      } else if (selector === selectActualMarkup) {
        return signal('o');
      }
      return defaultSignal;
    }) as typeof store.selectSignal);

    fixture = TestBed.createComponent(Board);
    component = fixture.componentInstance;

    component['size'] = signal(size) as unknown as InputSignal<
      GameSettings['size']
    >;

    component['step'] = signal(0) as unknown as InputSignal<number>;

    component['clickPermission'] = signal(
      true
    ) as unknown as InputSignal<boolean>;

    component['lastMove'] = signal(undefined) as unknown as InputSignal<
      LastMove | undefined
    >;

    fixture.detectChanges();
  });

  /**
   * HTML structure related tests.
   *
   */
  describe('HTML:', () => {
    /**
     * Verifies that the rendered template contains the expected number of button
     * elements based on the provided board size.
     */
    it('Should have a number of cells that matches the board size', () => {
      const fields = fixture.debugElement.queryAll(By.css('button'));
      expect(fields.length).toBe(Math.pow(size, 2));
    });

    /**
     * Verifies that the gridTemplate style binding correctly applies
     * the expected column and row definitions to the host element.
     */
    it('[gridTemplate] should apply correct grid column and row sizes to the host element', () => {
      // The host element of the component where the gridTemplate styles are applied
      const board = fixture.debugElement.nativeElement as HTMLDivElement;

      expect(board.style.gridTemplateColumns).toBe(`repeat(${size}, 1fr)`);
      expect(board.style.gridTemplateRows).toBe(`repeat(${size}, 1fr)`);
    });
  });

  /**
   * Tests the component's signal-based effects
   */
  describe('Effects:', () => {
    beforeEach(() => {
      actualBoardSignal.set(undefined);
      fixture.detectChanges();
    });

    it('First `effect` should initialize the board based on the `size` if no board exists in the store', () => {
      expect(component['gameField']()).toEqual(createBoard(size));
    });

    /**
     * Verifies that the component's second effect dispatches the correct actions
     * in the proper order when the `step` signal changes.
     *
     * The test uses the component's existing `step` signal (cast to WritableSignal)
     * to trigger changes. Each `.set()` call should cause the effect to run,
     * dispatching `modifyGameInfo` actions for both `actualMarkup` and `actualBoard`
     * in sequence. The test checks that all dispatch calls occur in the expected order.
     */
    it('Second effect should dispatch modifyGameInfo actions in correct order when step changes', () => {
      const dispatchSpy = spyOn(store, 'dispatch');

      const stepSignal = component['step'] as unknown as WritableSignal<number>;

      stepSignal.set(1);
      fixture.detectChanges();

      stepSignal.set(2);
      fixture.detectChanges();

      const calls = dispatchSpy.calls.allArgs().map((args) => args[0]);

      expect(calls).toEqual([
        modifyGameInfo({ actualMarkup: 'x' }),
        modifyGameInfo({ actualBoard: component['gameField']() }),
        modifyGameInfo({ actualMarkup: 'o' }),
        modifyGameInfo({ actualBoard: component['gameField']() }),
      ]);
    });

    /**
     * Verifies that the component's third effect reacts to changes in the `lastMove` signal.
     *
     * When the `lastMove` signal is updated with a new coordinate, the effect should call
     * the protected `setCell` method with the corresponding `{ xCoordinate, yCoordinate }`.
     * The test uses the existing `lastMove` WritableSignal to trigger the effect and
     * spies on `setCell` to assert the correct call.
     */
    it('Third effect should call setCell with the correct coordinates when `lastMove` changes', () => {
      spyOn<any>(component, 'setCell');

      const row = randomNumber(size);
      const column = randomNumber(size);

      const lastMoveSignal = component['lastMove'] as unknown as WritableSignal<
        GameInfo['lastMove']
      >;
      lastMoveSignal.set({ row, column });

      fixture.detectChanges();

      expect(component['setCell']).toHaveBeenCalledWith({
        row,
        column,
      });
    });
  });

  describe('Component methods:', () => {
    /**
     * Verifies that the `getAriaLabelText` method returns correct, screen-reader-friendly
     * descriptions for each board cell.
     *
     * The label should reflect the cell content (`empty`, `cross`, or `circle`)
     * and its position on the board in a human-readable format, e.g.,
     * "cross at row 2, column 3."
     */
    it('[getAriaLabelText] should return correct `ARIA` label text for each board cell', () => {
      board[0][0] = 'o';
      board[1][1] = 'x';

      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const field =
            board[i][j] === 'e'
              ? 'empty'
              : board[i][j] === 'x'
              ? 'cross'
              : 'circle';
          expect(
            component['getAriaLabelText']({ xCoordinate: i, yCoordinate: j })
          ).toBe(`${field} at row ${i + 1}, column ${j + 1}.`);
        }
      }
    });

    /**
     * Verifies that the `setCell` method updates the internal game board state
     * and dispatches the correct store action.
     *
     * When a valid cell coordinate is provided, the method should place the
     * current player's markup on the board, update the `gameField` signal,
     * and dispatch a `modifyGameInfo` action that increments the actual step.
     */
    it('[setCell] should update the board and dispatch step increment', () => {
      spyOn(store, 'dispatch');

      setBoard(randomBetween(3, 9));
      fixture.detectChanges();

      const row = randomNumber(size);
      const column = randomNumber(size);

      board[row][column] = 'o';
      component['setCell']({ row, column });
      fixture.detectChanges();

      expect(component['gameField']()).toEqual(board);
      expect(store.dispatch).toHaveBeenCalledWith(
        modifyGameInfo({ actualStep: component['step']() + 1 })
      );
    });
  });
});
