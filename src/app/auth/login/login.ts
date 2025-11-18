import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLogin } from '../../services/auth-login/auth-login';
import { LoginRequest } from '../../services/auth-login/loginRequests';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  standalone: true
})
export class Login implements AfterViewInit, OnDestroy {

  loginError: string = "";
  loginForm: FormGroup;
  showSuggestions = false;
  emailSuggestions = ['@gmail.com', '@outlook.com', '@hotmail.com', '@yahoo.com', '@icloud.com'];

  constructor(
    private formBuilder: FormBuilder,
    private authLogin: AuthLogin,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  // 🔥 LOGIN CORREGIDO COMPLETAMENTE
  login() {
    if (this.loginForm.valid) {
      this.authLogin.login(this.loginForm.value as LoginRequest).subscribe({
        next: (userData) => {
          console.log("Usuario logueado:", userData);
          localStorage.setItem('userLoginOn', 'true');
        },
        error: (errorMsg) => {
          this.loginError = errorMsg;
        },
        complete: () => {
          console.info("Login completado");
          this.router.navigateByUrl('/inicio');
          this.loginForm.reset();
        }
      });
    }
  }

  // Sugerencias Email
  onEmailInput() {
    this.showSuggestions = true;
  }

  hideSuggestions() {
    this.showSuggestions = false;
  }

  @ViewChild('emailContainer') emailContainer!: ElementRef;
  private clickListener: any;

  ngAfterViewInit() {
    this.clickListener = (event: MouseEvent) => {
      if (
        this.showSuggestions &&
        this.emailContainer &&
        !this.emailContainer.nativeElement.contains(event.target)
      ) {
        this.showSuggestions = false;
      }
    };
    document.addEventListener('mousedown', this.clickListener);
  }

  ngOnDestroy() {
    document.removeEventListener('mousedown', this.clickListener);
  }

  applySuggestion(suffix: string) {
    const value = this.email?.value?.split('@')[0] || '';
    this.email?.setValue(value + suffix);
    this.showSuggestions = false;
  }

  // Contraseña
  showPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onPasswordInput(): void {
    const value: string = this.loginForm.get('password')?.value || '';
    this.passwordRules[0].valid = value.length >= 8 && value.length <= 128;
    this.passwordRules[1].valid = /\d/.test(value);
    this.passwordRules[2].valid = /[A-Z]/.test(value);
  }

  passwordRules = [
    { label: 'Al menos 8 caracteres', valid: false },
    { label: 'Al menos 1 número', valid: false },
    { label: 'Al menos 1 letra mayúscula', valid: false }
  ];
}
