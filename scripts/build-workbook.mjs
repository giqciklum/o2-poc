import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outputPath = resolve(root, "data", "o2_operational_seed.xlsx");
const previewPath = resolve(root, "data", "o2_dashboard_preview.png");

const theme = {
  ink: "#071016",
  blue: "#009DE0",
  blueDeep: "#006F9F",
  green: "#7ED957",
  gold: "#D6A94A",
  danger: "#D84B55",
  soft: "#EEF5F9",
  line: "#D9E2E8",
  white: "#FFFFFF"
};

const data = {
  socios: {
    headers: ["id_socio","nombre","club","plan","fecha_alta","estado","frecuencia_30d","frecuencia_prev_30d","churn_score","ltv_estimado","programa","accion_recomendada"],
    rows: [
      ["S-1748","Clara Valera","O2CW Manuel Becerra","Well Living Plus","2025-09-17","Riesgo alto",3,11,79,3240,"Spa + fuerza","Llamada + invitacion spa en franja valle"],
      ["S-0832","Javier Anton","O2CW Granada","Family Wellness","2025-03-02","Riesgo medio",5,8,62,2860,"Padel + nutricion","Oferta pack padel + seguimiento nutricion"],
      ["S-2214","Marta Roca","O2CW Boutique Barcelona","Boutique Women","2026-01-14","Activo",13,12,31,1980,"Body&Soul","Mantener recomendacion Zone Her"],
      ["S-1905","David Llorente","O2CW Malaga","Well Living","2024-11-22","Activo",9,8,28,2140,"Piscina","Rutina piscina + fuerza"],
      ["S-1511","Paula Gomez","O2CW Huelva","Well Living","2025-07-04","Activo",7,6,35,1760,"Fisio","Check preventivo fisio"]
    ]
  },
  voz_cliente: {
    headers: ["id_feedback","fecha","canal","club","rating","sentimiento","tema","prioridad","estado","texto","accion"],
    rows: [
      ["V-104","2026-05-24","Google Reviews","O2CW Malaga","2",-72,"Sauna y bano turco","Alta","Abierta","La sauna estaba fuera de servicio otra vez y nadie aviso antes de entrar.","Crear tarea preventiva y respuesta publica"],
      ["V-098","2026-05-23","Hoja sugerencias","O2CW Granada","Sugerencia",26,"Pistas de padel","Media","En curso","Ampliar huecos de reserva en tarde.","Cruzar aforo con reservas"],
      ["V-091","2026-05-22","Recepcion","O2CW Boutique Madrid","Promotor",88,"Body&Soul","Baja","Completada","La clase de movilidad ha sido excelente.","Usar como senal de retencion"]
    ]
  },
  entrevistas_comerciales: {
    headers: ["id_entrevista","fecha","lead","club","canal","motivacion","objeciones","intencion_compra","estado","siguiente_accion"],
    rows: [
      ["C-2401","2026-05-24","Ines Romero","O2CW Sexta Avenida","Dia de prueba","Fuerza, piscina y fisioterapia por lesion previa","Precio; horario despues de oficina",86,"Visita agendada","Enviar plan 14 dias con piscina + fisio"],
      ["C-2388","2026-05-23","Alvaro Segui","O2CW Huelva","Formulario web","Club familiar con piscina y padel","Disponibilidad padel",72,"Contactado","Proponer visita en franja valle"],
      ["C-2362","2026-05-22","Nuria Ferrer","O2CW Boutique Girona","Instagram","Gimnasio femenino, yoga, pilates y sauna","Compromiso anual",91,"Alta probable","Cerrar mensual con upgrade Body&Soul"]
    ]
  },
  aforos: {
    headers: ["id_aforo","fecha_hora","club","zona","tipo_zona","ocupacion_pct","umbral_pct","estado","accion_recomendada"],
    rows: [
      ["AF-001","2026-05-25 18:30","O2CW Malaga","Padel","padel",94,85,"Saturado","Abrir lista de espera y sugerir franja 21:00"],
      ["AF-002","2026-05-25 18:30","O2CW Manuel Becerra","Spa","spa",88,80,"Tension","Aviso app y refuerzo limpieza"],
      ["AF-003","2026-05-25 18:30","O2CW Granada","Piscina","piscina",76,82,"Controlado","Mantener monitorizacion"],
      ["AF-004","2026-05-25 18:30","O2CW Huelva","Sala fitness","fitness",82,84,"Tension","Refuerzo tecnico 19:00-20:30"]
    ]
  },
  mantenimiento: {
    headers: ["id_activo","club","instalacion","horas_uso","umbral_aviso","riesgo_averia","estado","accion","fecha_revision"],
    rows: [
      ["M-447","O2CW Malaga","Sauna seca",392,420,84,"Preventivo","Revision resistencia y sensor","2026-05-27"],
      ["M-441","O2CW Granada","Duchas vestuario",1180,1300,68,"Observacion","Inspeccion caudal y juntas","2026-05-29"],
      ["M-430","O2CW Huelva","Cinta Technogym 04",780,1100,42,"Normal","Mantenimiento programado","2026-06-04"],
      ["M-422","O2CW Manuel Becerra","Bomba hidromasaje",610,680,73,"Preventivo","Cambio filtro y check vibracion","2026-05-28"]
    ]
  },
  tareas: {
    headers: ["id_tarea","categoria","club","responsable","prioridad","estado","descripcion","fecha_creacion"],
    rows: [
      ["T-801","Retencion","O2CW Manuel Becerra","Customer Success","Alta","Hoy","Llamar a Clara Valera con propuesta spa + rutina.","2026-05-25"],
      ["T-790","Experiencia","O2CW Malaga","Club manager","Alta","En curso","Responder resena sobre sauna y validar mantenimiento.","2026-05-24"],
      ["T-772","Aforo","O2CW Malaga","Operaciones","Media","Pendiente","Redistribuir reservas de padel en hora punta.","2026-05-24"]
    ]
  },
  agenda_impacto: {
    headers: ["fecha","tipo","categoria","club","entidad","importe_estimado","estado","origen","trigger_relacionado","comentario"],
    rows: [
      ["2026-05-25","ingreso protegido","retencion","O2CW Manuel Becerra","S-1748",3240,"en riesgo","lifetime","churn","LTV protegido si se recupera habito"],
      ["2026-05-26","coste evitado","mantenimiento","O2CW Malaga","M-447",1800,"preventivo","mantenimiento","maintenance","Evitar cierre no planificado de sauna"],
      ["2026-05-25","reputacion","voz_cliente","O2CW Malaga","V-104",900,"abierto","voz_cliente","voice","Gestion de resena critica"],
      ["2026-05-28","pipeline","comercial","O2CW Sexta Avenida","C-2401",1280,"probable","ventas","sales","Alta esperada Well Living"]
    ]
  }
};

