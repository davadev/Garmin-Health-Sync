[English](README.md) · [Deutsch](README.de.md) · [中文](README.zh.md) · [日本語](README.ja.md) · **Español** · [Français](README.fr.md)

# Garmin Health Sync

**Un compañero para tus notas diarias.** Garmin Health Sync lleva los números que importan de tu reloj Garmin a tus notas diarias de Obsidian y, si quieres, muestra cómo estás respecto a tu propia normalidad. No es una copia de Garmin Connect: el objetivo es ayudarte a tomar las decisiones adecuadas para el día.

**Dos formas de usarlo**

- **Mantenerlo simple.** Inicia sesión y activa las métricas que quieras. Se escriben en tus notas diarias como propiedades que puedes consultar con Dataview, y la evaluación la haces tú.
- **Añadir visualizaciones junto a tus notas.** Activa el **panel lateral** en los ajustes para ver tarjetas de preparación, recuperación, sueño, energía, movimiento y entrenamiento, comparadas con tu propio rango habitual. La bombilla de cada tarjeta dice lo que tus datos sugieren hoy. [Qué muestra cada tarjeta y cómo se calcula](docs/panel-cards.md).

<p>
<img src="docs/screenshots/panel-today.png" width="280" alt="Tarjetas de preparación y recuperación">
<img src="docs/screenshots/panel-insights.png" width="280" alt="Lo que sugieren tus datos, bajo la bombilla">
<img src="docs/screenshots/panel-today-dark.png" width="280" alt="Las mismas tarjetas con un tema oscuro">
</p>

> **Funciona en escritorio y en móvil** (Windows, macOS, Linux, iOS, Android). Este plugin utiliza la API interna de Garmin Connect; no existe una API oficial de terceros. Inicias sesión con tu correo y contraseña de Garmin (y el código de verificación si usas la verificación en dos pasos). Si Garmin bloquea ese intento, hay un inicio de sesión alternativo en el navegador.

## Documentación

- [Ajustes](docs/settings.md) — cada ajuste
- [Métricas](docs/metrics.md) — cada propiedad que se escribe en tus notas
- [Tarjetas del panel lateral](docs/panel-cards.md) — qué muestra cada tarjeta, con qué decisión diaria ayuda y cómo se calcula
- [Interpretaciones bajo la bombilla](docs/panel-insights.md) — cuándo aparece cada afirmación y en qué se basa
- [Notas de historial y rellenado](docs/history.md) — cómo se guarda y se construye el historial
- [Mejor marca personal](docs/personal-best.md) — cómo se calculan la marca de los mejores días y la posición entre todos tus días
- [Solución de problemas](docs/troubleshooting.md) — inicio de sesión, métricas que faltan, el panel, las notas y el rellenado
- [Registro de cambios](CHANGELOG.md) — qué cambió en cada versión

## Características

