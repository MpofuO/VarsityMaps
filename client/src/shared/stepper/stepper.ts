import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stepper',
  standalone: true,
  templateUrl: './stepper.html',
  styleUrl: './stepper.css'
})
export class Stepper {
  @Input() steps: string[] = [];
  @Input() currentStep = 0;
}
