import { Component, inject, Signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { NavBar } from './nav-bar/nav-bar';
import { selectGameWinner } from '../../store/selectors/game-info.selector';
import { GameInfo } from '../../utils/interfaces/game-info.interface';
import { reserGameInfo } from '../../store/actions/game-info-reset.action';

/**
 * @component Header
 *
 * Represents the main application header container.
 *
 * Responsibilities:
 *  - Hosts the navigation bar component.
 *  - Exposes the current game winner as a reactive signal.
 *  - Provides an action to reset and start a new game.
 *
 * This component acts as a thin orchestration layer and avoids business logic,
 * delegating state management to the global store.
 */
@Component({
  selector: 'header[appHeader]',
  imports: [NavBar],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  /** Global NgRx store instance */
  #store: Store = inject(Store);

  /**
   * Reactive signal exposing the winner of the current game.
   *
   * The value is derived directly from the global store selector and
   * updates automatically when the application state changes.
   */
  get winner(): Signal<GameInfo['winner']> {
    return this.#store.selectSignal(selectGameWinner);
  }

  /**
   * Resets the current game state and initializes a fresh game session.
   *
   * This method dispatches a reset action to the store and relies on
   * reducers/effects to perform the actual state cleanup.
   */
  startNewGame(): void {
    this.#store.dispatch(reserGameInfo());
  }
}
