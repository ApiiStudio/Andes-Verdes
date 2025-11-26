import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthLogin } from '../../services/auth-login/auth-login';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
  ,
  standalone: true,
  imports: [RouterModule, CommonModule, RouterLink,]
})
export class AdminDashboard {

  sidebarOpen = false;
  searchTerm: string = '';


  userData: any;
  userName: string = '';
  isAdmin: boolean = false;
  userLoginOn: boolean = false;

  constructor(
    private router: Router,
    private AuthLogin: AuthLogin,
    private cdRef: ChangeDetectorRef,
  ) {}

  logout() {
    this.AuthLogin.logout();

    this.userData = undefined;
    this.userName = '';
    this.isAdmin = false;
    this.userLoginOn = false;

    this.cdRef.detectChanges();

    this.router.navigate(['/inicio']);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;

    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) {
      if (this.sidebarOpen) sidebar.classList.add('open');
      else sidebar.classList.remove('open');
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 520) {
      this.sidebarOpen = false;

      const sidebar = document.querySelector('.admin-sidebar');
      sidebar?.classList.remove('open');
    }
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value.toLowerCase();

  }
}