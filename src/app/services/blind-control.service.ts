import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, tap, of } from 'rxjs';
import { DeviceStatus } from '../models/device.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BlindControlService {
  private http = inject(HttpClient);
  private deviceStatusMap = new Map<string, BehaviorSubject<DeviceStatus>>();
  private readonly apiUrl = environment.apiUrl;

  // Modo de operación: 'api' o 'simulation'
  private mode: 'api' | 'simulation' = this.apiUrl ? 'api' : 'simulation';

  constructor() {
    if (this.mode === 'simulation') {
      console.warn('⚠️ API_URL no configurada. Ejecutando en modo simulación.');
      console.warn('📝 Configura API_URL en Vercel para usar la API real.');
    } else {
      console.log('✅ API configurada:', this.apiUrl);
    }
  }

  getDeviceStatus(deviceId: string): Observable<DeviceStatus> {
    if (!this.deviceStatusMap.has(deviceId)) {
      const initialStatus: DeviceStatus = {
        id: deviceId,
        status: 'STOPPED',
        position: 50 // Start at 50%
      };
      this.deviceStatusMap.set(deviceId, new BehaviorSubject<DeviceStatus>(initialStatus));
    }
    return this.deviceStatusMap.get(deviceId)!.asObservable();
  }

  private updateStatus(deviceId: string, updates: Partial<DeviceStatus>): void {
    const subject = this.deviceStatusMap.get(deviceId);
    if (subject) {
      const currentStatus = subject.value;
      subject.next({ ...currentStatus, ...updates });
    }
  }

  /**
   * Move blind up - Envía comando semántico 'up' al backend
   * El backend aplica la inversión si inverted=true
   * API: ${API_URL}/api/devices/${deviceId}/command/up[?inverted=true]
   */
  moveUp(deviceId: string, inverted: boolean = false): void {
    console.log(`📤 Subiendo persiana: ${deviceId} ${inverted ? '(invertido)' : ''}`);
    this.updateStatus(deviceId, { status: 'UP' });

    if (this.mode === 'api') {
      this.sendCommand(deviceId, 'up', inverted).subscribe({
        next: () => {
          console.log(`✅ Comando 'up' enviado exitosamente a ${deviceId}`);
          this.simulateMovement(deviceId, 'UP');
        },
        error: (error) => {
          console.error(`❌ Error enviando comando 'up' a ${deviceId}:`, error);
          // En caso de error, seguimos con la simulación local
          this.simulateMovement(deviceId, 'UP');
        }
      });
    } else {
      this.simulateMovement(deviceId, 'UP');
    }
  }

  /**
   * Move blind down - Envía comando semántico 'down' al backend
   * El backend aplica la inversión si inverted=true
   * API: ${API_URL}/api/devices/${deviceId}/command/down[?inverted=true]
   */
  moveDown(deviceId: string, inverted: boolean = false): void {
    console.log(`📤 Bajando persiana: ${deviceId} ${inverted ? '(invertido)' : ''}`);
    this.updateStatus(deviceId, { status: 'DOWN' });

    if (this.mode === 'api') {
      this.sendCommand(deviceId, 'down', inverted).subscribe({
        next: () => {
          console.log(`✅ Comando 'down' enviado exitosamente a ${deviceId}`);
          this.simulateMovement(deviceId, 'DOWN');
        },
        error: (error) => {
          console.error(`❌ Error enviando comando 'down' a ${deviceId}:`, error);
          // En caso de error, seguimos con la simulación local
          this.simulateMovement(deviceId, 'DOWN');
        }
      });
    } else {
      this.simulateMovement(deviceId, 'DOWN');
    }
  }

  /**
   * Stop blind movement - Envía comando 'stop' a la API
   * API: ${API_URL}/api/devices/${deviceId}/command/stop
   */
  stop(deviceId: string): void {
    console.log(`📤 Deteniendo persiana: ${deviceId}`);
    this.updateStatus(deviceId, { status: 'STOPPED' });

    if (this.mode === 'api') {
      this.sendCommand(deviceId, 'stop').subscribe({
        next: () => {
          // console.log(`✅ Comando 'stop' enviado exitosamente a ${deviceId}`);
        },
        error: (error) => {
          console.error(`❌ Error enviando comando 'stop' a ${deviceId}:`, error);
        }
      });
    }
  }

  /**
   * Envía un comando semántico al backend
   * Formato: ${API_URL}/api/devices/${deviceId}/command/${command}[?inverted=true]
   * El backend resuelve la inversión y mapea a on/off/stop antes de llamar a Z-Way
   */
  private sendCommand(deviceId: string, command: 'up' | 'down' | 'stop', inverted: boolean = false): Observable<any> {
    const invertedParam = inverted ? '?inverted=true' : '';
    const url = `${this.apiUrl}/api/devices/${deviceId}/command/${command}${invertedParam}`;
    console.log(`🌐 Llamando API: ${url}`);

    return this.http.get(url, {}).pipe(
      tap(response => console.log('📥 Respuesta API:', response)),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error en la llamada a la API:', error);
        return of(null); // Retorna observable vacío para no romper el flujo
      })
    );
  }

  /**
   * Simulate blind movement for demo purposes
   * Animation duration: 15 seconds (0-100%)
   * Increment: 1% every 150ms = 15 seconds total
   */
  private simulateMovement(deviceId: string, direction: 'UP' | 'DOWN'): void {
    const subject = this.deviceStatusMap.get(deviceId);
    if (!subject) return;

    const interval = setInterval(() => {
      const currentStatus = subject.value;

      if (currentStatus.status === 'STOPPED') {
        clearInterval(interval);
        return;
      }

      let newPosition = currentStatus.position;

      if (direction === 'UP') {
        newPosition = Math.min(100, currentStatus.position + 1);
        if (newPosition === 100) {
          this.updateStatus(deviceId, { position: newPosition, status: 'STOPPED' });
          clearInterval(interval);
          return;
        }
      } else if (direction === 'DOWN') {
        newPosition = Math.max(0, currentStatus.position - 1);
        if (newPosition === 0) {
          this.updateStatus(deviceId, { position: newPosition, status: 'STOPPED' });
          clearInterval(interval);
          return;
        }
      }

      this.updateStatus(deviceId, { position: newPosition });
    }, 150);
  }
}
