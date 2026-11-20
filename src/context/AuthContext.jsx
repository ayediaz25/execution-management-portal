import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../lib/supabase";


const AuthContext =
  createContext(null);


export function AuthProvider({
  children,
}) {
  const [session, setSession] =
    useState(null);

  const [user, setUser] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const loadedUserIdRef =
    useRef(null);


  useEffect(() => {
    let mounted = true;

    async function iniciarAuth() {
      setLoading(true);

      const {
        data,
        error,
      } =
        await supabase.auth
          .getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          "Error recuperando sesión:",
          error
        );

        setSession(null);
        setUser(null);
        setProfile(null);
        loadedUserIdRef.current = null;
        setLoading(false);

        return;
      }

      const currentSession =
        data?.session || null;

      setSession(
        currentSession
      );

      setUser(
        currentSession?.user ||
          null
      );

      if (
        currentSession?.user
      ) {
        await cargarPerfil(
          currentSession.user.id
        );
      } else {
        loadedUserIdRef.current = null;
        setProfile(null);
        setLoading(false);
      }
    }


    iniciarAuth();


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          newSession
        ) => {
          if (!mounted) {
            return;
          }

          setSession(
            newSession
          );

          setUser(
            newSession?.user ||
              null
          );


          /*
           * Supabase puede emitir TOKEN_REFRESHED
           * cuando el navegador vuelve a tomar foco.
           *
           * En ese caso solo actualizamos la sesión.
           * NO volvemos a cargar el perfil ni desmontamos
           * las pantallas del portal.
           */
          if (
            event ===
              "TOKEN_REFRESHED" ||
            event ===
              "USER_UPDATED"
          ) {
            return;
          }


          if (
            event ===
              "SIGNED_OUT" ||
            !newSession?.user
          ) {
            loadedUserIdRef.current =
              null;

            setProfile(null);
            setLoading(false);

            return;
          }


          /*
           * Evita volver a consultar el mismo perfil
           * en INITIAL_SESSION / SIGNED_IN si ya fue
           * cargado por iniciarAuth().
           */
          if (
            loadedUserIdRef.current ===
            newSession.user.id
          ) {
            setLoading(false);
            return;
          }


          await cargarPerfil(
            newSession.user.id
          );
        }
      );


    return () => {
      mounted = false;
      subscription.unsubscribe();
    };

  }, []);


  async function cargarPerfil(
    userId
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from("perfiles")
        .select("*")
        .eq(
          "id",
          userId
        )
        .maybeSingle();


    if (error) {
      console.error(
        "Error cargando perfil:",
        error
      );

      loadedUserIdRef.current =
        null;

      setProfile(null);
      setLoading(false);

      return;
    }


    loadedUserIdRef.current =
      userId;

    setProfile(
      data || null
    );

    setLoading(false);
  }


  async function login(
    email,
    password
  ) {
    const {
      data,
      error,
    } =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        });


    if (error) {
      throw error;
    }


    return data;
  }


  async function logout() {
    const {
      error,
    } =
      await supabase.auth
        .signOut();


    if (error) {
      throw error;
    }
  }


  const role =
    profile?.rol || null;


  const isAdmin =
    role ===
    "administrador";


  const canEdit =
    role ===
      "administrador" ||
    role ===
      "soporte";


  const isAuditor =
    role ===
    "auditor";


  const isReadOnly =
    role ===
      "consulta" ||
    role ===
      "auditor";


  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,

        loading,

        isAdmin,
        canEdit,
        isAuditor,
        isReadOnly,

        login,
        logout,

        reloadProfile:
          () =>
            user
              ? cargarPerfil(
                  user.id
                )
              : null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const context =
    useContext(
      AuthContext
    );


  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }


  return context;
}
