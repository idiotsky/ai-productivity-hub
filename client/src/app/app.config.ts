import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const preset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: { preset },
      license:
        'eyJpZCI6ImM4MjgwNjAxLThhNTYtNGI5Ny04NTU3LWQxZmZjMTMxMDk0YyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3OTUxMjI1MDUsImV4cCI6MTgyNjY1ODUwNX0.8OFN5t6b_aYvEN3VPET7lFO771Hy71Omo5xAWo-IzWVf3Y1OARWQbXGFyEQJ_u25rNY61nFzbBQtAKewEp65CQ',
    }),
  ],
};
