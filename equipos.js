// Lógica para armar equipos. No depende de Firebase, así se puede probar sola.

function mezclar(lista, rnd = Math.random) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Primer integrante: Product Owner. Segundo: Scrum Master (si el equipo
// tiene 3 o más). El resto: Developers.
export function asignarRoles(equipo) {
  const roles = {};
  equipo.miembros.forEach((uid, i) => {
    roles[uid] = i === 0 ? "po" : (i === 1 && equipo.miembros.length >= 3) ? "sm" : "dev";
  });
  return { ...equipo, roles };
}

// Reparte a las personas en la menor cantidad de equipos que respete el
// máximo por equipo, con tamaños parejos (difieren en 1 como mucho).
export function armarEquipos(uids, maxPorEquipo = 5, rnd = Math.random) {
  const lista = mezclar(uids, rnd);
  const n = lista.length;
  if (!n) return {};
  const max = Math.max(2, maxPorEquipo | 0);
  const k = Math.max(1, Math.ceil(n / max));
  const equipos = {};
  for (let i = 0; i < k; i++) equipos["e" + (i + 1)] = { miembros: [] };
  lista.forEach((uid, i) => equipos["e" + ((i % k) + 1)].miembros.push(uid));
  for (const id of Object.keys(equipos)) equipos[id] = asignarRoles(equipos[id]);
  return equipos;
}

// Suma a alguien que entró tarde al equipo más chico.
export function sumarTarde(equipos, uid) {
  const copia = JSON.parse(JSON.stringify(equipos || {}));
  const ids = ordenarIds(Object.keys(copia));
  if (!ids.length) return { e1: { miembros: [uid], roles: { [uid]: "po" } } };
  const destino = ids.slice().sort((a, b) => copia[a].miembros.length - copia[b].miembros.length)[0];
  const eq = copia[destino];
  eq.miembros.push(uid);
  eq.roles = eq.roles || {};
  const tieneSm = Object.values(eq.roles).includes("sm");
  const tienePo = Object.values(eq.roles).includes("po");
  eq.roles[uid] = !tienePo ? "po" : (!tieneSm && eq.miembros.length >= 3) ? "sm" : "dev";
  return copia;
}

export function equipoDe(equipos, uid) {
  for (const [id, eq] of Object.entries(equipos || {})) {
    if ((eq.miembros || []).includes(uid)) return id;
  }
  return null;
}

export function ordenarIds(ids) {
  return ids.slice().sort((a, b) => (parseInt(a.slice(1), 10) || 0) - (parseInt(b.slice(1), 10) || 0));
}

// Texto de vista previa: "Con 12 personas se arman 3 equipos de 4."
export function resumenEquipos(n, maxPorEquipo = 5) {
  if (!n) return "Todavía no ingresó nadie.";
  const max = Math.max(2, maxPorEquipo | 0);
  const k = Math.max(1, Math.ceil(n / max));
  const base = Math.floor(n / k), extra = n % k;
  const personas = n === 1 ? "1 persona" : `${n} personas`;
  if (k === 1) return `Con ${personas} se arma 1 equipo.`;
  if (!extra) return `Con ${personas} se arman ${k} equipos de ${base}.`;
  const grandes = extra, chicos = k - extra;
  return `Con ${personas} se arman ${k} equipos: ${grandes} de ${base + 1} y ${chicos} de ${base}.`;
}
