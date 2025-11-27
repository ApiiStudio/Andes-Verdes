import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthLogin } from '../../services/auth-login/auth-login';
import { ApiService } from '../../services/api.service';

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
  suggestions: Array<{ label: string; category: string; id?: any; type?: string }> = [];

  private _itemsCache: Array<{ label: string; category: string; id?: any; type?: string }> = [];

  // counts for KPIs
  parksCount: number = 0;
  faunaCount: number = 0;
  floraCount: number = 0;
  usersCount: number = 0;


  userData: any;
  userName: string = '';
  isAdmin: boolean = false;
  userLoginOn: boolean = false;

  constructor(
    private router: Router,
    private AuthLogin: AuthLogin,
    private cdRef: ChangeDetectorRef,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    // preload items from APIs so we can show combined suggestions
    this.fetchAllItems();
  }

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
    this.searchTerm = (event.target.value || '').toLowerCase();
    // Broadcast a global event so child admin views can react and filter their lists
    try {
      const term = (this.searchTerm || '').trim();
      window.dispatchEvent(new CustomEvent('admin-search', { detail: { term } }));
      // also compute local suggestions
      this.computeSuggestions(term);
    } catch (e) {
      // ignore if dispatch fails
    }
    }

  private fetchAllItems() {
    // parks
    this.api.getParks().subscribe({ next: (ps: any[]) => {
      const arr = ps || [];
      this.parksCount = Array.isArray(arr) ? arr.length : 0;
      (arr).forEach((p,i) => this._itemsCache.push({ id: p.id || 'srv_'+i, label: p.titulo || p.name || p.properties?.name || '', category: 'Parques', type: 'parque' }));
    }, error: () => { this.parksCount = 0; } });
    // fauna
    this.api.getFaunas().subscribe({ next: (fs: any[]) => {
      const arr = fs || [];
      this.faunaCount = Array.isArray(arr) ? arr.length : 0;
      (arr).forEach((f,i) => this._itemsCache.push({ id: f.id, label: f.titulo || f.nombre || '', category: 'Fauna', type: 'fauna' }));
    }, error: () => { this.faunaCount = 0; } });
    // flora
    this.api.getFloras().subscribe({ next: (fs: any[]) => {
      const arr = fs || [];
      this.floraCount = Array.isArray(arr) ? arr.length : 0;
      (arr).forEach((f,i) => this._itemsCache.push({ id: f.id, label: f.titulo || f.nombre || '', category: 'Flora', type: 'flora' }));
    }, error: () => { this.floraCount = 0; } });
    // users
    this.api.getUsuarios().subscribe({ next: (us: any[]) => {
      const arr = us || [];
      this.usersCount = Array.isArray(arr) ? arr.length : 0;
      (arr).forEach((u,i) => this._itemsCache.push({ id: u.id, label: u.username || u.email || '', category: 'Usuarios', type: 'usuario' }));
    }, error: () => { this.usersCount = 0; } });
  }

  private computeSuggestions(term: string) {
    const v = (term || '').toLowerCase().trim();
    if (!v) { this.suggestions = []; return; }
    const scored = this._itemsCache.map(it => {
      const name = (it.label || '').toLowerCase();
      let score = 100000;
      if (name === v) score = 0;
      else if (name.startsWith(v)) score = 1;
      else {
        const idx = name.indexOf(v);
        if (idx >= 0) score = 10 + idx;
      }
      return { it, score };
    }).filter(s => s.score < 100000)
      .sort((a,b) => a.score - b.score)
      .slice(0,3)
      .map(s => s.it);
    this.suggestions = scored.map(s => ({ label: s.label, category: s.category, id: s.id, type: s.type }));
  }

  selectSuggestion(item: { label: string; category: string; id?: any; type?: string }) {
    if (!item) return;
    // set search term, broadcast and clear suggestions
    this.searchTerm = item.label || '';
    window.dispatchEvent(new CustomEvent('admin-search', { detail: { term: this.searchTerm } }));
    this.suggestions = [];
    // navigate to corresponding admin route and optionally pass filter via query
    if (item.type === 'parque') this.router.navigate(['./parques']);
    else if (item.type === 'fauna') this.router.navigate(['./fauna']);
    else if (item.type === 'flora') this.router.navigate(['./flora']);
    else if (item.type === 'usuario') this.router.navigate(['./usuarios']);
  }
}