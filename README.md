# Consultoritas

**Consultoritas** es un portal SaaS diseñado para la digitalización integral de pequeñas asesorías y despachos en España. Su objetivo principal es eliminar la fricción entre el cliente y el asesor, ofreciendo una plataforma centralizada que automatiza el procesamiento de datos, la gestión fiscal y mejora la experiencia de usuario mediante interfaces intuitivas e inteligencia artificial.

## Contexto y Visión del Proyecto

El sistema ha sido modelado para adaptarse a la normativa y segmentación fiscal española (AEAT), proporcionando lo que se denomina un **Despacho Colaborativo**. Este modelo ofrece:

- **Asesores (Acceso Global):** Los asesores pueden gestionar la información de todos los clientes, empresas y documentos de forma compartida (sin silos), facilitando el trabajo en equipo del despacho.
- **Asesores (Agenda Privada):** Cada asesor dispone de una agenda privada para sus citas, asegurando privacidad en su gestión de tiempo.
- **Clientes (Aislamiento Total):** Acceso restringido para que el cliente únicamente interactúe con los datos y documentos de su propia empresa.

## Arquitectura y Stack Tecnológico

El proyecto está separado en múltiples servicios, orquestados mediante contenedores, que garantizan un desarrollo y despliegue ágil, escalable y robusto.

- **Frontend (`/frontend`)**: Desarrollado con [Next.js](https://nextjs.org/) y React. Utiliza [Tailwind CSS v4](https://tailwindcss.com/) y componentes de [Radix UI](https://www.radix-ui.com/) para una interfaz rápida y accesible. Para el manejo del estado y la reactividad se emplea `SWR`, además de contar con exportaciones de reportes usando `exceljs`.
- **Backend (`/backend`)**: API REST construida con [Django](https://www.djangoproject.com/) y [Django REST Framework](https://www.django-rest-framework.org/).
  - **Base de Datos**: PostgreSQL (con extensión `pgvector`).
  - **Tareas Asíncronas**: [Celery](https://docs.celeryq.dev/) y [Redis](https://redis.io/) gestionan las colas de trabajo pesado y tareas recurrentes (Celery Beat).
  - **IA y OCR**: Módulo integrado para conexión con Google GenAI, Groq y OpenAI para extraer e interpretar datos de documentos.
- **Infraestructura (`/nginx`, `docker-compose.yml`)**: [Docker Compose](https://docs.docker.com/compose/) levanta todos los componentes y un proxy inverso con [Nginx](https://nginx.org/) se encarga del enrutamiento de tráfico hacia el Frontend y Backend.

## Funcionalidades Principales

1. **Lógica Fiscal y Segmentación (Cerebro)**
   - Distingue roles tributarios: **Autónomo** (Persona Física) y **Sociedad** (Persona Jurídica).
   - Generación y activación automática de obligaciones (Modelos 130, 303, 200, 202, 111, 115) según características del negocio (ej. `has_employees`, `has_office_rent`).

2. **Procesamiento de Documentos (OCR e IA)**
   - Motor inteligente capaz de leer facturas y estructurar la información siguiendo el **Estándar de Datos AEAT** (Identificación, NIF Destinatario, Impuestos, Cuotas, etc.).
   - Validación de datos en tiempo real en la interfaz para asistir al asesor.

3. **Calendario Fiscal Automatizado**
   - El modelo `TaxCalendar` sirve de "checklist". A medida que los documentos se categorizan y validan, el calendario se actualiza para marcar obligaciones tributarias presentadas o pendientes.

## Cómo levantar el proyecto con Docker

La manera más sencilla de ejecutar Consultoritas en un entorno local de desarrollo o producción es a través de Docker.

### Prerrequisitos
- [Docker](https://docs.docker.com/get-docker/) instalado.
- [Docker Compose](https://docs.docker.com/compose/install/) instalado.

### Pasos de Instalación

1. **Clonar el repositorio** e ingresar al directorio principal del proyecto:
   ```bash
   git clone <URL_DEL_REPOSITORIO> consultoritas
   cd consultoritas
   ```

2. **Configurar Variables de Entorno**:
   Copiar el archivo de ejemplo para configurar las variables locales.
   ```bash
   cp .env.example .env
   # Edita el archivo .env según tus necesidades (claves API de IA, configuración de base de datos, etc.)
   ```

3. **Construir y Levantar los Servicios**:
   Ejecuta el siguiente comando para construir las imágenes y levantar los contenedores en segundo plano:
   ```bash
   docker-compose up -d --build
   ```

   Este comando iniciará:
   - `consultoritas_redis`: Servidor de caché y broker de mensajería.
   - `consultoritas_backend`: API principal de Django.
   - `consultoritas_worker`: Worker de Celery para tareas en segundo plano.
   - `consultoritas_beat`: Programador de tareas de Celery.
   - `consultoritas_frontend`: Aplicación Next.js.
   - `consultoritas_nginx`: Proxy inverso que expone el servicio.

4. **Aplicar Migraciones Base de Datos**:
   (Opcional, aunque el `docker-compose.yml` está configurado para ejecutar un `migrate` al iniciar el backend)
   Si necesitas ejecutarlas manualmente:
   ```bash
   docker exec -it consultoritas_backend python manage.py migrate
   ```

5. **Acceso a los Servicios**:
   - **Plataforma Web (Nginx Proxy)**: [http://localhost](http://localhost) (Puerto 80 por defecto).
   - **Frontend Desarrollo**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)

### Detener los servicios
Para detener todos los contenedores sin borrar sus volúmenes (bases de datos, media, etc.):
```bash
docker-compose stop
```
Para detener y eliminar los contenedores:
```bash
docker-compose down
```
