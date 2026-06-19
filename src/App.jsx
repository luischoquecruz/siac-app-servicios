import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ══════════════════════════════════════════════════════════════
//  CONFIGURACIÓN CENTRAL — modifica estos valores para adaptar
//  la app a tu institución sin tocar el resto del código
// ══════════════════════════════════════════════════════════════
const CONFIG_DEFAULT = {
  // ── Identidad ──────────────────────────────────────────────
  orgNombre: "CEPI",
  orgSubtitulo: "SIAC",
  appTitulo: "Registro de Servicio",
  appSubtitulo: "Complete el formulario para registrar su atención",

  // ── Colores (CSS válidos) ──────────────────────────────────
  colorPrimario: "#1e3a5f",
  colorAcento: "#2563eb",
  colorFondo: "#f0f4ff",
  colorFondoAlt: "#e8f5e9",

  // ── Acceso ─────────────────────────────────────────────────
  adminPin: "siscep20",

  // ── Backend ────────────────────────────────────────────────
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbw_kzZvAnCAeFhGKTUMQTIuXwrz2pc_kbsgemTYvqgW45poldN30NU3mX_cq14dvpDc/exec",
  storageKey: "siac_servicios_local",

  // ── Opciones de formulario ─────────────────────────────────
  tipos: ["Cursante", "Docente", "Administrativo", "Otro"],
  modalidades: ["Presencial", "Virtual", "En línea"],
  modalidadIconos: { "Presencial": "🏢", "Virtual": "💻", "En línea": "🌐" },

  // ── Actividades / servicios ────────────────────────────────
  actividades: [
    { id: 4,  label: "Soporte de acceso (reseteo / desbloqueo)" },
    { id: 5,  label: "Corrección de información personal" },
    { id: 6,  label: "Administración de roles y permisos" },
    { id: 7,  label: "Gestión de catálogos" },
    { id: 8,  label: "Generación de Curriculum / Declaración jurada" },
    { id: 9,  label: "Registro, matriculación o cambio de descuentos" },
    { id: 10, label: "Corrección de errores en matriculación" },
    { id: 11, label: "Filtrado y búsqueda de información" },
    { id: 12, label: "Matriculación – devoluciones de cursantes externos" },
    { id: 13, label: "Matriculación – programas de regularización" },
    { id: 14, label: "Actualización / corrección de plan de pagos" },
    { id: 15, label: "Actualización Página Web del Posgrado" },
    { id: 1,  label: "Requerimientos y TDRs Fase 3 SIAC" },
    { id: 2,  label: "Seguimiento aplicación web CEPI Fase 3" },
    { id: 3,  label: "Mantenimiento y copias de seguridad SIAC" },
    { id: 16, label: "Otra actividad asignada" },
  ],

  // ── Textos UI ──────────────────────────────────────────────
  textos: {
    botonEnviar: "💾 Enviar registro",
    mensajeExito: "✅ ¡Registro guardado correctamente! Gracias por su calificación.",
    calificacionLabel: "⭐ Califique la atención recibida",
    califLabels: ["", "Deficiente", "Regular", "Bueno", "Muy bueno", "Excelente"],
    adminLink: "Acceso administrador",
    placeholder: {
      nombre: "Su nombre completo",
      programa: "Programa o unidad a la que pertenece",
      descripcion: "Describa brevemente su consulta o solicitud...",
      comentario: "¿Algún comentario adicional sobre la atención? (opcional)",
    }
  },

  // ── Comportamiento ─────────────────────────────────────────
  mostrarCampoPrograma: true,
  mostrarCampoDescripcion: true,
  mostrarCampoComentario: true,
  requierePrograma: false,
  requiereDescripcion: false,
  exitoDelay: 5000,

  // ── Modo oscuro ───────────────────────────────────────────
  darkMode: false,
  darkColorPrimario: "#0f172a",
  darkColorAcento: "#3b82f6",
  darkColorFondo: "#0f172a",
  darkColorFondoAlt: "#1e293b",
};

