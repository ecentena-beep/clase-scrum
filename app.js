import { firebaseConfig, CLASE_POR_DEFECTO, CLAVE_DOCENTE } from "./firebase-config.js";
import { armarEquipos, sumarTarde, equipoDe, ordenarIds, resumenEquipos } from "./equipos.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";

/* =========================== Contenido =========================== */
const STORIES = [
  { id: "A", t: "Ver los horarios libres de cada cancha", h: "Como socio, quiero ver los horarios libres de cada cancha para elegir cuándo jugar." },
  { id: "B", t: "Reservar una cancha en un horario libre", h: "Como socio, quiero reservar una cancha en un horario libre para asegurarme el lugar." },
  { id: "C", t: "Ingresar con el número de socio", h: "Como socio, quiero ingresar con mi número de socio para que la app sepa quién reserva." },
  { id: "D", t: "Recibir la confirmación por correo", h: "Como socio, quiero recibir la confirmación por correo para tener constancia de la reserva." },
  { id: "E", t: "Cancelar una reserva", h: "Como socio, quiero cancelar una reserva para liberar la cancha si no puedo ir." },
  { id: "F", t: "Pagar la reserva en línea", h: "Como socio, quiero pagar la reserva en línea para no tener que pagar en el club." },
  { id: "G", t: "Ver el historial de mis reservas", h: "Como socio, quiero ver el historial de mis reservas para saber cuándo jugué." },
  { id: "H", t: "Panel de ocupación de canchas", h: "Como administrador, quiero un panel de ocupación de canchas para planificar el mantenimiento." }
];
const STORY = Object.fromEntries(STORIES.map(s => [s.id, s]));
const IDS = STORIES.map(s => s.id);
const PTS = { S: 1, M: 3, L: 5 }, CAP = 10;
const ROLES = { po: "Product Owner", sm: "Scrum Master", dev: "Developer" };
const STEPS = [
  { n: "Ordenar", min: 2, who: "El Product Owner ordena por valor" },
  { n: "Estimar", min: 2, who: "Los Developers ponen talles" },
  { n: "Comprometerse", min: 3, who: "Llenan 10 puntos y escriben el objetivo" },
  { n: "Compartir", min: 1, who: "Cada equipo lee su objetivo" }
];
const QUIZ = [
  { q: "¿Cuál es la principal diferencia entre un proyecto en cascada y uno ágil?", o: ["En ágil no se planifica", "En ágil se entrega algo usable en cada ciclo corto", "En cascada no hay documentación"], c: 1, w: "Ágil también planifica y documenta, pero en ciclos cortos que dejan algo usable." },
  { q: "¿Quién ordena el Product Backlog?", o: ["El Scrum Master", "Los Developers, por votación", "El Product Owner"], c: 2, w: "El Product Owner es responsable del orden del backlog." },
  { q: "¿Cuánto dura como máximo la Daily Scrum?", o: ["15 minutos", "30 minutos", "1 hora"], c: 0, w: "La Daily dura 15 minutos o menos." },
  { q: "Si al final del sprint no se terminó todo lo planificado, ¿qué se hace?", o: ["Se alarga el sprint hasta terminar", "Lo pendiente vuelve al Product Backlog", "Se muestra igual en la Review"], c: 1, w: "El sprint tiene duración fija; lo pendiente se replanifica." },
  { q: "¿Qué compromiso acompaña al Incremento?", o: ["El Objetivo del Sprint", "El Objetivo del Producto", "La Definición de Terminado"], c: 2, w: "Lo que no cumple la Definición de Terminado no es parte del incremento." },
  { q: "¿Para qué sirve la Retrospectiva?", o: ["Para mostrar el producto a los interesados", "Para mejorar la forma de trabajar del equipo", "Para estimar el próximo sprint"], c: 1, w: "La Review mira el producto; la Retrospectiva, la forma de trabajar." },
  { q: "¿Cuáles son los tres pilares del empirismo?", o: ["Transparencia, inspección y adaptación", "Compromiso, foco y respeto", "Planificar, ejecutar y controlar"], c: 0, w: "Compromiso, foco y respeto son valores de Scrum, no pilares." },
  { q: "¿Qué afirmación sobre el Scrum Master es correcta?", o: ["Asigna las tareas a cada Developer", "Ayuda al equipo a ser efectivo y a quitar trabas", "Es quien decide qué se construye"], c: 1, w: "El Scrum Master sirve al equipo; no asigna tareas ni decide el producto." }
];

