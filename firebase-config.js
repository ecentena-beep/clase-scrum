// =====================================================================
//  CONFIGURACIÓN del sitio (ver README.md)
// =====================================================================

// Datos del proyecto de Firebase "clase-scrum-dns".
// La apiKey es pública por diseño: lo que protege los datos son las
// reglas de firestore.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCrB_e-6_Fxze57FSY50-3wYcu3TeqJW-g",
  authDomain: "clase-scrum-dns.firebaseapp.com",
  projectId: "clase-scrum-dns",
  storageBucket: "clase-scrum-dns.firebasestorage.app",
  messagingSenderId: "688928448628",
  appId: "1:688928448628:web:10714a65e999a623cdb121"
};

// Código de clase que aparece cargado por defecto en el formulario.
// Para dar la clase otra vez desde cero, usá un código nuevo
// (por ejemplo "scrum-2026-11").
export const CLASE_POR_DEFECTO = "scrum-sistemas";

// Clave para entrar como docente. Cambiala antes de publicar.
// El sitio es público, así que esta clave solo evita que alguien abra
// la clase por error; los controles del docente los protegen las reglas.
export const CLAVE_DOCENTE = "scrum-swmotn";