// ══════════════════════════════════════════════════════════════
//  PANEL DE CONFIGURACIÓN (solo visible en modo desarrollo)
// ══════════════════════════════════════════════════════════════
function PanelConfig({ config, setConfig, onClose, onSaveConfig, onSaveActividades, onSaveTipos }) {
  const [tab, setTab] = useState("identidad");
  const [actTexto, setActTexto] = useState(
    config.actividades.map(a => `${a.id}|${a.label}`).join("\n")
  );
  const [tiposTexto, setTiposTexto] = useState(config.tipos.join("\n"));
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState(""); // "" | "saving" | "ok" | "error"

  const set = (key, val) => setConfig(p => ({ ...p, [key]: val }));
  const setTexto = (key, val) => setConfig(p => ({ ...p, textos: { ...p.textos, [key]: val } }));

  const guardarActividades = () => {
    try {
      const parsed = actTexto.trim().split("\n").map(line => {
        const [id, ...rest] = line.split("|");
        if (!id || !rest.length) throw new Error(`Línea inválida: "${line}"`);
        return { id: Number(id), label: rest.join("|").trim() };
      });
      set("actividades", parsed);
      setError("");
    } catch (e) { setError(e.message); }
  };

  const guardarTipos = () => {
    const parsed = tiposTexto.trim().split("\n").filter(Boolean);
    if (parsed.length < 1) { setError("Se necesita al menos un tipo"); return; }
    set("tipos", parsed);
    setError("");
  };

  const inp = {
    width: "100%", border: "1px solid var(--border)", borderRadius: 7,
    padding: "8px 11px", fontSize: 13, boxSizing: "border-box",
    background: "var(--bg-card)", fontFamily: "monospace"
  };
  const tabStyle = (id) => ({
    padding: "8px 14px", fontSize: 12, fontWeight: 600, border: "none",
    cursor: "pointer", borderBottom: tab === id ? `3px solid ${config.colorAcento}` : "3px solid transparent",
    background: "transparent", color: tab === id ? config.colorAcento : "var(--text-secondary)"
  });
  const label = (txt) => (
    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{txt}</label>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 14, width: "min(700px, 96vw)",
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "var(--shadow-xl)"
      }}>
        {/* Header */}
        <div style={{ background: config.colorPrimario, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>⚙️ Panel de Configuración</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>✕ Cerrar</button>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid var(--border-light)", display: "flex", flexWrap: "wrap", padding: "0 8px" }}>
          {[["identidad", "🏛️ Identidad"], ["colores", "🎨 Colores"], ["backend", "🔗 Backend"], ["formulario", "📝 Formulario"], ["actividades", "📋 Actividades"]].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={tabStyle(id)}>{lbl}</button>
          ))}
        </div>

        <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>
          {error && <div style={{ background: "var(--bg-error)", border: "1px solid var(--danger-text)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "var(--danger-text)", fontSize: 12 }}>{error}</div>}

          {tab === "identidad" && (
            <div style={{ display: "grid", gap: 12 }}>
              {[
                ["orgNombre", "Nombre de la organización (ej: CEPI)"],
                ["orgSubtitulo", "Subtítulo / sistema (ej: SIAC)"],
                ["appTitulo", "Título de la app"],
                ["appSubtitulo", "Descripción debajo del título"],
                ["adminPin", "PIN de administrador"],
              ].map(([key, lbl]) => (
                <div key={key}>
                  {label(lbl)}
                  <input value={config[key]} onChange={e => set(key, e.target.value)} style={{ ...inp, fontFamily: "inherit" }} />
                </div>
              ))}
              <div>
                {label("Texto botón Enviar")}
                <input value={config.textos.botonEnviar} onChange={e => setTexto("botonEnviar", e.target.value)} style={{ ...inp, fontFamily: "inherit" }} />
              </div>
              <div>
                {label("Mensaje de éxito")}
                <input value={config.textos.mensajeExito} onChange={e => setTexto("mensajeExito", e.target.value)} style={{ ...inp, fontFamily: "inherit" }} />
              </div>
              <div>
                {label("Etiqueta calificación")}
                <input value={config.textos.calificacionLabel} onChange={e => setTexto("calificacionLabel", e.target.value)} style={{ ...inp, fontFamily: "inherit" }} />
              </div>
            </div>
          )}

          {tab === "colores" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["colorPrimario", "Color primario (header, botones)"],
                ["colorAcento", "Color de acento (seleccionado, links)"],
                ["colorFondo", "Fondo gradiente inicio"],
                ["colorFondoAlt", "Fondo gradiente fin"],
              ].map(([key, lbl]) => (
                <div key={key}>
                  {label(lbl)}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={config[key]} onChange={e => set(key, e.target.value)}
                      style={{ width: 40, height: 34, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                    <input value={config[key]} onChange={e => set(key, e.target.value)}
                      style={{ ...inp, width: "auto", flex: 1 }} />
                  </div>
                </div>
              ))}
              <div style={{ gridColumn: "1/-1", padding: 12, background: "var(--bg-muted)", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)" }}>
                Vista previa del header:
                <div style={{ marginTop: 8, background: `linear-gradient(135deg,${config.colorPrimario},${config.colorAcento})`, borderRadius: 8, padding: "12px 16px", color: "#fff" }}>
                  <div style={{ fontSize: 10, opacity: .8, letterSpacing: 2 }}>{config.orgNombre} — {config.orgSubtitulo}</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{config.appTitulo}</div>
                </div>
              </div>
            </div>
          )}

          {tab === "backend" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                {label("URL Google Apps Script")}
                <input value={config.appsScriptUrl} onChange={e => set("appsScriptUrl", e.target.value)} style={inp} placeholder="https://script.google.com/macros/s/..." />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Deja vacío para usar solo almacenamiento local (localStorage)</div>
              </div>
              <div>
                {label("Clave de localStorage")}
                <input value={config.storageKey} onChange={e => set("storageKey", e.target.value)} style={inp} />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Prefijo bajo el que se guardan los datos en el navegador</div>
              </div>
              <div style={{ background: "var(--bg-warning)", border: "1px solid var(--border-accent)", borderRadius: 8, padding: 12, fontSize: 12, color: "var(--text-comment)" }}>
                <b>Apps Script:</b> El script debe aceptar GET (listar) y POST (crear/eliminar/loadConfig/saveConfig). Los datos siempre se guardan en localStorage como respaldo offline.
              </div>
              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 8 }}>Sincronizar configuración</div>
                <button onClick={async () => {
                  if (!onSaveConfig) return;
                  setSyncStatus("saving");
                  try {
                    await onSaveConfig();
                    setSyncStatus("ok");
                    setTimeout(() => setSyncStatus(""), 3000);
                  } catch {
                    setSyncStatus("error");
                    setTimeout(() => setSyncStatus(""), 3000);
                  }
                }} disabled={syncStatus==="saving" || !config.appsScriptUrl}
                  style={{ background: config.appsScriptUrl ? config.colorPrimario : "var(--text-muted)", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: config.appsScriptUrl ? "pointer" : "not-allowed", fontSize: 12, alignSelf: "flex-start" }}>
                  {syncStatus==="saving" ? "Guardando..." : "💾 Guardar configuración en servidor"}
                </button>
                {syncStatus==="ok" && <span style={{ marginLeft: 10, fontSize: 12, color: "var(--tag-modalidad-text)" }}>✅ Configuración guardada</span>}
                {syncStatus==="error" && <span style={{ marginLeft: 10, fontSize: 12, color: "var(--danger-text)" }}>❌ Error al guardar</span>}
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Guarda la configuración actual en el servidor para que persista entre sesiones.</div>
              </div>
            </div>
          )}

          {tab === "formulario" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 4 }}>Campos opcionales</div>
              {[
                ["mostrarCampoPrograma", "Mostrar campo Programa / Área"],
                ["mostrarCampoDescripcion", "Mostrar campo Descripción"],
                ["mostrarCampoComentario", "Mostrar campo Comentario en calificación"],
              ].map(([key, lbl]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={config[key]} onChange={e => set(key, e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }} />
                  {lbl}
                </label>
              ))}
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginTop: 8, marginBottom: 4 }}>Campos requeridos (además de los obligatorios fijos)</div>
              {[
                ["requierePrograma", "Programa / Área requerido"],
                ["requiereDescripcion", "Descripción requerida"],
              ].map(([key, lbl]) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={config[key]} onChange={e => set(key, e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }} />
                  {lbl}
                </label>
              ))}
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginTop: 8, marginBottom: 4 }}>Tipos de usuario (uno por línea)</div>
              <textarea value={tiposTexto} onChange={e => setTiposTexto(e.target.value)} rows={5} style={inp} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={guardarTipos} style={{ background: config.colorPrimario, color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12, alignSelf: "flex-start" }}>
                  Guardar tipos
                </button>
                {config.appsScriptUrl && onSaveTipos && (
                  <button onClick={async () => {
                    guardarTipos();
                    setTimeout(async () => { try { await onSaveTipos(); } catch {} }, 100);
                  }} style={{ background: "#047857", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12, alignSelf: "flex-start" }}>
                    ☁️ Sincronizar al servidor
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === "actividades" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-muted)", borderRadius: 7, padding: 10 }}>
                Formato: <code>ID|Nombre de la actividad</code> — una por línea. El ID debe ser un número único.
              </div>
              <textarea value={actTexto} onChange={e => setActTexto(e.target.value)} rows={18} style={{ ...inp, lineHeight: 1.8 }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={guardarActividades} style={{ background: config.colorPrimario, color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12, alignSelf: "flex-start" }}>
                  Guardar actividades
                </button>
                {config.appsScriptUrl && onSaveActividades && (
                  <button onClick={async () => {
                    guardarActividades();
                    setTimeout(async () => { try { await onSaveActividades(); } catch {} }, 100);
                  }} style={{ background: "#047857", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12, alignSelf: "flex-start" }}>
                    ☁️ Sincronizar al servidor
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border-light)", padding: "12px 20px", background: "var(--bg-muted)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => { setConfig(CONFIG_DEFAULT); onClose(); }}
            style={{ background: "var(--danger-bg)", color: "var(--danger-text)", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
            Restaurar valores por defecto
          </button>
          <button onClick={onClose} style={{ background: config.colorPrimario, color: "#fff", border: "none", borderRadius: 7, padding: "8px 20px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
            ✓ Aplicar y cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  API helpers
// ══════════════════════════════════════════════════════════════
async function apiGet(url) {
  if (!url) throw new Error("NO_URL");
  const r = await fetch(url);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.data.map(row => ({
    id: row.ID, fecha: row.Fecha, creadoEn: row.FechaHora,
    tipo: row.Tipo, nombre: row.Nombre, programa: row.Programa,
    actividadId: String(row.ActividadId), actividad: row.Actividad,
    modalidad: row.Modalidad, descripcion: row.Descripcion,
    calificacion: Number(row.Calificacion), comentario: row.Comentario,
  }));
}

async function apiPost(url, payload) {
  if (!url) throw new Error("NO_URL");
  await fetch(url, {
    method: "POST", body: JSON.stringify(payload),
    headers: { "Content-Type": "text/plain" }
  });
}

async function apiLoadConfig(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ action: "loadConfig" }),
      headers: { "Content-Type": "text/plain" }
    });
    const j = await r.json();
    return j.ok ? j.config : null;
  } catch { return null; }
}

async function apiSaveConfig(url, config) {
  if (!url) return;
  await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action: "saveConfig", config }),
    headers: { "Content-Type": "text/plain" }
  });
}