/* =========================== Estado =========================== */
const S = {
  fb: null, uid: null, perfil: null, clase: null, docente: false,
  sala: null, part: {}, grupos: {}, quiz: {},
  tab: "ejercicio", verEq: null, draft: {}, quizSent: false, unsubs: [], armando: false
};
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let toastT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3500); }
function errMsg(e) {
  const c = e && e.code;
  if (c === "permission-denied") return "No tenés permiso para hacer eso.";
  if (c === "unavailable") return "Sin conexión. Revisá internet y probá de nuevo.";
  if (c === "auth/operation-not-allowed" || c === "auth/admin-restricted-operation") return "Falta activar el acceso anónimo en Firebase (README, paso 2).";
  return "No se pudo completar. Probá de nuevo.";
}
function show(id) { document.querySelectorAll(".screen").forEach(s => (s.hidden = s.id !== id)); }
function iniciales(n, a) { return (((n || "?")[0] || "") + ((a || "")[0] || "")).toUpperCase(); }
function nombreDe(uid) {
  const p = S.part[uid];
  if (p) return `${p.nombre} ${p.apellido}`;
  if (S.sala && uid === S.sala.docenteUid) return `${S.sala.docenteNombre || "Docente"} (docente)`;
  return "Participante";
}
const guardarSesion = s => { try { s ? localStorage.setItem("claseScrum", JSON.stringify(s)) : localStorage.removeItem("claseScrum"); } catch (e) {} };
const leerSesion = () => { try { return JSON.parse(localStorage.getItem("claseScrum") || "null"); } catch (e) { return null; } };

/* =========================== Firebase =========================== */
async function cargarFirebase() {
  if (S.fb) return S.fb;
  const [app, auth, fs] = await Promise.all([
    import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")
  ]);
  const a = app.initializeApp(firebaseConfig);
  S.fb = { auth: auth.getAuth(a), authM: auth, db: fs.getFirestore(a), f: fs };
  return S.fb;
}
async function entrarAnonimo() {
  const { auth, authM } = await cargarFirebase();
  if (auth.currentUser) return auth.currentUser.uid;
  await new Promise(r => { const u = authM.onAuthStateChanged(auth, () => { u(); r(); }); });
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await authM.signInAnonymously(auth);
  return cred.user.uid;
}
const ref = (...p) => S.fb.f.doc(S.fb.db, "salas", S.clase, ...p);
const col = name => S.fb.f.collection(S.fb.db, "salas", S.clase, name);

/* =========================== Ingreso =========================== */
function prepararLogin(err) {
  const ses = leerSesion();
  const params = new URLSearchParams(location.search);
  $("#fClase").value = (params.get("clase") || ses?.clase || CLASE_POR_DEFECTO).toLowerCase();
  if (ses) { $("#fNombre").value = ses.nombre || ""; $("#fApellido").value = ses.apellido || ""; $("#fCuenta").value = ses.cuenta || ""; }
  if (params.has("docente")) $("#docBox").open = true;
  $("#loginErr").textContent = err || "";
  $("#who").hidden = $("#salir").hidden = $("#clock").hidden = true;
  show("s-login");
}

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const nombre = $("#fNombre").value.trim(), apellido = $("#fApellido").value.trim();
  const cuenta = $("#fCuenta").value.trim().toLowerCase();
  const clase = $("#fClase").value.trim().toLowerCase();
  const docente = $("#docBox").open && $("#fClave").value !== "";
  const errEl = $("#loginErr");
  if (!nombre || !apellido || !cuenta) { errEl.textContent = "Completá nombre, apellido y cuenta."; return; }
  if (!/^[a-z0-9-]{3,40}$/.test(clase)) { errEl.textContent = "El código de la clase usa letras minúsculas, números y guiones."; return; }
  if (docente && $("#fClave").value !== CLAVE_DOCENTE) { errEl.textContent = "La clave de docente no es correcta."; return; }
  $("#loginBtn").disabled = true; errEl.textContent = "";
  try { await ingresar({ nombre, apellido, cuenta, clase, docente }); }
  catch (er) { errEl.textContent = er.mensaje || errMsg(er); }
  finally { $("#loginBtn").disabled = false; }
});

