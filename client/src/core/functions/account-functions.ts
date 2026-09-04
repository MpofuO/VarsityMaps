import { AbstractControl, ValidationErrors } from "@angular/forms";

export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.parent?.get('password')?.value;
    return password === control.value ? null : { passwordMismatch: true };
}