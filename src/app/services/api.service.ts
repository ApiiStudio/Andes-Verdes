import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environments';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  private jsonOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  /* Parques */
  getParks(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/parques/`).pipe(catchError(this.handleError));
  }

  getParques(id: string | number): Observable<any> {
    return this.http.get(`${environment.apiUrl}/parques/${id}`).pipe(catchError(this.handleError));
  }

  createParques(payload: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/parques/`, payload, this.jsonOptions).pipe(catchError(this.handleError));
  }

  updateParques(id: string | number, payload: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/parques/${id}`, payload, this.jsonOptions).pipe(catchError(this.handleError));
  }

  deleteParques(id: string | number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/parques/${id}`).pipe(catchError(this.handleError));
  }

  /* Faunas */
  getFaunas(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/faunas/`).pipe(catchError(this.handleError));
  }

  createFaunas(payload: any) {
    return this.http.post(`${environment.apiUrl}/faunas/`, payload, this.jsonOptions).pipe(catchError(this.handleError));
  }

  updateFaunas(id: any, payload: any) {
    return this.http.put(`${environment.apiUrl}/faunas/${id}`, payload, this.jsonOptions).pipe(catchError(this.handleError));
  }

  deleteFaunas(id: any) {
    return this.http.delete(`${environment.apiUrl}/faunas/${id}`).pipe(catchError(this.handleError));
  }

  /* Floras */
  getFloras(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/floras/`).pipe(catchError(this.handleError));
  }

  createFloras(payload: any) {
    return this.http.post(`${environment.apiUrl}/floras/`, payload, this.jsonOptions).pipe(catchError(this.handleError));
  }

  updateFloras(id: any, payload: any) {
    return this.http.put(`${environment.apiUrl}/floras/${id}`, payload, this.jsonOptions).pipe(catchError(this.handleError));
  }

  deleteFloras(id: any) {
    return this.http.delete(`${environment.apiUrl}/floras/${id}`).pipe(catchError(this.handleError));
  }

  /* Usuarios */
  getUsuarios(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/usuarios/`).pipe(catchError(this.handleError));
  }

  createUsuarios(payload: any) {
    return this.http.post(`${environment.apiUrl}/usuarios/`, payload, this.jsonOptions).pipe(catchError(this.handleError));
  }

  updateUsuarios(id: any, payload: any) {
    return this.http.put(`${environment.apiUrl}/usuarios/${id}`, payload, this.jsonOptions).pipe(catchError(this.handleError));
  }

  deleteUsuarios(id: any) {
    return this.http.delete(`${environment.apiUrl}/usuarios/${id}`).pipe(catchError(this.handleError));
  }

  /* Imagenes */
  uploadImagen(formData: FormData) {
    return this.http.post(`${environment.apiUrl}/imagenes`, formData).pipe(catchError(this.handleError));
  }

  private handleError(err: any) {
    console.error('API error', err);
    return throwError(() => err || 'Server error');
  }
}