async function ingresar(ses) {
  await cargarFirebase();
  S.uid = await entrarAnonimo();
  S.clase = ses.clase; S.perfil = ses; S.docente = !!ses.docente;
  const { f } = S.fb;
  const snap = await f.getDoc(ref());
  if (S.docente) {
    if (!snap.exists()) {
      await f.setDoc(ref(), {
        docenteUid: S.uid, docenteNombre: `${ses.nombre} ${ses.apellido}`, estado: "espera",
        equipos: {}, paso: 0, fin: 0, maxEquipo: 5, creada: f.serverTimestamp()
      });
    } else if (snap.data().docenteUid !== S.uid) {
      throw { mensaje: "Esta clase ya fue abierta desde otro navegador. Usá un código de clase nuevo o entrá desde ese navegador." };
    }
  } else {
    if (!snap.exists()) throw { mensaje: `La clase "${ses.clase}" todavía no fue abierta. Esperá a que el docente ingrese y probá de nuevo.` };
    await f.setDoc(ref("participantes", S.uid), {
      nombre: ses.nombre, apellido: ses.apellido, cuenta: ses.cuenta, ingreso: f.serverTimestamp()
    }, { merge: true });
  }
  guardarSesion(ses);
  history.replaceState(null, "", location.pathname + "?clase=" + encodeURIComponent(ses.clase));
  $("#whoIni").textContent = iniciales(ses.nombre, ses.apellido);
  $("#whoTxt").textContent = `${ses.nombre} ${ses.apellido}${S.docente ? " · docente" : ""}`;
  $("#who").hidden = $("#salir").hidden = false;
  $("#t-coord").hidden = !S.docente;
  $("#verEquipo").hidden = !S.docente;
  escuchar();
}

$("#salir").addEventListener("click", async () => {
  S.unsubs.forEach(u => u()); S.unsubs = [];
  if (!S.docente && S.sala && S.sala.estado === "espera") {
    try { await S.fb.f.deleteDoc(ref("participantes", S.uid)); } catch (e) {}
  }
  const ses = leerSesion(); if (ses) guardarSesion({ ...ses, salio: true });
  S.sala = null; S.part = {}; S.grupos = {}; S.quiz = {}; S.quizSent = false; S.draft = {};
  prepararLogin();
});

/* =========================== Tiempo real =========================== */
function escuchar() {
  const { f } = S.fb;
  S.unsubs.forEach(u => u()); S.unsubs = [];
  const fallo = e => toast(errMsg(e));
  S.unsubs.push(f.onSnapshot(ref(), s => {
    if (!s.exists()) { S.unsubs.forEach(u => u()); S.unsubs = []; prepararLogin("La clase fue cerrada."); return; }
    S.sala = s.data(); render(); sumarLosQueLlegaronTarde();
  }, fallo));
  S.unsubs.push(f.onSnapshot(col("participantes"), q => {
    S.part = {}; q.forEach(d => (S.part[d.id] = d.data())); render(); sumarLosQueLlegaronTarde();
  }, fallo));
  S.unsubs.push(f.onSnapshot(col("grupos"), q => {
    S.grupos = {}; q.forEach(d => (S.grupos[d.id] = d.data())); if (S.sala?.estado === "iniciada") { renderEjercicio(); renderComun(); renderCoord(); }
  }, fallo));
  S.unsubs.push(f.onSnapshot(col("quiz"), q => {
    S.quiz = {}; q.forEach(d => (S.quiz[d.id] = d.data()));
    if (S.quiz[S.uid]?.enviado && !S.quizSent) { S.quizSent = true; renderQuizForm(); }
    renderQuizRes();
  }, fallo));
}

// El navegador del docente suma a un equipo a quien entra con la clase ya iniciada.
async function sumarLosQueLlegaronTarde() {
  if (!S.docente || S.armando || S.sala?.estado !== "iniciada") return;
  const asignados = new Set(Object.values(S.sala.equipos || {}).flatMap(e => e.miembros || []));
  const faltan = Object.keys(S.part).filter(u => !asignados.has(u));
  if (!faltan.length) return;
  let eq = S.sala.equipos || {};
  faltan.forEach(u => (eq = sumarTarde(eq, u)));
  S.armando = true;
  try { await S.fb.f.updateDoc(ref(), { equipos: eq }); } catch (e) { toast(errMsg(e)); }
  finally { S.armando = false; }
}

/* =========================== Render general =========================== */
function render() {
  if (!S.sala) return;
  renderClock();
  if (S.sala.estado !== "iniciada") { renderEspera(); show("s-espera"); return; }
  show("s-clase");
  renderMiEquipo(); renderEjercicio(); renderComun(); renderQuizRes(); renderCoord();
  if (!$("#quizForm").childElementCount) renderQuizForm();
}

