import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Bell,
  ChevronDown,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";


export default function Header() {
  const navigate =
    useNavigate();

  const menuRef =
    useRef(null);

  const {
    displayName,
    initials,
    roleLabel,
    profile,
    logout,
  } =
    useAuth();


  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);


  /* =========================================================
     CERRAR MENÚ AL CLICK AFUERA
     ========================================================= */

  useEffect(() => {
    function handleOutsideClick(
      event
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {
        setMenuOpen(false);
      }
    }


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);


  /* =========================================================
     LOGOUT
     ========================================================= */

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logout();

      navigate(
        "/login",
        {
          replace: true,
        }
      );

    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );

    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
    }
  }


  return (
    <header className="topbar">

      <div className="topbar-context">

        <span className="topbar-context-kicker">
          PETRA
        </span>

        <strong>
          Seguimiento de ejecutantes
        </strong>

      </div>


      <div className="topbar-user">

        <button
          type="button"
          className="notification-button"
          onClick={() =>
            navigate("/alertas")
          }
          title="Alertas"
        >
          <Bell size={19} />
        </button>


        <div className="user-avatar">
          {initials}
        </div>


        <div className="user-info">

          <strong>
            {displayName}
          </strong>

          <span>
            {roleLabel}
          </span>

        </div>


        <div
          ref={menuRef}
          className="header-user-menu-wrapper"
        >

          <button
            className={`header-user-menu ${
              menuOpen
                ? "active"
                : ""
            }`}
            type="button"
            title="Opciones de usuario"
            aria-expanded={
              menuOpen
            }
            onClick={() =>
              setMenuOpen(
                (current) =>
                  !current
              )
            }
          >
            <ChevronDown
              size={16}
            />
          </button>


          {menuOpen && (

            <div className="header-profile-dropdown">

              <div className="header-profile-dropdown-head">

                <div className="header-profile-dropdown-avatar">
                  {initials}
                </div>

                <div>
                  <strong>
                    {displayName}
                  </strong>

                  <span>
                    {profile?.email ||
                      ""}
                  </span>
                </div>

              </div>


              <div className="header-profile-role">

                <ShieldCheck
                  size={14}
                />

                <div>
                  <span>
                    Rol de acceso
                  </span>

                  <strong>
                    {roleLabel}
                  </strong>
                </div>

              </div>


              <div className="header-profile-separator" />


              <button
                type="button"
                className="header-profile-action"
                onClick={() => {
                  setMenuOpen(false);
                }}
              >
                <UserRound
                  size={15}
                />

                <span>
                  {displayName}
                </span>
              </button>


              <button
                type="button"
                className="header-profile-action logout"
                onClick={
                  handleLogout
                }
                disabled={
                  loggingOut
                }
              >
                <LogOut
                  size={15}
                />

                <span>
                  {loggingOut
                    ? "Cerrando..."
                    : "Cerrar sesión"}
                </span>
              </button>

            </div>

          )}

        </div>

      </div>

    </header>
  );
}