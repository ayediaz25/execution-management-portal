import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const YPF_RECOVERY_URL =
  "https://ssofed.ypf.com/ufpw/recupero_clave_cp";

const YPF_ORIGIN =
  "https://ssofed.ypf.com";

const RATE_LIMIT_MINUTES = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

function decodeHtml(
  value: string,
) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function absoluteUrl(
  value: string,
  base: string,
) {
  return new URL(
    decodeHtml(value),
    base,
  ).toString();
}

function getCookies(
  headers: Headers,
) {
  const getSetCookie =
    (
      headers as Headers & {
        getSetCookie?: () => string[];
      }
    ).getSetCookie;

  const raw =
    typeof getSetCookie === "function"
      ? getSetCookie.call(headers)
      : [];

  if (raw.length) {
    return raw
      .map(
        (item) =>
          item.split(";")[0],
      )
      .filter(Boolean)
      .join("; ");
  }

  const single =
    headers.get("set-cookie");

  if (!single) {
    return "";
  }

  /*
   * Fallback suficiente para las cookies de sesión
   * observadas en este flujo. Solo conserva name=value.
   */
  return single
    .split(/,(?=[^;,]+=)/)
    .map(
      (item) =>
        item
          .trim()
          .split(";")[0],
    )
    .filter(Boolean)
    .join("; ");
}

function mergeCookies(
  current: string,
  next: string,
) {
  const map =
    new Map<string, string>();

  for (
    const source
    of [current, next]
  ) {
    for (
      const piece
      of source.split(";")
    ) {
      const item =
        piece.trim();

      if (!item) {
        continue;
      }

      const index =
        item.indexOf("=");

      if (index <= 0) {
        continue;
      }

      const name =
        item
          .slice(0, index)
          .trim();

      map.set(
        name,
        item,
      );
    }
  }

  return Array
    .from(
      map.values(),
    )
    .join("; ");
}

function getAttribute(
  tag: string,
  attribute: string,
) {
  const regex =
    new RegExp(
      `${attribute}\\s*=\\s*["']([^"']*)["']`,
      "i",
    );

  return (
    tag.match(regex)?.[1] ||
    null
  );
}

function findRecoveryForm(
  html: string,
) {
  const forms =
    Array.from(
      html.matchAll(
        /<form\b[\s\S]*?<\/form>/gi,
      ),
    ).map(
      (match) =>
        match[0],
    );

  return (
    forms.find(
      (form) =>
        /inicioRecuperoClaveForm/i
          .test(form) ||
        /IFormSubmitListener-inicioRecuperoClaveForm-formulario/i
          .test(form),
    ) ||
    forms.find(
      (form) =>
        /campos:\d+:panel:campo/i
          .test(form),
    ) ||
    null
  );
}

function parseForm(
  html: string,
  baseUrl: string,
) {
  const form =
    findRecoveryForm(html);

  if (!form) {
    throw new Error(
      "No se encontró el formulario de recuperación de YPF.",
    );
  }

  const formTag =
    form.match(
      /<form\b[^>]*>/i,
    )?.[0];

  if (!formTag) {
    throw new Error(
      "No se pudo interpretar el formulario de YPF.",
    );
  }

  const actionRaw =
    getAttribute(
      formTag,
      "action",
    );

  if (!actionRaw) {
    throw new Error(
      "YPF no informó la URL de envío del formulario.",
    );
  }

  const params =
    new URLSearchParams();

  const inputs =
    Array.from(
      form.matchAll(
        /<input\b[^>]*>/gi,
      ),
    ).map(
      (match) =>
        match[0],
    );

  let emailField =
    "";

  for (
    const input
    of inputs
  ) {
    const name =
      getAttribute(
        input,
        "name",
      );

    if (!name) {
      continue;
    }

    const type =
      (
        getAttribute(
          input,
          "type",
        ) ||
        "text"
      ).toLowerCase();

    const value =
      decodeHtml(
        getAttribute(
          input,
          "value",
        ) ||
        "",
      );

    if (
      type === "hidden"
    ) {
      params.set(
        decodeHtml(name),
        value,
      );
    }

    if (
      !emailField &&
      (
        type === "email" ||
        /campos:\d+:panel:campo/i
          .test(name) ||
        /email/i.test(name)
      )
    ) {
      emailField =
        decodeHtml(name);
    }
  }

  /*
   * El formulario observado actualmente usa:
   * campos:0:panel:campo
   * pero lo buscamos primero de forma dinámica.
   */
  if (!emailField) {
    emailField =
      "campos:0:panel:campo";
  }

  return {
    action:
      absoluteUrl(
        actionRaw,
        baseUrl,
      ),
    emailField,
    params,
  };
}