function renderClock() {
  const c = $("#clock"); const p = S.sala?.paso | 0;
  if (!S.sala || S.sala.estado !== "iniciada" || !p) { c.hidden = true; return; }
  c.hidden = false;
  const left = Math.max(0, Math.round(((S.sala.fin || 0) - Date.now()) / 1000));
  c.classList.toggle("live", left > 0);
  $("#clockTxt").textContent = `Paso ${p} · ${STEPS[p - 1].n} · ` + (left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "tiempo");
}
setInterval(renderClock, 1000);

/* =========================== Sala de espera =========================== */
function personasOrdenadas() {
  return Object.entries(S.part).sort((a, b) => (a[1].ingreso?.seconds || 9e12) - (b[1].ingreso?.seconds || 9e12));
}
function renderEspera() {
  const gente = personasOrdenadas(), n = gente.length;
  $("#cuantos").textContent = n;
  $("#cuantosTxt").textContent = n === 1 ? "persona conectada" : "personas conectadas";
  const ul = $("#gente"); ul.innerHTML = "";
  if (!n) ul.innerHTML = '<li class="muted">Cuando alguien ingrese, aparece acá.</li>';
  gente.forEach(([uid, p]) => {
    const li = document.createElement("li");
    const av = document.createElement("span"); av.className = "avatar"; av.textContent = iniciales(p.nombre, p.apellido);
    const nm = document.createElement("span"); nm.textContent = `${p.nombre} ${p.apellido}` + (uid === S.uid ? " (vos)" : "");
    const ac = document.createElement("span"); ac.className = "acc"; ac.textContent = p.cuenta; ac.title = p.cuenta;
    li.append(av, nm, ac); ul.append(li);
  });
  $("#docCtrl").hidden = !S.docente;
  if (S.docente) {
    $("#esperaTitulo").textContent = "Cuando estén todos, iniciá la clase";
    $("#esperaTexto").textContent = `Compartí el link de esta página con el código de clase "${S.clase}". Los equipos se arman al azar con las personas conectadas en ese momento; quien llegue después se suma al equipo más chico.`;
    $("#preview").textContent = resumenEquipos(n, +$("#fMax").value);
    $("#iniciar").disabled = n < 1;
  } else {
    $("#esperaTitulo").textContent = "Ya estás en la clase";
    $("#esperaTexto").textContent = `Esperá a que ${S.sala.docenteNombre || "el docente"} inicie la clase. Cuando lo haga, vas a ver tu equipo y tu rol.`;
  }
}
$("#fMax").addEventListener("change", renderEspera);
$("#iniciar").addEventListener("click", async () => {
  const uids = personasOrdenadas().map(([u]) => u);
  const max = +$("#fMax").value;
  const equipos = armarEquipos(uids, max);
  $("#iniciar").disabled = true;
  S.armando = true;
  try {
    await S.fb.f.updateDoc(ref(), { estado: "iniciada", equipos, maxEquipo: max, paso: 0, fin: 0, inicio: S.fb.f.serverTimestamp() });
    S.verEq = ordenarIds(Object.keys(equipos))[0] || null;
  } catch (e) { toast(errMsg(e)); }
  finally { S.armando = false; $("#iniciar").disabled = false; }
});

/* =========================== Mi equipo =========================== */
function renderMiEquipo() {
  const box = $("#miEquipo"); const eqs = S.sala.equipos || {};
  if (S.docente) {
    const n = Object.keys(S.part).length, k = Object.keys(eqs).length;
    box.innerHTML = `<div class="eyebrow">Docente</div><h2>${n} ${n === 1 ? "persona" : "personas"} en ${k} ${k === 1 ? "equipo" : "equipos"}</h2><p>Seguís el avance de cada equipo desde la pestaña Ejercicio y manejás el reloj desde Coordinación.</p>`;
    return;
  }
  const gid = equipoDe(eqs, S.uid);
  if (!gid) { box.innerHTML = `<div class="eyebrow">Tu equipo</div><h2>Te estamos sumando a un equipo…</h2>`; return; }
  const eq = eqs[gid], rol = eq.roles?.[S.uid] || "dev";
  box.innerHTML = `<div class="eyebrow">Tu equipo</div><h2>Equipo ${gid.slice(1)} · <span class="rol">${ROLES[rol]}</span></h2><div class="mates"></div>`;
  const m = box.querySelector(".mates");
  eq.miembros.forEach(u => {
    const s = document.createElement("span"); s.className = "mate";
    s.textContent = nombreDe(u) + (u === S.uid ? " (vos)" : "") + " · ";
    const b = document.createElement("b"); b.textContent = ROLES[eq.roles?.[u] || "dev"]; s.append(b); m.append(s);
  });
}

