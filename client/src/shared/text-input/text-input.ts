import { Component, input, Self } from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';

@Component({
  selector: 'app-text-input',
  standalone: true,
  templateUrl: './text-input.html',
})
export class TextInput implements ControlValueAccessor {
  label = input<string>('');
  type = input<'text' | 'email' | 'password' | 'number' | 'date'>('text');
  placeholder = input<string>('');
  autocomplete = input<string>('');
  id = input<string>('');
  name = input<string>('');
  min = input<number | string | null>(null);
  max = input<number | string | null>(null);
  step = input<number | string | null>(null);
  containerClass = input<string>('form-control w-full');
  inputClass = input<string>('input input-bordered w-full pl-10 text-sm focus:input-primary transition-all');
  labelClass = input<string>('label pb-1');
  labelTextClass = input<string>('label-text font-medium text-xs');
  errorClass = input<string>('label-text-alt text-error text-[10px]');
  errorMessages = input<Record<string, string>>({});

  value = '';
  disabled = false;

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this;
  }

  // --- ControlValueAccessor Methods ---
  writeValue(value: unknown): void {
    this.value = (value ?? '') as string;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // --- Event Handlers ---
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  // --- Helpers & Error Handling ---
  get control(): FormControl {
    return (this.ngControl?.control as FormControl) ?? null;
  }

  get shouldShowError(): boolean {
    const ctrl = this.control;
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  get errorMessage(): string | null {
    const ctrl = this.control;
    if (!this.shouldShowError || !ctrl?.errors) {
      return null;
    }

    const firstError = Object.keys(ctrl.errors)[0];
    const customMsgs = this.errorMessages();
    return customMsgs[firstError] ?? this.fallbackErrorMessage(firstError, ctrl);
  }

  private fallbackErrorMessage(errorKey: string, ctrl: FormControl): string {
    const labelText = this.label() || 'This field';

    switch (errorKey) {
      case 'required':
        return `${labelText} is required.`;
      case 'email':
        return 'Please enter a valid email address.';
      case 'minlength':
        return `${labelText} must be at least ${ctrl.errors?.['minlength']?.requiredLength} characters.`;
      case 'maxlength':
        return `${labelText} must be at most ${ctrl.errors?.['maxlength']?.requiredLength} characters.`;
      case 'passwordMismatch':
        return 'Passwords do not match.';
      case 'min':
        return 'Value must be greater than or equal to the minimum.';
      default:
        return 'Please enter a valid value.';
    }
  }
}