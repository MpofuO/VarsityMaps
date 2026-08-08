import { Component, input, Self } from '@angular/core';
import { ControlValueAccessor, FormControl, NgControl } from '@angular/forms';

export interface SelectOption {
  label: string;
  value: string | number;
}

@Component({
  selector: 'app-select-input',
  standalone: true,
  templateUrl: './select-input.html',
})
export class SelectInput implements ControlValueAccessor {
  label = input<string>('');
  options = input<SelectOption[]>([]);
  placeholder = input<string>('Select an option');
  disabledPlaceholder = input<string>('Select an option');
  containerClass = input<string>('form-control w-full');
  selectClass = input<string>('select select-bordered w-full text-sm focus:select-primary transition-all');
  labelClass = input<string>('label pb-1');
  labelTextClass = input<string>('label-text font-medium text-xs');
  errorClass = input<string>('label-text-alt text-error text-[10px]');
  errorMessages = input<Record<string, string>>({});

  value: string | number = '';
  disabled = false;

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this;
  }

  writeValue(value: unknown): void {
    this.value = (value ?? '') as string | number;
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

  onChangeHandler(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.value = select.value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  get control(): FormControl {
    return (this.ngControl?.control as FormControl);
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
    return customMsgs[firstError] ?? `${this.label() || 'This field'} is required.`;
  }
}