/* =========================== Pestañas =========================== */
function setTab(t) {
  S.tab = t;
  document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
  document.querySelectorAll("#s-clase [role=tabpanel]").forEach(p => (p.hidden = p.id !== "p-" + t));
}
document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
setTab("ejercicio");

/* =========================== Ejercicio =========================== */
function equipoActivo() {
  if (S.docente) {
    const ids = ordenarIds(Object.keys(S.sala?.equipos || {}));
    if (!ids.includes(S.verEq)) S.verEq = ids[0] || null;
    return S.verEq;
  }
  return equipoDe(S.sala?.equipos, S.uid);
}
function grupo(gid) {
  const g = S.grupos[gid] || {};
  const ok = Array.isArray(g.orden) && g.orden.length === IDS.length && IDS.every(i => g.orden.includes(i));
  const talles = {}; Object.entries(g.talles || {}).forEach(([k, v]) => { if (PTS[v]) talles[k] = v; });
  return {
    orden: ok ? g.orden.slice() : IDS.slice(), talles,
    elegidas: Array.isArray(g.elegidas) ? g.elegidas.filter(i => IDS.includes(i)) : [],
    objetivo: typeof g.objetivo === "string" ? g.objetivo : ""
  };
}
async function guardarGrupo(gid, remoto, local) {
  const g = grupo(gid); local(g); S.grupos[gid] = g; renderEjercicio(); renderComun();
  try { await S.fb.f.setDoc(ref("grupos", gid), remoto, { merge: true }); }
  catch (e) { toast(errMsg(e)); }
}

function renderEjercicio() {
  if (!S.sala || S.sala.estado !== "iniciada") return;
  const p = S.sala.paso | 0;
  $("#steps").innerHTML = STEPS.map((s, i) => `<div class="step${p === i + 1 ? " on" : ""}"><b>${i + 1}. ${s.n}</b><span class="muted">${s.min} min · ${s.who}</span></div>`).join("");
  const gid = equipoActivo();
  if (S.docente) {
    $("#verEquipo").innerHTML = ordenarIds(Object.keys(S.sala.equipos || {})).map(x => `<button class="seg${x === gid ? " on" : ""}" data-g="${x}" aria-pressed="${x === gid}">Equipo ${x.slice(1)}</button>`).join("");
  }
  const board = $(".board");
  board.classList.toggle("readonly", !gid);
  const g = grupo(gid || "_");
  const used = g.elegidas.reduce((s, id) => s + (PTS[g.talles[id]] || 0), 0);
  $("#cards").innerHTML = g.orden.map((id, i) => {
    const st = STORY[id], t = g.talles[id], sel = g.elegidas.includes(id);
    return `<li class="card-h${sel ? " sel" : ""}">
      <div class="rank">${i + 1}</div>
      <div class="story"><div class="st-t">${id} · ${esc(st.t)}</div><p>${esc(st.h)}</p></div>
      <div class="ctrls">
        <div class="move"><button data-act="up" data-id="${id}" ${i === 0 ? "disabled" : ""} aria-label="Subir ${id}">↑</button><button data-act="down" data-id="${id}" ${i === IDS.length - 1 ? "disabled" : ""} aria-label="Bajar ${id}">↓</button></div>
        <div class="sizes" role="group" aria-label="Talle de ${id}">${["S", "M", "L"].map(s => `<button class="sz${t === s ? " on" : ""}" data-act="size" data-id="${id}" data-s="${s}" aria-pressed="${t === s}" title="${s} = ${PTS[s]} punto${PTS[s] > 1 ? "s" : ""}">${s}</button>`).join("")}</div>
        <label class="take"><input type="checkbox" data-act="take" data-id="${id}" ${sel ? "checked" : ""} ${t ? "" : "disabled"}><span>${t ? "Entra" : "Estimar"}</span></label>
      </div></li>`;
  }).join("");
  $("#used").textContent = used;
  const cap = $("#capBar"); cap.classList.toggle("over", used > CAP);
  cap.innerHTML = Array.from({ length: CAP }, (_, i) => `<span class="${i < Math.min(used, CAP) ? "f" : ""}"></span>`).join("");
  const m = $("#capMsg");
  if (used > CAP) { m.className = "msg bad"; m.textContent = `Se pasan por ${used - CAP} punto${used - CAP > 1 ? "s" : ""}: saquen algo del sprint.`; }
  else if (used === CAP) { m.className = "msg ok"; m.textContent = "Capacidad completa. Revisen que el objetivo cierre."; }
  else { m.className = "msg"; m.textContent = `Quedan ${CAP - used} punto${CAP - used > 1 ? "s" : ""} disponibles.`; }
  const ta = $("#objetivo"); if (document.activeElement !== ta) ta.value = g.objetivo;
}
$("#verEquipo").addEventListener("click", e => { const b = e.target.closest("[data-g]"); if (b) { S.verEq = b.dataset.g; renderEjercicio(); } });
$("#cards").addEventListener("click", e => {
  const b = e.target.closest("button[data-act]"); const gid = equipoActivo(); if (!b || !gid) return;
  const g = grupo(gid), id = b.dataset.id;
  if (b.dataset.act === "size") {
    const nv = g.talles[id] === b.dataset.s ? null : b.dataset.s;
    const remoto = { talles: { [id]: nv || S.fb.f.deleteField() } };
    if (!nv && g.elegidas.includes(id)) remoto.elegidas = g.elegidas.filter(x => x !== id);
    guardarGrupo(gid, remoto, x => { if (nv) x.talles[id] = nv; else { delete x.talles[id]; x.elegidas = x.elegidas.filter(y => y !== id); } });
    return;
  }
  const i = g.orden.indexOf(id), j = b.dataset.act === "up" ? i - 1 : i + 1; if (j < 0 || j >= g.orden.length) return;
  const o = g.orden.slice(); [o[i], o[j]] = [o[j], o[i]];
  guardarGrupo(gid, { orden: o }, x => (x.orden = o));
});
$("#cards").addEventListener("change", e => {
  const c = e.target.closest("input[data-act=take]"); const gid = equipoActivo(); if (!c || !gid) return;
  const g = grupo(gid), id = c.dataset.id;
  const el = c.checked ? [...g.elegidas.filter(x => x !== id), id] : g.elegidas.filter(x => x !== id);
  guardarGrupo(gid, { elegidas: el }, x => (x.elegidas = el));
});
let objT;
$("#objetivo").addEventListener("input", e => {
  const gid = equipoActivo(); if (!gid) return;
  clearTimeout(objT); $("#savedMsg").textContent = "Escribiendo…";
  const v = e.target.value.slice(0, 280);
  objT = setTimeout(async () => { await guardarGrupo(gid, { objetivo: v }, x => (x.objetivo = v)); $("#savedMsg").textContent = "Guardado para el equipo"; }, 700);
});

