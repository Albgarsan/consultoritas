---
name: consultoritas-project-engineering
description: Guía de arquitectura y reglas de negocio para Consultoritas (Django + Next.js). Define el modelo de Despacho Colaborativo, segmentación fiscal española y estándares AEAT para la preparación de OCR e IA.
---

# Consultoritas Project Skill

## 1. Visión y Propósito
Consultoritas es un portal SaaS para digitalizar pequeñas asesorías en España. Su objetivo es eliminar la fricción entre el cliente y el asesor mediante procesamiento automático de datos y una interfaz intuitiva.

## 2. Modelo de Visibilidad (Despacho Colaborativo)
- **Asesores (Acceso Global):** Todos los asesores pueden ver y gestionar la información de todos los clientes, empresas y documentos. No existen silos de clientes.
- **Asesores (Agenda Privada):** Las citas (`Appointments`) son estrictamente personales. Un asesor solo ve su propia agenda.
- **Clientes:** Aislamiento total. Solo ven su propia empresa, sus documentos y sus citas.

## 3. Lógica Fiscal y Segmentación (Cerebro de la App)
El sistema automatiza el cumplimiento basándose en el perfil de la empresa (`Business`):

### A. Tipos de Contribuyente (`role`)
- **Autónomo (Persona Física):** Genera obligaciones de IRPF (Modelo 130) e IVA (Modelo 303).
- **Sociedad (Persona Jurídica):** Genera obligaciones de Sociedades (Modelo 200), pagos a cuenta (Modelo 202) e IVA (Modelo 303).

### B. Flags de Obligación (Automatización de Calendario)
- `has_employees`: Si es True, activa el **Modelo 111** (Retenciones de personal).
- `has_office_rent`: Si es True, activa el **Modelo 115** (Retenciones de alquiler).

## 4. Estándar de Datos AEAT (Libro de Registro)
Toda factura procesada debe estructurarse según el formato oficial:
- **Identificación:** fecha_expedicion, fecha_operacion, serie, numero, numero_final.
- **NIF Destinatario:** nif_tipo, nif_codigo_pais, nif_identificacion (debe coincidir con el tax_id del cliente).
- **Impuestos:** base_imponible, tipo_iva, cuota_iva_repercutida, tipo_recargo_equivalencia, cuota_recargo_equivalencia, total_factura.

## 5. Arquitectura de Automatización
1. **Frontend:** El componente `validator.tsx` realiza cálculos en tiempo real (Base * IVA = Total) para asistir al asesor.
2. **Backend:** El modelo `TaxCalendar` actúa como "checklist". Se marca como `is_presented` automáticamente cuando se valida un documento de categoría `IMPUESTO` que coincida con el periodo/año.

## 6. Estándares Técnicos
- **Comunicación:** Helper `apiFetch` para manejo de CSRF y credenciales.
- **Reactividad:** Patrón Event-Driven mediante eventos `consultoritas:*`.
- **Exportación:** Uso de `exceljs` para informes profesionales con formato contable.
- **UI/UX:** Componentes reutilizables y consistentes para una experiencia fluida.
- **Seguridad:** Validaciones estrictas en backend y frontend para garantizar integridad de datos y cumplimiento normativo.
