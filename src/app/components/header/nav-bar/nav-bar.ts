import { Component, computed, inject, Signal } from '@angular/core';
import { HeaderButton } from './header-button/header-button';

import { Theme } from '../../../services/theme.service';
import { DialogHandler } from '../../../services/dialog-handler.service';
import { RouterService } from '../../../services/router.service';
import { GameSettings } from '../../../utils/interfaces/game-settings.interface';
import { Store } from '@ngrx/store';
import { modifyGameSettings } from '../../../store/actions/game-settings-modify.action';
import { reserGameInfo } from '../../../store/actions/game-info-reset.action';
import { Auth } from '../../../services/auth.service';
import { SnackBarHandler } from '../../../services/snack-bar-handler.service';
import { DialogTriggerButton } from '../../../utils/interfaces/dialog-trigger-button.interface';
import { selectGameInfo } from '../../../store/selectors/game-info.selector';
import { selectGameSettings } from '../../../store/selectors/game-settings.selector';
import { Functions } from '../../../services/functions.service';
import { Http } from '../../../services/http.service';
import { resetGameInfoResults } from '../../../store/actions/game-info-results-reset.action';
import { modifySidebar } from '../../../store/actions/sidebar-modify.action';

@Component({
  selector: 'div[appNavbar]',
  imports: [HeaderButton],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})
export class NavBar {
  /** Provides current theme and allows switching between light and dark modes */
  #theme: Theme = inject(Theme);

  /** Handles opening and managing dialog windows */
  #dialog: DialogHandler = inject(DialogHandler);

  /** Helper service for utility functions (e.g., difficulty conversion, calculations) */
  #helperFunctions: Functions = inject(Functions);

  /** Manages navigation and provides reactive access to current route and query parameters */
  #router: RouterService = inject(RouterService);

  /** Global NgRx store for dispatching actions and accessing application state */
  #store: Store = inject(Store);

  /** Authentication service to access current user and login state */
  #auth: Auth = inject(Auth);

  /** HTTP service for making backend requests (REST or GraphQL) */
  #http: Http = inject(Http);

  /** Service responsible for displaying snackbar notifications for user feedback */
  #snackbarHandler: SnackBarHandler = inject(SnackBarHandler);

  /**
   * Reactive signal indicating whether a user is currently logged in.
   * Computed from the Auth service user signal.
   */
  logged: Signal<boolean> = computed(() => {
    return !!this.#auth.user();
  });

  readonly width = computed(() => {
    return this.#theme.width() ?? 599;
  });