- **Sincronización automática al iniciar** — comprueba los últimos 7 días y completa los datos de salud faltantes
- **Modo de espera de nota** — opcionalmente deja que la sincronización automática espere a que otra herramienta (Templater, Calendar, una sincronización externa) cree la Daily Note, en lugar de crearla ella misma
- **Sincronización manual** — sincroniza cualquier Daily Note abierta mediante la paleta de comandos
- **Rellenado retroactivo** — sincronización masiva de un rango de fechas (p. ej., los últimos 3 meses)
- **Más de 30 métricas** — pasos, puntuación de sueño, HRV, estrés, Body Battery, SpO2, peso y más
- **Seguimiento de actividades** — cada entrenamiento aparece como un resumen legible
- **Ubicación del entrenamiento** — nombre del lugar obtenido por geocodificación inversa de tu primera actividad con GPS
- **Detección inteligente** — detecta automáticamente la ruta y el formato de tus Daily Notes desde Periodic Notes o el plugin nativo de Daily Notes
- **Soporte de subdirectorios** — encuentra Daily Notes existentes en carpetas anidadas (p. ej., `Journal/2024-07/`) y crea subcarpetas por fecha cuando el formato del nombre de archivo contiene `/` (p. ej., `YYYY/YYYY-MM-DD` → `Journal/2026/2026-08-04.md`)
- **Detección automática del idioma** — el idioma de la interfaz se configura según el idioma de tu Obsidian (EN, DE, ZH, JA, ES, FR)
- **Datos estructurados opcionales** — campo `trainings` legible por máquina para consultas avanzadas con Dataview
- **Prefijo de propiedades** — añade opcionalmente el prefijo `ohs_` a todas las propiedades de frontmatter para evitar conflictos de nombres con otros plugins
- **Registro de estilo de vida (hábitos)** — sincroniza opcionalmente los hábitos que registras en Garmin Connect (sí/no o una cantidad, como tazas de café) como propiedades `lifestyle_<nombre>`; la tarjeta Hábitos del panel lateral muestra cada hábito y, con datos suficientes, cómo son tu VFC y tu frecuencia cardíaca en reposo la noche siguiente
- **Panel lateral de salud** — barra lateral derecha opcional con tarjetas de recuperación, sueño, energía, movimiento, forma física y entrenamiento frente a tu propio rango habitual; toca la bombilla de una tarjeta para ver qué sugieren tus datos y cómo se calcula; actívalo en **Ajustes → Garmin Health Sync → Panel lateral**; las tarjetas de VFC y frecuencia en reposo muestran los últimos 14 días con su promedio de 7 días frente a tu semana típica, y la preparación juzga la VFC con esa semana y explica la mañana después de un entrenamiento duro
- **Notas de historial** — guarda opcionalmente cada día descargado en pequeñas notas mensuales en markdown, para que el panel también funcione en días sin nota diaria y los datos se sincronicen con tu vault
- **Propiedades de las notas diarias** — pliega el bloque de propiedades al abrir una nota u oculta las propiedades de Garmin que el panel ya muestra

## Salida de Frontmatter

### Métricas

```yaml
---
steps: 15185
resting_hr: 69
sleep_score: 81
sleep_duration: 7h 43min
hrv: 39
stress: 30
vo2_max: 48
workout_location: Bad Honnef, Deutschland
---
```

**Body Battery:** `body_battery` es el valor *charged* de Garmin, la suma de todas las ganancias de Body Battery del día (sobre todo la recarga nocturna), no el nivel actual. Activa `body_battery_min` y `body_battery_max` para el nivel más bajo y más alto del día, que es lo que muestra la app de Garmin en su historial.

### Actividades

Cada entrenamiento se escribe como una clave de frontmatter con una cadena de resumen:

```yaml
---
hiking: 8.2 km · 157min · Ø105 bpm · 696 kcal
e_bike: 22.1 km · 65min · Ø112 bpm · 420 kcal
---
```

Solo los días con entrenamientos reales reciben claves de actividad — el plugin nunca sobrescribe contenido existente en tus notas.

### Entrenamientos (opcional, legible por máquina)

Activa "Entrenamientos legibles por máquina" en la configuración para añadir un campo `trainings` estructurado para consultas con Dataview:

```yaml
---
trainings:
  - type: hiking
    category: outdoor
    distance_km: 8.2
    duration_min: 157
    avg_hr: 105
    calories: 696
  - type: e_bike
    category: cycling
    distance_km: 22.1
    duration_min: 65
    avg_hr: 112
    calories: 420
---
```

## Requisitos

- **Obsidian** en Windows, macOS, Linux, iOS o Android
- **Cuenta de Garmin** con acceso a Garmin Connect
- Plugin **Daily Notes** o **Periodic Notes** activado (o configurar la ruta manualmente en los ajustes)

## Instalación

### Desde Community Plugins (recomendado)

1. Abre Configuración de Obsidian → Community Plugins → Explorar
2. Busca "Garmin Health Sync"
3. Instala y activa el plugin
4. Inicia sesión en Garmin Connect en la configuración del plugin

### Manual

