export enum DeviceType {
  PUERTA = 'PUERTA',
  VENTANA = 'VENTANA'
}

export interface Device {
  id: string;
  description: string;
  room: string;
  type: DeviceType;
  inverted?: boolean; // Si es true, invierte los comandos on/off (subir/bajar)
}

export interface DeviceStatus {
  id: string;
  status: 'UP' | 'DOWN' | 'STOPPED';
  position: number; // 0-100
}
