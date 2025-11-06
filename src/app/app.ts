import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { PanelControl } from './pages/admin-dashboard/panel-control';
import { Parques } from './pages/admin-dashboard/parques';
import { Fauna } from './pages/admin-dashboard/fauna';
import { Flora } from './pages/admin-dashboard/flora';
import { Usuarios } from './pages/admin-dashboard/usuarios';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: Home },

  {
    path: 'admin',
    component: AdminDashboard,
    children: [
      { path: '', redirectTo: 'panel-control', pathMatch: 'full' },
      { path: 'panel-control', component: PanelControl },
      { path: 'parques', component: Parques },
      { path: 'fauna', component: Fauna },
      { path: 'flora', component: Flora},
      { path: 'usuarios', component: Usuarios }
    ]
  },

  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}