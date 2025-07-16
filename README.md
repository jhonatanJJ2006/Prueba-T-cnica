# Evaluación Técnica – Senior Backend Developer  

---

## Tabla de Contenido

- [Resumen General](#resumen-general)
- [Stack Tecnológico y Decisiones](#stack-tecnológico-y-decisiones)
- [Arquitectura General](#arquitectura-general)
- [Modelo de Datos y Esquema](#modelo-de-datos-y-esquema)
- [Endpoints y Ejecución de Flows](#endpoints-y-ejecución-de-flows)
- [Procesamiento de Flows y Validaciones](#procesamiento-de-flows-y-validaciones)
- [Manejo de Cupones y Tickets](#manejo-de-cupones-y-tickets)
- [Motor de Ejecución de Steps](#motor-de-ejecución-de-steps)
- [Notas sobre Mensajería, Stripe y Assets](#notas-sobre-mensajería-stripe-y-assets)
- [Retos de la Evaluación Cubiertos](#retos-de-la-evaluación-cubiertos)
- [Consideraciones y Mejoras Futuras](#consideraciones-y-mejoras-futuras)
- [Solución a la Pregunta de Lógica](#solución-a-la-pregunta-de-lógica)
- [Cómo ejecutar el sistema (frontend + backend)](#cómo-ejecutar-el-sistema-frontend--backend)

---

## Resumen General

El proyecto aborda el reto de diseñar e implementar un **sistema de gestión de Flows (funnels de usuario)** con pasos dinámicos, configuración BackOffice, y lógica para cupones y tickets. El sistema soporta distintas etapas configurables (popups, delays, formularios, cupones, tickets, email, etc.), gestión robusta de recursos asociados (QR único, compra y gestión de tickets, validaciones de negocio) y un panel administrativo React para gestionar todo el flujo.

---

## Stack Tecnológico y Decisiones

- **Backend:** Node.js, Express, TypeScript
- **Base de datos:** PostgreSQL
- **Frontend:** React + TypeScript (panel administrativo y redención)
- **Generación de QR:** `qrcode.react` (frontend), `qrcode` (backend)
- **Control de assets:** Data URL por ahora (diseñado para migrar fácilmente a S3)
- **Mensajería/Async:** Arquitectura preparada para integración con SQS, Pub/Sub o RabbitMQ
- **Pagos:** Arquitectura preparada para Stripe (mockeado en esta etapa, integrable fácilmente)
- **Arquitectura:** Clean Architecture, rutas y servicios desacoplados, fácil de migrar a Serverless
- **Motivo por stack:**  
  - Elegí un stack local y open source para desarrollo ágil, pero toda la arquitectura es cloud-native y lista para serverless/Lambda.
  - Las decisiones buscan claridad, mantenibilidad y flexibilidad para crecer el sistema.

---

## Arquitectura General

- **División de módulos:**  
  - **Flows & Steps:** CRUD y lógica de funnels y sus etapas  
  - **Coupons:** Creación, redención única (QR), tracking de uso  
  - **Tickets:** Compra (mock Stripe), emisión individual con QR y control de redención  
  - **Frontend/Backoffice:** React para administración y usuarios  
  - **Mensajería/Async:** Listo para desacoplar colas/eventos (emails, pagos, logs, etc.)
  - **Servicios desacoplados:** Cada endpoint/módulo puede migrar a Lambda sin dependencias cruzadas

- **Escalabilidad:**  
  - Soporte multi-tenant y horizontal
  - Cada etapa del Flow es modular y ampliable

---

## Modelo de Datos y Esquema

### Flows
CREATE TABLE flows (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamp DEFAULT now()
);

### Coupons
CREATE TABLE coupons (
  id uuid PRIMARY KEY,
  step_id uuid REFERENCES flow_steps(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  type text CHECK (type IN ('fixed', 'percent', 'free_product')) NOT NULL,
  value numeric,
  valid_from date,
  valid_until date,
  redeemed_at timestamp,
  qr_code_url text,
  is_redeemed boolean DEFAULT false,
  redeemed_by text
);

### Tickets
CREATE TABLE tickets (
  id uuid PRIMARY KEY,
  step_id uuid REFERENCES flow_steps(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  code text UNIQUE NOT NULL,
  status text CHECK (status IN ('unused', 'used')) DEFAULT 'unused',
  qr_code_url text,
  created_at timestamp DEFAULT now(),
  used_at timestamp,
  redeemed_at timestamp
);

## Endpoints y Ejecución de Flows

### Flows CRUD

- `GET /api/flows`  
  Lista todos los flows.

- `POST /api/flows`  
  Crea un flow.

- `GET /api/flows/:id`  
  Detalle de un flow (incluye steps).

- `PUT /api/flows/:id`  
  Edita un flow.

- `DELETE /api/flows/:id`  
  Elimina un flow.

---

### Steps CRUD

- `POST /api/flow-details/:flowId/steps`  
  Añade steps dinámicos (cupones/tickets).

- `PUT /api/flow-details/:flowId/steps/:stepId`  
  Edita configuración del step.

- `DELETE /api/flow-details/:flowId/steps/:stepId`  
  Elimina un step.

---

### Redención y compra

- `POST /api/coupons/redeem`  
  Redime cupón por código/QR, una sola vez.

- `POST /api/tickets/redeem`  
  Redime ticket por código/QR, una sola vez.

- `POST /api/tickets/buy`  
  Compra uno o varios tickets (simulación Stripe, genera QRs).

---

### Panel de administración (Frontend)

- Interfaz para crear/editar flows, steps, configurar emails, delays, popups, cupones y tickets.
- Vista de usuario para visualizar y redimir cupones/tickets (QR autoredime).

## Procesamiento de Flows y Validaciones

### Validaciones clave (en backend y frontend)

- **Antes de Email debe haber Formulario con campo email**
- **No puede haber dos emails seguidos**
- **No puede haber dos delays seguidos, ni delay al principio**
- **Redención solo si hay cupón antes**
- **Expiration solo al final**

### Ejecución secuencial

- Los steps se ejecutan por `order_index`
- El motor soporta pasos asincrónicos (delay, email)
- Validaciones fáciles de extender

---

## Manejo de Cupones y Tickets

### Cupones

- Generación automática al crear step `popup_coupon`
- Código QR único por cupón
- Redención única garantizada (`is_redeemed`)
- Tracking de quién y cuándo redime
- Campos configurables: `fixed`, `percent`, `free_product`, fechas de validez

### Tickets

- Compra de varios tickets en una sola operación
- Generación de N tickets individuales y QRs
- Redención única por QR, control de estado (`unused`, `used`)
- Preparado para integración directa con Stripe

---

## Motor de Ejecución de Steps

El core del sistema es un **motor de ejecución secuencial de steps**, orquestado desde el backend, que:

- Lee el estado de ejecución actual (`flow_executions.current_step_index`)
- Devuelve instrucciones al frontend (`action` y `data`) según el tipo de step
- Solo avanza el step si la interacción del usuario lo permite (o lo requiere el step, como en `"email"`)
- Permite crear flows arbitrarios y controlarlos desde una única ruta `/start` y `/next`

### Tipos de Steps soportados

- `popup_form` &rarr; **action:** `show_form` (el frontend muestra un formulario)
- `email` &rarr; **action:** `show_email` (automatizado, avanza solo)
- `ticket` &rarr; **action:** `show_ticket` (muestra QR/código, espera click del usuario)
- `popup_coupon` &rarr; **action:** `show_coupon` (muestra cupón, espera click del usuario)
- `redemption` &rarr; **action:** `show_redemption` (pantalla de redención, espera click)
- `expiration` &rarr; **action:** `show_expiration` (pantalla de expiración/finalización)

## Notas sobre Mensajería, Stripe y Assets

### Mensajería/Colas

- Arquitectura lista para SQS, Pub/Sub o RabbitMQ (emails, pagos, logs)
- Servicios desacoplados, fácil migración a eventos asíncronos

### Stripe y assets

- QRs almacenados como data URL, migrable a S3/Cloud Storage con un storage service
- Arquitectura cloud-native y serverless-ready

---

## Retos de Evaluación

1. **Modelo de datos y esquema adecuado**
    - Tablas y relaciones normalizadas y flexibles, adaptables a nuevos tipos de etapa.

2. **Diseño arquitectónico y división en componentes**
    - Servicios desacoplados, arquitectura escalable, lista para serverless y cloud.

3. **Endpoints CRUD mínimos para gestionar Flows y etapas**
    - Implementados, documentados y probados.

4. **Motor de procesamiento para steps en orden, con delays, redención y eventos**
    - Ejecuta pasos secuenciales y controla reglas de negocio. Solo Motor implementado

**Adicionalmente (parcial/documentado):**

- **Mensajería asíncrona y eventos**
    - Documentado y preparado para integración.

## Solución a la Pregunta de Lógica: Cajas Mal Etiquetadas

**Mi razonamiento y respuesta:**

El problema consiste en tres cajas mal etiquetadas: una con la etiqueta "Clavos", otra "Tornillos" y otra "Mixto". Sé que ninguna caja contiene lo que indica su etiqueta, y puedo sacar una sola pieza de una sola caja para descubrir el contenido real de todas.

1. Lo primero que entiendo es que todas las etiquetas están mal, es decir, ninguna coincide con el contenido real de la caja.

2. Por eso, empiezo sacando una pieza de la caja etiquetada como **"Mixto"**. Como esa caja no puede contener ambos tipos (porque entonces la etiqueta sería correcta), al sacar una pieza, por ejemplo un tornillo, sé con certeza que **esa caja contiene únicamente tornillos**. Si saco un clavo, entonces contiene sólo clavos.

3. El siguiente paso es deducir las otras dos cajas:
    - La caja que elegí ("Mixto") no puede contener lo que dice la etiqueta. Así que, si saqué un tornillo, esa caja es la de tornillos.
    - De las dos cajas que quedan ("Clavos" y "Tornillos"), ninguna puede contener lo que dice su etiqueta ni lo que ya descubrí que hay en la caja "Mixto".
    - Si la caja "Mixto" resultó ser tornillos, entonces la caja etiquetada como "Clavos" debe contener la mezcla (porque la de clavos no puede ser ni de clavos ni de tornillos). La caja "Tornillos" por descarte será la de clavos.

4. Resumiendo la reasignación:
    - La caja que saqué ("Mixto") contiene lo que obtuve (tornillos o clavos).
    - La caja con la etiqueta "Clavos" contiene la mezcla.
    - La caja con la etiqueta "Tornillos" contiene clavos (si saqué tornillos al principio) o viceversa.

**Ejemplo concreto:**
Si saco un tornillo de la caja "Mixto":
- Caja "Mixto": tornillos
- Caja "Clavos": mixto
- Caja "Tornillos": clavos

Así, con una sola pieza, puedo deducir correctamente el contenido de cada caja.

## Cómo ejecutar el sistema (frontend + backend)

### Tecnologías y lenguajes utilizados

- **Backend:**
  - Lenguaje: TypeScript (Node.js)
  - Framework: Express
  - Base de datos: PostgreSQL
  - Librerías clave: pg, dotenv, qrcode (para generación de QR en backend)
  - Postman para debuguing

- **Frontend:**
  - Lenguaje: TypeScript
  - Framework: React
  - Librerías clave: qrcode.react (para visualización de QR), axios, react-router-dom, tailwindcss

---

### Requisitos previos

- Node.js (v18 o superior recomendado)
- npm o yarn
- PostgreSQL (local o en docker, mínimo v12+)
- (Opcional) Docker para facilitar la inicialización

---

#### Backend

- cd backend
- npm install
- # o
- yarn install

---

#### Frontend

- cd ../frontend      
- npm install
- # o
- yarn install

---
