# LLM Reimplementation Guide: Koharu Custom Features

Este documento es una **especificación de requisitos para IA (como Jules)** pensada para reconstruir las características personalizadas en un *fork* limpio de Koharu (versión 0.42.2 o superior).

⚠️ **NOTA IMPORTANTE PARA EL LLM:**
La arquitectura base de Koharu (estado del frontend, manejo de API, almacenamiento en el backend con Rust) ha cambiado drásticamente en la versión 0.42.x (ej. transición a XState/Orval y reescritura del storage).
**No busques los archivos antiguos.** Debes comprender la *lógica* descrita aquí e integrarla de forma nativa en la nueva arquitectura y estructura de carpetas que encuentres en el repositorio.

---

## 1. Selección Múltiple (Batch) y Procesamiento Masivo
- **Requisito:** Permitir al usuario seleccionar múltiples documentos/imágenes a la vez en la barra de navegación lateral.
- **Frontend:** Implementar lógica de selección con `Shift-Click` (rango) y `Ctrl-Click`/`Cmd-Click` (individual). Mantener un estado global (`Set` o arreglo de IDs) de los "documentos seleccionados".
- **Interacción:** Cuando el usuario ejecute una acción masiva (procesar, OCR, traducir), el frontend debe iterar o enviar un arreglo con todos los IDs seleccionados al backend, en lugar de procesar únicamente la imagen activa.

## 2. Exportación Masiva (Batch Export)
- **Requisito:** Descargar todas las imágenes seleccionadas o el proyecto entero de una sola vez.
- **Backend:** Asegurar (o crear) un endpoint en Rust capaz de recibir múltiples IDs de documentos. El backend debe generar y devolver un archivo `.zip` que contenga las imágenes procesadas.
- **Frontend:** Añadir un botón o modificar el flujo de exportación para invocar este endpoint con el arreglo de documentos seleccionados.

## 3. Buscador de Fuentes Personalizado (Font Search)
- **Requisito:** Facilitar la búsqueda de tipografías cuando el usuario tiene muchas instaladas.
- **Frontend:** En el panel de control de renderizado (RenderControls), justo encima de la lista de fuentes disponibles, integrar un input de búsqueda de texto.
- **Lógica:** Filtrar en tiempo real la lista de fuentes que se renderiza basándose en el texto introducido (ignorando mayúsculas/minúsculas).

## 4. Guardar Proyecto (Project Save/Export)
- **Requisito:** Persistir toda la sesión de trabajo (imágenes, bloques de texto detectados, traducciones) en un archivo portable (ej. `.khr`).
- **Backend:** Crear la lógica de serialización para empaquetar el estado actual del espacio de trabajo (workspace) y sus imágenes en un archivo exportable.
- **Frontend:** Agregar un botón "Guardar Proyecto" que haga la llamada al backend y permita al usuario descargar o persistir dicho archivo.

## 5. Integración de OpenRouter
- **Requisito:** Soportar OpenRouter como proveedor de servicios LLM.
- **Frontend:** En el diálogo de configuración (Settings), agregar "OpenRouter" a la lista de proveedores. Requerirá campos para el modelo y la API Key, similares a los de OpenAI.
- **Backend:** Asegurar que el backend rutee correctamente las peticiones de traducción hacia la API de OpenRouter cuando este proveedor esté seleccionado.

## 6. Importación de archivos CBZ / ZIP
- **Requisito:** Soporte para arrastrar y soltar (drag & drop) o importar archivos comprimidos `.zip` o `.cbz` con cómics/mangas.
- **Backend:** Lógica para desempaquetar (unzip) el archivo temporalmente, filtrar las imágenes válidas e importarlas como nuevos documentos en el motor de la aplicación de manera masiva.

## 7. Persistencia de Preferencias (Persistent Preferences)
- **Requisito:** Recordar configuraciones del usuario (idioma, tema, credenciales de LLM, ajustes de renderizado) para que no se pierdan al refrescar la página o cerrar la app.
- **Frontend:** Usar el mecanismo de persistencia del gestor de estado (ej. localStorage/IndexedDB a través de middleware si usa Zustand, o el equivalente actual) para auto-cargar la configuración inicial.

## 8. Flujo Completo de Eliminación de Imágenes (Ghost Images / Preview Bug)
- **Requisito:** Al eliminar un documento/imagen, este debe desaparecer por completo sin dejar rastros visuales ni "fantasmas" de vista previa.
- **Backend:** La lógica de eliminación debe asegurarse de borrar no solo la entidad en la base de datos/estado, sino también eliminar cualquier *thumbnail* (miniatura) o imagen generada en caché de almacenamiento.
- **Frontend:**
  1. Si el usuario elimina el documento que actualmente está "activo" o viéndose en el lienzo principal, el frontend debe limpiar inmediatamente el estado activo (poniéndolo en `null` o cambiando al siguiente documento disponible).
  2. Forzar la invalidación del caché de queries (ej. React Query) para que la vista previa no quede atrapada en memoria.