/* =========================== Puesta en común =========================== */
function tarjetaEquipo(gid, conMiembros) {
  const eq = S.sala.equipos[gid], g = grupo(gid);
  const used = g.elegidas.reduce((s, id) => s + (PTS[g.talles[id]] || 0), 0);
  const dentro = g.orden.filter(id => g.elegidas.includes(id)), afuera = g.orden.filter(id => !g.elegidas.includes(id));
  const c = document.createElement("article"); c.className = "gcard";
  c.innerHTML = `<div class="eyebrow">Equipo ${gid.slice(1)}</div><p class="obj"></p>
    <div><div class="sm">En el sprint · ${used} de ${CAP} puntos${used > CAP ? " (se pasan)" : ""}</div><div class="pills in"></div></div>
    <div><div class="sm">Quedaron afuera</div><div class="pills fuera"></div></div><ul class="members"></ul>`;
  const o = c.querySelector(".obj");
  if (g.objetivo.trim()) o.textContent = "«" + g.objetivo.trim() + "»"; else { o.classList.add("none"); o.textContent = "Todavía sin Objetivo del Sprint"; }
  const pin = c.querySelector(".in"), pout = c.querySelector(".fuera");
  if (!dentro.length) pin.innerHTML = '<span class="sm">Nada elegido aún</span>';
  dentro.forEach(id => { const s = document.createElement("span"); s.className = "pill"; s.textContent = `${id} · ${g.talles[id]}`; s.title = STORY[id].t; pin.append(s); });
  afuera.forEach(id => { const s = document.createElement("span"); s.className = "pill out"; s.textContent = id + (g.talles[id] ? " · " + g.talles[id] : ""); s.title = STORY[id].t; pout.append(s); });
  const ul = c.querySelector(".members");
  if (conMiembros) (eq.miembros || []).forEach(u => {
    const li = document.createElement("li"); const a = document.createElement("span"); a.textContent = nombreDe(u);
    const r = document.createElement("span"); r.className = "r"; r.textContent = ROLES[eq.roles?.[u] || "dev"]; li.append(a, r); ul.append(li);
  });
  return c;
}
function renderComun() {
  if (!S.sala || S.sala.estado !== "iniciada") return;
  const box = $("#groups"); box.innerHTML = "";
  ordenarIds(Object.keys(S.sala.equipos || {})).forEach(gid => box.append(tarjetaEquipo(gid, true)));
}

