import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  Signal,
} from '@angular/core';

import { GameDisplayPart } from './game-display-part/game-display-part';
import { GameLogic } from '../../services/game-logic.service';
import { Store } from '@ngrx/store';
import {
  selectGameHardness,
  selectGameOpponent,
  selectGameSize,
} from '../../store/selectors/game-settings.selector';
import { LastMove } from '../../utils/interfaces/last-move.interface';
import { Board } from './board/board';
import {
  selectActualBoard,
  selectActualMarkup,
  selectActualStep,
  selectGameResults,
  selectGameWinner,
  selectLastMove,
  selectPlayersSpentTimes,
  selectStarted,
} from '../../store/selectors/game-info.selector';
import { modifyGameInfo } from '../../store/actions/game-info-modify.action';
import { GameInfo } from '../../utils/interfaces/game-info.interface';
import { Auth } from '../../services/auth.service';
import { SnackBarHandler } from '../../services/snack-bar-handler.service';

/**
 * Main game controller component.
 *
 * This component orchestrates the entire game lifecycle:
 *  - synchronizes state with NgRx (board, moves, results, timestamps);
 *  - mediates interactions between the UI and GameLogic service;
 *  - executes player and AI moves based on opponent mode;
 *  - computes derived state (markup, click-permission, etc.);
 *  - persists game results through Auth service when relevant.
 *
 * It operates as the definitive bridge between:
 *  - reactive UI signals,
 *  - NgRx global state,
 *  - and the pure game engine (GameLogic).
 */
