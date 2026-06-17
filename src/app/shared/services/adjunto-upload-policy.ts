export const ADJUNTO_MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
export const ADJUNTO_MAX_DOCUMENTO_BYTES = 25 * 1024 * 1024;
export const ADJUNTO_MAX_PDF_ORIGEN_BYTES = 50 * 1024 * 1024;
export const ADJUNTO_MAX_EXCEL_ORIGEN_BYTES = 50 * 1024 * 1024;
export const ADJUNTO_ACCEPT_TIPOS = '.xlsx,.xls,.pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.zip,.rar';

export const ADJUNTO_TIPOS_PERMITIDOS = new Set([
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/octet-stream',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif'
]);

export const ADJUNTO_EXTENSIONES_PERMITIDAS = new Set([
  'xlsx', 'xls', 'pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'zip', 'rar'
]);
