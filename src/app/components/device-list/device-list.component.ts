import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Device, DeviceType } from '../../models/device.model';
import { IndexedDBService } from '../../services/indexed-db.service';
import { BlindControlComponent } from '../blind-control/blind-control.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

interface GroupedDevices {
  ventanas: Device[];
  puertas: Device[];
}

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
  groupedDevices$!: Observable<GroupedDevices>;

  constructor(private dbService: IndexedDBService) {}

  ngOnInit(): void {
    this.devices$ = this.dbService.devices$;
    this.groupedDevices$ = this.devices$.pipe(
      map(devices => ({
        ventanas: devices.filter(d => d.type === DeviceType.VENTANA),
        puertas: devices.filter(d => d.type === DeviceType.PUERTA)
      }))
    );
  }
}
