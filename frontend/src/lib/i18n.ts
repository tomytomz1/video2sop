import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
const enTranslations = {
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Try Again',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    submit: 'Submit',
  },
  upload: {
    title: 'Upload Video',
    dragDrop: 'Drag and drop your video here',
    or: 'or',
    browse: 'Browse Files',
    maxSize: 'Maximum file size: {{size}}',
    supportedFormats: 'Supported formats: {{formats}}',
    processing: 'Processing your video...',
    success: 'Video uploaded successfully',
    error: 'Failed to upload video',
  },
  validation: {
    required: '{{field}} is required',
    invalidUrl: 'Please enter a valid URL',
    invalidEmail: 'Please enter a valid email address',
    maxLength: '{{field}} must be less than {{max}} characters',
    minLength: '{{field}} must be at least {{min}} characters',
    fileSize: 'File size must be less than {{size}}',
    fileType: 'Only {{types}} files are supported',
  },
  errors: {
    network: 'Network error. Please check your connection.',
    server: 'Server error. Please try again later.',
    unauthorized: 'Please log in to continue',
    forbidden: 'You do not have permission to perform this action',
    notFound: 'The requested resource was not found',
  },
};

// Spanish translations
const esTranslations = {
  common: {
    loading: 'Cargando...',
    error: 'Ocurrió un error',
    retry: 'Intentar de nuevo',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    submit: 'Enviar',
  },
  upload: {
    title: 'Subir Video',
    dragDrop: 'Arrastra y suelta tu video aquí',
    or: 'o',
    browse: 'Buscar Archivos',
    maxSize: 'Tamaño máximo de archivo: {{size}}',
    supportedFormats: 'Formatos soportados: {{formats}}',
    processing: 'Procesando tu video...',
    success: 'Video subido exitosamente',
    error: 'Error al subir el video',
  },
  validation: {
    required: '{{field}} es requerido',
    invalidUrl: 'Por favor ingresa una URL válida',
    invalidEmail: 'Por favor ingresa un email válido',
    maxLength: '{{field}} debe tener menos de {{max}} caracteres',
    minLength: '{{field}} debe tener al menos {{min}} caracteres',
    fileSize: 'El tamaño del archivo debe ser menor a {{size}}',
    fileType: 'Solo se permiten archivos {{types}}',
  },
  errors: {
    network: 'Error de red. Por favor verifica tu conexión.',
    server: 'Error del servidor. Por favor intenta más tarde.',
    unauthorized: 'Por favor inicia sesión para continuar',
    forbidden: 'No tienes permiso para realizar esta acción',
    notFound: 'El recurso solicitado no fue encontrado',
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
  });

export default i18n; 