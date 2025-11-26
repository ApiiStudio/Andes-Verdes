import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';

// Importar Chart.js
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-panel-control',
  templateUrl: './panel-control.html',
  styleUrls: ['./panel-control.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PanelControl implements OnInit {
  usersCount = 0;
  parksCount = 0;
  faunaCount = 0;
  floraCount = 0;


  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getUsuarios().subscribe({
      next: (users: any[]) => {
        this.usersCount = users.length;
        this.updateSpeciesChart();
      },
      error: () => this.usersCount = 0
    });

    this.api.getParks().subscribe({
      next: (parks: any[]) => {
        this.parksCount = parks.length;
        this.updateParksChart();
      },
      error: () => this.parksCount = 0
    });

    this.api.getFaunas().subscribe({
      next: (fauna: any[]) => {
        this.faunaCount = fauna.length;
        this.updateSpeciesChart();
      },
      error: () => this.faunaCount = 0
    });

    this.api.getFloras().subscribe({
      next: (flora: any[]) => {
        this.floraCount = flora.length;
        this.updateSpeciesChart();
      },
      error: () => this.floraCount = 0
    });
  }

  // Gráfico de visitas mensuales a parques
  private updateParksChart() {
    new Chart('parksChart', {
      type: 'line',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [{
          label: 'Visitas',
          data: [120, 200, 150, 300, 250, this.parksCount * 10], // ejemplo dinámico
          borderColor: '#2e7d32',
          backgroundColor: 'rgba(46,125,50,0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    });
   }
  // Gráfico de distribución de especies
  speciesChart: any = null;

updateSpeciesChart() {
  const canvas = document.getElementById('speciesChart') as HTMLCanvasElement;
  if (!canvas) return;

  // ✅ Destruir gráfico anterior si existe
  if (this.speciesChart) {
    this.speciesChart.destroy();
  }

  this.speciesChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Fauna', 'Flora'],
      datasets: [{
        data: [this.faunaCount, this.floraCount],
        backgroundColor: ['#43a047', '#81c784']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

}