/* =========================== Cuestionario =========================== */
function renderQuizForm() {
  const f = $("#quizForm"); const mio = S.quiz[S.uid];
  const sent = S.quizSent; const resp = sent ? (mio?.resp || S.draft) : S.draft;
  f.innerHTML = QUIZ.map((q, i) => `<fieldset class="q"><legend>${i + 1}. ${esc(q.q)}</legend>${q.o.map((o, j) => {
    let cls = ""; if (sent) { if (j === q.c) cls = " good"; else if (resp["q" + i] === j) cls = " wrong"; }
    return `<label class="opt${cls}"><input type="radio" name="q${i}" value="${j}" ${resp["q" + i] === j ? "checked" : ""} ${sent ? "disabled" : ""}><span>${"abc"[j]}) ${esc(o)}</span></label>`;
  }).join("")}${sent ? `<p class="why">${esc(q.w)}</p>` : ""}</fieldset>`).join("") +
    `<div class="row">${sent ? '<button type="button" class="btn ghost" id="redo">Responder de nuevo</button>' : '<button type="submit" class="btn" id="sendQ">Enviar respuestas</button>'}<span class="sm" id="qHint"></span></div>`;
  if (!sent) actualizarHint();
}
function actualizarHint() {
  const n = QUIZ.filter((_, i) => S.draft["q" + i] !== undefined).length;
  const h = $("#qHint"); if (h) h.textContent = `${n} de ${QUIZ.length} respondidas`;
  const b = $("#sendQ"); if (b) b.disabled = n < QUIZ.length;
}
$("#quizForm").addEventListener("change", e => { if (e.target.name) { S.draft[e.target.name] = +e.target.value; actualizarHint(); } });
$("#quizForm").addEventListener("submit", async e => {
  e.preventDefault();
  const resp = { ...S.draft }; const puntaje = QUIZ.reduce((s, q, i) => s + (resp["q" + i] === q.c ? 1 : 0), 0);
  S.quizSent = true; S.quiz[S.uid] = { resp, puntaje, enviado: true };
  renderQuizForm(); renderQuizRes();
  try { await S.fb.f.setDoc(ref("quiz", S.uid), { resp, puntaje, enviado: true }); } catch (er) { toast(errMsg(er)); }
});
$("#quizForm").addEventListener("click", async e => {
  if (e.target.id !== "redo") return;
  S.quizSent = false; S.draft = {}; renderQuizForm();
  try { await S.fb.f.setDoc(ref("quiz", S.uid), { enviado: false }, { merge: true }); } catch (er) { toast(errMsg(er)); }
});
function renderQuizRes() {
  const box = $("#quizRes"); const mio = S.quiz[S.uid];
  const mi = mio?.enviado ? mio.puntaje : null;
  const filas = Object.entries(S.quiz).filter(([, v]) => v && v.resp && typeof v.puntaje === "number");
  const pct = QUIZ.map((q, i) => filas.length ? Math.round(100 * filas.filter(([, v]) => v.resp["q" + i] === q.c).length / filas.length) : 0);
  const prom = filas.length ? (filas.reduce((s, [, v]) => s + v.puntaje, 0) / filas.length).toFixed(1).replace(".", ",") : "–";
  box.innerHTML = `<div><div class="eyebrow">Tu resultado</div>${mi == null ? '<p class="muted">Respondé las 8 preguntas y enviá para ver la corrección.</p>' : `<p><span class="score">${mi}</span> <span class="muted">de ${QUIZ.length} correctas</span></p>`}</div>
    <div><div class="eyebrow">Resultados del equipo</div><p class="muted">${filas.length} ${filas.length === 1 ? "persona respondió" : "personas respondieron"} · promedio ${prom} de ${QUIZ.length}</p></div>
    ${filas.length ? `<div class="bars" aria-label="Porcentaje de aciertos por pregunta">${pct.map((v, i) => `<div class="bar"><span>P${i + 1}</span><span class="t"><i style="width:${v}%"></i></span><span>${v}%</span></div>`).join("")}</div>
    <p class="sm">Las preguntas con menos aciertos son las que conviene repasar juntos.</p><ul class="rank-list" id="rankList"></ul>` : '<p class="sm">Cuando el equipo responda, acá aparece el porcentaje de aciertos de cada pregunta.</p>'}`;
  const ul = $("#rankList");
  if (ul) filas.sort((a, b) => b[1].puntaje - a[1].puntaje).forEach(([u, v]) => {
    const li = document.createElement("li"); const n = document.createElement("span"); n.textContent = nombreDe(u) + (u === S.uid ? " (vos)" : "");
    const b = document.createElement("b"); b.textContent = `${v.puntaje}/${QUIZ.length}`; li.append(n, b); ul.append(li);
  });
}

