import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Florafauna } from './pages/florafauna/florafauna'
import { AboutUs } from './pages/about-us/about-us';

export const routes: Routes = [
    {path:"", redirectTo: "inicio", pathMatch: "full"},
    {path:"inicio", component: Home},
    {path:"login", component: Login},
    {path:"register", component: Register},
    {path:"florafauna", component: Florafauna},
    {path:"sobre-parques", component: AboutUs}
];