const workbook = Workbook.create();
const dashboard = workbook.worksheets.getOrAdd("Dashboard", { renameFirstIfOnlyNewSpreadsheet: true });
dashboard.showGridLines = false;

function writeMatrix(sheet, startCell, matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const range = sheet.getRange(startCell).resize(rows, cols);
  range.values = matrix;
  return range;
}

function addDataSheet(name, payload, color) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  const matrix = [payload.headers, ...payload.rows];
  const range = writeMatrix(sheet, "A1", matrix);
  sheet.freezePanes.freezeRows(1);
  sheet.getRangeByIndexes(0, 0, 1, payload.headers.length).format = {
    fill: color,
    font: { bold: true, color: theme.white },
    wrapText: true
  };
  range.format.borders = { color: theme.line, style: "Continuous", weight: "Thin" };
  range.format.wrapText = true;
  range.format.autofitColumns();
  const used = `${name}!A1:${String.fromCharCode(64 + payload.headers.length)}${matrix.length}`;
  const tableName = `${name.replace(/[^A-Za-z0-9]/g, "")}Table`;
  const table = sheet.tables.add(used, true, tableName);
  table.showFilterButton = true;
  table.showBandedRows = true;
  return sheet;
}

Object.entries(data).forEach(([name, payload], index) => {
  const palette = [theme.blue, theme.ink, theme.blueDeep, theme.blue, theme.blueDeep, theme.ink, theme.gold];
  addDataSheet(name, payload, palette[index % palette.length]);
});

dashboard.getRange("A1:H1").merge();
dashboard.getRange("A1").values = [["O2 Centro Wellness Intelligence Hub"]];
dashboard.getRange("A1").format = {
  fill: theme.ink,
  font: { bold: true, color: theme.white },
  horizontalAlignment: "Center"
};
dashboard.getRange("A1").format.rowHeightPx = 40;

dashboard.getRange("A3:H3").merge();
dashboard.getRange("A3").values = [["Dashboard ejecutivo para retencion, voz del cliente, comercial, aforos y mantenimiento predictivo."]];
dashboard.getRange("A3").format = { fill: theme.soft, font: { color: theme.ink }, wrapText: true };

