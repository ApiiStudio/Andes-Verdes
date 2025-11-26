import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { PanelControl } from './pages/admin-dashboard/panel-control/panel-control';
import { Parques } from './pages/admin-dashboard/parques/parques';
import { Fauna } from './pages/admin-dashboard/fauna/fauna';
import { Flora } from './pages/admin-dashboard/flora/flora';
import { Usuarios } from './pages/admin-dashboard/usuarios/usuarios';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Florafauna } from './pages/florafauna/florafauna';
import { AboutUs } from './pages/about-us/about-us';

export const routes: Routes = [
    {path:"", redirectTo: "inicio", pathMatch: "full"},
    {path:"inicio", component: Home},
    {path:"login", component: Login},
    {path:"register", component: Register},
    {path:"florafauna", component: Florafauna},
    {path:"sobre-parques", component: AboutUs},

  {
    path: 'admin',
    component: AdminDashboard,
    children: [
      { path: '', redirectTo: 'panel-control', pathMatch: 'full' },
      { path: 'panel-control', component: PanelControl },
      { path: 'parques', component: Parques },
      { path: 'fauna', component: Fauna },
      { path: 'flora', component: Flora },
      { path: 'usuarios', component: Usuarios }
    ]
  },

  // fallback
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}

