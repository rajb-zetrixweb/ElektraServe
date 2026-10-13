import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'devices',
    loadComponent: () => import('./pages/devices/devices.page').then((m) => m.DevicesPage),
  },
  {
    path: 'commands',
    loadComponent: () => import('./pages/commands/commands.page').then((m) => m.CommandsPage),
  },
  { path: '**', redirectTo: 'dashboard' },
];
