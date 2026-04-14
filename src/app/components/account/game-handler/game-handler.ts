import {
  Component,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
} from '@angular/core';
import { GameElement } from './game-element/game-element';
import { SavedGame } from '../../../utils/interfaces/saved-game.interface';
import { DialogHandler } from '../../../services/dialog-handler.service';
import { Http } from '../../../services/http.service';
import { Store } from '@ngrx/store';
import { Functions } from '../../../services/functions.service';
import { modifyGameSettings } from '../../../store/actions/game-settings-modify.action';
import { modifyGameInfo } from '../../../store/actions/game-info-modify.action';
import { Auth } from '../../../services/auth.service';
import { RouterService } from '../../../services/router.service';
import { SnackBarHandler } from '../../../services/snack-bar-handler.service';

@Component({
  selector: 'section[appGameHandler]',
  imports: [GameElement],
  templateUrl: './game-handler.html',
  styleUrl: './game-handler.scss',
})
export class GameHandler {
  /** Http service used for sending requests to the backend (GraphQL or REST) */
  #http: Http = inject(Http);

  /** NgRx store for dispatching and selecting application state */
  #store: Store = inject(Store);

  /** Auth service to access current logged-in user and authentication functions */
  #auth: Auth = inject(Auth);

  /** Input signal holding the list of saved games passed from the parent component */
  savedGames: InputSignal<SavedGame[] | undefined> = input.required();

  /** Helper functions service for utilities like difficulty conversion */
  #helperFunctions: Functions = inject(Functions);

  /** RouterService for programmatic navigation and query param handling */
  #router: RouterService = inject(RouterService);

  /** Dialog handler service for showing confirmation/modals */
  #dialogHandler: DialogHandler = inject(DialogHandler);

  /** Snackbar service for showing feedback messages */
  #snackbar: SnackBarHandler = inject(SnackBarHandler);

  /** Output signal to notify parent component about deleted game ID */
  deletedGameEvent: OutputEmitterRef<string> = output();

  /**
   * Calculates the number of moves already made on a game board
   * @param board - 2D array representing the game board
   * @returns Number of non-empty cells (moves)
   */
  private calculateActualStep(board: string[][]) {
    return board.reduce(
      (acc, row) =>
        acc + row.reduce((rowAcc, cell) => rowAcc + (cell !== 'e' ? 1 : 0), 0),
      0
    );
  }

  /**
   * Loads a saved game into the current game state
   * @param id - The ID of the game to load
   */
  protected async loadGame(id: string): Promise<void> {
    const chosenGame = this.savedGames()?.find((game) => game.gameId === id);
    console.log(chosenGame)
    const dialogResult = await this.#dialogHandler.open<true | 'CLOSE_EVENT'>(
      'message',
      {
        title: 'Loading',
        content: `Do you want to load "${chosenGame?.name}" game?`,
        buttons: [
          { button: 'accept', name: 'Load' },
          { button: 'reject', name: 'Back' },
        ],
      }
    );

    if (!chosenGame || dialogResult === 'CLOSE_EVENT') return;

    this.#store.dispatch(
      modifyGameSettings({
        size: chosenGame.size,
        opponent: chosenGame.opponent,
        hardness: this.#helperFunctions.difficultyToNumber(
          chosenGame.difficulty
        ),
      })
    );

    const actualStep = this.calculateActualStep(chosenGame.board);
    this.#store.dispatch(
      modifyGameInfo({
        actualBoard: chosenGame.board,
        actualStep,
        actualMarkup: this.#helperFunctions.markupByStep(actualStep),
        lastMove: chosenGame.lastMove,
        loadedGameName: chosenGame.name,
      })
    );

    this.#router.navigateTo(['tic-tac-toe']);
  }

  /**
   * Deletes a saved game by ID
   * @param id - The ID of the game to delete
   */
  protected async deleteGame(id: string): Promise<void> {
    const chosenGame = this.savedGames()?.find((game) => game.gameId === id);
    const dialogResult = await this.#dialogHandler.open<true | 'CLOSE_EVENT'>(
      'message',
      {
        title: 'Delete',
        content: `Do you want to delete "${chosenGame?.name}" game?`,
        buttons: [
          { button: 'accept', name: 'Delete' },
          { button: 'reject', name: 'Back' },
        ],
      }
    );

    if (dialogResult !== 'CLOSE_EVENT') {
      const body = {
        query: `
        mutation deleteGame($gameId: ID!, $userId: ID!) {
          deleteGame(gameId: $gameId, userId: $userId) { gameId }
        }
      `,
        variables: {
          gameId: id,
          userId: this.#auth.user()!.userId,
        },
      };

      try {
        const result = await this.#http.request<{
          deleteGame: { gameId: string };
        }>('post', 'graphql/game', body, { maxRetries: 3, initialDelay: 100 });

        if ((result as any)?.data?.deleteGame?.gameId) {
          this.deletedGameEvent.emit(id);
        }
      } catch (error) {
        this.#snackbar.addElement('Failed to delete game', true);
      }
    }
  }
}