async function ypfRequest(
  email: string,
) {
  const userAgent =
    "Mozilla/5.0 (compatible; Portal-Ejecutantes/1.0)";

  const initial =
    await fetch(
      YPF_RECOVERY_URL,
      {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent":
            userAgent,
          "Accept":
            "text/html,application/xhtml+xml",
        },
      },
    );

  if (
    initial.status < 200 ||
    initial.status >= 400
  ) {
    throw new Error(
      `YPF respondió ${initial.status} al abrir el recuperador.`,
    );
  }

  const html =
    await initial.text();

  let cookies =
    getCookies(
      initial.headers,
    );

  const {
    action,
    emailField,
    params,
  } =
    parseForm(
      html,
      YPF_RECOVERY_URL,
    );

  params.set(
    emailField,
    email,
  );

  const submit =
    await fetch(
      action,
      {
        method: "POST",
        redirect: "manual",
        headers: {
          "User-Agent":
            userAgent,
          "Accept":
            "text/html,application/xhtml+xml",
          "Content-Type":
            "application/x-www-form-urlencoded",
          "Origin":
            YPF_ORIGIN,
          "Referer":
            YPF_RECOVERY_URL,
          ...(cookies
            ? {
                Cookie:
                  cookies,
              }
            : {}),
        },
        body:
          params.toString(),
      },
    );

  cookies =
    mergeCookies(
      cookies,
      getCookies(
        submit.headers,
      ),
    );

  const location =
    submit.headers.get(
      "location",
    );

  if (
    submit.status >= 300 &&
    submit.status < 400 &&
    location
  ) {
    const confirmationUrl =
      absoluteUrl(
        location,
        action,
      );

    const confirmation =
      await fetch(
        confirmationUrl,
        {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent":
              userAgent,
            "Accept":
              "text/html,application/xhtml+xml",
            "Referer":
              YPF_RECOVERY_URL,
            ...(cookies
              ? {
                  Cookie:
                    cookies,
                }
              : {}),
          },
        },
      );

    const confirmationHtml =
      await confirmation.text();

    const success =
      confirmation.ok &&
      (
        /pedido fue completado con éxito/i
          .test(
            confirmationHtml,
          ) ||
        /recibir[aá]s un e-mail/i
          .test(
            confirmationHtml,
          ) ||
        /_confirmacion/i
          .test(
            confirmation.url,
          )
      );

    return {
      success,
      status:
        confirmation.status,
      finalUrl:
        confirmation.url,
    };
  }

  const responseHtml =
    await submit.text();

  return {
    success:
      submit.ok &&
      (
        /pedido fue completado con éxito/i
          .test(
            responseHtml,
          ) ||
        /recibir[aá]s un e-mail/i
          .test(
            responseHtml,
          )
      ),
    status:
      submit.status,
    finalUrl:
      submit.url,
  };
}

