import { useEffect, useMemo, useState } from "react";

import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Copy,
  NotebookTabs,
  Building2,
  UserRound,
  KeyRound,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";


const EMPTY_FORM = {
  id: null,
  usuario: "",
  empresa: "",
  nombre_apellido: "",
  password_petra: "",
  login: "",
  sala_sector: "",
};


export default function Otros() {
  const { canEdit } = useAuth();

  const [registros, setRegistros] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [passwords, setPasswords] =
    useState({});

  const [visiblePasswords, setVisiblePasswords] =
    useState({});

  const [loadingPasswordId, setLoadingPasswordId] =
    useState(null);

  const [deletingId, setDeletingId] =
    useState(null);


  useEffect(() => {
    if (canEdit) {
      cargarRegistros();
    } else {
      setLoading(false);
    }
  }, [canEdit]);


  async function cargarRegistros() {
    setLoading(true);
    setError("");

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "listar_otros_registros"
      );

      if (rpcError) {
        throw rpcError;
      }

      setRegistros(data || []);
    } catch (err) {
      console.error(
        "Error cargando Otros:",
        err
      );

      setError(
        err?.message ||
          "No se pudieron cargar los registros."
      );

      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }


  const registrosFiltrados =
    useMemo(() => {
      const termino =
        search
          .trim()
          .toLowerCase();

      if (!termino) {
        return registros;
      }

      return registros.filter(
        (registro) =>
          [
            registro.usuario,
            registro.empresa,
            registro.nombre_apellido,
            registro.login,
            registro.sala_sector,
          ]
            .filter(Boolean)
            .some((valor) =>
              String(valor)
                .toLowerCase()
                .includes(termino)
            )
      );
    }, [registros, search]);


  function abrirNuevo() {
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }


  function abrirEditar(registro) {
    setForm({
      id: registro.id,
      usuario:
        registro.usuario || "",
      empresa:
        registro.empresa || "",
      nombre_apellido:
        registro.nombre_apellido || "",
      password_petra: "",
      login:
        registro.login || "",
      sala_sector:
        registro.sala_sector || "",
    });

    setFormError("");
    setModalOpen(true);
  }


  function cerrarModal() {
    if (saving) return;

    setModalOpen(false);
    setForm(EMPTY_FORM);
    setFormError("");
  }


  function actualizarCampo(
    campo,
    valor
  ) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }


  async function guardarRegistro(
    event
  ) {
    event.preventDefault();

    if (
      !form.nombre_apellido.trim()
    ) {
      setFormError(
        "Ingresá nombre y apellido."
      );
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const {
        error: rpcError,
      } = await supabase.rpc(
        "guardar_otro_registro",
        {
          p_id: form.id || null,
          p_usuario:
            form.usuario.trim() ||
            null,
          p_empresa:
            form.empresa.trim() ||
            null,
          p_nombre_apellido:
            form.nombre_apellido.trim(),
          p_password_petra:
            form.password_petra ||
            null,
          p_login:
            form.login.trim() ||
            null,
          p_sala_sector:
            form.sala_sector.trim() ||
            null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);

      await cargarRegistros();
    } catch (err) {
      console.error(
        "Error guardando registro Otros:",
        err
      );

      setFormError(
        err?.message ||
          "No se pudo guardar el registro."
      );
    } finally {
      setSaving(false);
    }
  }


  async function cargarPassword(
    registro
  ) {
    if (
      passwords[registro.id] !==
      undefined
    ) {
      setVisiblePasswords(
        (prev) => ({
          ...prev,
          [registro.id]:
            !prev[registro.id],
        })
      );
      return;
    }

    setLoadingPasswordId(
      registro.id
    );

    try {
      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "ver_otro_password_petra",
        {
          p_id: registro.id,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const row =
        Array.isArray(data)
          ? data[0]
          : data;

      setPasswords((prev) => ({
        ...prev,
        [registro.id]:
          row?.password_petra ||
          "",
      }));

      setVisiblePasswords(
        (prev) => ({
          ...prev,
          [registro.id]: true,
        })
      );
    } catch (err) {
      console.error(
        "Error leyendo contraseña PETRA:",
        err
      );

      window.alert(
        err?.message ||
          "No se pudo visualizar la contraseña."
      );
    } finally {
      setLoadingPasswordId(null);
    }
  }


  async function copiarPassword(
    registro
  ) {
    let password =
      passwords[registro.id];

    if (
      password === undefined
    ) {
      setLoadingPasswordId(
        registro.id
      );

      try {
        const {
          data,
          error: rpcError,
        } = await supabase.rpc(
          "ver_otro_password_petra",
          {
            p_id: registro.id,
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        const row =
          Array.isArray(data)
            ? data[0]
            : data;

        password =
          row?.password_petra ||
          "";

        setPasswords((prev) => ({
          ...prev,
          [registro.id]:
            password,
        }));
      } catch (err) {
        console.error(
          "Error copiando contraseña PETRA:",
          err
        );

        window.alert(
          "No se pudo copiar la contraseña."
        );

        setLoadingPasswordId(
          null
        );
        return;
      }

      setLoadingPasswordId(null);
    }

    if (!password) {
      window.alert(
        "Este registro no tiene contraseña PETRA cargada."
      );
      return;
    }

    await navigator.clipboard.writeText(
      password
    );
  }


  async function eliminarRegistro(
    registro
  ) {
    const confirmar =
      window.confirm(
        `¿Eliminar a ${registro.nombre_apellido} de Otros?`
      );

    if (!confirmar) return;

    setDeletingId(
      registro.id
    );

    try {
      const {
        error: rpcError,
      } = await supabase.rpc(
        "eliminar_otro_registro",
        {
          p_id: registro.id,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setPasswords((prev) => {
        const next = {
          ...prev,
        };

        delete next[
          registro.id
        ];

        return next;
      });

      await cargarRegistros();
    } catch (err) {
      console.error(
        "Error eliminando registro Otros:",
        err
      );

      window.alert(
        err?.message ||
          "No se pudo eliminar el registro."
      );
    } finally {
      setDeletingId(null);
    }
  }


  if (!canEdit) {
    return (
      <div className="page otros-page">
        <section className="glass-card otros-access-denied">
          <ShieldCheck size={26} />

          <div>
            <strong>
              Módulo exclusivo de Soporte
            </strong>

            <span>
              Esta página contiene información operativa y credenciales PETRA.
            </span>
          </div>
        </section>
      </div>
    );
  }


  return (
    <div className="page otros-page">

      <section className="page-hero">
        <div>
          <span className="page-eyebrow">
            SOPORTE · REGISTRO MANUAL
          </span>

          <h1>
            Otros
          </h1>

          <p>
            Bloc operativo para accesos PETRA que se gestionan manualmente fuera del circuito habitual de ejecutantes.
          </p>
        </div>

        <button
          type="button"
          className="otros-primary-button"
          onClick={abrirNuevo}
        >
          <Plus size={17} />
          Agregar persona
        </button>
      </section>


      <section className="otros-summary-grid">

        <article className="glass-card otros-summary-card">
          <NotebookTabs size={19} />

          <div>
            <span>
              Registros
            </span>

            <strong>
              {registros.length}
            </strong>
          </div>
        </article>


        <article className="glass-card otros-summary-card">
          <KeyRound size={19} />

          <div>
            <span>
              Con contraseña PETRA
            </span>

            <strong>
              {
                registros.filter(
                  (item) =>
                    item.tiene_password_petra
                ).length
              }
            </strong>
          </div>
        </article>
      </section>


      <section className="glass-card otros-filter-panel">
        <Search size={18} />

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Buscar por nombre, usuario, empresa, login o sala/sector..."
        />
      </section>


      {loading ? (
        <section className="glass-card otros-empty">
          Cargando registros...
        </section>
      ) : error ? (
        <section className="glass-card otros-empty error">
          {error}
        </section>
      ) : registrosFiltrados.length ===
        0 ? (
        <section className="glass-card otros-empty">
          <NotebookTabs size={28} />

          <strong>
            No hay registros
          </strong>

          <span>
            Agregá una persona para comenzar a utilizar este bloc de soporte.
          </span>
        </section>
      ) : (
        <section className="glass-card otros-table-card">

          <div className="otros-table-scroll">
            <table className="otros-table">
              <thead>
                <tr>
                  <th>
                    Nombre y apellido
                  </th>
                  <th>
                    Usuario
                  </th>
                  <th>
                    Empresa
                  </th>
                  <th>
                    Login
                  </th>
                  <th>
                    Contraseña PETRA
                  </th>
                  <th>
                    Sala / Sector
                  </th>
                  <th>
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {registrosFiltrados.map(
                  (registro) => {
                    const visible =
                      Boolean(
                        visiblePasswords[
                          registro.id
                        ]
                      );

                    const password =
                      passwords[
                        registro.id
                      ];

                    return (
                      <tr
                        key={
                          registro.id
                        }
                      >
                        <td>
                          <div className="otros-name-cell">
                            <UserRound
                              size={16}
                            />

                            <strong>
                              {
                                registro.nombre_apellido
                              }
                            </strong>
                          </div>
                        </td>

                        <td>
                          {
                            registro.usuario ||
                            "—"
                          }
                        </td>

                        <td>
                          <div className="otros-inline-cell">
                            <Building2
                              size={14}
                            />

                            <span>
                              {
                                registro.empresa ||
                                "—"
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          {
                            registro.login ||
                            "—"
                          }
                        </td>

                        <td>
                          <div className="otros-password-cell">

                            <span className="otros-password-value">
                              {!registro.tiene_password_petra
                                ? "Sin información"
                                : loadingPasswordId ===
                                    registro.id
                                ? "Cargando..."
                                : visible
                                ? password ||
                                  "Sin información"
                                : "••••••••••••"}
                            </span>

                            {registro.tiene_password_petra && (
                              <div className="otros-password-actions">

                                <button
                                  type="button"
                                  title={
                                    visible
                                      ? "Ocultar"
                                      : "Ver"
                                  }
                                  onClick={() =>
                                    cargarPassword(
                                      registro
                                    )
                                  }
                                >
                                  {visible ? (
                                    <EyeOff
                                      size={15}
                                    />
                                  ) : (
                                    <Eye
                                      size={15}
                                    />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  title="Copiar"
                                  onClick={() =>
                                    copiarPassword(
                                      registro
                                    )
                                  }
                                >
                                  <Copy
                                    size={15}
                                  />
                                </button>

                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="otros-inline-cell">
                            <MapPin
                              size={14}
                            />

                            <span>
                              {
                                registro.sala_sector ||
                                "—"
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="otros-row-actions">

                            <button
                              type="button"
                              title="Editar"
                              onClick={() =>
                                abrirEditar(
                                  registro
                                )
                              }
                            >
                              <Pencil
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              className="danger"
                              title="Eliminar"
                              disabled={
                                deletingId ===
                                registro.id
                              }
                              onClick={() =>
                                eliminarRegistro(
                                  registro
                                )
                              }
                            >
                              <Trash2
                                size={15}
                              />
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}


      {modalOpen && (
        <div
          className="otros-modal-backdrop"
          onMouseDown={cerrarModal}
        >
          <section
            className="otros-modal glass-card"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="otros-modal-header">
              <div>
                <span className="page-eyebrow">
                  SOPORTE
                </span>

                <h2>
                  {form.id
                    ? "Editar registro"
                    : "Agregar persona"}
                </h2>
              </div>

              <button
                type="button"
                className="otros-modal-close"
                onClick={cerrarModal}
              >
                <X size={18} />
              </button>
            </div>


            <form
              className="otros-form"
              onSubmit={
                guardarRegistro
              }
            >
              <label>
                <span>
                  Nombre y apellido *
                </span>

                <input
                  type="text"
                  value={
                    form.nombre_apellido
                  }
                  onChange={(event) =>
                    actualizarCampo(
                      "nombre_apellido",
                      event.target.value
                    )
                  }
                  placeholder="Ej. Juan Pérez"
                />
              </label>


              <label>
                <span>
                  Empresa
                </span>

                <input
                  type="text"
                  value={form.empresa}
                  onChange={(event) =>
                    actualizarCampo(
                      "empresa",
                      event.target.value
                    )
                  }
                  placeholder="Ej. AESA / Interno YPF"
                />
              </label>


              <label>
                <span>
                  Usuario
                </span>

                <input
                  type="text"
                  value={form.usuario}
                  onChange={(event) =>
                    actualizarCampo(
                      "usuario",
                      event.target.value
                    )
                  }
                  placeholder="Usuario de referencia"
                />
              </label>


              <label>
                <span>
                  Login
                </span>

                <input
                  type="text"
                  value={form.login}
                  onChange={(event) =>
                    actualizarCampo(
                      "login",
                      event.target.value
                    )
                  }
                  placeholder="Login PETRA"
                />
              </label>


              <label>
                <span>
                  Contraseña PETRA
                </span>

                <input
                  type="password"
                  value={
                    form.password_petra
                  }
                  autoComplete="new-password"
                  onChange={(event) =>
                    actualizarCampo(
                      "password_petra",
                      event.target.value
                    )
                  }
                  placeholder={
                    form.id
                      ? "Vacío = conservar la actual"
                      : "Ingresar contraseña"
                  }
                />
              </label>


              <label>
                <span>
                  Sala / Sector
                </span>

                <input
                  type="text"
                  value={
                    form.sala_sector
                  }
                  onChange={(event) =>
                    actualizarCampo(
                      "sala_sector",
                      event.target.value
                    )
                  }
                  placeholder="Ej. Sala de Control / Calderas II"
                />
              </label>


              {formError && (
                <div className="otros-form-error">
                  {formError}
                </div>
              )}


              <div className="otros-modal-actions">

                <button
                  type="button"
                  className="secondary"
                  onClick={
                    cerrarModal
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={saving}
                >
                  <Save size={16} />

                  {saving
                    ? "Guardando..."
                    : "Guardar"}
                </button>

              </div>
            </form>
          </section>
        </div>
      )}

    </div>
  );
}