@Component({
  selector: 'app-game',
  imports: [GameDisplayPart, Board],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game implements OnInit {
  /** NgRx store instance for global state management. */
  #store: Store = inject(Store);

  /** Authentication service for retrieving and persisting user statistics. */
  #auth: Auth = inject(Auth);

  /** Core game engine handling AI decisions and winner evaluation. */
  #gameLogic: GameLogic = inject(GameLogic);

  /**
   * Injected {@link SnackBarHandler} service used for displaying
   * success and error feedback messages through snackbars.
   * Provides methods for adding, removing, and auto-expiring notifications.
   */
  #snackbarHandler: SnackBarHandler = inject(SnackBarHandler);

  // ---------------------------------------------------------------------------
  //                              Game Settings
  // ---------------------------------------------------------------------------

  /** Difficulty level of AI player (if applicable). */
  #hardness: Signal<number> = this.#store.selectSignal(selectGameHardness);

  /** Board size (N×N). */
  #size: Signal<number> = this.#store.selectSignal(selectGameSize);

  /** Current opponent type: 'player' or 'computer'. */
  #opponent: Signal<'player' | 'computer'> =
    this.#store.selectSignal(selectGameOpponent);

  // ---------------------------------------------------------------------------
  //                          Reactive Game Information
  // ---------------------------------------------------------------------------

  /** Current step counter (number of performed moves). */
  #step = this.#store.selectSignal(selectActualStep) as Signal<number>;

  /** Last performed move (row, column, and markup). */
  #lastMove: Signal<LastMove | undefined> =
    this.#store.selectSignal(selectLastMove);

  /** Markup ('x' or 'o') of the player whose turn it is. */
  #actualMarkup: Signal<GameInfo['actualMarkup']> = this.#store.selectSignal(
    selectActualMarkup,
  ) as Signal<GameInfo['actualMarkup']>;

  /** Indicates whether the game has officially started. */
  #started = this.#store.selectSignal(selectStarted) as Signal<
    GameInfo['started']
  >;

  /** Object tracking spent times for each player. */
  #spentTimes = this.#store.selectSignal(selectPlayersSpentTimes) as Signal<
    NonNullable<GameInfo['playerSpentTime']>
  >;

  /** Persistent game result counters (wins, losses, draws). */
  #results: Signal<GameInfo['results']> =
    this.#store.selectSignal(selectGameResults);

  /** Current game winner: 'x', 'o', 'draw', or undefined. */
  #winner: Signal<GameInfo['winner']> =
    this.#store.selectSignal(selectGameWinner);

  /** Internal state: tracks the last known step value. */
  #previousStep = this.#step();

  /**
   * Determines whether the user is permitted to click on the board.
   *
   * Rules:
   *  - Disabled if a winner exists.
   *  - If two-player mode → clicking is always permitted.
   *  - If AI mode → player clicks only allowed on even steps.
   */
  #clickPermission: Signal<boolean> = computed(() => {
    if (this.#snackbarHandler.snackbarContent().length) return false;
    if (this.#winner()) return false;
    if (this.#opponent() === 'player') return true;
    return this.#step() % 2 === 0;
  });

  // ---------------------------------------------------------------------------
  //                                  Getters
  // ---------------------------------------------------------------------------

  get step(): Signal<number> {
    return this.#step;
  }
  get lastMove(): Signal<LastMove | undefined> {
    return this.#lastMove;
  }
  get actualMarkup(): Signal<GameInfo['actualMarkup']> {
    return this.#actualMarkup;
  }
  get clickPermission(): Signal<boolean> {
    return this.#clickPermission;
  }
  get size(): Signal<number> {
    return this.#size;
  }
  get started() {
    return this.#started;
  }
  get spentTimes() {
    return this.#spentTimes;
  }
  get results() {
    return this.#results;
  }

  // ---------------------------------------------------------------------------
  //                              Lifecycle Hook
  // ---------------------------------------------------------------------------

  /**
   * Runs an initial winner check on component initialization.
   * Useful when restoring a persisted game.
   */
  async ngOnInit(): Promise<void> {
    this.winnerCheck();
  }

  constructor() {
    // -----------------------------------------------------------------------
    // Effect 1: Mark game as started when step count increases.
    // -----------------------------------------------------------------------
    effect(() => {
      if (
        this.#step() > 0 &&
        this.#previousStep !== this.#step() &&
        !this.#winner()
      ) {
        this.#store.dispatch(modifyGameInfo({ started: true }));
      }
    });

    // -----------------------------------------------------------------------
    // Effect 2: If playing against AI, execute computer move on every odd step.
    // -----------------------------------------------------------------------
    effect(() => {
      if (this.#opponent() === 'computer' && this.#step() % 2 === 1) {
        setTimeout(() => this.computerMode(), 1000);
      }
    });

    // -----------------------------------------------------------------------
    // Effect 3: In two-player mode, evaluate winner and update counters.
    // -----------------------------------------------------------------------
    effect(() => {
      if (this.#opponent() === 'player' && this.step() !== this.#previousStep) {
        this.twoPlayerMode();
      }
    });
  }

  // ---------------------------------------------------------------------------
  //                               Game Logic
  // ---------------------------------------------------------------------------

  /**
   * Two-player mode step handler:
   *  - performs a winner check,
   *  - updates results accordingly,
   *  - records the previous step.
   */
  private async twoPlayerMode(): Promise<void> {
    await this.winnerCheck();
    this.dispatchResults();
    this.#previousStep = this.#step();
  }

  /**
   * Handles a step cycle in AI mode:
   *  - performs AI move via GameLogic,
   *  - updates winner and lastMove,
   *  - tracks results and persists them if user is authenticated.
   */
  private async computerMode(): Promise<void> {
    const board = this.#store.selectSignal(selectActualBoard)();
    if (board) {
      const result = await this.#gameLogic.aiMove(
        board,
        this.actualMarkup()!,
        this.#hardness()!,
        this.#lastMove()!,
      );

      if (result?.winner) {
        this.#store.dispatch(
          modifyGameInfo({ winner: result.winner, started: false }),
        );
        if (result.winner === 'o' || result.winner === 'x') {
          this.#store.dispatch(
            modifyGameInfo({ actualMarkup: result.winner as 'o' | 'x' }),
          );
        }
      }

      if (result?.lastMove && result?.winner !== 'draw') {
        this.#store.dispatch(modifyGameInfo({ lastMove: result.lastMove }));
      }

      this.#previousStep = this.#step();
    }

    this.dispatchResults();
    this.saveResult();
  }

  /**
   * Performs a full winner evaluation on the current board state.
   * If a winner is detected, the store is immediately updated.
   */
  private async winnerCheck(): Promise<void> {
    const board = this.#store.selectSignal(selectActualBoard)();
    if (board) {
      const incomingBoard = await this.#gameLogic.hasWinner(board);
      if (incomingBoard?.winner) {
        this.#store.dispatch(
          modifyGameInfo({ winner: incomingBoard.winner, started: false }),
        );
      }
    }
  }

  /**
   * Updates the stored result counters based on the current winner.
   * Increments win/loss/draw statistics in the NgRx store.
   */
  private dispatchResults(): void {
    const winner = this.#winner();
    const results = this.#results()!;

    const base = {
      player_O_Lose: results.player_O_Lose!,
      player_X_Lose: results.player_X_Lose!,
      player_O_Win: results.player_O_Win!,
      player_X_Win: results.player_X_Win!,
      draw: results.draw!,
    };

    const changes: Partial<typeof base> = {};

    if (winner === 'o') {
      changes.player_O_Win = base.player_O_Win + 1;
      changes.player_X_Lose = base.player_X_Lose + 1;
    } else if (winner === 'x') {
      changes.player_X_Win = base.player_X_Win + 1;
      changes.player_O_Lose = base.player_O_Lose + 1;
    } else if (winner === 'draw') {
      changes.draw = base.draw + 1;
    }

    this.#store.dispatch(modifyGameInfo({ results: { ...base, ...changes } }));
  }

  /**
   * Persists user statistics (wins or losses) after the match ends,
   * provided the user is authenticated.
   */
  private saveResult(): void {
    const user = this.#auth.user();
    const winner = this.#winner();

    if (winner === 'o') {
      this.#auth.updateUser({ winNumber: (user?.winNumber ?? 0) + 1 });
    } else if (winner === 'x') {
      this.#auth.updateUser({ loseNumber: (user?.loseNumber ?? 0) + 1 });
    }
  }
}
