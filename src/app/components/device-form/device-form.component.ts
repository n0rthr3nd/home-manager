import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Device, DeviceType } from '../../models/device.model';
import { IndexedDBService } from '../../services/indexed-db.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-device-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './device-form.component.html',
  styleUrl: './device-form.component.scss'
})
export class DeviceFormComponent {
  @Output() deviceAdded = new EventEmitter<Device>();

  deviceForm: FormGroup;
  deviceTypes = [
    { value: DeviceType.PUERTA, label: 'Puerta' },
    { value: DeviceType.VENTANA, label: 'Ventana' }
  ];

  constructor(
    private fb: FormBuilder,
    private dbService: IndexedDBService,
    private snackBar: MatSnackBar
  ) {
    this.deviceForm = this.fb.group({
      id: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      type: [DeviceType.VENTANA, Validators.required]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.deviceForm.valid) {
      const device: Device = this.deviceForm.value;

      try {
        await this.dbService.addDevice(device);
        this.snackBar.open('Dispositivo agregado correctamente', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.deviceAdded.emit(device);
        this.deviceForm.reset({ type: DeviceType.VENTANA });
      } catch (error) {
        console.error('Error adding device:', error);
        this.snackBar.open('Error: El ID ya existe o hubo un problema', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  getErrorMessage(field: string): string {
    const control = this.deviceForm.get(field);

    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control?.hasError('minlength')) {
      return 'Mínimo 3 caracteres';
    }

    return '';
  }
}
