import { Device, DeviceType } from '../models/device.model';

export const DEFAULT_DEVICES: Device[] = [
  {
    id: 'ZWayVDev_zway_3-0-38',
    description: 'Ventana Hab. Principal',
    room: 'Hab. Principal',
    type: DeviceType.VENTANA
  },
  {
    id: 'ZWayVDev_zway_8-0-38',
    description: 'Puerta Hab. Principal',
    room: 'Hab. Principal',
    type: DeviceType.PUERTA
  },
  {
    id: 'ZWayVDev_zway_4-0-38',
    description: 'Ventana Salón',
    room: 'Salón',
    type: DeviceType.VENTANA
  },
  {
    id: 'ZWayVDev_zway_2-0-38',
    description: 'Puerta Salón',
    room: 'Salón',
    type: DeviceType.PUERTA
  },
  {
    id: 'ZWayVDev_zway_7-0-38',
    description: 'Ventana Ordenadores',
    room: 'Ordenadores',
    type: DeviceType.VENTANA,
    inverted: true
  },
  {
    id: 'ZWayVDev_zway_9-0-38',
    room: 'Hab. Jaume/Edu',
    description: 'Ventana Hab. Jaume/Edu',
    type: DeviceType.VENTANA
  }
];
