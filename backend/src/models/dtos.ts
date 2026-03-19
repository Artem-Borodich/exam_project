/**
 * DTO (данные запроса/ответа) — единая точка типов для контроллеров и сервисов.
 * В реальном проекте обычно сюда выносят и Zod-схемы, и TS-типы для фронта/клиента.
 */

export type PolygonPointDto = { lat: number; lng: number };

export type CreateZoneDto = {
  name: string;
  polygon: PolygonPointDto[];
};

export type CreateShiftDto = {
  zoneId: number;
  employeeId: number;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  startAt?: string; // ISO
  endAt?: string; // ISO
  durationMinutes?: number;
  timezone?: string;
};

export type GenerateReportDto = {
  fromAt: string; // ISO datetime
  toAt: string; // ISO datetime
  zoneIds: number[];
};

