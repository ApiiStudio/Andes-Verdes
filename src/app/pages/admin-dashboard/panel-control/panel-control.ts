import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-panel-control',
  template: `
    <div class="panel-control">
      <div class="panel-title-row">
        <h2>Panel de Control</h2>
      </div>

      <div class="kpi-row">
        <div class="kpi-chip">
          <div class="kpi-icon">👥</div>
          <div>
            <div class="value">{{ usersCount }}</div>
            <div class="label">Usuarios</div>
          </div>
        </div>

        <div class="kpi-chip">
          <div class="kpi-icon">🏞️</div>
          <div>
            <div class="value">{{ parksCount }}</div>
            <div class="label">Parques</div>
          </div>
        </div>

        <div class="kpi-chip">
          <div class="kpi-icon">🦌</div>
          <div>
            <div class="value">{{ faunaCount }}</div>
            <div class="label">Fauna</div>
          </div>
        </div>

        <div class="kpi-chip">
          <div class="kpi-icon">🌿</div>
          <div>
            <div class="value">{{ floraCount }}</div>
            <div class="label">Flora</div>
          </div>
        </div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class PanelControl implements OnInit {
  usersCount = 0;
  parksCount = 0;
  faunaCount = 0;
  floraCount = 0;

  ngOnInit(): void {
    try {
      const users = JSON.parse(localStorage.getItem('av_users') || '[]');
      this.usersCount = users.length;
    } catch (e) {
      this.usersCount = 0;
    }

    try {
      const parks = JSON.parse(localStorage.getItem('av_parks') || '[]');
      this.parksCount = parks.length;
    } catch (e) {
      this.parksCount = 0;
    }

    try {
      const fauna = JSON.parse(localStorage.getItem('av_fauna') || '[]');
      this.faunaCount = fauna.length;
    } catch (e) {
      this.faunaCount = 0;
    }

    try {
      const flora = JSON.parse(localStorage.getItem('av_flora') || '[]');
      this.floraCount = flora.length;
    } catch (e) {
      this.floraCount = 0;
    }
  }
}