import { Injectable } from '@angular/core';
import { Device } from '../models/device.model';
import { DEFAULT_DEVICES } from '../config/default-devices.config';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private dbName = 'BlindsControlDB';
  private dbVersion = 1;
  private storeName = 'devices';
  private db: IDBDatabase | null = null;

  private devicesSubject = new BehaviorSubject<Device[]>([]);
  public devices$: Observable<Device[]> = this.devicesSubject.asObservable();

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Error opening database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully');
        this.loadDevices();
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex('type', 'type', { unique: false });
          objectStore.createIndex('description', 'description', { unique: false });
          console.log('Object store created');

          // Add default devices on first initialization
          objectStore.transaction.oncomplete = () => {
            this.loadDefaultDevices();
          };
        }
      };
    });
  }

  private async loadDefaultDevices(): Promise<void> {
    // Ya no guardamos los dispositivos por defecto en IndexedDB
    // Solo cargamos los dispositivos (que ahora incluirán los defaults automáticamente)
    this.loadDevices();
  }

  private async loadDevices(): Promise<void> {
    const userDevices = await this.getUserDevices();
    // Fusionar dispositivos por defecto con los del usuario
    // Los dispositivos del usuario tienen prioridad (pueden sobreescribir los default con el mismo ID)
    const allDevices = this.mergeDevices(DEFAULT_DEVICES, userDevices);
    this.devicesSubject.next(allDevices);
  }

  /**
   * Fusiona dispositivos por defecto con los del usuario
   * Si hay IDs duplicados, el dispositivo del usuario tiene prioridad
   */
  private mergeDevices(defaultDevices: Device[], userDevices: Device[]): Device[] {
    const deviceMap = new Map<string, Device>();

    // Primero agregamos los dispositivos por defecto
    defaultDevices.forEach(device => {
      deviceMap.set(device.id, device);
    });

    // Luego agregamos/sobreescribimos con los dispositivos del usuario
    userDevices.forEach(device => {
      deviceMap.set(device.id, device);
    });

    // Convertimos el Map a array
    return Array.from(deviceMap.values());
  }

  /**
   * Obtiene solo los dispositivos guardados por el usuario en IndexedDB
   */
  private async getUserDevices(): Promise<Device[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        // Si la DB no está lista, devolvemos array vacío
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Error getting user devices');
        reject(request.error);
      };
    });
  }

  async addDevice(device: Device): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(device);

      request.onsuccess = () => {
        console.log('Device added successfully');
        this.loadDevices();
        resolve();
      };

      request.onerror = () => {
        console.error('Error adding device');
        reject(request.error);
      };
    });
  }

  async updateDevice(device: Device): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(device);

      request.onsuccess = () => {
        console.log('Device updated successfully');
        this.loadDevices();
        resolve();
      };

      request.onerror = () => {
        console.error('Error updating device');
        reject(request.error);
      };
    });
  }

  async deleteDevice(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Device deleted successfully');
        this.loadDevices();
        resolve();
      };

      request.onerror = () => {
        console.error('Error deleting device');
        reject(request.error);
      };
    });
  }

  /**
   * Obtiene TODOS los dispositivos (defaults + usuario)
   */
  async getAllDevices(): Promise<Device[]> {
    const userDevices = await this.getUserDevices();
    return this.mergeDevices(DEFAULT_DEVICES, userDevices);
  }

  /**
   * Obtiene un dispositivo por ID (busca en usuario primero, luego en defaults)
   */
  async getDevice(id: string): Promise<Device | undefined> {
    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        // Si la DB no está inicializada, buscar solo en defaults
        const defaultDevice = DEFAULT_DEVICES.find(d => d.id === id);
        resolve(defaultDevice);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          // Encontrado en dispositivos del usuario
          resolve(request.result);
        } else {
          // Buscar en dispositivos por defecto
          const defaultDevice = DEFAULT_DEVICES.find(d => d.id === id);
          resolve(defaultDevice);
        }
      };

      request.onerror = () => {
        console.error('Error getting device');
        reject(request.error);
      };
    });
  }

  async clearAllDevices(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All devices cleared');
        this.loadDevices();
        resolve();
      };

      request.onerror = () => {
        console.error('Error clearing devices');
        reject(request.error);
      };
    });
  }
}
