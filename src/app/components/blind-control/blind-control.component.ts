import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './blind-control.component.html',
  styleUrl: './blind-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlindControlComponent implements OnInit {
  @Input() device!: Device;
  deviceStatus$!: Observable<DeviceStatus>;

  constructor(private blindControlService: BlindControlService) {}

  ngOnInit(): void {
    this.deviceStatus$ = this.blindControlService.getDeviceStatus(this.device.id);
  }

  moveUp(): void {
    this.blindControlService.moveUp(this.device.id, this.device.inverted || false);
  }

  moveDown(): void {
    this.blindControlService.moveDown(this.device.id, this.device.inverted || false);
  }

  stop(): void {
    this.blindControlService.stop(this.device.id);
  }

  getIconForType(): string {
    return this.device.type === 'PUERTA' ? 'door_sliding' : 'window';
  }
}
