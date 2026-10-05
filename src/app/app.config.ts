import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { iamInterceptor } from './identity-and-access-management/infrastructure/iam.interceptor';
import { KidTrackTitleStrategy } from './shared/presentation/kid-track-title.strategy';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([iamInterceptor])),
        { provide: TitleStrategy, useClass: KidTrackTitleStrategy },
    ],
};