writeMatrix(dashboard, "A5", [
  ["KPI", "Valor", "Lectura", "Fuente"],
  ["Socios muestra", "", "Socios operativos en workbook demo", "socios"],
  ["Churn medio", "", "Score medio de riesgo", "socios"],
  ["Feedback critico", "", "Casos con sentimiento negativo", "voz_cliente"],
  ["Pipeline probable", "", "Suma de oportunidades comerciales", "entrevistas"],
  ["Aforos saturados", "", "Zonas por encima de umbral", "aforos"],
  ["Riesgo mantenimiento", "", "Activos con riesgo >=70", "mantenimiento"]
]);
dashboard.getRange("B6:B11").formulas = [
  ["=COUNTA(socios!A2:A500)"],
  ["=ROUND(AVERAGE(socios!I2:I500),0)"],
  ["=COUNTIF(voz_cliente!F2:F500,\"<0\")"],
  ["=SUMIF(entrevistas_comerciales!H2:H500,\">=80\",agenda_impacto!F2:F500)"],
  ["=COUNTIF(aforos!H2:H500,\"Saturado\")"],
  ["=COUNTIF(mantenimiento!F2:F500,\">=70\")"]
];
dashboard.getRange("A5:D5").format = { fill: theme.blue, font: { bold: true, color: theme.white } };
dashboard.getRange("A5:D11").format.borders = { color: theme.line, style: "Continuous", weight: "Thin" };
dashboard.getRange("B9").format.numberFormat = "#,##0";
dashboard.getRange("A:D").format.columnWidthPx = 150;
dashboard.getRange("C:C").format.columnWidthPx = 260;

writeMatrix(dashboard, "F5", [
  ["Escena", "Estado"],
  ["Socio en riesgo", "Demo-ready"],
  ["Resena negativa", "Demo-ready"],
  ["Entrevista comercial", "Demo-ready"],
  ["Averia anticipada", "Demo-ready"],
  ["Aforo saturado", "Demo-ready"]
]);
dashboard.getRange("F5:G5").format = { fill: theme.ink, font: { bold: true, color: theme.white } };
dashboard.getRange("F5:G10").format.borders = { color: theme.line, style: "Continuous", weight: "Thin" };
dashboard.getRange("F:G").format.columnWidthPx = 150;

writeMatrix(dashboard, "J4", [
  ["Mes", "Visitas Clara", "Churn score"],
  ["Ene", 11, 18],
  ["Feb", 10, 22],
  ["Mar", 9, 29],
  ["Abr", 6, 42],
  ["May", 4, 63],
  ["Jun", 3, 79]
]);
const retentionChart = dashboard.charts.add("line", dashboard.getRange("J4:L10"));
retentionChart.setPosition("A13", "H30");
retentionChart.title = "Radar de retencion: frecuencia vs churn";
retentionChart.hasLegend = true;
retentionChart.xAxis = { axisType: "textAxis" };
retentionChart.yAxis = { numberFormatCode: "0" };

writeMatrix(dashboard, "N4", [
  ["Tema", "Casos"],
  ["Spa", 34],
  ["Vestuarios", 28],
  ["Padel", 19],
  ["Clases", 11],
  ["Recepcion", 8]
]);
const voiceChart = dashboard.charts.add("bar", dashboard.getRange("N4:O9"));
voiceChart.setPosition("J13", "Q30");
voiceChart.title = "Voz del cliente por tema";
voiceChart.hasLegend = false;
voiceChart.xAxis = { axisType: "textAxis" };
voiceChart.yAxis = { numberFormatCode: "0" };

dashboard.getRange("J4:O10").format = { fill: "#F8FBFD" };
dashboard.getRange("J4:L4").format = { fill: theme.blueDeep, font: { bold: true, color: theme.white } };
dashboard.getRange("N4:O4").format = { fill: theme.blueDeep, font: { bold: true, color: theme.white } };
dashboard.getRange("J:L").format.columnWidthPx = 110;
dashboard.getRange("N:O").format.columnWidthPx = 120;
dashboard.freezePanes.freezeRows(4);

const errorsBefore = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan"
});
console.log(errorsBefore.ndjson);

const preview = await workbook.render({ sheetName: "Dashboard", range: "A1:Q31", scale: 1, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

await fs.mkdir(resolve(root, "data"), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
