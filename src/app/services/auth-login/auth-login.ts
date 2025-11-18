import { Injectable } from '@angular/core';
import { LoginRequest } from './loginRequests';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, tap, catchError, of, map } from 'rxjs';
import { User } from '../user';

@Injectable({
  providedIn: 'root'
})
export class AuthLogin {

  private loginUrl = 'https://andesverdes-back-ib4y.onrender.com/api/login/';
  private userUrl = 'https://andesverdes-back-ib4y.onrender.com/api/usuarios/';

  currentUserLoginOn = new BehaviorSubject<boolean>(false);
  currentUserData = new BehaviorSubject<User>({ id_user: 0, email: '' });

  constructor(private http: HttpClient) {

    const savedUser = localStorage.getItem('userData');

    if (savedUser) {
      this.currentUserData.next(JSON.parse(savedUser));
      this.currentUserLoginOn.next(true);
    }
  }

  // LOGIN
  login(credential: LoginRequest): Observable<User> {
    return this.http.post<any>(this.loginUrl, credential).pipe(

      map((userData) => {

        // El backend devuelve exactamente estos campos:
        const user: User = {
          id_user: userData.id_user,
          email: userData.email,
          name: userData.name,
          surname: userData.surname,
          rol: userData.rol
        };

        // Guardar usuario
        localStorage.setItem('userData', JSON.stringify(user));
        this.currentUserData.next(user);
        this.currentUserLoginOn.next(true);

        return user;
      }),

      catchError((err) => this.handleError(err))
    );
  }

  // CARGAR USUARIO ACTUAL (solo si quieres obtener lista completa desde el backend)
  cargarUsuarioActual(): Observable<User | null> {
    return this.http.get<any>(this.userUrl).pipe(

      map((user: any) => {
        const mappedUser: User = {
          id_user: user.id_user,
          email: user.email,
          name: user.name,
          surname: user.surname,
          rol: user.rol
        };

        localStorage.setItem('userData', JSON.stringify(mappedUser));
        this.currentUserData.next(mappedUser);
        this.currentUserLoginOn.next(true);

        return mappedUser;
      }),

      catchError(() => of(null))
    );
  }

  // LOGOUT
  logout() {
    localStorage.removeItem('userData');
    this.currentUserData.next({ id_user: 0, email: '' });
    this.currentUserLoginOn.next(false);
  }

  get userData(): Observable<User> {
    return this.currentUserData.asObservable();
  }

  get userLoginOn(): Observable<boolean> {
    return this.currentUserLoginOn.asObservable();
  }

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Error HTTP:', error);
    return throwError(() =>
      error.error?.error || 'Error de conexión con el servidor.'
    );
  }
}