/* =========================== Coordinación (docente) =========================== */
let confirmar = null;
function pedirConfirmacion(btn, texto, accion) {
  if (confirmar && confirmar.btn === btn) { clearTimeout(confirmar.t); const a = confirmar.accion; restaurar(); a(); return; }
  restaurar();
  confirmar = { btn, accion, original: btn.textContent, t: setTimeout(restaurar, 6000) };
  btn.textContent = "Confirmar"; $("#coordHint").textContent = texto;
}
function restaurar() { if (confirmar) { confirmar.btn.textContent = confirmar.original; clearTimeout(confirmar.t); } confirmar = null; $("#coordHint").textContent = ""; }

function renderCoord() {
  if (!S.docente || !S.sala || S.sala.estado !== "iniciada") return;
  const p = S.sala.paso | 0;
  $("#pasoBtns").innerHTML = STEPS.map((s, i) => `<button class="btn${p === i + 1 ? "" : " ghost"}" data-paso="${i + 1}">Iniciar ${i + 1}. ${s.n} (${s.min}′)</button>`).join("");
  const ids = ordenarIds(Object.keys(S.sala.equipos || {}));
  const n = Object.keys(S.part).length;
  $("#equiposResumen").textContent = `${n} ${n === 1 ? "persona" : "personas"} en ${ids.length} ${ids.length === 1 ? "equipo" : "equipos"}.`;
  const box = $("#equiposLista"); box.innerHTML = "";
  ids.forEach(gid => box.append(tarjetaEquipo(gid, true)));
  if (!confirmar) $("#fMax2").value = String(S.sala.maxEquipo || 5);
}
$("#pasoBtns").addEventListener("click", async e => {
  const b = e.target.closest("[data-paso]"); if (!b) return;
  const n = +b.dataset.paso;
  try { await S.fb.f.updateDoc(ref(), { paso: n, fin: Date.now() + STEPS[n - 1].min * 60000 }); } catch (er) { toast(errMsg(er)); }
});
$("#pararReloj").addEventListener("click", async () => { try { await S.fb.f.updateDoc(ref(), { paso: 0, fin: 0 }); } catch (er) { toast(errMsg(er)); } });
$("#rearmar").addEventListener("click", () => pedirConfirmacion($("#rearmar"),
  "Se vuelven a sortear los equipos con todas las personas conectadas. Los tableros quedan como están.", async () => {
    const max = +$("#fMax2").value; S.armando = true;
    try { await S.fb.f.updateDoc(ref(), { equipos: armarEquipos(Object.keys(S.part), max), maxEquipo: max }); toast("Equipos rearmados"); }
    catch (er) { toast(errMsg(er)); } finally { S.armando = false; }
  }));
$("#limpiar").addEventListener("click", () => pedirConfirmacion($("#limpiar"),
  "Se borran las tarjetas y objetivos de todos los equipos. El cuestionario se mantiene.", async () => {
    try { await Promise.all(Object.keys(S.grupos).map(g => S.fb.f.deleteDoc(ref("grupos", g)))); toast("Tableros borrados"); }
    catch (er) { toast(errMsg(er)); }
  }));

/* =========================== Arranque =========================== */
(async () => {
  const configurado = !String(firebaseConfig.apiKey || "").startsWith("PEGAR");
  if (!configurado) { show("s-config"); return; }
  const ses = leerSesion();
  const params = new URLSearchParams(location.search);
  const mismaClase = !params.get("clase") || params.get("clase") === ses?.clase;
  if (ses && !ses.salio && mismaClase) {
    try { await ingresar(ses); return; } catch (e) { prepararLogin(e.mensaje || errMsg(e)); return; }
  }
  prepararLogin();
})();
