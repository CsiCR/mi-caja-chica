
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';

// Extender dayjs con plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

// Configurar timezone por defecto: Buenos Aires, Argentina
export const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';

// Función para obtener la fecha/hora actual en Buenos Aires
export const now = () => {
  return dayjs().tz(DEFAULT_TIMEZONE);
};

// Función para formatear una fecha en Buenos Aires
export const formatDate = (date: Date | string | null | undefined, format: string = 'DD/MM/YYYY') => {
  if (!date) return '';
  return dayjs(date).tz(DEFAULT_TIMEZONE).format(format);
};

// Función para formatear fecha y hora en Buenos Aires
export const formatDateTime = (date: Date | string | null | undefined) => {
  if (!date) return '';
  return dayjs(date).tz(DEFAULT_TIMEZONE).format('DD/MM/YYYY HH:mm');
};

// Función para convertir a Date de Buenos Aires
export const toDate = (date: string | Date) => {
  return dayjs(date).tz(DEFAULT_TIMEZONE).toDate();
};

// Función para obtener fecha de hoy en Buenos Aires
export const today = () => {
  return dayjs().tz(DEFAULT_TIMEZONE).startOf('day').toDate();
};

export default dayjs;