  /** Button configuration for toggling between light and dark theme */
  readonly #themeButton: Signal<DialogTriggerButton> = computed(() => {
    const mode = this.#theme.mode === 'light' ? 'dark' : 'light';
    return {
      ariaLabel: `${mode} mode.`,
      iconPath:
        mode === 'light'
          ? 'M440-760v-160h80v160h-80Zm266 110-55-55 112-115 56 57-113 113Zm54 210v-80h160v80H760ZM440-40v-160h80v160h-80ZM254-652 140-763l57-56 113 113-56 54Zm508 512L651-255l54-54 114 110-57 59ZM40-440v-80h160v80H40Zm157 300-56-57 112-112 29 27 29 28-114 114Zm283-100q-100 0-170-70t-70-170q0-100 70-170t170-70q100 0 170 70t70 170q0 100-70 170t-170 70Zm0-80q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0-160Z'
          : 'M380-160q133 0 226.5-93.5T700-480q0-133-93.5-226.5T380-800h-21q-10 0-19 2 57 66 88.5 147.5T460-480q0 89-31.5 170.5T340-162q9 2 19 2h21Zm0 80q-53 0-103.5-13.5T180-134q93-54 146.5-146T380-480q0-108-53.5-200T180-826q46-27 96.5-40.5T380-880q83 0 156 31.5T663-763q54 54 85.5 127T780-480q0 83-31.5 156T663-197q-54 54-127 85.5T380-80Zm80-400Z',
      action: () => {
        this.#theme.mode = mode;
      },
      condition: true,
    };
  });

  /** Button configuration for opening the game settings dialog */
  readonly #gameSettingsButton: Signal<DialogTriggerButton> = computed(() => {
    return {
      ariaLabel: 'Open game settings dialog.',
      iconPath:
        'M189-160q-60 0-102.5-43T42-307q0-9 1-18t3-18l84-336q14-54 57-87.5t98-33.5h390q55 0 98 33.5t57 87.5l84 336q2 9 3.5 18.5T919-306q0 61-43.5 103.5T771-160q-42 0-78-22t-54-60l-28-58q-5-10-15-15t-21-5H385q-11 0-21 5t-15 15l-28 58q-18 38-54 60t-78 22Zm3-80q19 0 34.5-10t23.5-27l28-57q15-31 44-48.5t63-17.5h190q34 0 63 18t45 48l28 57q8 17 23.5 27t34.5 10q28 0 48-18.5t21-46.5q0 1-2-19l-84-335q-7-27-28-44t-49-17H285q-28 0-49.5 17T208-659l-84 335q-2 6-2 18 0 28 20.5 47t49.5 19Zm348-280q17 0 28.5-11.5T580-560q0-17-11.5-28.5T540-600q-17 0-28.5 11.5T500-560q0 17 11.5 28.5T540-520Zm80-80q17 0 28.5-11.5T660-640q0-17-11.5-28.5T620-680q-17 0-28.5 11.5T580-640q0 17 11.5 28.5T620-600Zm0 160q17 0 28.5-11.5T660-480q0-17-11.5-28.5T620-520q-17 0-28.5 11.5T580-480q0 17 11.5 28.5T620-440Zm80-80q17 0 28.5-11.5T740-560q0-17-11.5-28.5T700-600q-17 0-28.5 11.5T660-560q0 17 11.5 28.5T700-520Zm-360 60q13 0 21.5-8.5T370-490v-40h40q13 0 21.5-8.5T440-560q0-13-8.5-21.5T410-590h-40v-40q0-13-8.5-21.5T340-660q-13 0-21.5 8.5T310-630v40h-40q-13 0-21.5 8.5T240-560q0 13 8.5 21.5T270-530h40v40q0 13 8.5 21.5T340-460Zm140-20Z',
      action: async () => {
        const dialogResult = await this.#dialog.open<
          GameSettings | 'CLOSE_EVENT'
        >('game_setting', {
          title: 'Game setup',
          content: 'game_setting',
          buttons: [
            { button: 'trigger', name: 'accept', triggerValue: 'form' },
          ],
        });
        if (dialogResult && dialogResult !== 'CLOSE_EVENT') {
          this.#store.dispatch(modifyGameSettings(dialogResult));
          this.#store.dispatch(reserGameInfo());
          this.#snackbarHandler.addElement('Game settings saved', false);
        }
      },
      condition: this.#router.currentEndpoint() === 'tic-tac-toe',
    };
  });

  /** Button configuration for navigation between account and game pages */
  readonly #navigateButton: Signal<DialogTriggerButton> = computed(() => {
    return {
      ariaLabel:
        this.#router.currentEndpoint() === 'account' ? 'account' : 'back',
      iconPath:
        this.#router.currentEndpoint() === 'account'
          ? 'm480-320 56-56-64-64h168v-80H472l64-64-56-56-160 160 160 160Zm0 240q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z'
          : 'M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z',
      action: () => {
        const url =
          this.#router.currentEndpoint() === 'account'
            ? 'tic-tac-toe'
            : 'account';
        const queryParams =
          this.#router.currentEndpoint() === 'account'
            ? { page: null, filter: null, order: null }
            : { page: 1, order: 'time-desc' };
        this.#router.navigateTo([url], queryParams, 'merge');
      },
      condition: this.logged(),
    };
  });

  /** Button configuration for opening the save game dialog */
  readonly #saveButton: Signal<DialogTriggerButton> = computed(() => {
    return {
      ariaLabel: 'Open save dialog.',
      iconPath:
        'M840-680v480q0 33-23.5 56.5T760-120H200q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h480l160 160Zm-80 34L646-760H200v560h560v-446ZM480-240q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35ZM240-560h360v-160H240v160Zm-40-86v446-560 114Z',
      action: async () => {
        const dialogResult = await this.#dialog.open<
          { gameName: string } | 'CLOSE_EVENT'
        >('save', {
          title: 'Save game',
          content: 'save',
        });
        if (dialogResult && dialogResult !== 'CLOSE_EVENT') {
          const gameInfo = this.#store.selectSignal(selectGameInfo)();
          const gameSetting = this.#store.selectSignal(selectGameSettings)();
          let status;
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
            name: dialogResult!.gameName,
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
              this.#snackbarHandler.addElement(
                'Game saved successfully',
                false,
              );
            } else {
              this.#snackbarHandler.addElement('Game saving failed', true);
            }
          } catch (error) {
            this.#snackbarHandler.addElement('Game saving failed', true);
          }
        }
      },
      condition:
        !!this.#auth.user() && this.#router.currentEndpoint() === 'tic-tac-toe',
    };
  });

  /** Button configuration for opening the settings dialog */
  readonly #settingsButton: Signal<DialogTriggerButton> = computed(() => {
    return {
      ariaLabel: 'Open settings dialog.',
      iconPath:
        'm370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z',
      action: async () => {
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
      },
      condition: true,
    };
  });

  /** Button configuration for opening the authentication dialog */
  readonly #authButton: Signal<DialogTriggerButton> = computed(() => {
    return {
      ariaLabel: 'Login',
      iconPath:
        'M480-120v-80h280v-560H480v-80h280q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H480Zm-80-160-55-58 102-102H120v-80h327L345-622l55-58 200 200-200 200Z',
      action: async () => {
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
      },
      condition: !this.logged(),
    };
  });

  /** Button configuration for logging out the authenticated user */
  readonly #logoutButton: Signal<DialogTriggerButton> = computed(() => {
    return {
      ariaLabel: 'Logout',
      iconPath:
        'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z',
      action: async () => {
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
              this.#snackbarHandler.addElement(
                'Logged out successfully',
                false,
              );
              this.#store.dispatch(resetGameInfoResults());
              this.#store.dispatch(reserGameInfo());
            } else {
              this.#snackbarHandler.addElement('Logout failed', true);
            }
          } catch (error) {
            this.#snackbarHandler.addElement('Logout failed', true);
          }
        }
      },
      condition: this.logged(),
    };
  });

  /** Reactive list of all header buttons displayed in the navigation bar */
  protected readonly buttons = computed(() => [
    this.#navigateButton(),
    this.#themeButton(),
    this.#gameSettingsButton(),
    this.#saveButton(),
    this.#settingsButton(),
    this.#authButton(),
    this.#logoutButton(),
  ]);

  protected openSidebar(): void {
    this.#store.dispatch(modifySidebar({ isOpen: true }));
  }
}
