# Task Manager Front (edición: papá ingeniero sarcástico)

Bienvenido al frontend que nació porque en esta casa sí había caos operativo:

- “¿Quién tenía que lavar?”
- “Yo pensé que era recurrente martes y jueves.”
- “¿Por qué todos tienen 0 puntos si nadie hizo nada?”

Entonces sí, era necesario. Mucho.

Este proyecto consume una API de tareas domésticas y convierte la negociación familiar en pantallas, roles, puntos, colores bonitos y decisiones trazables. Como debe ser.

## ¿Qué hace esta cosa?

- Manejo de casa, usuarios y roles (Propietario, Admin, Miembro).
- Dashboard por horario y por usuario.
- Crear, editar, clonar y eliminar tareas.
- Completar tareas con puntos y fuegos artificiales, porque la motivación también es arquitectura.
- Gestión de perfil con edición de foto (incluyendo recorte).

## Stack

- Angular standalone components
- Signals para estado
- API HTTP (backend esperado en dominio local)
- UX con modales, validaciones y un poquito de dramatismo visual

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

1. Instalar dependencias:

	npm install

2. Levantar el proyecto:

	npm start

3. Abrir en navegador:

	http://localhost:4200

## Scripts útiles

- Desarrollo: npm start
- Tests: npm test
- Build: npm run build

## Config de API

Actualmente el frontend apunta a:

- http://api.taskmanager.home

Si tu backend vive en otro host, ajusta la base URL en el servicio API del proyecto.

## Filosofía de producto (versión hogar)

- Si no está en el dashboard, no existe.
- Si no tiene responsable, nadie la hace.
- Si no da puntos, nadie se emociona.
- Si no hay rol, hay anarquía.

## Estado del proyecto

Frontend funcional para operación diaria doméstica con énfasis en:

- Claridad de sesión activa
- Control de permisos
- Feedback visual inmediato

Traducción ejecutiva: ya no discutimos “quién dijo qué”, ahora discutimos contra la evidencia.

## Nota final de papá ingeniero

Sí, pude haber hecho una lista en el refri.
No, no iba a escalar.

Gracias por venir a mi TED Talk doméstica.
