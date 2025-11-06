import { Component } from '@angular/core';

@Component({
  selector: 'app-panel-control',
  template: `
    <div class="panel-control">
      <h3>Panel de Control</h3>
      <p>KPIs y acciones rápidas.</p>
      <div class="widgets">
        <div class="widget">Usuarios: <strong>--</strong></div>
        <div class="widget">Parques: <strong>--</strong></div>
      </div>
    </div>
  `
})
export class PanelControl {}