Deno.serve(
  async (req) => {
    if (
      req.method === "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        },
      );
    }

    if (
      req.method !== "POST"
    ) {
      return json(
        {
          ok: false,
          error:
            "Método no permitido.",
        },
        405,
      );
    }

    try {
      const authHeader =
        req.headers.get(
          "Authorization",
        );

      if (!authHeader) {
        return json(
          {
            ok: false,
            error:
              "Sesión requerida.",
          },
          401,
        );
      }

      const supabaseUrl =
        Deno.env.get(
          "SUPABASE_URL",
        );

      const anonKey =
        Deno.env.get(
          "SUPABASE_ANON_KEY",
        );

      const serviceRoleKey =
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        );

      if (
        !supabaseUrl ||
        !anonKey ||
        !serviceRoleKey
      ) {
        throw new Error(
          "Faltan variables de entorno de Supabase.",
        );
      }

      const authClient =
        createClient(
          supabaseUrl,
          anonKey,
          {
            global: {
              headers: {
                Authorization:
                  authHeader,
              },
            },
          },
        );

      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await authClient
          .auth
          .getUser();

      if (
        userError ||
        !user
      ) {
        return json(
          {
            ok: false,
            error:
              "Sesión inválida.",
          },
          401,
        );
      }

      const admin =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              persistSession:
                false,
              autoRefreshToken:
                false,
            },
          },
        );

      const {
        data:
          perfil,
        error:
          perfilError,
      } =
        await admin
          .from(
            "perfiles",
          )
          .select(
            "id,nombre,email,rol,activo",
          )
          .eq(
            "id",
            user.id,
          )
          .maybeSingle();

      const rol =
        String(
          perfil?.rol ||
          "",
        )
          .trim()
          .toLowerCase();

      const perfilActivo =
        perfil?.activo !== false;

      if (
        perfilError ||
        !perfil ||
        !perfilActivo ||
        ![
          "administrador",
          "soporte",
        ].includes(
          rol,
        )
      ) {
        console.error(
          "Perfil sin permisos para recuperación YPF:",
          {
            user_id:
              user.id,
            rol,
            activo:
              perfil?.activo,
            perfil_error:
              perfilError?.message ||
              null,
          },
        );

        return json(
          {
            ok: false,
            error:
              "Tu perfil del portal no tiene permisos válidos para solicitar recuperaciones YPF.",
          },
          403,
        );
      }

      const body =
        await req.json();

      const ejecutanteId =
        String(
          body?.ejecutante_id ||
          "",
        ).trim();

      if (!ejecutanteId) {
        return json(
          {
            ok: false,
            error:
              "Falta el ejecutante.",
          },
          400,
        );
      }

      const {
        data:
          ejecutante,
        error:
          ejecutanteError,
      } =
        await admin
          .from(
            "ejecutantes",
          )
          .select(
            "id,nombre_completo,email,usuario_ibm",
          )
          .eq(
            "id",
            ejecutanteId,
          )
          .maybeSingle();

      if (
        ejecutanteError ||
        !ejecutante
      ) {
        return json(
          {
            ok: false,
            error:
              "Ejecutante no encontrado.",
          },
          404,
        );
      }

      const email =
        String(
          ejecutante.email ||
          "",
        )
          .trim()
          .toLowerCase();

      if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
          .test(email)
      ) {
        return json(
          {
            ok: false,
            error:
              "El ejecutante no tiene un email válido registrado.",
          },
          400,
        );
      }

      /*
       * Defensa adicional:
       * las identidades internas RY no forman parte
       * del flujo de ejecutantes externos.
       */
      if (
        String(
          ejecutante.usuario_ibm ||
          "",
        )
          .trim()
          .toUpperCase()
          .startsWith("RY")
      ) {
        return json(
          {
            ok: false,
            error:
              "Este usuario corresponde a una identidad interna y no se procesa desde este módulo.",
          },
          400,
        );
      }

      const desde =
        new Date(
          Date.now() -
          RATE_LIMIT_MINUTES *
            60 *
            1000,
        ).toISOString();

      const {
        data:
          reciente,
        error:
          rateError,
      } =
        await admin
          .from(
            "auditoria",
          )
          .select(
            "id,created_at",
          )
          .eq(
            "usuario_id",
            user.id,
          )
          .eq(
            "ejecutante_id",
            ejecutanteId,
          )
          .eq(
            "accion",
            "Recuperación automática YPF",
          )
          .gte(
            "created_at",
            desde,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          )
          .limit(1);

      if (rateError) {
        console.error(
          "Error validando rate limit:",
          rateError,
        );
      }

      if (
        reciente &&
        reciente.length > 0
      ) {
        return json(
          {
            ok: false,
            rate_limited:
              true,
            error:
              `Ya se solicitó una recuperación para este ejecutante en los últimos ${RATE_LIMIT_MINUTES} minutos.`,
          },
          429,
        );
      }

      const result =
        await ypfRequest(
          email,
        );

      if (
        !result.success
      ) {
        console.error(
          "YPF no confirmó el envío:",
          result,
        );

        return json(
          {
            ok: false,
            error:
              "YPF no confirmó el envío. Podés usar el recuperador oficial como respaldo.",
          },
          502,
        );
      }

      const nombreUsuario =
        String(
          perfil.nombre ||
          perfil.email ||
          user.email ||
          "Usuario",
        );

      const {
        error:
          auditError,
      } =
        await admin
          .from(
            "auditoria",
          )
          .insert({
            usuario_id:
              user.id,
            usuario_nombre:
              nombreUsuario,
            ejecutante_id:
              ejecutanteId,
            entidad:
              "credenciales",
            entidad_id:
              ejecutanteId,
            accion:
              "Recuperación automática YPF",
            campo:
              "recuperador_ypf",
            valor_anterior:
              null,
            valor_nuevo:
              "Solicitud enviada",
            descripcion:
              `YPF confirmó la solicitud de recuperación para ${email}.`,
          });

      if (auditError) {
        console.error(
          "La solicitud se envió, pero no se pudo registrar auditoría:",
          auditError,
        );
      }

      return json({
        ok: true,
        email,
        message:
          `YPF confirmó la solicitud de recuperación para ${email}.`,
      });
    } catch (error) {
      console.error(
        "reenviar-clave-ypf:",
        error,
      );

      return json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo procesar la recuperación YPF.",
        },
        500,
      );
    }
  },
);
