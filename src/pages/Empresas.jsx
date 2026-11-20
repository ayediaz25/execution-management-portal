import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Building2,
  Search,
  Users,
  UserCheck,
  UserRoundX,
  ArrowUpRight,
  Database,
  Download,
} from "lucide-react";

import ExcelJS from "exceljs";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";


export default function Empresas() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isConsulta = role === "consulta";

  const [empresas, setEmpresas] = useState([]);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todas");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [exportandoEmpresaId, setExportandoEmpresaId] = useState(null);
  const [exportMessage, setExportMessage] = useState(null);


  /* =========================================================
     CARGA
     ========================================================= */

  useEffect(() => {
    cargarEmpresas();
  }, []);


  async function cargarEmpresas() {
    setLoading(true);
    setError("");

    const {
      data,
      error,
    } = await supabase
      .from("v_empresas_resumen")
      .select("*")
      .order("personal_activo", {
        ascending: false,
      })
      .order("nombre", {
        ascending: true,
      });


    if (error) {
      console.error(
        "Error cargando empresas:",
        error
      );

      setError(
        "No se pudieron cargar las empresas."
      );

      setEmpresas([]);
      setLoading(false);

      return;
    }


    setEmpresas(data || []);
    setLoading(false);
  }


  /* =========================================================
     FILTRO
     ========================================================= */

  const empresasFiltradas = useMemo(() => {
    const termino =
      search
        .trim()
        .toLowerCase();


    return empresas.filter((empresa) => {
      const coincideBusqueda =
        !termino ||
        empresa.nombre
          ?.toLowerCase()
          .includes(termino) ||
        empresa.cuit
          ?.toLowerCase()
          .includes(termino);


      const personalActivo =
        Number(
          empresa.personal_activo ||
          0
        );


      const coincideEstado =
        estado === "todas" ||
        (
          estado === "activas" &&
          personalActivo > 0
        ) ||
        (
          estado === "sin-personal" &&
          personalActivo === 0
        );


      return (
        coincideBusqueda &&
        coincideEstado
      );
    });

  }, [
    empresas,
    search,
    estado,
  ]);


  /* =========================================================
     RESUMEN
     ========================================================= */

  const resumen = useMemo(() => {
    return empresas.reduce(
      (acc, empresa) => {
        acc.empresas += 1;

        acc.personalActivo +=
          Number(
            empresa.personal_activo ||
            0
          );

        acc.personalBaja +=
          Number(
            empresa.personal_baja ||
            0
          );

        return acc;
      },
      {
        empresas: 0,
        personalActivo: 0,
        personalBaja: 0,
      }
    );
  }, [empresas]);



  /* =========================================================
     EXPORTACIÓN DE HABILITADOS
     ========================================================= */

  function nombreArchivoSeguro(valor) {
    return String(valor || "Empresa")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }


  function formatearFechaExportacion() {
    return new Intl.DateTimeFormat(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(new Date());
  }


  async function descargarHabilitados(empresa) {
    if (!empresa?.id) return;

    setExportandoEmpresaId(empresa.id);
    setExportMessage(null);

    try {
      const {
        data,
        error: exportError,
      } = await supabase.rpc(
        "exportar_ejecutantes_habilitados",
        {
          p_empresa_id: empresa.id,
        }
      );

      if (exportError) {
        throw exportError;
      }

      const filas = data || [];

      if (filas.length === 0) {
        setExportMessage({
          type: "warning",
          text: `${empresa.nombre}: no hay ejecutantes habilitados para descargar.`,
        });

        return;
      }

      const workbook = new ExcelJS.Workbook();

      workbook.creator =
        "Portal de Personal de Ejecución";
      workbook.lastModifiedBy =
        "Portal de Personal de Ejecución";
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet =
        workbook.addWorksheet(
          "Ejecutantes habilitados",
          {
            views: [
              {
                state: "frozen",
                ySplit: 5,
              },
            ],
          }
        );

      worksheet.properties.defaultRowHeight = 20;

      worksheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.35,
          right: 0.35,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
      };

      worksheet.mergeCells("A1:D1");
      worksheet.getCell("A1").value =
        `Ejecutantes habilitados · ${empresa.nombre}`;

      worksheet.getCell("A1").font = {
        name: "Aptos",
        size: 18,
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };

      worksheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF0B3D63",
        },
      };

      worksheet.getCell("A1").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      worksheet.getRow(1).height = 34;


      worksheet.mergeCells("A2:D2");
      worksheet.getCell("A2").value =
        "Portal de Personal de Ejecución · CILC";

      worksheet.getCell("A2").font = {
        name: "Aptos",
        size: 10,
        italic: true,
        color: {
          argb: "FF64748B",
        },
      };

      worksheet.getCell("A2").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      worksheet.getRow(2).height = 21;


      worksheet.mergeCells("A3:D3");
      worksheet.getCell("A3").value =
        `Fecha de exportación: ${formatearFechaExportacion()}   |   Total habilitados: ${filas.length}`;

      worksheet.getCell("A3").font = {
        name: "Aptos",
        size: 10,
        bold: true,
        color: {
          argb: "FF334155",
        },
      };

      worksheet.getCell("A3").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFF1F5F9",
        },
      };

      worksheet.getCell("A3").alignment = {
        vertical: "middle",
        horizontal: "left",
      };

      worksheet.getRow(3).height = 23;


      worksheet.getRow(4).height = 8;


      const headerRow = worksheet.getRow(5);

      headerRow.values = [
        "Nombre completo",
        "Email",
        "Empresa",
        "Estado",
      ];

      headerRow.height = 28;

      headerRow.eachCell((cell) => {
        cell.font = {
          name: "Aptos",
          size: 10,
          bold: true,
          color: {
            argb: "FFFFFFFF",
          },
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FF1F5F7A",
          },
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
        };

        cell.border = {
          top: {
            style: "thin",
            color: {
              argb: "FFD8E2EA",
            },
          },
          left: {
            style: "thin",
            color: {
              argb: "FFD8E2EA",
            },
          },
          bottom: {
            style: "thin",
            color: {
              argb: "FFD8E2EA",
            },
          },
          right: {
            style: "thin",
            color: {
              argb: "FFD8E2EA",
            },
          },
        };
      });


      filas.forEach((fila, index) => {
        const row = worksheet.addRow([
          fila.nombre_completo || "",
          fila.email || "",
          fila.empresa || "",
          fila.estado || "",
        ]);

        row.height = 22;

        row.eachCell((cell, columnNumber) => {
          cell.font = {
            name: "Aptos",
            size: 10,
            color: {
              argb: "FF243B53",
            },
          };

          cell.alignment = {
            vertical: "middle",
            horizontal:
              columnNumber === 4
                ? "center"
                : "left",
          };

          cell.border = {
            top: {
              style: "hair",
              color: {
                argb: "FFE2E8F0",
              },
            },
            left: {
              style: "hair",
              color: {
                argb: "FFE2E8F0",
              },
            },
            bottom: {
              style: "hair",
              color: {
                argb: "FFE2E8F0",
              },
            },
            right: {
              style: "hair",
              color: {
                argb: "FFE2E8F0",
              },
            },
          };

          if (index % 2 === 1) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: "FFF8FAFC",
              },
            };
          }
        });

        const estadoCell = row.getCell(4);

        estadoCell.font = {
          name: "Aptos",
          size: 10,
          bold: true,
          color: {
            argb: "FF137A4A",
          },
        };

        estadoCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFE8F7EF",
          },
        };
      });


      worksheet.columns = [
        {
          key: "nombre",
          width: 34,
        },
        {
          key: "email",
          width: 38,
        },
        {
          key: "empresa",
          width: 25,
        },
        {
          key: "estado",
          width: 14,
        },
      ];


      const ultimaFila = 5 + filas.length;

      worksheet.autoFilter = {
        from: {
          row: 5,
          column: 1,
        },
        to: {
          row: ultimaFila,
          column: 4,
        },
      };


      const footerRow =
        worksheet.getRow(
          ultimaFila + 2
        );

      worksheet.mergeCells(
        `A${ultimaFila + 2}:D${ultimaFila + 2}`
      );

      footerRow.getCell(1).value =
        "Documento generado desde Portal de Personal de Ejecución.";

      footerRow.getCell(1).font = {
        name: "Aptos",
        size: 9,
        italic: true,
        color: {
          argb: "FF94A3B8",
        },
      };


      const buffer =
        await workbook.xlsx.writeBuffer();

      const blob = new Blob(
        [buffer],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const fechaArchivo = new Date()
        .toISOString()
        .slice(0, 10);

      link.href = url;
      link.download =
        `${nombreArchivoSeguro(
          empresa.nombre
        )}_Ejecutantes_Habilitados_${fechaArchivo}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setExportMessage({
        type: "success",
        text: `${empresa.nombre}: se descargaron ${filas.length} ejecutantes habilitados en Excel.`,
      });
    } catch (err) {
      console.error(
        "Error exportando ejecutantes habilitados:",
        err
      );

      setExportMessage({
        type: "error",
        text: `No se pudo descargar el personal habilitado de ${empresa.nombre}.`,
      });
    } finally {
      setExportandoEmpresaId(null);
    }
  }


  return (
    <div className="page empresas-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="page-hero">

        <div>

          <span className="page-eyebrow">
            {isConsulta
              ? "ACCESO CONTRATISTAS · CILC"
              : "EMPRESAS CONTRATISTAS · CILC"}
          </span>

          <h1>
            {isConsulta
              ? "Listados de personal"
              : "Empresas"}
          </h1>

          <p>
            {isConsulta
              ? "Seleccioná una contratista y descargá el listado de personal habilitado que necesites."
              : "Personal asociado a cada empresa contratista dentro del seguimiento CILC."}
          </p>

        </div>


        <div className="page-hero-badge">

          <Database size={17} />

          <div>
            <span>
              {isConsulta
                ? "Acceso"
                : "Base"}
            </span>

            <strong>
              {isConsulta
                ? "Consulta de listados"
                : "Contratistas CILC"}
            </strong>
          </div>

        </div>

      </section>


      {/* =====================================================
          RESUMEN
          ===================================================== */}

      <section className={`company-summary-grid ${
        isConsulta
          ? "company-summary-grid-consulta"
          : ""
      }`}>

        <article className="glass-card company-summary-card">

          <div className="company-summary-icon">
            <Building2 size={19} />
          </div>

          <div>

            <span>
              {isConsulta
                ? "Contratistas disponibles"
                : "Empresas"}
            </span>

            <strong>
              {resumen.empresas}
            </strong>

            <small>
              {isConsulta
                ? "con listado disponible"
                : "registradas"}
            </small>

          </div>

        </article>


        <article className="glass-card company-summary-card">

          <div className="company-summary-icon success">
            <UserCheck size={19} />
          </div>

          <div>

            <span>
              Personal activo
            </span>

            <strong>
              {resumen.personalActivo}
            </strong>

            <small>
              registros activos
            </small>

          </div>

        </article>


        {!isConsulta && (
          <article className="glass-card company-summary-card">

            <div className="company-summary-icon neutral">
              <UserRoundX size={19} />
            </div>

            <div>

              <span>
                Bajas
              </span>

              <strong>
                {resumen.personalBaja}
              </strong>

              <small>
                ejecutantes
              </small>

            </div>

          </article>
        )}

      </section>


      {/* =====================================================
          BUSCADOR
          ===================================================== */}

      <section className="glass-card company-filter-panel">

        <div className="company-search">

          <Search size={18} />

          <input
            type="text"
            placeholder={isConsulta
              ? "Buscar contratista por nombre o CUIT..."
              : "Buscar empresa por nombre o CUIT..."}
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>


        <select
          value={estado}
          onChange={(e) =>
            setEstado(
              e.target.value
            )
          }
        >

          <option value="todas">
            Todas
          </option>

          <option value="activas">
            Con personal activo
          </option>

          <option value="sin-personal">
            Sin personal activo
          </option>

        </select>

      </section>


      {exportMessage && (
        <div
          className={`company-export-message ${exportMessage.type}`}
          role="status"
        >
          {exportMessage.text}
        </div>
      )}


      {/* =====================================================
          RESULTADOS
          ===================================================== */}

      <div className="company-result-heading">

        <strong>
          {empresasFiltradas.length}
          {" "}
          {isConsulta
            ? empresasFiltradas.length === 1
              ? "contratista"
              : "contratistas"
            : empresasFiltradas.length === 1
            ? "empresa encontrada"
            : "empresas encontradas"}
        </strong>

        <span>
          {isConsulta
            ? "Descargá únicamente el listado que necesites"
            : "Personal activo por contratista"}
        </span>

      </div>


      {/* =====================================================
          ESTADOS
          ===================================================== */}

      {loading ? (

        <section className="glass-card company-empty-card">
          Cargando empresas...
        </section>

      ) : error ? (

        <section className="glass-card company-empty-card error">
          {error}
        </section>

      ) : empresasFiltradas.length === 0 ? (

        <section className="glass-card company-empty-card">

          <Search size={24} />

          <strong>
            No encontramos empresas
          </strong>

          <span>
            Probá buscando por otro nombre
            o CUIT.
          </span>

        </section>

      ) : (

        <section className="company-grid">

          {empresasFiltradas.map((empresa) => {
            const personalActivo =
              Number(
                empresa.personal_activo ||
                0
              );

            const sinPersonalActivo =
              personalActivo === 0;


            return (
              <article
                key={empresa.id}
                className={`glass-card company-card ${
                  sinPersonalActivo
                    ? "company-card-inactive"
                    : "company-card-active"
                }`}
              >

                {/* HEADER */}

                <div className="company-card-header">

                  <div className="company-card-icon">
                    <Building2
                      size={20}
                    />
                  </div>


                  <div className="company-card-title">

                    <div>

                      <h3>
                        {empresa.nombre}
                      </h3>


                      {sinPersonalActivo ? (

                        <span className="company-no-active-badge">
                          Sin personal activo
                        </span>

                      ) : (

                        <span className="company-active-badge">
                          {isConsulta
                            ? "Activa"
                            : "Con personal activo"}
                        </span>

                      )}

                    </div>


                    <span>
                      {empresa.cuit
                        ? `CUIT ${empresa.cuit}`
                        : "CUIT sin registrar"}
                    </span>

                  </div>


                  {!isConsulta && (
                    <button
                      type="button"
                      className="company-open-icon"
                      onClick={() =>
                        navigate(
                          `/empresas/${empresa.id}`
                        )
                      }
                      title="Ver empresa"
                    >
                      <ArrowUpRight
                        size={17}
                      />
                    </button>
                  )}

                </div>


                {/* PERSONAL */}

                <div className="company-personnel-card">

                  <div className="company-personnel-main">

                    <div className="company-personnel-icon">
                      <Users
                        size={20}
                      />
                    </div>


                    <div>

                      <span>
                        Personal activo
                      </span>

                      <strong>
                        {personalActivo}
                      </strong>

                    </div>

                  </div>


                  {!isConsulta && (
                    <div className="company-personnel-detail">

                      <div>
                        <span>
                          Total
                        </span>

                        <strong>
                          {
                            empresa.total_personal ||
                            0
                          }
                        </strong>
                      </div>


                      <div>
                        <span>
                          Bajas
                        </span>

                        <strong>
                          {
                            empresa.personal_baja ||
                            0
                          }
                        </strong>
                      </div>

                    </div>
                  )}

                </div>


                {/* FOOTER */}

                <div className="company-card-footer">

                  <span>
                    {isConsulta
                      ? "Personal habilitado disponible"
                      : sinPersonalActivo
                      ? "Todos los registros están de baja"
                      : "Empresa con personal activo"}
                  </span>


                  <div className="company-card-footer-actions">

                    <button
                      type="button"
                      className="company-download-button"
                      disabled={
                        exportandoEmpresaId === empresa.id
                      }
                      onClick={() =>
                        descargarHabilitados(
                          empresa
                        )
                      }
                      title="Descargar ejecutantes habilitados"
                    >
                      <Download
                        size={14}
                      />

                      {exportandoEmpresaId === empresa.id
                        ? "Generando..."
                        : isConsulta
                        ? "Descargar listado"
                        : "Descargar habilitados"}
                    </button>


                    {!isConsulta && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/empresas/${empresa.id}`
                          )
                        }
                      >
                        Ver empresa

                        <ArrowUpRight
                          size={14}
                        />
                      </button>
                    )}

                  </div>

                </div>

              </article>
            );
          })}

        </section>

      )}

    </div>
  );
}