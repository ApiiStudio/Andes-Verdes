import { AfterViewInit, Component, OnDestroy, ElementRef, ViewChild, } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthSignupService } from '../../services/auth-signup/auth-signup';
import { SignupRequest } from '../../services/auth-signup/signup-requests';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements AfterViewInit, OnDestroy {
  signupError: string = "";
  registerForm: FormGroup;
  showSuggestions = false;
  emailSuggestions = ['@gmail.com', '@outlook.com', '@hotmail.com', '@yahoo.com', '@icloud.com'];
  http: any;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authSignupService: AuthSignupService
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', Validators.required],
      surname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.passwordComplexityValidator]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }


  // Valida la contraseña
  passwordComplexityValidator(control: any) {
    const value = control.value || '';
    const errors: any = {};

    if (value.length < 8) errors.minLength = true;
    if (!/[A-Z]/.test(value)) errors.uppercase = true;
    if (!/[0-9]/.test(value)) errors.number = true;

    return Object.keys(errors).length ? errors : null;
  }

  // Mensaje para la contraseña
  getPasswordError(): string | null {
    const control = this.password;
    if (control?.touched && control?.errors) {
      const errors = control.errors;
    }
    return null;
  }

  // Requisitos de la contraseña
  passwordRules = [
    { label: 'Al menos 8 caracteres', valid: false },
    { label: 'Al menos 1 número', valid: false },
    { label: 'Al menos 1 letra mayúscula', valid: false },
  ];

  // Método para validar los requisitos de la contraseña
  onPasswordInput(): void {
    const value: string = this.registerForm.get('password')?.value || '';

    // Reglas visuales ya existentes
    this.passwordRules[0].valid = value.length >= 8 && value.length <= 128;
    this.passwordRules[1].valid = /\d/.test(value);
    this.passwordRules[2].valid = /[A-Z]/.test(value);

    // Nueva: fuerza
    this.evaluatePasswordStrength(value);
  }

  passwordStrength: string = 'débil';

  evaluatePasswordStrength(password: string): void {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++; // símbolos

    if (score <= 2) {
      this.passwordStrength = 'débil';
    } else if (score === 3 || score === 4) {
      this.passwordStrength = 'media';
    } else {
      this.passwordStrength = 'fuerte';
    }
  }

  // Métodos para obtener los controles del formulario
  get name() {
    return this.registerForm.get('name');
  }
  get surname() {
    return this.registerForm.get('surname')
  }
  get email() {
    return this.registerForm.get('email');
  }
  get password() {
    return this.registerForm.get('password');
  }
  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  signup() {
    if (this.registerForm.valid) {
      const { confirmPassword, ...signupData } = this.registerForm.value;

      console.log("Datos a enviar:", signupData);

      this.authSignupService.signup(signupData as SignupRequest).subscribe({
        next: (userData) => {
          console.log("datos del servicio", userData);
          this.router.navigateByUrl('/inicio');
          this.registerForm.reset();
        },
        error: (errorData) => {
          // Manejo robusto para evitar el error de undefined
          const detalle = errorData?.error?.detail?.toLowerCase?.() || '';
          if (detalle.includes('ya está registrado')) {
            this.signupError = 'Este correo electrónico ya está registrado.';
            this.email?.setErrors({ emailExists: true });
            this.email?.markAsTouched();
          } else {
            this.signupError = 'Ocurrió un error al registrar. Intenta nuevamente.';
          }
        }
      });
    }
  }

  // Validador coincidencia de contraseñas
  passwordMatchValidator(formGroup: FormGroup) {
    return formGroup.get('password')?.value === formGroup.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  // Botón para enviar el formulario
  onSubmit(event: Event) {
    if (this.registerForm.valid) {
      const signupData: SignupRequest = this.registerForm.value;
      this.authSignupService.signup(signupData).subscribe({
        next: (res) => {
          // Registro exitoso, redirige o muestra mensaje
          this.router.navigateByUrl('/signup');
        },
        error: (err) => {
          // Maneja el error (por ejemplo, email ya registrado)
          this.signupError = 'Error al registrar: ' + (err.error?.detail || 'Intenta de nuevo');
        }
      });
    } else {
      console.error("Formulario inválido");
    }
  }

  // Método para cambiar la visibilidad de la contraseña
  showPassword = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  onEmailInput() {
    this.showSuggestions = true;
    this.signupError = '';

    const errors = this.email?.errors;
    if (errors && errors['emailExists']) {
      delete errors['emailExists'];
      this.email?.setErrors(Object.keys(errors).length ? errors : null);
    }
  }


  // Sugerencia de correo electrónico
  applySuggestion(suffix: string) {
    const value = this.email?.value?.split('@')[0] || '';
    this.email?.setValue(value + suffix);
    this.showSuggestions = false;
  }

  // Ocultar sugerencias de correo electrónico
  hideSuggestions() {
    setTimeout(() => this.showSuggestions = false, 200);
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

}