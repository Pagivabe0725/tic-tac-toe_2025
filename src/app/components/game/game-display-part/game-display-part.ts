import {
  Component,
  computed,
  effect,
  HostBinding,
  inject,
  input,
  Input,
  InputSignal,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { Theme } from '../../../services/theme.service';
import { Store } from '@ngrx/store';
import { selectPlayersSpentTimes } from '../../../store/selectors/game-info.selector';
import { GameInfo } from '../../../utils/interfaces/game-info.interface';
import { modifyGameInfo } from '../../../store/actions/game-info-modify.action';
import { LastMove } from '../../../utils/interfaces/last-move.interface';

/**
 * GameDisplayPart component handles the display of a single player's
 * information panel in the game, including:
 *  - current markup ('x' or 'o'),
 *  - win/loss/draw statistics,
 *  - spent time counter,
 *  - responsive layout placement based on screen width.
 *
 * It reacts to signals and NgRx store changes to keep the displayed data
 * synchronized with the game state.
 */
@Component({
  selector: 'div[appGameDisplayPart], section[appGameDisplayPart]',
  imports: [],
  templateUrl: './game-display-part.html',
  styleUrl: './game-display-part.scss',
})
export class GameDisplayPart implements OnInit {
  /** Markup of this player panel ('x' or 'o'). Required input. */
  @Input({ required: true }) markup!: 'x' | 'o';

  /** NgRx store instance. */
  #store: Store = inject(Store);

  /** Current player's actual markup from the store. */
  actualMarkup: InputSignal<GameInfo['actualMarkup']> = input.required();

  /** Theme service to get screen width and styling info. */
  #theme: Theme = inject(Theme);

  /** Last move performed in the game. */
  lastMove: InputSignal<LastMove | undefined> = input.required();

  /** Whether the game has started. */
  started: InputSignal<GameInfo['started']> = input.required();

  /** Current game results object. */
  results: InputSignal<GameInfo['results']> = input.required();

  /** Player spent times object. */
  spentTimes: InputSignal<GameInfo['playerSpentTime'] | undefined> =
    input.required();

  /** Tracks whether the restart logic has already been handled. */
  private restartHandled = signal(false);

  /** Current player's elapsed time in seconds. */
  protected seconds = signal(0);

  /**
   * Formatted timer string (hh:mm:ss) computed from `seconds`.
   */
  protected time = computed(() =>
    new Date(this.seconds() * 1000).toISOString().slice(11, 19),
  );

  /** Displayed win count for this player. */
  protected winNumber?: number;

  /** Displayed loss count for this player. */
  protected loseNumber?: number;

  /** Displayed draw count. */
  protected drawNumber?: number;

  /**
   * Dynamically computes CSS grid placement based on screen width
   * and player markup.
   */
  @HostBinding('style')
  get place(): Partial<CSSStyleDeclaration> | null {
    const width = this.#theme.width();
    if (!width) return null;

    if (width <= 1000 && width > 600) {
      return {
        gridColumn: this.markup === 'o' ? '1/10' : '12/21',
      };
    }

    if (width <= 600)
      return {
        gridColumn: '1/20',
      };

    return {
      gridColumn: this.markup === 'o' ? '1/4' : '18/21',
    };
  }

  /** Initializes the seconds counter from the store on component initialization. */
  ngOnInit(): void {
    this.seconds.set(
      this.#store.selectSignal(selectPlayersSpentTimes)()?.[
        this.markup === 'o' ? 'player_O' : 'player_X'
      ] ?? 0,
    );
  }

  constructor() {
    /**
     * Effect 1:
     * Updates win, lose, and draw numbers whenever `results` signal changes.
     */
    effect(() => {
      const results = this.results();
      if (results) {
        this.winNumber =
          this.markup === 'x' ? results.player_X_Win : results.player_O_Win;
        this.loseNumber =
          this.markup === 'x' ? results.player_X_Lose : results.player_O_Lose;
        this.drawNumber = results.draw;
      }
    });

    /**
     * Effect 2:
     * Starts a per-second timer when the game is started and this player
     * is the current active markup.
     * Cleans up the interval when effect is invalidated.
     */
    effect((onCleanup) => {
      if (this.started() && this.markup === this.actualMarkup()) {
        const interval = setInterval(() => {
          this.seconds.update((previous) => previous + 1);
        }, 1000);

        onCleanup(() => {
          clearInterval(interval);
        });
      }
    });

    /**
     * Effect 3:
     * Updates the NgRx store with the current player's elapsed time
     * every time `seconds` changes.
     */
    effect(() => {
      const originalTimeObject = untracked(this.spentTimes);
      const newSpentTimes: GameInfo['playerSpentTime'] = {};
      if (untracked(this.actualMarkup) === 'o')
        newSpentTimes.player_O = this.seconds();
      else {
        newSpentTimes.player_X = this.seconds();
      }

      this.#store.dispatch(
        modifyGameInfo({
          playerSpentTime: { ...originalTimeObject, ...newSpentTimes },
        }),
      );
    });

    /**
     * Effect 4:
     * Resets the `seconds` counter if both players' times are zero,
     * ensuring proper restart handling.
     */
    effect(() => {
      const spent = this.spentTimes();

      const shouldRestart = spent?.player_O === 0 && spent.player_X === 0;

      if (shouldRestart && !this.restartHandled()) {
        this.seconds.set(0);
        this.restartHandled.set(true);
      }

      if (!shouldRestart && this.restartHandled()) {
        this.restartHandled.set(false);
      }
    });
  }
}
