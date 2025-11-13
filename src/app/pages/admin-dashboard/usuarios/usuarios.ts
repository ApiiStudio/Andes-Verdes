import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-usuarios-admin',
  template: `
    <div class="usuarios-admin">
      <h2>Usuarios</h2>
      <p class="muted">Usuarios registrados y conectados (simulado).</p>

      <div class="users-grid">
        <div class="list">
          <h3>Registrados (localStorage)</h3>
          <ul>
            <li *ngFor="let u of users">
              <div>
                <strong>{{ u.username }}</strong>
                <div class="muted">{{ u.email }}</div>
              </div>
              <div class="actions">
                <button class="btn danger" (click)="remove(u.username)">Eliminar</button>
              </div>
            </li>
          </ul>
        </div>

        <div class="connected">
          <h3>Conectados ahora</h3>
          <ul>
            <li *ngFor="let c of connected">{{ c }}</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class Usuarios implements OnInit {
  users: Array<{ username: string; email?: string }> = [];
  connected: string[] = [];

  ngOnInit(): void {
    this.loadUsers();
    // Simular usuarios conectados (aleatorio)
    this.connected = ['admin', 'editor1'];
  }

  loadUsers() {
    const s = localStorage.getItem('av_users');
    if (s) {
      try {
        this.users = JSON.parse(s);
      } catch (e) {
        this.users = [];
      }
    } else {
      // seed demo
      this.users = [
        { username: 'admin', email: 'admin@andes.local' },
        { username: 'usuario1', email: 'u1@andes.local' }
      ];
      localStorage.setItem('av_users', JSON.stringify(this.users));
    }
  }

  remove(username: string) {
    if (!confirm('Eliminar usuario ' + username + '?')) return;
    this.users = this.users.filter((u) => u.username !== username);
    localStorage.setItem('av_users', JSON.stringify(this.users));
  }
}