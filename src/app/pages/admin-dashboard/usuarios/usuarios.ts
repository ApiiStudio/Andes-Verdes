import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';

interface UserItem {
  id?: any;
  username: string;
  email?: string;
}

@Component({
  selector: 'app-usuarios-admin',
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css'],
  standalone: true,
  imports: [CommonModule]
})
export class Usuarios implements OnInit {
  users: UserItem[] = [];
  connected: string[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.connected = ['admin', 'editor1'];
  }

  loadUsers() {
    this.api.getUsuarios().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          // Normalizar estructura
          this.users = data.map((u: any) => ({
            id: u.id ?? undefined,
            username: u.username ?? u.email ?? 'usuario',
            email: u.email ?? ''
          }));
          localStorage.setItem('av_users', JSON.stringify(this.users));
        } else {
          this.loadFromStorage();
        }
      },
      error: () => this.loadFromStorage()
    });
  }

  private loadFromStorage() {
    const s = localStorage.getItem('av_users');
    if (s) {
      try {
        this.users = JSON.parse(s);
      } catch {
        this.users = [];
      }
    } else {
      this.users = [
        { username: 'admin', email: 'admin@andes.local' },
        { username: 'usuario1', email: 'u1@andes.local' }
      ];
      localStorage.setItem('av_users', JSON.stringify(this.users));
    }
  }

  remove(username: string) {
    if (!confirm('Eliminar usuario ' + username + '?')) return;
    const idx = this.users.findIndex((u) => u.username === username);
    if (idx < 0) return;

    const id = this.users[idx]?.id;

    // Evitar llamar al backend si el ID no es "real"
    const isServerId = (val: any) => {
      if (typeof val === 'number') return true;
      if (typeof val === 'string') return !/^local_|^tmp_|^mock_/.test(val);
      return false;
    };

    if (!isServerId(id)) {
      this.users.splice(idx, 1);
      localStorage.setItem('av_users', JSON.stringify(this.users));
      return;
    }

    this.api.deleteUsuarios(id).subscribe({
      next: () => {
        this.users.splice(idx, 1);
        localStorage.setItem('av_users', JSON.stringify(this.users));
      },
      error: () => {
        // Para mantener UX consistente, eliminar igual en local
        this.users.splice(idx, 1);
        localStorage.setItem('av_users', JSON.stringify(this.users));
      }
    });
  }
}