import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';

export const routes: Routes = [
    {path:"", redirectTo: "home", pathMatch: "full"},
    {path:"home", component: Home},
    {path:"login", component: Login},
    {path:"register", component: Register}
];