async function apiGetActividades(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ action: "getActividades" }),
      headers: { "Content-Type": "text/plain" }
    });
    const j = await r.json();
    return j.ok ? j.data : null;
  } catch { return null; }
}

async function apiGetTipos(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ action: "getTipos" }),
      headers: { "Content-Type": "text/plain" }
    });
    const j = await r.json();
    return j.ok ? j.data : null;
  } catch { return null; }
}

async function apiSaveData(url, data, tipo) {
  if (!url) return;
  await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action: "save" + tipo, data }),
    headers: { "Content-Type": "text/plain" }
  });
}

// ══════════════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════════════
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = s => { if (!s) return ""; const d = s.slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return s; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
const fmtDateTime = s => { if (!s) return ""; try { return new Date(s).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return s; } };
const emptyForm = () => ({
  fecha: today(), tipo: "", nombre: "", programa: "",
  actividadId: "", modalidad: "", descripcion: "",
  calificacion: 0, comentario: ""
});

// ══════════════════════════════════════════════════════════════
//  BUSCADOR DE ACTIVIDADES
// ══════════════════════════════════════════════════════════════
function BuscadorActividades({ actividades, value, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtradas = actividades.filter(a =>
    a.label.toLowerCase().includes(busqueda.toLowerCase())
  );
  const actSel = actividades.find(a => String(a.id) === String(value));

  const estilos = {
    contenedor: { position: "relative" },
    disparador: { width:"100%", border:"1px solid var(--border)", borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box", background:"var(--bg-card)", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"border-color .2s" },
    dropdown: { position:"absolute", top:"100%", left:0, right:0, background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:10, marginTop:5, zIndex:100, boxShadow:"var(--shadow-lg)", maxHeight:320, display:"flex", flexDirection:"column", overflow:"hidden" },
    inputBusqueda: { width:"100%", border:"1px solid var(--border)", borderRadius:6, padding:"6px 10px", fontSize:12, boxSizing:"border-box", outline:"none", background:"var(--bg-card)", color:"var(--text-main)" },
    item: (sel) => ({ padding:"8px 12px", cursor:"pointer", fontSize:13, background:sel?"var(--bg-accent)":"transparent", color:"var(--text-main)", borderBottom:"1px solid var(--border-light)", transition:"background .15s" }),
  };

  return (
    <div ref={ref} style={estilos.contenedor}>
      <div onClick={() => setAbierto(!abierto)} style={estilos.disparador}>
        <span style={{ color: actSel ? "var(--text-main)" : "var(--text-muted)" }}>
          {actSel ? actSel.label : "-- Seleccione el tipo de servicio --"}
        </span>
        <span style={{ fontSize:10, color:"var(--text-secondary)" }}>{abierto ? "▲" : "▼"}</span>
      </div>
      {abierto && (
        <div style={estilos.dropdown}>
          <div style={{ padding:8, borderBottom:"1px solid var(--border-light)" }}>
            <input autoFocus value={busqueda} onChange={e=>setBusqueda(e.target.value)}
              placeholder="Buscar servicio..." style={estilos.inputBusqueda} />
          </div>
          <div style={{ overflowY:"auto", flex:1 }}>
            {filtradas.length===0 ? (
              <div style={{ padding:12, textAlign:"center", color:"var(--text-muted)", fontSize:12 }}>Sin resultados</div>
            ) : filtradas.map(a => (
              <div key={a.id} onClick={() => { onChange(String(a.id)); setAbierto(false); setBusqueda(""); }}
                style={estilos.item(String(a.id) === String(value))}
                onMouseEnter={e=>e.currentTarget.style.background="var(--bg-muted)"}
                onMouseLeave={e=>e.currentTarget.style.background=String(a.id)===String(value)?"var(--bg-accent)":"transparent"}>
                {a.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  VISTA PÚBLICA
// ══════════════════════════════════════════════════════════════
function VistaPublica({ cfg, onAdminLogin, toggleDarkMode }) {
  const [form, setForm] = useState(emptyForm());
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const C = cfg;
  const T = cfg.textos;

  const handleSubmit = async () => {
    const req = ["tipo", "nombre", "actividadId", "modalidad"];
    if (C.requierePrograma) req.push("programa");
    if (C.requiereDescripcion) req.push("descripcion");
    if (!form.calificacion) { setError("Seleccione una calificación."); return; }
    if (req.some(k => !form[k])) {
      setError("Complete todos los campos obligatorios (*).");
      return;
    }
    setError(""); setLoading(true);
    const act = C.actividades.find(a => String(a.id) === String(form.actividadId));
    const nuevo = { ...form, id: Date.now(), creadoEn: new Date().toISOString(), actividad: act?.label || "" };
    try {
      const local = JSON.parse(localStorage.getItem(C.storageKey) || "[]");
      localStorage.setItem(C.storageKey, JSON.stringify([...local, nuevo]));
      if (C.appsScriptUrl) await apiPost(C.appsScriptUrl, nuevo);
      setSaved(true);
      setTimeout(() => { setSaved(false); setForm(emptyForm()); }, C.exitoDelay);
    } catch {
      setSaved(true);
      setTimeout(() => { setSaved(false); setForm(emptyForm()); }, C.exitoDelay);
    } finally { setLoading(false); }
  };

  const inp = {
    width: "100%", border: "1px solid var(--border)", borderRadius: 8,
    padding: "9px 12px", fontSize: 13, boxSizing: "border-box",
    background: "var(--bg-card)", color: "var(--text-main)"
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${C.colorFondo} 0%,${C.colorFondoAlt} 100%)`, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,${C.colorPrimario},${C.colorAcento})`, borderRadius: 16, padding: "22px 24px", marginBottom: 20, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, opacity: .8, textTransform: "uppercase", marginBottom: 4 }}>{C.orgNombre} — {C.orgSubtitulo}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{C.appTitulo}</div>
          <div style={{ fontSize: 12, opacity: .75, marginTop: 4 }}>{C.appSubtitulo}</div>
        </div>

        {saved && (
          <div style={{ background: "var(--bg-success)", border: "1px solid var(--tag-modalidad-text)", borderRadius: 12, padding: "20px 24px", marginBottom: 16, color: "var(--tag-modalidad-text)", textAlign: "center", animation: "fadeIn .3s" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>¡Su registro ha sido enviado con éxito!</div>
            <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600 }}>Gracias por su participación</div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: .85 }}>
              {T.mensajeExito} — {C.orgNombre}
            </div>
            <div style={{ fontSize: 10, marginTop: 8, opacity: .65, letterSpacing: 1, textTransform: "uppercase" }}>
              UNIDAD DE SISTEMAS — {C.orgNombre}
            </div>
          </div>
        )}
        {error && (
          <div style={{ background: "var(--bg-error)", border: "1px solid var(--danger-text)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "var(--danger-text)", fontSize: 13 }}>{error}</div>
        )}

        <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => setF("fecha", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>Tipo de usuario *</label>
              <select value={form.tipo} onChange={e => setF("tipo", e.target.value)} style={inp}>
                <option value="">-- Seleccione --</option>
                {C.tipos.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>Nombre completo *</label>
              <input value={form.nombre} onChange={e => setF("nombre", e.target.value)} style={inp} placeholder={T.placeholder.nombre} />
            </div>

            {C.mostrarCampoPrograma && (
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>
                  Programa / Área{C.requierePrograma ? " *" : ""}
                </label>
                <input value={form.programa} onChange={e => setF("programa", e.target.value)} style={inp} placeholder={T.placeholder.programa} />
              </div>
            )}

            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>Servicio solicitado *</label>
              <BuscadorActividades actividades={C.actividades} value={form.actividadId} onChange={v => setF("actividadId", v)} />
            </div>

            {/* Modalidad */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>Modalidad de atención *</label>
              <div style={{ display: "flex", gap: 10 }}>
                {C.modalidades.map(m => {
                  const sel = form.modalidad === m;
                  return (
                    <div key={m} onClick={() => setF("modalidad", m)}
                      style={{ flex: 1, border: `2px solid ${sel ? C.colorAcento : "var(--border-light)"}`, borderRadius: 10, padding: "12px 8px", textAlign: "center", cursor: "pointer", background: sel ? "var(--bg-accent)" : "var(--bg-card)", transform: sel ? "scale(1.03)" : "scale(1)", boxShadow: sel ? "var(--shadow-sm)" : "none" }}>
                      <div style={{ fontSize: 22 }}>{C.modalidadIconos[m] || "📍"}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: sel ? C.colorAcento : "var(--text-secondary)", marginTop: 3 }}>{m}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {C.mostrarCampoDescripcion && (
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 5 }}>
                  Descripción del caso{C.requiereDescripcion ? " *" : ""}
                </label>
                <textarea value={form.descripcion} onChange={e => setF("descripcion", e.target.value)} rows={3}
                  style={{ ...inp, resize: "vertical" }} placeholder={T.placeholder.descripcion} />
              </div>
            )}

            {/* Calificación */}
            <div style={{ gridColumn: "1/-1", background: "var(--bg-warning)", border: "1px solid var(--border-accent)", borderRadius: 12, padding: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main)", display: "block", marginBottom: 10 }}>{T.calificacionLabel} *</label>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} onClick={() => setF("calificacion", s)}
                    style={{ fontSize: 40, cursor: "pointer", color: s <= form.calificacion ? "var(--star)" : "var(--star-inactive)", transform: s <= form.calificacion ? "scale(1.2)" : "scale(1)", transition: "all .15s", display: "inline-block" }}>★</span>
                ))}
              </div>
              {form.calificacion > 0 && (
                <div style={{ textAlign: "center", fontWeight: 800, fontSize: 15, color: "var(--star)", marginBottom: 10 }}>
                  {T.califLabels[form.calificacion]} ({form.calificacion}/5)
                </div>
              )}
              {C.mostrarCampoComentario && (
                <textarea value={form.comentario} onChange={e => setF("comentario", e.target.value)} rows={2}
                  style={{ ...inp, background: "var(--bg-card)", border: "1px solid var(--border-accent)", resize: "vertical" }}
                  placeholder={T.placeholder.comentario} />
              )}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", marginTop: 18, background: loading ? "var(--text-muted)" : C.colorPrimario, color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontSize: 15, transition: "opacity .2s, background .2s" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = ".85" }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = "1" }}>
            {loading ? "Guardando..." : T.botonEnviar}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, display: "flex", justifyContent: "center", gap: 16, alignItems: "center" }}>
          <span onClick={onAdminLogin} style={{ fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", textDecoration: "underline", transition: "color .2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-main)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>
            {T.adminLink}
          </span>
          <span onClick={toggleDarkMode} style={{ fontSize: 20, cursor: "pointer", lineHeight: 1, transition: "transform .3s", display: "inline-block" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            {cfg.darkMode ? "☀️" : "🌙"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  VISTA ADMIN
// ══════════════════════════════════════════════════════════════
function VistaAdmin({ cfg, onLogout, onConfig, toggleDarkMode }) {
  const C = cfg;
  const [pinInput, setPinInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [tab, setTab] = useState("historial");
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rango, setRango] = useState({ desde: today().slice(0, 7) + "-01", hasta: today() });
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroAct, setFiltroAct] = useState("");
  const [filtroMod, setFiltroMod] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      if (C.appsScriptUrl) {
        const data = await apiGet(C.appsScriptUrl);
        setServicios(data);
        localStorage.setItem(C.storageKey, JSON.stringify(data));
      } else {
        const local = JSON.parse(localStorage.getItem(C.storageKey) || "[]");
        setServicios(local);
      }
    } catch {
      const local = JSON.parse(localStorage.getItem(C.storageKey) || "[]");
      setServicios(local);
    } finally { setLoading(false); }
  }, [C.appsScriptUrl, C.storageKey]);

  useEffect(() => { if (authed) cargar(); }, [authed, cargar]);

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      if (C.appsScriptUrl) await apiPost(C.appsScriptUrl, { action: "delete", id });
      const nueva = servicios.filter(s => s.id !== id);
      setServicios(nueva);
      localStorage.setItem(C.storageKey, JSON.stringify(nueva));
    } catch { alert("Error al eliminar"); }
  };

  const handlePin = () => {
    if (pinInput === C.adminPin) { setAuthed(true); setPinError(false); }
    else { setPinError(true); setPinInput(""); }
  };

  const filtrados = servicios.filter(s =>
    s.fecha >= rango.desde && s.fecha <= rango.hasta
    && (!filtroTipo || s.tipo === filtroTipo)
    && (!filtroAct || s.actividadId === filtroAct)
    && (!filtroMod || s.modalidad === filtroMod)
  );

  const porActividad = C.actividades.map(a => {
    const items = filtrados.filter(s => s.actividadId === String(a.id));
    const prom = items.length ? (items.reduce((s, i) => s + Number(i.calificacion), 0) / items.length).toFixed(1) : null;
    return { ...a, items, total: items.length, promedio: prom };
  }).filter(a => a.total > 0);

  const porModalidad = C.modalidades.map(m => ({ m, total: filtrados.filter(s => s.modalidad === m).length }));
  const promGlobal = filtrados.length ? (filtrados.reduce((s, i) => s + Number(i.calificacion), 0) / filtrados.length).toFixed(1) : null;

  if (!authed) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 36, boxShadow: "var(--shadow-lg)", width: 320, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text-main)", marginBottom: 2 }}>Panel Administrador</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 24 }}>{C.orgNombre} — {C.orgSubtitulo}</div>
        <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handlePin()}
          style={{ width: "100%", border: `2px solid ${pinError ? "var(--danger-text)" : "var(--border)"}`, borderRadius: 8, padding: "10px", fontSize: 18, textAlign: "center", letterSpacing: 8, boxSizing: "border-box", marginBottom: 8, background: "var(--bg-card)", color: "var(--text-main)" }}
          placeholder="••••" maxLength={20} />
        {pinError && <div style={{ color: "var(--danger-text)", fontSize: 12, marginBottom: 8 }}>PIN incorrecto</div>}
        <button onClick={handlePin}
          style={{ width: "100%", background: C.colorPrimario, color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontWeight: 700, cursor: "pointer", fontSize: 14, transition: "opacity .2s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          Ingresar
        </button>
        <div style={{ marginTop: 14 }}>
          <span onClick={onLogout} style={{ fontSize: 11, color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline" }}>← Volver al formulario</span>
        </div>
      </div>
    </div>
  );

  const imprimirDetalle = (s) => {
    const act = C.actividades.find(a => String(a.id) === String(s.actividadId));
    const w = window.open("", "_blank", "width=500,height=700");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Detalle de Atención — ${C.orgNombre}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font: 14px/1.6 system-ui, sans-serif; color: #1e293b; padding: 30px; max-width: 480px; margin: 0 auto; color-scheme: light; }
  .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1e3a5f; }
  .header h1 { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #1e3a5f; margin-bottom: 2px; }
  .header h2 { font-size: 18px; font-weight: 800; color: #1e293b; }
  .field { display: flex; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
  .field .lbl { width: 110px; font-weight: 700; color: #64748b; font-size: 12px; flex-shrink: 0; }
  .field .val { flex: 1; color: #1e293b; }
  .stars { color: #f59e0b; font-size: 18px; letter-spacing: 2px; }
  .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style></head><body>
<div class="header"><h1>${C.orgNombre} — ${C.orgSubtitulo}</h1><h2>Detalle de Atención</h2></div>
<div class="field"><div class="lbl">Fecha atención</div><div class="val">${fmtDate(s.fecha)}</div></div>
<div class="field"><div class="lbl">Tipo de usuario</div><div class="val">${s.tipo || "—"}</div></div>
<div class="field"><div class="lbl">Nombre</div><div class="val">${s.nombre || "—"}</div></div>
${s.programa ? `<div class="field"><div class="lbl">Programa</div><div class="val">${s.programa}</div></div>` : ""}
<div class="field"><div class="lbl">Servicio</div><div class="val">${act?.label || s.actividad || "—"}</div></div>
<div class="field"><div class="lbl">Modalidad</div><div class="val">${s.modalidad || "—"}</div></div>
${s.descripcion ? `<div class="field"><div class="lbl">Descripción</div><div class="val">${s.descripcion}</div></div>` : ""}
<div class="field"><div class="lbl">Calificación</div><div class="val"><span class="stars">${"★".repeat(Number(s.calificacion))}${"☆".repeat(5 - Number(s.calificacion))}</span> (${s.calificacion}/5)</div></div>
${s.comentario ? `<div class="field"><div class="lbl">Comentario</div><div class="val" style="font-style:italic">"${s.comentario}"</div></div>` : ""}
${s.creadoEn ? `<div class="field"><div class="lbl">Registrado</div><div class="val" style="font-size:12px;color:#64748b">${fmtDateTime(s.creadoEn)}</div></div>` : ""}
<div class="footer">Documento generado el ${new Date().toLocaleDateString()} — ${C.orgNombre} SIAC</div>
<button class="no-print" onclick="window.print();window.close()" style="display:block;margin:20px auto 0;background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-weight:700;cursor:pointer;font-size:14px">🖨️ Imprimir</button>
<script>window.onload=setTimeout(()=>{window.print()},500)</script>
</body></html>`);
    w.document.close();
  };

  const imprimirTodo = () => {
    if (filtrados.length === 0) return;
    const w = window.open("", "_blank", "width=700,height=700");
    const cards = [...filtrados].reverse().map(s => {
      const act = C.actividades.find(a => String(a.id) === String(s.actividadId));
      return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px;page-break-inside:avoid">
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">
          <span style="background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:0 7px;font-size:10px;font-weight:600">${s.tipo || "—"}</span>
          <span style="background:#f1f5f9;color:#475569;border-radius:4px;padding:0 7px;font-size:10px">${fmtDateTime(s.creadoEn)}</span>
          <span style="background:#f0fdf4;color:#166534;border-radius:4px;padding:0 7px;font-size:10px">${s.modalidad || "—"}</span>
          ${s.programa ? `<span style="background:#faf5ff;color:#7c3aed;border-radius:4px;padding:0 7px;font-size:10px">${s.programa}</span>` : ""}
        </div>
        <div style="font-weight:700;font-size:13px">${s.nombre || "—"}</div>
        <div style="font-size:12px;color:#2563eb">${act?.label || s.actividad || "—"}</div>
        ${s.descripcion ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${s.descripcion}</div>` : ""}
        <div style="font-size:13px;color:#f59e0b;margin-top:3px">${"★".repeat(Number(s.calificacion))}${"☆".repeat(5 - Number(s.calificacion))} (${s.calificacion}/5)</div>
        ${s.comentario ? `<div style="font-size:10px;color:#92400e;font-style:italic">"${s.comentario}"</div>` : ""}
      </div>`;
    }).join("\n");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Todas las Atenciones — ${C.orgNombre}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font:13px/1.5 system-ui,sans-serif; color:#1e293b; padding:30px; max-width:700px; margin:0 auto; color-scheme:light; }
  .header { text-align:center; margin-bottom:20px; padding-bottom:14px; border-bottom:2px solid #1e3a5f; }
  .header h1 { font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#1e3a5f; margin-bottom:2px; }
  .header h2 { font-size:17px; font-weight:800; color:#1e293b; }
  .header .count { font-size:11px; color:#64748b; margin-top:4px; }
  .footer { text-align:center; margin-top:20px; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; }
  @media print { body { padding:20px; } .no-print { display:none; } }
</style></head><body>
<div class="header"><h1>${C.orgNombre} — ${C.orgSubtitulo}</h1><h2>Reporte de Atenciones</h2><div class="count">Total: ${filtrados.length} registro(s)${servicios.length !== filtrados.length ? ` (filtrados de ${servicios.length})` : ""}</div></div>
${cards}
<div class="footer">Documento generado el ${new Date().toLocaleDateString()} — ${C.orgNombre} SIAC — Unidad de Sistemas</div>
<button class="no-print" onclick="window.print();window.close()" style="display:block;margin:20px auto 0;background:#1e3a5f;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-weight:700;cursor:pointer;font-size:14px">🖨️ Imprimir todo</button>
<script>window.onload=setTimeout(()=>{window.print()},500)</script>
</body></html>`);
    w.document.close();
  };

  const inp2 = { border: "1px solid var(--border)", borderRadius: 7, padding: "7px 10px", fontSize: 12, boxSizing: "border-box", background: "var(--bg-card)", color: "var(--text-main)" };
  const tabBtn = (id, label, icon) => (
    <button onClick={() => setTab(id)} style={{ padding: "10px 16px", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer", borderBottom: tab === id ? `3px solid ${C.colorAcento}` : "3px solid transparent", background: "transparent", color: tab === id ? C.colorAcento : "var(--text-secondary)", transition: "color .2s, border-color .2s" }}
      onMouseEnter={e => { if (tab !== id) e.currentTarget.style.color = "var(--text-main)" }}
      onMouseLeave={e => { if (tab !== id) e.currentTarget.style.color = "var(--text-secondary)" }}>
      {icon} {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-muted)", fontFamily: "sans-serif" }}>
      <div style={{ background: `linear-gradient(135deg,${C.colorPrimario},${C.colorAcento})`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
        <div>
          <div style={{ fontSize: 11, opacity: .8, letterSpacing: 2, textTransform: "uppercase" }}>{C.orgNombre} — {C.orgSubtitulo}</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Panel Administrador</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={onConfig} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12, transition: "background .2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.15)"}>
            ⚙️ Configurar
          </button>
          <button onClick={cargar} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12, transition: "background .2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.15)"}>
            {loading ? "⏳" : "🔄"} Actualizar
          </button>
          <button onClick={toggleDarkMode} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, padding: "6px 10px", fontWeight: 600, cursor: "pointer", fontSize: 16, transition: "background .2s, transform .3s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.15)"}>
            {C.darkMode ? "☀️" : "🌙"}
          </button>
          <button onClick={() => { setAuthed(false); onLogout(); }}
            style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12, transition: "background .2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.15)"}>
            Salir
          </button>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-card)", padding: "0 20px", display: "flex" }}>
        {tabBtn("historial", `Historial (${servicios.length})`, "📋")}
        {tabBtn("informe", "Generar Informe", "📊")}
      </div>

      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>

        {/* HISTORIAL */}
        {tab === "historial" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span>Historial completo — {servicios.length} registro(s)</span>
              {!C.appsScriptUrl && <span style={{ fontSize: 11, color: "var(--star)", background: "var(--bg-warning)", padding: "2px 8px", borderRadius: 6 }}>⚠ Modo local</span>}
              <button onClick={imprimirTodo} style={{ marginLeft: "auto", background: C.colorPrimario, color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12, transition: "opacity .2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>🖨️ Imprimir filtrados</button>
            </div>
            {/* Filtros */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, padding: 12, marginBottom: 14, boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                {[{ label: "Desde", key: "desde" }, { label: "Hasta", key: "hasta" }].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>{f.label}</label>
                    <input type="date" value={rango[f.key]} onChange={e => setRango(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...inp2, width: "100%" }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Tipo</label>
                  <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inp2, width: "100%" }}>
                    <option value="">Todos</option>{C.tipos.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Modalidad</label>
                  <select value={filtroMod} onChange={e => setFiltroMod(e.target.value)} style={{ ...inp2, width: "100%" }}>
                    <option value="">Todas</option>{C.modalidades.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Actividad</label>
                  <select value={filtroAct} onChange={e => setFiltroAct(e.target.value)} style={{ ...inp2, width: "100%" }}>
                    <option value="">Todas</option>{C.actividades.map(a => <option key={a.id} value={String(a.id)}>{a.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Cargando...</div>
              : servicios.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", border: "1px dashed var(--border-light)", borderRadius: 10 }}>Sin registros</div>
                : filtrados.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", border: "1px dashed var(--border-light)", borderRadius: 10 }}>Sin registros en este período</div>
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[...filtrados].reverse().map(s => {
                      const act = C.actividades.find(a => String(a.id) === String(s.actividadId));
                      const modIco = C.modalidadIconos[s.modalidad] || "📍";
                      return (
                        <div key={s.id} style={{ border: "1px solid var(--border-light)", borderRadius: 10, padding: 14, background: "var(--bg-card)", display: "flex", gap: 12, alignItems: "flex-start", boxShadow: "var(--shadow-sm)", transition: "box-shadow .2s, transform .2s" }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)" }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "none" }}>
                          <div style={{ background: "var(--bg-accent)", borderRadius: 8, padding: "8px 10px", textAlign: "center", minWidth: 46, flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: C.colorAcento }}>{s.calificacion}</div>
                            <div style={{ fontSize: 11, color: "var(--star)" }}>{"★".repeat(Number(s.calificacion))}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>
                              <span style={{ background: "var(--tag-tipo)", color: "var(--tag-tipo-text)", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>{s.tipo}</span>
                              <span style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>{fmtDateTime(s.creadoEn)}</span>
                              <span style={{ background: "var(--tag-modalidad)", color: "var(--tag-modalidad-text)", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>{modIco} {s.modalidad}</span>
                              {s.programa && <span style={{ background: "var(--tag-programa)", color: "var(--tag-programa-text)", borderRadius: 6, padding: "1px 8px", fontSize: 11 }}>{s.programa}</span>}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)" }}>{s.nombre}</div>
                            <div style={{ fontSize: 12, color: C.colorAcento, marginTop: 1 }}>{act?.label || s.actividad || "—"}</div>
                            {s.descripcion && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{s.descripcion}</div>}
                            {s.comentario && <div style={{ fontSize: 11, color: "var(--text-comment)", fontStyle: "italic", marginTop: 2 }}>"{s.comentario}"</div>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                            <button onClick={() => imprimirDetalle(s)} style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border-light)", borderRadius: 6, padding: "4px 8px", fontSize: 10, cursor: "pointer", transition: "background .15s" }}
                              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-accent)"}
                              onMouseLeave={e => e.currentTarget.style.background = "var(--bg-muted)"}
                              title="Imprimir detalle">🖨️</button>
                            <button onClick={() => eliminar(s.id)} style={{ background: "var(--danger-bg)", color: "var(--danger-text)", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
          </div>
        )}

        {/* INFORME */}
        {tab === "informe" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-main)", marginBottom: 14 }}>Generar Informe por Período</div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, padding: 16, marginBottom: 18, boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10 }}>
                {[{ label: "Desde", key: "desde" }, { label: "Hasta", key: "hasta" }].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>{f.label}</label>
                    <input type="date" value={rango[f.key]} onChange={e => setRango(p => ({ ...p, [f.key]: e.target.value }))} style={{ ...inp2, width: "100%" }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Tipo</label>
                  <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inp2, width: "100%" }}>
                    <option value="">Todos</option>{C.tipos.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Modalidad</label>
                  <select value={filtroMod} onChange={e => setFiltroMod(e.target.value)} style={{ ...inp2, width: "100%" }}>
                    <option value="">Todas</option>{C.modalidades.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 3 }}>Actividad</label>
                  <select value={filtroAct} onChange={e => setFiltroAct(e.target.value)} style={{ ...inp2, width: "100%" }}>
                    <option value="">Todas</option>{C.actividades.map(a => <option key={a.id} value={String(a.id)}>{a.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Total casos", val: filtrados.length, color: C.colorAcento, bg: "var(--bg-accent)" },
                { label: "Actividades", val: porActividad.length, color: "var(--tag-modalidad-text)", bg: "var(--bg-success)" },
                { label: "Calif. prom.", val: promGlobal ? `${promGlobal}★` : "—", color: "var(--star)", bg: "var(--bg-warning)" },
                { label: "Usuarios únicos", val: new Set(filtrados.map(s => s.nombre)).size, color: "var(--tag-programa-text)", bg: "var(--tag-programa)" },
                { label: "Presencial", val: filtrados.filter(s => s.modalidad === "Presencial").length, color: "#0891b2", bg: "var(--bg-accent)" },
              ].map(m => (
                <div key={m.label} style={{ background: m.bg, borderRadius: 10, padding: "14px 8px", textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.val}</div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {filtrados.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                {porModalidad.map(({ m, total }) => {
                  const ico = C.modalidadIconos[m] || "📍";
                  return total > 0 ? (
                    <div key={m} style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{ico}</span>
                      <div><div style={{ fontWeight: 700, fontSize: 13 }}>{total}</div><div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{m}</div></div>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {filtrados.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", border: "1px dashed var(--border-light)", borderRadius: 10 }}>Sin registros en el período</div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-main)", marginBottom: 8 }}>Cuadro Centralizador</div>
                <div style={{ overflowX: "auto", marginBottom: 18, borderRadius: 10, border: "1px solid var(--border-light)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: C.colorPrimario, color: "#fff" }}>
                        {["#", "Actividad", "Casos", "Presencial", "Virtual", "En línea", "Calif. Prom."].map(h => (
                          <th key={h} style={{ padding: "9px 10px", textAlign: h === "Actividad" ? "left" : "center", fontWeight: 600, fontSize: 11, letterSpacing: .5, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {porActividad.map((a, i) => {
                        const pres = a.items.filter(s => s.modalidad === "Presencial").length;
                        const virt = a.items.filter(s => s.modalidad === "Virtual").length;
                        const onl = a.items.filter(s => s.modalidad === "En línea").length;
                        return (
                          <tr key={a.id} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-muted)", transition: "background .15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-accent)" }}
                            onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? "var(--bg-card)" : "var(--bg-muted)" }}>
                            <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)", textAlign: "center", fontWeight: 700, color: C.colorAcento }}>{i + 1}</td>
                            <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)" }}>{a.label}</td>
                            <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)", textAlign: "center", fontWeight: 700 }}>{a.total}</td>
                            <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)", textAlign: "center" }}>{pres || "—"}</td>
                            <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)", textAlign: "center" }}>{virt || "—"}</td>
                            <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)", textAlign: "center" }}>{onl || "—"}</td>
                            <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border-light)", textAlign: "center" }}>
                              <span style={{ color: "var(--star)" }}>{"★".repeat(Math.round(a.promedio))}</span> <b>{a.promedio}</b>
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: "var(--bg-muted)", fontWeight: 700 }}>
                        <td colSpan={2} style={{ padding: "7px 10px", textAlign: "right" }}>TOTAL</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", color: "var(--text-main)" }}>{filtrados.length}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center" }}>{filtrados.filter(s => s.modalidad === "Presencial").length}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center" }}>{filtrados.filter(s => s.modalidad === "Virtual").length}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center" }}>{filtrados.filter(s => s.modalidad === "En línea").length}</td>
                        <td style={{ padding: "7px 10px", textAlign: "center", color: "var(--star)" }}>{promGlobal} ★</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => window.print()}
                    style={{ background: C.colorPrimario, color: "#fff", border: "none", borderRadius: 8, padding: "11px 26px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                    🖨️ Imprimir informe
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [mode, setMode] = useState(
    window.location.hash === "#admin" ? "admin" : "publico"
  );
  const [config, setConfig] = useState({ ...CONFIG_DEFAULT, darkMode: false });
  const [showConfig, setShowConfig] = useState(false);
  const configLoaded = useRef(false);

  useEffect(() => {
    if (!configLoaded.current && CONFIG_DEFAULT.appsScriptUrl) {
      configLoaded.current = true;
      const url = CONFIG_DEFAULT.appsScriptUrl;

      Promise.all([
        apiLoadConfig(url).catch(() => null),
        apiGetActividades(url).catch(() => null),
        apiGetTipos(url).catch(() => null),
      ]).then(([cfg, acts, tipos]) => {
        setConfig(prev => ({
          ...CONFIG_DEFAULT,
          ...(cfg || {}),
          darkMode: prev.darkMode,
          actividades: acts || cfg?.actividades || CONFIG_DEFAULT.actividades,
          tipos: tipos || cfg?.tipos || CONFIG_DEFAULT.tipos,
          textos: { ...CONFIG_DEFAULT.textos, ...(cfg?.textos || {}) }
        }));
      });
    }
  }, []);

  const getUrl = () => config.appsScriptUrl;

  useEffect(() => {
    document.body.classList.toggle("dark", config.darkMode);
  }, [config.darkMode]);

  const effectiveConfig = useMemo(() => {
    if (!config.darkMode) return config;
    return {
      ...config,
      colorPrimario: config.darkColorPrimario,
      colorAcento: config.darkColorAcento,
      colorFondo: config.darkColorFondo,
      colorFondoAlt: config.darkColorFondoAlt,
    };
  }, [config]);

  const toggleDarkMode = () => setConfig(prev => ({ ...prev, darkMode: !prev.darkMode }));

  const handleSaveConfig = async () => {
    const url = getUrl();
    if (!url) return;
    await apiSaveConfig(url, config);
    await Promise.all([
      apiSaveData(url, config.actividades, "Actividades"),
      apiSaveData(url, config.tipos, "Tipos"),
    ]);
  };

  const handleSaveActividades = async () => {
    const url = getUrl();
    if (!url) return;
    await apiSaveData(url, config.actividades, "Actividades");
  };

  const handleSaveTipos = async () => {
    const url = getUrl();
    if (!url) return;
    await apiSaveData(url, config.tipos, "Tipos");
  };

  return (
    <>
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "url(/cepi.png)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
        opacity: 0.07,
        pointerEvents: "none",
        zIndex: 9998,
      }} />
      {showConfig && (
        <PanelConfig
          config={config}
          setConfig={setConfig}
          onClose={() => setShowConfig(false)}
          onSaveConfig={handleSaveConfig}
          onSaveActividades={handleSaveActividades}
          onSaveTipos={handleSaveTipos}
        />
      )}
      {mode === "admin"
        ? <VistaAdmin cfg={effectiveConfig} onLogout={() => { window.location.hash = ""; setMode("publico"); }} onConfig={() => setShowConfig(true)} toggleDarkMode={toggleDarkMode} />
        : <VistaPublica
            cfg={effectiveConfig}
            onAdminLogin={() => { window.location.hash = "admin"; setMode("admin"); }}
            toggleDarkMode={toggleDarkMode}
          />
      }
    </>
  );
}