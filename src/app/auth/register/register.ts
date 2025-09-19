import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  signupError: string = "";
  registerForm: FormGroup;
  showSuggestions = false;
  emailSuggestions = ['@gmail.com', '@yahoo.com', '@outlook.com', '@hotmail.com', '@icloud.com'];
  http: any;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,

  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.passwordComplexityValidator]],
      confirmPassword: [Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordComplexityValidator(control: any) {
    const value = control.value || '';
    const errors: any = {};

    if (value.length < 8) errors.minLength = 'La contraseña debe tener al menos 8 caracteres.';
    if (!/[A-Z]/.test(value)) errors.uppercase = 'La contraseña debe contener al menos una letra mayúscula.';
    if (!/[0-9]/.test(value)) errors.number = 'La contraseña debe contener al menos un número.';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors.specialChar = 'La contraseña debe contener al menos un carácter especial.';

    return Object.keys(errors).length ? { complexity: errors } : null;
  }

  getPasswordErrors(): string | null {
    const control = this.password;
    if (control?.touched && control?.errors) {
      const errors = control.errors;
    }
    return null;
  }

  passwordRules = [
    { label: 'Al menos 8 caracteres', valid: false },
    { label: 'Al menos 1 número', valid: false },
    { label: 'Al menos 1 letra mayúscula', valid: false },
  ];

  onPasswordInput(): void {
    const value: string = this.registerForm.get('password')?.value || '';

    this.passwordRules[0].valid = value.length >= 8;
    this.passwordRules[1].valid = /[0-9]/.test(value);
    this.passwordRules[2].valid = /[A-Z]/.test(value);

    this.evaluatePasswordStrength(value);
  }

  passwordStrength: string = 'Débil';

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


  get name() {
    return this.registerForm.get('name');
  }
  get surname() {
    return this.registerForm.get('surname');
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

  passwordMatchValidator(FormGroup: FormGroup) {
    return FormGroup.get('password')?.value === FormGroup.get('confirmPassword')?.value ? null : { mismatch: true };
  }

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

  applySuggestion(suffix: string) {
    const value = this.email?.value?.split('@')[0] || '';
    this.email?.setValue(value + suffix);
    this.showSuggestions = false;
  }

  hideSuggestions() {
    setTimeout(() => this.showSuggestions = false, 200);
  }

  @ViewChild('emailContainer') emailContainer!: ElementRef;

  private clicklistener: any;

  ngAfterViewInit() {
    this.clicklistener = (event: MouseEvent) => {
      if (
        this.showSuggestions &&
        this.emailContainer &&
        !this.emailContainer.nativeElement.contains(event.target)
      ) {
        this.showSuggestions = false;
      }
    };
    document.addEventListener('click', this.clicklistener);
  }

  ngOnDestroy() {
    document.removeEventListener('mousedown', this.clicklistener);
  }

  signup() {
    if (this.registerForm.valid) {
      const { confirmPassword, ...signupData } = this.registerForm.value;

      console.log("Datos a enviar:", signupData);

      //this.authSignupService.signup(signupData as SignupRequest).subscribe({
        //next: (userData) => {
          //console.log("datos del servicio", userData);
          //this.router.navigateByUrl('/inicio');
          //this.registerForm.reset();
        //},
        //error: (errorData) => {
          // Manejo robusto para evitar el error de undefined
          //const detalle = errorData?.error?.detail?.toLowerCase?.() || '';
          //if (detalle.includes('ya está registrado')) {
            //this.signupError = 'Este correo electrónico ya está registrado.';
            //this.email?.setErrors({ emailExists: true });
            //this.email?.markAsTouched();
          //} else {
            //this.signupError = 'Ocurrió un error al registrar. Intenta nuevamente.';
          //}
        //}
      //});
    }
  }
}