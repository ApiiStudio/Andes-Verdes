import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, catchError, BehaviorSubject, tap } from 'rxjs';
import { User } from '../user';
import { SignupRequest } from './signup-requests';

@Injectable({
  providedIn: 'root'
})

export class AuthSignupService {

  private apiUrl = 'https://andesverdes-back-ib4y.onrender.com/api/signup/';
  currentUserSignIn: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  currentUserData: BehaviorSubject<User> = new BehaviorSubject<User>({ id_user: 0, email: '' });

  constructor(private http: HttpClient) { }

  signup(credential: SignupRequest): Observable<User> {
    return this.http.post<User>(this.apiUrl, credential).pipe(
      tap((userData: User) => {
        this.currentUserData.next(userData);
        this.currentUserSignIn.next(true);
      }),
      catchError(this.handleError)
    )
  }

  private handleError(error: HttpErrorResponse) {
  if (error.status === 0) {
    console.error('Se ha producido un error:', error.error);
  } else {
    console.error('Backend retornó código', error.status, error.error);
  }
  // En vez de reemplazar, devolvemos el error real
  return throwError(() => error);
}
  get userData(): Observable<User> {
    return this.currentUserData.asObservable();
  }
}