import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'] // opcional
  ,
  standalone: true,
  imports: [RouterModule, CommonModule]
})
export class AdminDashboard {}