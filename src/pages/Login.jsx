import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  History,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";


export default function Login() {
  const navigate = useNavigate();

  const {
    user,
    login,
    loading: authLoading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [remember, setRemember] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    if (
      !authLoading &&
      user
    ) {
      navigate("/", {
        replace: true,
      });
    }
  }, [
    authLoading,
    user,
    navigate,
  ]);


  async function handleSubmit(e) {
    e.preventDefault();

    if (
      !email.trim() ||
      !password
    ) {
      setError(
        "Ingresá tu email y contraseña."
      );

      return;
    }


    try {
      setLoading(true);
      setError("");

      await login(
        email.trim(),
        password
      );

      navigate("/", {
        replace: true,
      });

    } catch (err) {
      console.error(
        "Error iniciando sesión:",
        err
      );

      if (
        err?.message
          ?.toLowerCase()
          ?.includes(
            "invalid login credentials"
          )
      ) {
        setError(
          "El email o la contraseña no son correctos."
        );
      } else {
        setError(
          "No se pudo iniciar sesión. Intentá nuevamente."
        );
      }

    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="login-page-v2">

      {/* =====================================================
          PANEL VISUAL
          ===================================================== */}

      <section className="login-visual-panel">

        <div className="login-visual-overlay" />


        <div className="login-brand">

          <div className="login-brand-ypf">
            YPF
          </div>

          <div className="login-brand-divider" />

          <div>
            <span>
              PORTAL DE
            </span>

            <strong>
              Personal de Ejecución
            </strong>
          </div>

        </div>


        <div className="login-visual-content">

          <span className="login-kicker">
            IDENTIDAD · ACCESOS · TRAZABILIDAD
          </span>


          <h1>
            Una única fuente de
            <br />
            información para el
            <br />
            personal de ejecución.
          </h1>


          <p>
            Consulta centralizada de ejecutantes,
            empresas contratistas, credenciales IBM,
            vencimientos y actividad de soporte.
          </p>

        </div>


        <div className="login-feature-grid">

          <article className="login-feature-card">

            <div>
              <KeyRound size={17} />
            </div>

            <div>
              <strong>
                Identidad IBM
              </strong>

              <span>
                Seguimiento de credenciales,
                estados y vencimientos.
              </span>
            </div>

          </article>


          <article className="login-feature-card">

            <div>
              <Building2 size={17} />
            </div>

            <div>
              <strong>
                Empresas contratistas
              </strong>

              <span>
                Personal y seguimiento
                centralizado por empresa.
              </span>
            </div>

          </article>


          <article className="login-feature-card">

            <div>
              <History size={17} />
            </div>

            <div>
              <strong>
                Trazabilidad
              </strong>

              <span>
                Registro de cambios,
                acciones y actividad.
              </span>
            </div>

          </article>

        </div>


        <div className="login-visual-footer">
          Uso interno · Portal de soporte operativo
        </div>

      </section>


      {/* =====================================================
          LOGIN
          ===================================================== */}

      <section className="login-access-panel">

        <div className="login-card-v2">

          <div className="login-lock-icon">
            <LockKeyhole size={23} />
          </div>


          <div className="login-card-heading">

            <span>
              ACCESO AL PORTAL
            </span>

            <h2>
              Iniciar sesión
            </h2>

            <p>
              Ingresá con tus credenciales
              autorizadas.
            </p>

          </div>


          <form
            className="login-form-v2"
            onSubmit={handleSubmit}
          >

            {/* EMAIL */}

            <label className="login-field">

              <span>
                Email corporativo
              </span>

              <div className="login-input-wrap">

                <Mail size={16} />

                <input
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@ypf.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                />

              </div>

            </label>


            {/* PASSWORD */}

            <label className="login-field">

              <span>
                Contraseña
              </span>

              <div className="login-input-wrap">

                <LockKeyhole size={16} />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  placeholder="Ingresá tu contraseña"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                />


                <button
                  type="button"
                  className="login-show-password"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>

              </div>

            </label>


            {/* OPTIONS */}

            <div className="login-options">

              <label className="login-remember">

                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) =>
                    setRemember(
                      e.target.checked
                    )
                  }
                />

                <span>
                  Mantener sesión
                </span>

              </label>


            </div>


            {/* ERROR */}

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}


            {/* SUBMIT */}

            <button
              type="submit"
              className="login-submit"
              disabled={
                loading ||
                authLoading
              }
            >
              <span>
                {loading
                  ? "Ingresando..."
                  : "Ingresar al portal"}
              </span>

              {!loading && (
                <ArrowRight
                  size={17}
                />
              )}
            </button>

          </form>


          <div className="login-security">

            <ShieldCheck size={17} />

            <p>
              El acceso y las acciones realizadas
              dentro del portal quedan registrados
              por motivos de seguridad y auditoría.
            </p>

          </div>

        </div>


        <div className="login-version">
          Portal Personal de Ejecución
          <span>·</span>
          v1.0
        </div>

      </section>

    </div>
  );
}