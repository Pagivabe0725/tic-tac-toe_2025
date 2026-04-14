import { Component, computed, effect, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { FormsModule } from '@angular/forms';
import { Dialog } from './components/dialog/dialog';

import { Auth } from './services/auth.service';
import { SnackBar } from './components/snack-bar/snack-bar';

import { SnackBarHandler } from './services/snack-bar-handler.service';
import { DialogHandler } from './services/dialog-handler.service';
import { Sidebar } from './components/sidebar/sidebar';
import { Store } from '@ngrx/store';
import { selectSidebar } from './store/selectors/sidebar-selector';
import { Theme } from './services/theme.service';

/**
 * @component App
 * @description
 * Root component of the application.
 *
 * Responsibilities:
 * - Initializes the current user session on app load.
 * - Provides method to start a new game by resetting game state.
 * - Handles global services injection: Auth, Store, DialogHandler.
 * - Tracks the current winner via a reactive signal.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, FormsModule, Dialog, SnackBar, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  #store: Store = inject(Store);

  /** Dialog service to open and manage dialogs app-wide */
  protected dialog: DialogHandler = inject(DialogHandler);

  /** Auth service to manage user authentication */
  #auth: Auth = inject(Auth);

  #theme: Theme = inject(Theme)

  /**placeholder  ----------------*/
  protected snackBarHandler: SnackBarHandler = inject(SnackBarHandler);

  protected isSidebarOpen = this.#store.selectSignal(selectSidebar);

  protected width = computed<number>(()=> this.#theme.width() ?? 599)

  /** Lifecycle hook: sets the current user if a session exists */
  ngOnInit(): void {
    this.#auth.setCurrentUserIfExist();
  }

  constructor(){
    effect(()=>{
      console.log('open: ', this.isSidebarOpen())
    })
  }
}
