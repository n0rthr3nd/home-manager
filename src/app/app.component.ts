import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DeviceListComponent } from './components/device-list/device-list.component';
import { DeviceFormComponent } from './components/device-form/device-form.component';
import { VoiceButtonComponent } from './components/voice-button/voice-button.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MatIconModule,
    DeviceListComponent,
    DeviceFormComponent,
    VoiceButtonComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'Control de Persianas';
  formExpanded = false;
}