1. Descarga `main.js` y `manifest.json` de la [última versión](https://github.com/davadev/Garmin-Health-Sync/releases)
2. Crea la carpeta `.obsidian/plugins/garmin-health-sync/` en tu vault
3. Copia ambos archivos en esa carpeta
4. Activa el plugin en Configuración → Community Plugins

## Uso

### Iniciar sesión

Abre los ajustes del plugin y elige **Garmin Connect**; después introduce tu correo y contraseña de Garmin (y el código de verificación si usas la verificación en dos pasos). El inicio de sesión funciona igual en escritorio y en móvil.

Garmin puede limitar los intentos repetidos desde un dispositivo; el plugin muestra entonces una cuenta atrás hasta el siguiente intento. Si el inicio de sesión está bloqueado, usa en su lugar **Usar inicio de sesión en el navegador**: inicias sesión en la página de Garmin en tu navegador, copias el texto de la página que contiene `ST-…` y pulsas el botón del portapapeles en el plugin (o lo pegas en el campo). Una vez iniciada la sesión, el plugin renueva la conexión por sí mismo, así que rara vez tendrás que volver a iniciar sesión.

### Dónde se guardan las notas

La **ruta de notas diarias** es la carpeta y el **formato de nota diaria** es el nombre de archivo en sintaxis [moment.js](https://momentjs.com/docs/#/displaying/format/), la misma convención que el plugin Daily Notes integrado. El formato puede contener `/` para anidar las notas en subcarpetas por fecha, y los corchetes mantienen el texto literal:

| Ruta | Formato | Resultado |
| --- | --- | --- |
| `Journal` | `YYYY-MM-DD` | `Journal/2026-08-04.md` |
| `Journal` | `YYYY/YYYY-MM-DD` | `Journal/2026/2026-08-04.md` |
| `Journal` | `YYYY/YYYY-MM/YYYY-MM-DD` | `Journal/2026/2026-08/2026-08-04.md` |
| `Journal` | `YYYY-MM-DD [Workout]` | `Journal/2026-08-04 Workout.md` |

Las subcarpetas que falten se crean automáticamente.

### Sincronización automática

Al iniciar Obsidian, el plugin comprueba los últimos 7 días y completa automáticamente los datos de salud faltantes. No requiere acción manual. Por defecto crea una nota diaria cuando falta.

Si otra herramienta gestiona tus notas diarias (Templater, el plugin Calendar, una sincronización externa), pon **Días sin nota diaria** en los ajustes en **Omitir el día**. La sincronización automática espera entonces hasta que exista una nota diaria real (no vacía) y sincroniza en cuanto aparece; los marcadores vacíos de 0 bytes se ignoran. Con **Guardar en archivos de historial** el plugin no crea nota para un día sin ella y guarda el día en las notas de historial (ver abajo). Una sincronización manual siempre escribe en la nota que tienes abierta.

### Sincronización manual

Abre una Daily Note y ejecuta **Garmin Health Sync: Sync current note** desde la paleta de comandos (Cmd/Ctrl+P).

### Rellenado retroactivo de datos históricos

¿Tienes años de datos de Garmin? **Rellenar datos de salud** obtiene cualquier rango de días:

1. Abre la paleta de comandos (Cmd/Ctrl+P) y busca **"Rellenar datos de salud"**
2. Elige fecha de inicio y de fin, o activa **Hasta que empiecen mis datos** para retroceder hasta cinco años y parar cuando empiecen tus datos
3. Decide qué pasa con los días sin nota diaria (**Días sin nota diaria**): crear la nota, guardar el día en archivos de historial u omitirlo
4. Activa **Volver a obtener los días completos** para sobrescribir los días que ya existen

Los días se obtienen del más reciente al más antiguo, con la limitación de ritmo que Garmin necesita. Un aviso arriba muestra el día, cuántos días van y el tiempo restante, con un botón **Parar**, y en el escritorio la barra de estado muestra el porcentaje. Si cierras el aviso con un clic, el comando **Mostrar el progreso del backfill en curso** (solo aparece mientras corre uno) o un clic en la barra de estado lo recupera. Solo corre un relleno a la vez. Un relleno detenido o interrumpido continúa tras reiniciar, donde se quedó. Los fallos de Garmin se reintentan, y un día que un relleno anterior obtuvo con todas tus métricas activadas se omite, salvo los últimos 3 días, que aún pueden cambiar.

### Panel lateral de salud

Ábrelo desde el icono de la cinta o con el comando **Abrir el panel de salud**; al pedirlo se activa, no hay que activar nada antes (**Panel lateral** en los ajustes lo desactiva de nuevo). Las tarjetas comparan hoy con tu propio rango habitual (los últimos 30 días) y nunca modifican tus notas. Toca la fecha para elegir un día, usa las flechas para moverte un día y el botón del lápiz para ordenar las tarjetas arrastrándolas. Cada tarjeta tiene un interruptor en los ajustes que además indica qué métricas activar para ella. Toca la bombilla de una tarjeta para ver **Qué sugieren tus datos** (motivos y qué ayuda, a partir de tus propios datos) y **Cómo leerlo**. El panel no es consejo médico. Si añades tu año de nacimiento (solo el año) en los ajustes, obtienes zonas de frecuencia cardíaca y objetivos según la edad. Consulta [qué muestra cada tarjeta y cómo se calcula](docs/panel-cards.md).

<p>
<img src="docs/screenshots/panel-hydration.png" width="280" alt="Tarjeta de hidratación con sus explicaciones">
<img src="docs/screenshots/panel-sleep.png" width="280" alt="Sueño y fases del sueño">
<img src="docs/screenshots/panel-energy.png" width="280" alt="Body Battery, estrés e hidratación">
<img src="docs/screenshots/panel-training.png" width="280" alt="Pasos, equilibrio de carga, carga semanal y sesiones">
</p>

### Notas de historial

Con **Días sin nota diaria** en **Guardar en archivos de historial**, cada día obtenido también se guarda en pequeñas notas mensuales (`Garmin history/Garmin history 2026-10.md`, una línea por día) en tu carpeta de notas diarias. Son markdown simple, así que se sincronizan con tu vault, y el panel las lee para los días sin nota. El comando **Importar historial desde las notas diarias** copia en ellas los valores de Garmin de tus notas existentes. El relleno puede completarlas hasta el inicio de tus datos de una vez (**Hasta que empiecen mis datos**). Si cambias tu carpeta de notas diarias, las notas de historial se mueven con ella.

### Propiedades de las notas diarias

El ajuste **Propiedades de las notas diarias** puede plegar el bloque de propiedades de una nota diaria al abrirla, ocultar las propiedades que escribió el plugin (el panel las muestra) o ambas cosas. No se borra nada de una nota. Plegar y ocultar siguen las ideas de los plugins de la comunidad [Fold Properties By Default](https://obsidian.md/plugins?id=fold-properties-by-default) y [Extended Properties](https://obsidian.md/plugins?id=extended-properties); véase Créditos.

## Normalización de claves de actividad

Los valores `typeKey` de Garmin se normalizan a claves canónicas más concisas:

| Clave del proveedor | Clave canónica | Categoría |
|---|---|---|
| `e_bike_fitness` | `e_bike` | cycling |
| `e_bike_mountain` | `e_mtb` | cycling |
| `resort_skiing_snowboarding` | `skiing` | winter |
| `backcountry_skiing_snowboarding` | `backcountry_skiing` | winter |
| `stand_up_paddleboarding` | `sup` | water |
| `fitness_equipment` | `gym_equipment` | gym |

Todas las demás claves de Garmin se mantienen sin cambios (p. ej., `hiking`, `running`, `cycling`, `swimming`, `strength_training`, `yoga`, ...).

### Categorías de actividad

A cada actividad se le asigna una categoría:

| Categoría | Ejemplos |
|---|---|
| `cycling` | cycling, e_bike, e_mtb, mountain_biking, indoor_cycling, road_biking, virtual_ride |
| `running` | running, trail_running, treadmill_running, indoor_running, ultra_run |
| `walking` | walking, indoor_walking |
| `outdoor` | hiking, mountaineering, rock_climbing, bouldering |
| `swimming` | swimming, lap_swimming, pool_swimming, open_water_swimming |
| `winter` | skiing, backcountry_skiing, cross_country_skiing, snowboarding |
| `water` | sup, rowing, kayaking, paddling, surfing, sailing |
| `gym` | strength_training, gym_equipment, elliptical, yoga, pilates, hiit, indoor_cardio |
| `racket` | tennis, badminton, squash, table_tennis, pickleball |
| `team` | soccer, basketball, volleyball, rugby |
| `recovery` | breathwork, meditation, stretching, mobility (no cuentan para la carga) |
| `other` | golf, multi_sport, triathlon |

Los deportes más nuevos llevan un sufijo de Garmin (`kayaking_v2`, `skate_skiing_ws`); se omite para el nombre y la categoría, así que cuentan como el deporte sin sufijo. Las sesiones muestran el nombre del deporte en el idioma del plugin; un deporte que no figura aquí se muestra como texto legible y cuenta como `other`. La tarjeta de carga semanal registra la distancia de correr, ciclismo, caminar, deportes al aire libre y natación.

## Datos y privacidad

Este plugin realiza solicitudes de red a dos servicios externos:

- **Garmin Connect** — introduces tu correo y contraseña (y un código de verificación si es necesario) en el plugin. Se envían únicamente a los servidores de inicio de sesión de Garmin (`sso.garmin.com`, o `sso.garmin.cn` para China) y el plugin nunca los guarda ni los registra. Tras iniciar sesión, el plugin guarda los tokens de Garmin en el almacén de secretos de Obsidian, que permanece en el dispositivo, por lo que no se sincronizan con otros dispositivos ni se incluyen en copias de seguridad del vault ni en Git. Solo si el almacén de secretos no está disponible o rechaza la escritura, el plugin los guarda en `data.json`. Trata estos tokens como un inicio de sesión: Garmin controla su duración. Cada dispositivo inicia sesión por separado. Si Garmin bloquea o limita el inicio de sesión, se ofrece un inicio de sesión en el navegador (inicias sesión en la página de Garmin en tu navegador y pegas el ticket de un solo uso). Las claves OAuth públicas necesarias para iniciar sesión se obtienen de `thegarth.s3.amazonaws.com` (con claves de respaldo incluidas si ese host no está disponible). **Cerrar sesión** borra los tokens guardados en este dispositivo.
- **Nominatim (OpenStreetMap)** — si la función **Ubicación del entrenamiento** está activada, las coordenadas GPS de tu primera actividad se envían a `nominatim.openstreetmap.org` para geocodificación inversa. Puedes desactivarlo en los ajustes, en **Ubicación del entrenamiento**.

No se envían datos a ningún otro servidor.

**Notas de historial:** las notas de historial opcionales contienen tus valores de salud y viven en tu vault como tus notas diarias. El plugin no hace solicitudes de red adicionales para ellas.

**Acceso a la bóveda:** el plugin enumera los archivos de tu bóveda (`vault.getMarkdownFiles`) para encontrar tus notas diarias y sus propias notas de historial por su ruta y su nombre basado en la fecha, y para indicar al panel lateral qué días tienen datos. Solo lee las propiedades y el contenido de las notas que reconoce como notas diarias o de historial, y solo escribe en ellas, en la copia de seguridad de una nota dañada y en su carpeta de historial. Los nombres de archivo y el contenido de las notas nunca salen de tu dispositivo.

**Portapapeles:** El plugin solo usa el portapapeles cuando pulsas un botón, nunca en segundo plano. **Usar inicio de sesión en el navegador** lo lee una vez, cuando pulsas **Iniciar sesión desde el portapapeles**, para recoger el ticket de inicio de sesión de un solo uso que copiaste del navegador. Escribe en él cuando pulsas para copiar el enlace de inicio de sesión o **Copiar diagnóstico** (en los ajustes y en la ventana de inicio de sesión). El diagnóstico no contiene contraseña, tokens, datos de la cuenta ni valores de salud, solo detalles técnicos del último inicio de sesión o sincronización: nombres de tipos de datos, códigos de estado HTTP, tamaños de respuesta, tiempos y la estructura de las respuestas de Garmin (nombres y tipos de campos, nunca valores).

## Desarrollo

```bash
npm install
npm run dev    # modo vigilancia
npm run build  # compilación para producción
```

## Créditos

Creado originalmente por [fcandi](https://github.com/fcandi). Mantenido y desarrollado por [davadev](https://github.com/davadev).

El tratamiento de las propiedades en las notas diarias (plegar el bloque de propiedades, ocultar las propiedades que muestra el panel lateral) se inspiró en los plugins de la comunidad [Fold Properties By Default](https://obsidian.md/plugins?id=fold-properties-by-default) de Tommy Bergeron y [Extended Properties](https://obsidian.md/plugins?id=extended-properties) de electroluminescent (ambos con licencia MIT). No se copió código; véase [NOTICE.md](NOTICE.md).
