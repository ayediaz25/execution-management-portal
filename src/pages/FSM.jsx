import { useEffect, useMemo, useState } from "react";
import {
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Save,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function FSM() {
  const [ejecutantes, setEjecutantes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("ejecutantes")
      .select("id,nombre,apellido,nombre_completo,dni,empresa_id,usuario_ibm,email,activo")
      .eq("activo", true)
      .order("nombre_completo", { ascending: true });

    if (error) {
      console.error(error);
      setMensaje("No se pudo cargar el personal.");
      setEjecutantes([]);
    } else {
      setEjecutantes(data || []);
    }

    setLoading(false);
  }

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ejecutantes;

    return ejecutantes.filter((e) =>
      [e.nombre_completo, e.nombre, e.apellido, e.dni, e.usuario_ibm, e.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [ejecutantes, search]);

  async function seleccionar(item) {
    setSelected(item);
    setPassword("");
    setVisible(false);
    setMensaje("");

    const { data, error } = await supabase.rpc("obtener_credencial_fsm", {
      p_ejecutante_id: item.id,
      p_accion: "ver",
    });

    if (error) {
      console.error(error);
      setMensaje(error.message || "No se pudo consultar FSM.");
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (row?.valor) setPassword(row.valor);
  }

  async function copiar() {
    if (!selected || !password) return;

    const { error } = await supabase.rpc("obtener_credencial_fsm", {
      p_ejecutante_id: selected.id,
      p_accion: "copiar",
    });

    if (error) {
      setMensaje(error.message || "No se pudo registrar la copia.");
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      setMensaje("Contraseña FSM copiada.");
    } catch {
      setMensaje("No se pudo copiar automáticamente.");
    }
  }

  async function guardar() {
    if (!selected || !password.trim()) {
      setMensaje("Seleccioná un ejecutante e ingresá una contraseña FSM.");
      return;
    }

    setSaving(true);
    setMensaje("");

    const { error } = await supabase.rpc("guardar_credencial_fsm", {
      p_ejecutante_id: selected.id,
      p_password: password,
    });

    if (error) {
      console.error(error);
      setMensaje(error.message || "No se pudo guardar la contraseña FSM.");
    } else {
      setMensaje("Contraseña FSM guardada correctamente.");
    }

    setSaving(false);
  }

  return (
    <div className="fsm-page">
      <div className="fsm-header">
        <div>
          <div className="fsm-eyebrow">
            <ShieldCheck size={15} />
            Acceso restringido
          </div>
          <h1>Credenciales FSM</h1>
          <p>Gestión exclusiva de contraseñas FSM para personal de ejecución.</p>
        </div>

        <button type="button" className="fsm-refresh" onClick={cargar} disabled={loading}>
          <RefreshCcw size={17} />
          Actualizar
        </button>
      </div>

      {mensaje && <div className="fsm-message">{mensaje}</div>}

      <div className="fsm-layout">
        <section className="fsm-list-card">
          <label className="fsm-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, DNI, usuario IBM o email..."
            />
          </label>

          <div className="fsm-list">
            {loading ? (
              <div className="fsm-empty">Cargando...</div>
            ) : filtrados.length === 0 ? (
              <div className="fsm-empty">Sin resultados.</div>
            ) : (
              filtrados.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`fsm-person-row ${selected?.id === item.id ? "active" : ""}`}
                  onClick={() => seleccionar(item)}
                >
                  <div>
                    <strong>
                      {item.nombre_completo ||
                        `${item.nombre || ""} ${item.apellido || ""}`.trim()}
                    </strong>
                    <span>{item.usuario_ibm || "Sin usuario IBM"}</span>
                  </div>
                  <small>{item.dni || "Sin DNI"}</small>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="fsm-detail-card">
          {!selected ? (
            <div className="fsm-empty">
              Seleccioná una persona para gestionar su contraseña FSM.
            </div>
          ) : (
            <>
              <div className="fsm-detail-title">
                <div className="fsm-key-icon">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h2>
                    {selected.nombre_completo ||
                      `${selected.nombre || ""} ${selected.apellido || ""}`.trim()}
                  </h2>
                  <p>Usuario IBM: {selected.usuario_ibm || "Sin informar"}</p>
                </div>
              </div>

              <label className="fsm-field">
                <span>Contraseña FSM</span>
                <div className="fsm-password-input">
                  <input
                    type={visible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresar contraseña FSM"
                  />
                  <button type="button" onClick={() => setVisible((v) => !v)}>
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                  <button type="button" onClick={copiar} disabled={!password}>
                    <Copy size={17} />
                  </button>
                </div>
              </label>

              <button type="button" className="fsm-save" onClick={guardar} disabled={saving}>
                <Save size={17} />
                {saving ? "Guardando..." : "Guardar contraseña FSM"}
              </button>

              <div className="fsm-warning">
                Este perfil puede gestionar únicamente FSM. No tiene acceso a
                contraseñas IBM, PIN IBM, Login PETRA ni administración.
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
