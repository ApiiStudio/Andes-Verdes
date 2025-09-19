import { Component } from '@angular/core';
import { Footer } from "../../shared/footer/footer";
import { Navbar } from "../../shared/navbar/navbar";

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  imports: [Footer, Navbar]
})
export class Home {
  searchText = '';

  onSearchChange(evt: Event) {
    this.searchText = (evt.target as HTMLInputElement).value || '';
    console.log('Buscar:', this.searchText);
  }
}