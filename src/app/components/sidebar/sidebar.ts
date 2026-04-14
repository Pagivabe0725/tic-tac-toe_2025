import { Component, computed, inject } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { Store } from '@ngrx/store';
import { Theme } from '../../services/theme.service';
import { modifySidebar } from '../../store/actions/sidebar-modify.action';
import { DialogHandler } from '../../services/dialog-handler.service';
import { modifyGameSettings } from '../../store/actions/game-settings-modify.action';
import { Auth } from '../../services/auth.service';
import { RouterService } from '../../services/router.service';
import { GameSettings } from '../../utils/interfaces/game-settings.interface';
import { reserGameInfo } from '../../store/actions/game-info-reset.action';
import { SnackBarHandler } from '../../services/snack-bar-handler.service';
import { selectGameInfo } from '../../store/selectors/game-info.selector';
import { selectGameSettings } from '../../store/selectors/game-settings.selector';
import { Functions } from '../../services/functions.service';
import { Http } from '../../services/http.service';
import { resetGameInfoResults } from '../../store/actions/game-info-results-reset.action';

/**
 * Sidebar component responsible for handling navigation, authentication,
 * theme switching, and game-related dialogs (save, settings, login, logout).
 *
 * @component
 */
@Component({
  animations: [
    trigger('toggle', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('200ms ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)' })),
      ]),
    ]),
  ],
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  /** Global NgRx store instance */
  readonly #store: Store = inject(Store);

  /** Theme service for toggling light/dark mode */
  readonly #theme: Theme = inject(Theme);

  /** Dialog handler service */
  readonly #dialog: DialogHandler = inject(DialogHandler);

  /** Authentication service */
  readonly #auth: Auth = inject(Auth);

  /** Router abstraction service */
  readonly #router: RouterService = inject(RouterService);

  /** Helper utility functions */
  readonly #helperFunctions: Functions = inject(Functions);

  /** Snackbar notification handler */
  readonly #snackbarHandler: SnackBarHandler = inject(SnackBarHandler);

  /** HTTP communication service */
  readonly #http: Http = inject(Http);

  /** Indicates whether the current route is the authentication page */
  readonly isAuthPage = computed(
    () => this.#router.currentEndpoint() === 'account',
  );

  /** Indicates whether a user is currently authenticated */
  readonly isAuthenticated = computed(() => !!this.#auth.user());

  /** Inverse theme mode used for toggle button */
  protected readonly inverseMode = computed(() =>
    this.#theme.modeSignal() === 'light' ? 'dark' : 'light',
  );

  /**
   * Closes the sidebar.
   */
  protected closeSidebar(): void {
    this.#store.dispatch(modifySidebar({ isOpen: false }));
  }

  /**
   * Toggles between light and dark theme mode.
   */
  protected toggleMode(): void {
    this.#theme.mode = this.inverseMode();
  }

  /**
   * Opens game settings dialog and applies selected settings.
   *
   * Resets current game state after saving.
   */
  protected async gameSettingDialog(): Promise<void> {
    const dialogResult = await this.#dialog.open<GameSettings | 'CLOSE_EVENT'>(
      'game_setting',
      {
        title: 'Game setup',
        content: 'game_setting',
        buttons: [{ button: 'trigger', name: 'accept', triggerValue: 'form' }],
      },
    );

    if (dialogResult && dialogResult !== 'CLOSE_EVENT') {
      this.#store.dispatch(modifyGameSettings(dialogResult));
      this.#store.dispatch(reserGameInfo());
      this.#snackbarHandler.addElement('Game settings saved', false);
    }
  }

  /**
   * Opens general settings dialog.
   */
  protected async settingDialog(): Promise<void> {
    const dialogResult = await this.#dialog.open<true | 'CLOSE_EVENT'>(
      'setting',
      {
        title: 'Settings',
        content: 'setting',
      },
    );

    if (dialogResult && dialogResult !== 'CLOSE_EVENT') {
      this.#snackbarHandler.addElement('Settings updated', false);
    }
  }

  /**
   * Navigates between account page and game page.
   *
   * If currently on auth page, navigates to game.
   * Otherwise navigates to account.
   */
  protected navigate(): void {
    if (this.isAuthPage()) {
      this.#router.navigateTo(
        ['tic-tac-toe'],
        { page: null, filter: null, order: null },
        'merge',
      );
    } else {
      this.#router.navigateTo(
        ['account'],
        { page: 1, order: 'time-desc' },
        'merge',
      );
    }
  }

  /**
   * Opens save dialog and persists current game state.
   *
   * Determines game status before saving.
   */
  protected async saveDialog(): Promise<void> {
    const dialogResult = await this.#dialog.open<
      { gameName: string } | 'CLOSE_EVENT'
    >('save', {
      title: 'Save game',
      content: 'save',
    });

    if (dialogResult && dialogResult !== 'CLOSE_EVENT') {
      const gameInfo = this.#store.selectSignal(selectGameInfo)();
      const gameSetting = this.#store.selectSignal(selectGameSettings)();

      let status: 'won' | 'lost' | 'draw' | 'not_started' | 'in_progress';

      if (gameInfo.winner) {
        switch (gameInfo.winner) {
          case 'o':
            status = 'won';
            break;
          case 'x':
            status = 'lost';
            break;
          case 'draw':
            status = 'draw';
        }
      } else {
        switch (gameInfo.actualStep) {
          case undefined:
          case 0:
            status = 'not_started';
            break;
          default:
            status = 'in_progress';
        }
      }

      const body = {
        userId: this.#auth.user()!.userId,
        name: dialogResult.gameName,
        board: gameInfo.actualBoard,
        lastMove: gameInfo.lastMove,
        status,
        difficulty: this.#helperFunctions.numberToDifficulty(
          gameSetting.hardness,
        ),
        opponent: gameSetting.opponent,
        size: gameSetting.size,
      };

      try {
        const result = await this.#http.request(
          'post',
          'game/create-game',
          body,
          { maxRetries: 3, initialDelay: 100 },
        );

        if ((result as any).userId) {
          this.#snackbarHandler.addElement('Game saved successfully', false);
        } else {
          this.#snackbarHandler.addElement('Game saving failed', true);
        }
      } catch {
        this.#snackbarHandler.addElement('Game saving failed', true);
      }
    }
  }

  /**
   * Opens authentication dialog.
   *
   * Handles both login and registration flows.
   */
  protected async authDialog(): Promise<void> {
    const dialogResult = await this.#dialog.open<
      | {
          password: string;
          email: string;
          rePassword?: string;
        }
      | 'CLOSE_EVENT'
    >('login', {
      title: 'Login',
      content: '',
    });

    if (dialogResult !== 'CLOSE_EVENT' && dialogResult?.rePassword) {
      const user = await this.#auth.signup(
        dialogResult.email,
        dialogResult.password,
        dialogResult.rePassword,
      );

      if (user) {
        this.#snackbarHandler.addElement('Registration successful', false);
      } else {
        this.#snackbarHandler.addElement('Registration failed', true);
      }
    } else if (
      dialogResult !== 'CLOSE_EVENT' &&
      dialogResult &&
      !dialogResult.rePassword
    ) {
      const user = await this.#auth.login(
        dialogResult.email,
        dialogResult.password,
      );

      if (user) {
        this.#auth.user = user;
        this.#snackbarHandler.addElement('Logged in successfully', false);
      } else {
        this.#snackbarHandler.addElement('Login failed', true);
      }
    }
  }

  /**
   * Opens logout confirmation dialog and logs out the user.
   *
   * Resets game state after successful logout.
   */
  protected async logoutDialog(): Promise<void> {
    const dialogResult = await this.#dialog.open<true | 'CLOSE_EVENT'>(
      'message',
      {
        title: 'Logout',
        content: 'Do you sure quit?',
        buttons: [
          { button: 'accept', name: 'Logout' },
          { button: 'reject', name: 'Back' },
        ],
      },
    );

    if (dialogResult && dialogResult !== 'CLOSE_EVENT') {
      try {
        const logout = await this.#auth.logout();

        if (logout) {
          this.#store.dispatch(modifyGameSettings({ opponent: 'player' }));
          this.#auth.user = undefined;
          this.#snackbarHandler.addElement('Logged out successfully', false);
          this.#store.dispatch(resetGameInfoResults());
          this.#store.dispatch(reserGameInfo());
        } else {
          this.#snackbarHandler.addElement('Logout failed', true);
        }
      } catch {
        this.#snackbarHandler.addElement('Logout failed', true);
      }
    }
  }
}
