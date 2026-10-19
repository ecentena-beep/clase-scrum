# Clase de Scrum · Sección Sistemas

Sitio para dar la clase de metodologías ágiles y Scrum en vivo. Funciona así:

1. Cada persona ingresa con **nombre, apellido y cuenta**.
2. Queda en una **sala de espera** donde se ve quién está conectado.
3. El docente toca **Iniciar clase** y el sitio **arma los equipos al azar** según la cantidad de personas conectadas, y asigna los roles: Product Owner, Scrum Master y Developers.
4. Cada equipo planifica un sprint en un tablero compartido, ven lo de los demás en **Puesta en común** y responden el **Cuestionario**, con los resultados del grupo en vivo.

GitHub Pages solo publica archivos; los datos compartidos (quién entró, los equipos, los tableros y las respuestas) se guardan en **Firebase**, un servicio gratuito de Google. Para una clase de este tamaño no tiene costo.

---

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | La página |
| `styles.css` | El diseño |
| `app.js` | El funcionamiento: ingreso, sala de espera, equipos, ejercicio y cuestionario |
| `equipos.js` | Cómo se arman los equipos y se asignan los roles |
| `firebase-config.js` | **Los datos que tenés que completar** |
| `firestore.rules` | Las reglas de seguridad que se pegan en Firebase |

---

## Paso 1 · Crear el proyecto en Firebase (una sola vez, unos 10 minutos)

1. Entrá a <https://console.firebase.google.com> con tu cuenta de Google y tocá **Crear un proyecto**. Ponele un nombre, por ejemplo `clase-scrum-dns`. Google Analytics no hace falta.
2. En la pantalla del proyecto, tocá el ícono **Web** (`</>`) para agregar una app. Ponele un nombre y **no** marques Firebase Hosting.
3. Firebase te muestra un bloque `const firebaseConfig = { ... }`. Copiá esos valores en `firebase-config.js`, reemplazando los que dicen `PEGAR_...`.

## Paso 2 · Activar el ingreso y la base de datos

1. **Authentication** → **Comenzar** → pestaña **Método de acceso** → **Anónimo** → **Habilitar** → Guardar.
   El sitio usa este acceso para identificar cada navegador sin pedir contraseña; el nombre, apellido y cuenta los escribe cada persona.
2. **Firestore Database** → **Crear base de datos** → elegí **modo de producción** y una ubicación cercana (por ejemplo `southamerica-east1`, San Pablo).
3. En Firestore, pestaña **Reglas**: borrá lo que hay, pegá el contenido de `firestore.rules` y tocá **Publicar**.
4. En `firebase-config.js`, cambiá `CLAVE_DOCENTE` por una clave tuya.

## Paso 3 · Publicar en GitHub Pages

1. Creá un repositorio en GitHub, por ejemplo `clase-scrum`, y subí **todos** los archivos de esta carpeta.
2. En el repositorio: **Settings** → **Pages** → en *Build and deployment* elegí **Deploy from a branch**, rama `main`, carpeta `/ (root)` → **Save**.
3. En un par de minutos queda en `https://TU-USUARIO.github.io/clase-scrum/`.
4. Volvé a Firebase → **Authentication** → **Configuración** → **Dominios autorizados** → **Agregar dominio** → `TU-USUARIO.github.io`.

> El `apiKey` de Firebase queda visible en el sitio: es normal y no es una contraseña. Lo que protege los datos son las reglas del paso 2.

---

## Cómo dar la clase

**Antes de empezar (docente)**
1. Abrí `https://TU-USUARIO.github.io/clase-scrum/?docente`.
2. Completá tus datos, el código de la clase (por ejemplo `scrum-sistemas`), desplegá **Soy el docente** y escribí la clave. Así se abre la clase.
3. Pasale al equipo el link con el código: `https://TU-USUARIO.github.io/clase-scrum/?clase=scrum-sistemas`

**Participantes**
1. Abren el link, escriben nombre, apellido y cuenta, y tocan **Ingresar**.
2. Quedan en la sala de espera; en tu pantalla los ves aparecer.

**Iniciar**
1. Elegí el máximo de personas por equipo (por defecto 5). La pantalla te anticipa cómo quedan, por ejemplo: *Con 12 personas se arman 3 equipos de 4*.
2. Tocá **Iniciar clase**. Cada persona ve su equipo, su rol y quiénes son sus compañeros.
3. Si alguien llega tarde, entra con el mismo link y se suma solo al equipo más chico (tu navegador tiene que estar abierto en la clase).

**Durante el ejercicio**, en la pestaña **Coordinación**:
- **Iniciar 1. Ordenar (2′)**, **2. Estimar (2′)**, etc.: arranca el reloj que todos ven arriba.
- **Rearmar equipos**: vuelve a sortear con las personas conectadas.
- **Borrar tableros**: deja los tableros como nuevos (el cuestionario se mantiene).
- En la pestaña **Ejercicio** podés elegir qué equipo ver y ayudarlos a editar.

**Para repetir la clase** con otro grupo, usá un código nuevo (por ejemplo `scrum-2026-11`). Cada código es una clase aparte, con su propio registro.

---

## Tené en cuenta

- La **cuenta** que escribe cada persona no se verifica contra ningún sistema: sirve para identificarla en la lista.
- Cada persona queda identificada por su navegador. Si alguien cambia de computadora o borra los datos del navegador, aparece como una persona nueva.
- El docente tiene que manejar la clase desde el **mismo navegador** con el que la abrió. Si eso no es posible, abrí una clase con un código nuevo.
- Para probarlo en tu computadora antes de publicar, abrí una terminal en esta carpeta y corré `python -m http.server 8000`. Después entrá a `http://localhost:8000`. Abrir `index.html` con doble clic no funciona.
