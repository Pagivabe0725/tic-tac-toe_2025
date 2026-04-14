import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { ROUTES } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { csrfInterceptor } from './utils/interceptors/csfr.interceptor';
import { provideStore } from '@ngrx/store';
import { gameSettingsReducer } from './store/reducers/game-settings.reducer';
import { provideEffects } from '@ngrx/effects';
import { GameSettingsStorageEffects } from './store/effects/game-settings.effect';
import { gameInfoReducer } from './store/reducers/game-info.reducer';
import { gameInfoStorageEffect } from './store/effects/game-info.effect';
import { sidebarReducer } from './store/reducers/sidebar.reducer';
import {
  BrowserAnimationsModule,
  provideAnimations,
} from '@angular/platform-browser/animations';

export const APPCONFIG: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    BrowserAnimationsModule,
    provideAnimations(),
    provideZonelessChangeDetection(),
    provideRouter(ROUTES),
    provideHttpClient(withInterceptors([csrfInterceptor])),
    provideStore({
      gameSettings: gameSettingsReducer,
      gameInfo: gameInfoReducer,
      sidebar: sidebarReducer,
    }),
    provideEffects([GameSettingsStorageEffects, gameInfoStorageEffect]),
  ],
};
