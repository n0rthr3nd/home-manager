import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Device, DeviceStatus } from '../../models/device.model';
import { BlindControlService } from '../../services/blind-control.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-blind-control',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './blind-control.component.html',
  styleUrl: './blind-control.component.scss'
})
export class BlindControlComponent implements OnInit {
  @Input() device!: Device;
  deviceStatus$!: Observable<DeviceStatus>;

  constructor(private blindControlService: BlindControlService) {}

  ngOnInit(): void {
    this.deviceStatus$ = this.blindControlService.getDeviceStatus(this.device.id);
  }

  moveUp(): void {
    this.blindControlService.moveUp(this.device.id);
  }

  moveDown(): void {
    this.blindControlService.moveDown(this.device.id);
  }

  stop(): void {
    this.blindControlService.stop(this.device.id);
  }

  getIconForType(): string {
    return this.device.type === 'PUERTA' ? 'door_sliding' : 'window';
  }
}
