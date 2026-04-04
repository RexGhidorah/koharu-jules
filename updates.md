# Koharu Custom Features & Updates Guide

Este documento detalla las características personalizadas y modificaciones aplicadas sobre la base de Koharu.
Está pensado como una guía técnica para re-aplicar esta lógica en caso de partir de un nuevo fork (ej. versión 0.42.2+).

## 1. Selección Múltiple (Batch) y Procesamiento Masivo
**Objetivo:** Permitir al usuario seleccionar múltiples documentos a la vez y procesarlos en lote.
**Ubicación principal:** Frontend UI (`ui/components/Navigator.tsx` o similar, junto con las tiendas de estado global).
**Lógica:**
- Se agregó estado en el frontend (ej. un Set o arreglo de IDs en zustand) para llevar el registro de qué documentos están "seleccionados".
- Se modificó la interfaz para permitir Shift-Click o Ctrl-Click.
- Al ejecutar acciones (como procesar, traducir, etc.), la UI envía un arreglo de IDs al backend en vez de solo el documento activo.

## 2. Exportación Masiva (Batch Export)
**Objetivo:** Poder exportar múltiples imágenes o el proyecto entero de una sola vez.
**Ubicación principal:** Frontend UI (componentes de exportación y llamadas a la API) y Backend Rust (ej. `koharu-rpc/src/api.rs`, `koharu-app/src/ops/project.rs`).
**Lógica:**
- Modificación en el backend para recibir múltiples IDs.
- Se asegura de que se construya el `.zip` o se exporten todas las imágenes especificadas de los documentos seleccionados en lote.

## 3. Buscador de Fuentes (Font Search)
**Objetivo:** Filtrar y buscar rápidamente la fuente deseada en el panel de renderizado.
**Ubicación principal:** `ui/components/panels/RenderControlsPanel.tsx` / `ui/components/ui/command.tsx`.
**Lógica:**
- Se introdujo un input de búsqueda / componente "Command" encima de la lista de fuentes.
- La lista renderizada aplica un `filter` basado en el texto introducido (ignorando mayúsculas y minúsculas).

## 4. Opción de Guardar Proyecto (Save/Export Project)
**Objetivo:** Persistir la sesión y documentos del proyecto en un archivo `.khr`.
**Ubicación principal:** `koharu-core/src/project.rs`, `koharu-app/src/ops/project.rs`, `koharu-rpc/src/api.rs`.
**Lógica:**
- Serialización de la estructura de estado/documentos.
- Lógica en el backend en Rust para empaquetar datos / imágenes asociadas al proyecto en un formato portable.
- Adición de un botón "Guardar Proyecto" en la UI que desencadena esta llamada al backend.

## 5. Proveedor de OpenRouter
**Objetivo:** Usar OpenRouter como alternativa en el servicio LLM.
**Ubicación principal:** `koharu-llm/src/providers/mod.rs` y `ui/lib/api.ts` (o donde se listen los proveedores).
**Lógica:**
- Se añadió OpenRouter al catálogo de proveedores compatibles en el backend (probablemente adaptado sobre OpenAI).
- Se agregó en la interfaz de configuración la opción para seleccionar "OpenRouter" e introducir su API Key y modelo (ej. `google/gemini-pro`, etc).

## 6. Importación de CBZ / ZIP
**Objetivo:** Poder importar archivos comprimidos con mangas.
**Ubicación principal:** Backend (`koharu-core` / `koharu-app`).
**Lógica:**
- Descompresión del ZIP/CBZ en memoria o en un directorio temporal.
- Extracción de todas las imágenes válidas y posterior importación masiva como nuevos documentos dentro del motor de la app.

## 7. Persistencia de Preferencias
**Objetivo:** Recordar la configuración elegida por el usuario (idioma, tema, proveedores de LLM, configuraciones de renderizado, etc.) entre sesiones.
**Ubicación principal:** `ui/lib/stores/preferencesStore.ts` (Zustand persist).
**Lógica:**
- El estado de Zustand usa el middleware `persist` para guardarse en localStorage / IndexedDB para que al recargar la app se mantengan estas preferencias sin depender del backend.

## 8. Correcciones al Flujo de Importación y Eliminación de Documentos
**Objetivo original:** Arreglar errores donde la UI no actualizaba bien el estado de documentos importados o dejaba "fantasmas" (vista previa residual) al eliminarlos.
**⚠️ NOTA IMPORTANTE PARA NUEVOS FORKS:**
La versión >=0.42.0 incluye refactorizaciones **masivas** en el almacenamiento del backend, el sistema de estado (usando Rx/XState/Orval), y la gestión de la API del frontend.
**Es altamente probable** que los errores originales que arreglamos hayan quedado obsoletos (o hayan cambiado drásticamente de contexto).
**Acción recomendada:** NO importar esta lógica de borrado "a ciegas". Probar primero si el flujo normal de importación/borrado funciona en el nuevo fork; si surge un problema similar, volver a plantear una solución adaptada a la nueva arquitectura.
