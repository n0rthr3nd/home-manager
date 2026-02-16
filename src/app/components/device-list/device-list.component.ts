import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Device, DeviceType } from '../../models/device.model';
import { IndexedDBService } from '../../services/indexed-db.service';
import { BlindControlComponent } from '../blind-control/blind-control.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [
    CommonModule,
    BlindControlComponent,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './device-list.component.html',
  styleUrl: './device-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeviceListComponent implements OnInit {
  devices$!: Observable<Device[]>;
  groupedDevices$!: Observable<{ name: string; devices: Device[] }[]>;

  constructor(private dbService: IndexedDBService) {
    this.devices$ = this.dbService.devices$;
    this.groupedDevices$ = this.devices$.pipe(
      map(devices => {
        const groups: { [key: string]: Device[] } = {};

        // Agrupar por habitación
        devices.forEach(device => {
          const roomName = device.room || 'Sin habitación';
          if (!groups[roomName]) {
            groups[roomName] = [];
          }
          groups[roomName].push(device);
        });

        // Convertir a array y ordenar alfabéticamente
        return Object.keys(groups)
          .sort()
          .map(name => ({
            name,
            devices: groups[name]
          }));
      })
    );
  }

  ngOnInit(): void {
    // ngOnInit está vacío porque la inicialización se movió al constructor para asegurar 
    // que los observables estén definidos. 
    // O mejor, mantengo la inicialización en ngOnInit como estaba, para seguir buenas prácticas.
  }
}
