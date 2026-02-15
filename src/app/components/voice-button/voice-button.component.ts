import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { VoiceRecognitionService, VoiceRecognitionState } from '../../services/voice-recognition.service';
import { BlindControlService } from '../../services/blind-control.service';
import { IndexedDBService } from '../../services/indexed-db.service';
import { Device } from '../../models/device.model';

@Component({
  selector: 'app-voice-button',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './voice-button.component.html',
  styleUrls: ['./voice-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoiceButtonComponent implements OnInit, OnDestroy {
  voiceState: VoiceRecognitionState = {
    isListening: false,
    transcript: '',
    message: 'Pulsa para hablar',
    confidence: 0
  };

  private subscriptions: Subscription[] = [];
  private devices: Device[] = [];

  constructor(
    private voiceService: VoiceRecognitionService,
    private blindControlService: BlindControlService,
    private indexedDbService: IndexedDBService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const stateSub = this.voiceService.state$.subscribe(state => {
      this.voiceState = state;
      this.cdr.markForCheck();

      if (state.error && state.error !== 'no-speech') {
        this.showNotification(state.message, 'error');
      }
    });
    this.subscriptions.push(stateSub);

    this.loadDevices();
    window.addEventListener('voice-command', this.onVoiceCommand.bind(this));

    if (!this.voiceService.isRecognitionSupported()) {
      this.showNotification('Tu navegador no soporta reconocimiento de voz', 'error');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());

    if (this.voiceState.isListening) {
      this.voiceService.stop();
    }

    window.removeEventListener('voice-command', this.onVoiceCommand.bind(this));
  }

  private loadDevices(): void {
    const devicesSub = this.indexedDbService.devices$.subscribe((devices: Device[]) => {
      this.devices = devices;
      this.voiceService.setAvailableDevices(devices);
      console.log('Dispositivos cargados para control por voz:', devices.length);
    });
    this.subscriptions.push(devicesSub);
  }

  toggleVoiceRecognition(): void {
    if (this.voiceState.isListening) {
      this.voiceService.stop();
    } else {
      this.voiceService.start();
    }
  }

  private onVoiceCommand(event: Event): void {
    const customEvent = event as CustomEvent;
    const { devices, action } = customEvent.detail;

    console.log('Ejecutando comando de voz:', action, 'en', devices.length, 'dispositivo(s)');

    devices.forEach((device: Device) => {
      this.executeDeviceCommand(device, action);
      console.log('Comando ejecutado en:', device.description);
    });

    this.showNotification(
      `Comando ejecutado en ${devices.length} dispositivo${devices.length > 1 ? 's' : ''}`,
      'success'
    );
  }

  private executeDeviceCommand(device: Device, action: string): void {
    const inverted = device.inverted || false;

    switch (action) {
      case 'on':
        this.blindControlService.moveUp(device.id, inverted);
        break;

      case 'off':
        this.blindControlService.moveDown(device.id, inverted);
        break;

      case 'stop':
        this.blindControlService.stop(device.id);
        break;

      default:
        console.error('Acción desconocida:', action);
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: [`snackbar-${type}`]
    });
  }

  getIcon(): string {
    if (this.voiceState.isListening) {
      return 'mic';
    }
    return 'mic_none';
  }
}
