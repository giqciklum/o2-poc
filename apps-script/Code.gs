/* ============================================================
   O2 Centro Wellness Intelligence Hub - Apps Script
   v1 · 2026-05-25

   Deploy as a Web App bound to a new Google Sheet.
   Endpoints:
   ?action=state&detail=full
   ?action=reset
   ?action=warmup
   ?action=churn|voice|sales|maintenance|capacity
   ============================================================ */

var VERSION = "o2-v1";

var CLUBS = [
  "O2CW Manuel Becerra",
  "O2CW Boutique Madrid",
  "O2CW Sexta Avenida",
  "O2CW Malaga",
  "O2CW Granada",
  "O2CW Huelva",
  "O2CW Parc del Migdia",
  "O2CW Boutique Girona",
  "O2CW Boutique Barcelona"
];

function nowFormatted() {
  return Utilities.formatDate(new Date(), "Europe/Madrid", "yyyy-MM-dd HH:mm");
}

function todayIso() {
  return Utilities.formatDate(new Date(), "Europe/Madrid", "yyyy-MM-dd");
}

function isoOffsetDate(days) {
  var d = new Date(Date.now() + days * 86400000);
  return Utilities.formatDate(d, "Europe/Madrid", "yyyy-MM-dd");
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet(ss, name, headers, color) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clear();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground(color || "#009de0")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  return sheet;
}

function appendRows(sheet, rows) {
  rows.forEach(function(row) { sheet.appendRow(row); });
}

function getNextSequentialId(sheet, prefix) {
  var lastRow = sheet.getLastRow();
  var maxId = 0;
  if (lastRow >= 2) {
    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    values.forEach(function(row) {
      var raw = String(row[0] || "");
      if (raw.indexOf(prefix) !== 0) return;
      var n = parseInt(raw.slice(prefix.length), 10);
      if (!isNaN(n) && n > maxId) maxId = n;
    });
  }
  return prefix + Utilities.formatString("%03d", maxId + 1);
}

function sheetToObjects(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var value = data[i][j];
      if (value instanceof Date) {
        value = Utilities.formatDate(value, "Europe/Madrid", "yyyy-MM-dd HH:mm");
      }
      obj[headers[j]] = value === null || value === undefined ? "" : String(value);
    }
    rows.push(obj);
  }
  return rows;
}

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var def = ss.getSheetByName("Sheet1");

  var socios = ensureSheet(ss, "socios", [
    "id_socio","nombre","club","plan","fecha_alta","estado","frecuencia_30d",
    "frecuencia_prev_30d","churn_score","ltv_estimado","programa","accion_recomendada"
  ], "#009de0");
  appendRows(socios, [
    ["S-1748","Clara Valera","O2CW Manuel Becerra","Well Living Plus","2025-09-17","Riesgo alto","3","11","79","3240","Spa + fuerza","Llamada + invitacion spa en franja valle"],
    ["S-0832","Javier Anton","O2CW Granada","Family Wellness","2025-03-02","Riesgo medio","5","8","62","2860","Padel + nutricion","Oferta pack padel + seguimiento nutricion"],
    ["S-2214","Marta Roca","O2CW Boutique Barcelona","Boutique Women","2026-01-14","Activo","13","12","31","1980","Body&Soul","Mantener recomendacion Zone Her"],
    ["S-1905","David Llorente","O2CW Malaga","Well Living","2024-11-22","Activo","9","8","28","2140","Piscina","Rutina piscina + fuerza"],
    ["S-1511","Paula Gomez","O2CW Huelva","Well Living","2025-07-04","Activo","7","6","35","1760","Fisio","Check preventivo fisio"]
  ]);

  var pagos = ensureSheet(ss, "pagos", [
    "id_pago","id_socio","fecha","importe","metodo","estado","proximo_cobro","observacion"
  ], "#071016");
  appendRows(pagos, [
    ["P-001","S-1748","2026-05-01","108","Tarjeta","Confirmado","2026-06-01","Plan premium"],
    ["P-002","S-0832","2026-05-03","126","Domiciliacion","Confirmado","2026-06-03","Family"],
    ["P-003","S-2214","2026-05-05","89","Tarjeta","Confirmado","2026-06-05","Boutique"],
    ["P-004","S-1905","2026-05-01","96","Tarjeta","Confirmado","2026-06-01","Well Living"],
    ["P-005","S-1511","2026-05-02","92","Domiciliacion","Confirmado","2026-06-02","Well Living"]
  ]);

  var reservas = ensureSheet(ss, "reservas", [
    "id_reserva","id_socio","club","zona","actividad","fecha_hora","estado","tipo_zona"
  ], "#009de0");
  appendRows(reservas, [
    ["R-001","S-1748","O2CW Manuel Becerra","Spa","Circuito spa","2026-05-25 19:00","No asistio","spa"],
    ["R-002","S-0832","O2CW Granada","Padel","Pista 4","2026-05-25 20:00","Confirmada","padel"],
    ["R-003","S-2214","O2CW Boutique Barcelona","Body&Soul","Pilates","2026-05-26 08:00","Confirmada","dirigida"],
    ["R-004","S-1905","O2CW Malaga","Piscina","Nado libre","2026-05-25 07:30","Confirmada","piscina"]
  ]);

  var voz = ensureSheet(ss, "voz_cliente", [
    "id_feedback","fecha","canal","club","rating","sentimiento","tema","prioridad","estado","texto","accion"
  ], "#006f9f");
  appendRows(voz, [
    ["V-104","2026-05-24","Google Reviews","O2CW Malaga","2","-72","Sauna y bano turco","Alta","Abierta","La sauna estaba fuera de servicio otra vez y nadie aviso antes de entrar.","Crear tarea preventiva y respuesta publica"],
    ["V-098","2026-05-23","Hoja sugerencias","O2CW Granada","Sugerencia","26","Pistas de padel","Media","En curso","Ampliar huecos de reserva en tarde.","Cruzar aforo con reservas"],
    ["V-091","2026-05-22","Encuesta post-clase","O2CW Boutique Madrid","Promotor","88","Body&Soul","Baja","Completada","La clase de movilidad ha sido excelente.","Usar como senal de retencion"],
    ["V-088","2026-05-21","WhatsApp","O2CW Manuel Becerra","Neutro","-18","Cambio de horario","Media","Nueva","Desde que cambiaron la clase de las 19:30 me cuesta venir entre semana.","Detectar cambio de tendencia y sugerir alternativa"]
  ]);

  var comunicaciones = ensureSheet(ss, "comunicaciones", [
    "id_comunicacion","fecha","id_socio","club","canal","motivo","sentimiento","resultado","siguiente_accion"
  ], "#071016");
  appendRows(comunicaciones, [
    ["COM-001","2026-05-23","S-1748","O2CW Manuel Becerra","WhatsApp","Saturacion vestuarios y cambio de rutina","-34","Sin resolver","Llamada humana + propuesta franja valle"],
    ["COM-002","2026-05-22","S-0832","O2CW Granada","Telefono","Disponibilidad padel familiar","12","Interes activo","Enviar huecos alternativos"],
    ["COM-003","2026-05-21","S-2214","O2CW Boutique Barcelona","App SoyO2","Felicitacion clase Body&Soul","82","Promotora","Recomendacion personalizada"]
  ]);

  var encuestas = ensureSheet(ss, "encuestas", [
    "id_encuesta","fecha","id_socio","club","nps","satisfaccion","puntos_dolor","area_mejora","accion_recomendada"
  ], "#006f9f");
  appendRows(encuestas, [
    ["E-001","2026-05-24","S-1748","O2CW Manuel Becerra","6","Media","Vestuarios y spa en hora punta","Experiencia club","Recuperar habito con circuito spa en franja valle"],
    ["E-002","2026-05-22","S-0832","O2CW Granada","7","Media","Reservas de padel saturadas","Aforos y reservas","Redistribuir pistas y comunicar huecos"],
    ["E-003","2026-05-21","S-2214","O2CW Boutique Barcelona","10","Alta","Ninguno","Clases Body&Soul","Usar como promotora"]
  ]);

  var habitos = ensureSheet(ss, "habitos_uso", [
    "id_habito","id_socio","periodo","club","accesos","reservas","servicios_usados","cambio_tendencia","lectura"
  ], "#009de0");
  appendRows(habitos, [
    ["H-001","S-1748","Ultimos 30 dias","O2CW Manuel Becerra","3","2 no-shows","Spa; fuerza","-73% accesos vs periodo anterior","Riesgo alto por perdida de habito"],
    ["H-002","S-0832","Ultimos 30 dias","O2CW Granada","5","2 cancelaciones padel","Padel; ciclo","Cambio a franja valle","Riesgo medio por saturacion"],
    ["H-003","S-2214","Ultimos 30 dias","O2CW Boutique Barcelona","13","12 reservas","Body&Soul; SoyO2","Estable positivo","Socia promotora"]
  ]);

  var necesidades = ensureSheet(ss, "necesidades_o2", [
    "necesidad","informacion_utilizada","herramienta_poc","kpi_demo","responsable","estado"
  ], "#009de0");
  appendRows(necesidades, [
    ["Prediccion de riesgo de desercion","Accesos; cuotas; servicios utilizados; comunicaciones","Socio 360 + playbook de retencion","churn_score; LTV protegido","Experiencia / club","Cubierto"],
    ["Satisfaccion y puntos de dolor","Resenas; reclamaciones; encuestas; WhatsApp; telefono","Voz del cliente + sentimiento por sede","sentimiento; NPS; prioridad","CX / direccion","Cubierto"],
    ["Areas de mejora en el servicio","Sugerencias; reclamaciones; aforos; mantenimiento","Ranking de temas + tareas por club","temas criticos; tareas abiertas","Operaciones","Cubierto"],
    ["Habitos de uso y cambios de tendencia","Accesos; reservas; SoyO2; servicios usados","Radar de frecuencia y habitos","frecuencia_30d; no-shows; ocupacion","Club manager","Cubierto"],
    ["Analisis de estrategias comerciales","CRM; llamadas; WhatsApp; visitas; objeciones","Inteligencia comercial y funnel","intencion_compra; objeciones; conversion","Comercial","Cubierto"]
  ]);

  var entrevistas = ensureSheet(ss, "entrevistas_comerciales", [
    "id_entrevista","fecha","lead","club","canal","motivacion","objeciones","intencion_compra","estado","siguiente_accion"
  ], "#071016");
  appendRows(entrevistas, [
    ["C-2401","2026-05-24","Ines Romero","O2CW Sexta Avenida","Dia de prueba","Fuerza, piscina y fisioterapia por lesion previa","Precio; horario despues de oficina","86","Visita agendada","Enviar plan 14 dias con piscina + fisio"],
    ["C-2388","2026-05-23","Alvaro Segui","O2CW Huelva","WhatsApp comercial","Club familiar con piscina y padel","Disponibilidad padel","72","Contactado","Proponer visita en franja valle"],
    ["C-2362","2026-05-22","Nuria Ferrer","O2CW Boutique Girona","Instagram","Gimnasio femenino, yoga, pilates y sauna","Compromiso anual","91","Alta probable","Cerrar mensual con upgrade Body&Soul"]
  ]);

  var aforos = ensureSheet(ss, "aforos", [
    "id_aforo","fecha_hora","club","zona","tipo_zona","ocupacion_pct","umbral_pct","estado","accion_recomendada"
  ], "#009de0");
  appendRows(aforos, [
    ["AF-001","2026-05-25 18:30","O2CW Malaga","Padel","padel","94","85","Saturado","Abrir lista de espera y sugerir franja 21:00"],
    ["AF-002","2026-05-25 18:30","O2CW Manuel Becerra","Spa","spa","88","80","Tension","Aviso app y refuerzo limpieza"],
    ["AF-003","2026-05-25 18:30","O2CW Granada","Piscina","piscina","76","82","Controlado","Mantener monitorizacion"],
    ["AF-004","2026-05-25 18:30","O2CW Huelva","Sala fitness","fitness","82","84","Tension","Refuerzo tecnico 19:00-20:30"]
  ]);

  var mantenimiento = ensureSheet(ss, "mantenimiento", [
    "id_activo","club","instalacion","horas_uso","umbral_aviso","riesgo_averia","estado","accion","fecha_revision"
  ], "#006f9f");
  appendRows(mantenimiento, [
    ["M-447","O2CW Malaga","Sauna seca","392","420","84","Preventivo","Revision resistencia y sensor","2026-05-27"],
    ["M-441","O2CW Granada","Duchas vestuario","1180","1300","68","Observacion","Inspeccion caudal y juntas","2026-05-29"],
    ["M-430","O2CW Huelva","Cinta Technogym 04","780","1100","42","Normal","Mantenimiento programado","2026-06-04"],
    ["M-422","O2CW Manuel Becerra","Bomba hidromasaje","610","680","73","Preventivo","Cambio filtro y check vibracion","2026-05-28"]
  ]);

  var tareas = ensureSheet(ss, "tareas", [
    "id_tarea","categoria","club","responsable","prioridad","estado","descripcion","fecha_creacion"
  ], "#071016");
  appendRows(tareas, [
    ["T-801","Retencion","O2CW Manuel Becerra","Customer Success","Alta","Hoy","Llamar a Clara Valera con propuesta spa + rutina.","2026-05-25"],
    ["T-790","Experiencia","O2CW Malaga","Club manager","Alta","En curso","Responder resena sobre sauna y validar mantenimiento.","2026-05-24"],
    ["T-772","Aforo","O2CW Malaga","Operaciones","Media","Pendiente","Redistribuir reservas de padel en hora punta.","2026-05-24"]
  ]);

  var autos = ensureSheet(ss, "automatizaciones", [
    "id_evento","trigger","entidad","detalle","estado","hora_inicio","hora_fin","resultado"
  ], "#009de0");
  appendRows(autos, [
    ["A-001","Churn score","S-1748","Frecuencia cae de 11 a 3 visitas","En curso","2026-05-25 09:02","","Playbook de retencion preparado"],
    ["A-002","Voz cliente","V-104","Resena negativa sobre sauna","En curso","2026-05-24 11:14","","Tarea a club manager"],
    ["A-003","Aforo","AF-001","Padel Malaga al 94%","Completado","2026-05-25 18:30","2026-05-25 18:31","Franja alternativa sugerida"]
  ]);

  var impacto = ensureSheet(ss, "agenda_impacto", [
    "fecha","tipo","categoria","club","entidad","importe_estimado","estado","origen","trigger_relacionado","comentario"
  ], "#006f9f");
  appendRows(impacto, [
    ["2026-05-25","ingreso protegido","retencion","O2CW Manuel Becerra","S-1748","3240","en riesgo","lifetime","churn","LTV protegido si se recupera habito"],
    ["2026-05-26","coste evitado","mantenimiento","O2CW Malaga","M-447","1800","preventivo","mantenimiento","maintenance","Evitar cierre no planificado de sauna"],
    ["2026-05-25","reputacion","voz_cliente","O2CW Malaga","V-104","900","abierto","voz_cliente","voice","Gestion de resena critica"],
    ["2026-05-28","pipeline","comercial","O2CW Sexta Avenida","C-2401","1280","probable","ventas","sales","Alta esperada Well Living"]
  ]);

  appendRows(socios, [
    ["S-2602","Lucia Marin","O2CW Malaga","Well Living Plus","2025-02-11","Riesgo alto","4","12","74","3560","Recovery + piscina","Sesion recovery + rutina piscina"],
    ["S-1189","Oscar Vidal","O2CW Sexta Avenida","Corporate Wellness","2024-10-04","Riesgo medio","6","9","57","4120","ZONE + fuerza","Reactivar con ZONE horario ejecutivo"],
    ["S-3077","Ainhoa Perez","O2CW Parc del Migdia","Family Wellness","2025-06-18","Activo","15","14","24","2680","Aqua + retos SoyO2","Invitar a reto SoyO2 familiar"],
    ["S-2334","Rafael Torres","O2CW Huelva","Well Living","2025-01-29","Riesgo alto","2","7","71","1840","Fisio espalda","Llamada retorno + plan espalda"],
    ["S-2718","Marina Soler","O2CW Boutique Girona","Boutique Women","2025-12-03","Activo","11","10","29","2260","Yoga + sauna","Recomendar Pilates Reformer"],
    ["S-3092","Teresa Navarro","O2CW Boutique Madrid","Boutique Premium","2025-08-14","Riesgo medio","7","11","54","3020","Bodymind","Ajustar agenda de clases"],
    ["S-3201","Hugo Salas","O2CW Granada","Padel & Wellness","2025-04-20","Riesgo medio","8","13","59","2440","Padel + spa","Ofrecer huecos fuera de pico"],
    ["S-3380","Noelia Castro","O2CW Manuel Becerra","Well Living","2025-11-08","Activo","10","9","33","2050","ZONE","Recomendar reto ZONE Games"],
    ["S-3521","Bruno Escudero","O2CW Sexta Avenida","Family Wellness","2024-12-12","Riesgo alto","3","10","76","3980","Natacion familiar","Reunion familiar + plan natacion infantil"],
    ["S-3604","Irene Costa","O2CW Malaga","Recovery Plus","2025-05-07","Activo","12","11","27","3180","Recovery + fisio","Mantener seguimiento fisio"],
    ["S-3742","Mateo Puig","O2CW Parc del Migdia","Well Living","2025-09-01","Riesgo medio","6","10","52","1920","Outdoor","Reactivar con grupo running"],
    ["S-3888","Carla Benitez","O2CW Huelva","Aqua Wellness","2026-02-03","Activo","14","13","22","2160","Natacion","Invitar a masterclass Aquawellness"],
    ["S-4011","Valentina Rius","O2CW Boutique Barcelona","Boutique Premium","2025-10-09","Activo","12","12","26","2860","Body&Soul + sauna","Recomendar masterclass Body&Soul"],
    ["S-4056","Andres Molina","O2CW Manuel Becerra","Well Living Plus","2025-07-19","Riesgo medio","5","9","61","3340","Fuerza","Plan fuerza 3 semanas + recordatorios SoyO2"],
    ["S-4080","Monica Vega","O2CW Sexta Avenida","Corporate Wellness","2025-01-16","Activo","9","8","30","3720","Corporate + ZONE","Invitar a evento corporate wellness"],
    ["S-4122","Diego Ramos","O2CW Granada","Padel & Wellness","2025-06-02","Riesgo alto","3","12","73","2580","Padel","Resolver reservas fallidas y liga interna"],
    ["S-4190","Elena Prieto","O2CW Parc del Migdia","Outdoor & Aqua","2025-04-12","Activo","11","10","28","2040","Outdoor + aqua","Recomendar running club + Aqua yoga"],
    ["S-4255","Carmen Ruiz","O2CW Malaga","Recovery Plus","2024-12-01","Riesgo medio","6","9","56","3460","Recovery + fisio","Check recuperacion y seguimiento fisio"],
    ["S-4310","Nicolas Serra","O2CW Boutique Madrid","Boutique Premium","2026-01-28","Activo","16","15","21","2940","HIIT boutique","Mantener recomendacion HIIT boutique"]
  ]);

  appendRows(voz, [
    ["V-121","2026-05-24","Encuesta NPS","O2CW Sexta Avenida","Detractor","-64","Natacion infantil","Alta","Abierta","Llevamos semanas sin hueco para el curso infantil.","Escalar a coordinacion y proponer lista preferente"],
    ["V-122","2026-05-24","WhatsApp","O2CW Boutique Madrid","Neutro","-22","Pilates Reformer","Media","Nueva","Nunca encuentro huecos de Pilates despues del trabajo.","Cruzar reservas fallidas y proponer franja alternativa"],
    ["V-123","2026-05-23","Recepcion","O2CW Manuel Becerra","Queja","-51","Vestuarios","Alta","En curso","Los vestuarios se saturan tras ZONE y el spa pierde sensacion premium.","Refuerzo limpieza y aviso de franjas valle"],
    ["V-124","2026-05-23","Google Reviews","O2CW Boutique Girona","5","91","Bodymind","Baja","Completada","Yoga, sauna y ambiente por encima de otros gimnasios.","Usar como promotor boutique"],
    ["V-125","2026-05-22","App SoyO2","O2CW Huelva","Sugerencia","18","Recordatorios","Media","Nueva","Seria util recibir recordatorios de natacion y eventos.","Segmentar recordatorios por habito"],
    ["V-126","2026-05-22","Telefono","O2CW Granada","Queja","-47","Padel","Media","Abierta","No hay visibilidad clara de huecos reales de pistas.","Unificar disponibilidad y guion de recepcion"],
    ["V-127","2026-05-21","Encuesta post-fisio","O2CW Malaga","Promotor","84","Fisioterapia","Baja","Completada","El fisio me ayudo a volver a entrenar con seguridad.","Argumento comercial para Recovery Plus"],
    ["V-128","2026-05-21","Hoja sugerencias","O2CW Parc del Migdia","Sugerencia","33","Running club","Baja","Nueva","Mas salidas de running por la manana ayudarian a mantener rutina.","Test grupo outdoor martes y jueves"]
  ]);

  appendRows(comunicaciones, [
    ["COM-004","2026-05-24","S-2602","O2CW Malaga","WhatsApp","Incidencia spa y baja rutina","-45","Pendiente","Sesion recovery + disculpa proactiva"],
    ["COM-005","2026-05-24","S-1189","O2CW Sexta Avenida","Telefono","Cambio horario laboral","-8","Contactado","Enviar ZONE 20:30 y plan corporate"],
    ["COM-006","2026-05-23","S-2334","O2CW Huelva","Telefono","Dolor lumbar y abandono fisio","-38","Sin respuesta","Reintentar llamada con fisio"],
    ["COM-007","2026-05-23","S-3201","O2CW Granada","WhatsApp","Disponibilidad padel","-21","Abierto","Proponer huecos fuera de pico"],
    ["COM-008","2026-05-22","lead","O2CW Boutique Madrid","Instagram","Interes Pilates Reformer","32","Contactado","Enviar huecos reales y visita"],
    ["COM-009","2026-05-22","lead","O2CW Malaga","Dia de prueba","Recovery Plus","58","Alta probable","Cita fisio + plan mensual"]
  ]);

  appendRows(encuestas, [
    ["E-004","2026-05-24","S-3521","O2CW Sexta Avenida","5","Baja","Curso natacion infantil sin huecos","Natacion y comunicacion","Resolver cupo familiar"],
    ["E-005","2026-05-23","S-2602","O2CW Malaga","6","Media","Sauna y duchas","Spa y mantenimiento","Plan preventivo visible"],
    ["E-006","2026-05-23","S-2718","O2CW Boutique Girona","9","Alta","Ninguno","Bodymind y sauna","Recomendar Pilates Reformer"],
    ["E-007","2026-05-22","S-2334","O2CW Huelva","4","Baja","Dolor lumbar sin seguimiento","Fisioterapia","Llamada humana con plan espalda"],
    ["E-008","2026-05-22","S-3888","O2CW Huelva","10","Alta","Ninguno","Aqua Wellness","Invitar a masterclass"]
  ]);

  appendRows(habitos, [
    ["H-004","S-2602","Ultimos 30 dias","O2CW Malaga","4","3 reservas piscina","Recovery; piscina","-67% accesos vs periodo anterior","Riesgo alto por friccion spa"],
    ["H-005","S-1189","Ultimos 30 dias","O2CW Sexta Avenida","6","3 cancelaciones ZONE","ZONE; fuerza","Cambio de franja a noche","Riesgo medio corporate"],
    ["H-006","S-3077","Ultimos 30 dias","O2CW Parc del Migdia","15","9 reservas aqua","Piscina; retos SoyO2","Estable positivo","Socia familiar promotora"],
    ["H-007","S-2334","Ultimos 30 dias","O2CW Huelva","2","0 reservas","Sala fitness; fisio","Abandono de rutina","Riesgo alto por salud"],
    ["H-008","S-3201","Ultimos 30 dias","O2CW Granada","8","5 reservas fallidas","Padel; spa","Saturacion padel 20:00","Redistribuir demanda"],
    ["H-009","S-3742","Ultimos 30 dias","O2CW Parc del Migdia","6","1 reserva indoor","Outdoor; On Demand","Migracion a exterior","Activar running club"]
  ]);

  appendRows(entrevistas, [
    ["C-2420","2026-05-25","Beatriz Galan","O2CW Boutique Madrid","Instagram","Boutique, Pilates y spa sin ambiente masificado","Disponibilidad Pilates; precio","82","Visita agendada","Mostrar huecos reales y valor boutique"],
    ["C-2421","2026-05-25","Daniel Bosch","O2CW Parc del Migdia","Referral socio","Natacion y fuerza para triatlon","Distancia; horario piscina","78","Contactado","Enviar plan piscina + fuerza + On Demand"],
    ["C-2422","2026-05-24","Sandra Rivas","O2CW Malaga","Dia de prueba","Recuperacion lesion y spa post-entreno","Compromiso","93","Alta probable","Cita con fisio y plan Recovery Plus"],
    ["C-2423","2026-05-24","Pablo Nieto","O2CW Granada","WhatsApp comercial","Padel y sala fitness con amigos","Saturacion pistas","69","Seguimiento","Enviar disponibilidad real fuera de pico"],
    ["C-2424","2026-05-23","Laura Esteve","O2CW Huelva","Web","Plan familiar con piscina infantil","Curso natacion","74","Visita agendada","Proponer Family Wellness con cupo curso"],
    ["C-2425","2026-05-23","Marc Oliva","O2CW Boutique Barcelona","Evento corporativo","Entrenamiento funcional cerca oficina","Contrato empresa","67","Contactado","Preparar propuesta corporate flexible"],
    ["C-2426","2026-05-22","Elena Moya","O2CW Manuel Becerra","Telefono","Fuerza, ZONE y fisioterapia preventiva","Parking","81","Alta probable","Invitacion ZONE + sesion fisio"],
    ["C-2427","2026-05-22","Victor Sancho","O2CW Sexta Avenida","Google Ads","Cambio desde low-cost a experiencia premium","Precio; permanencia","58","Nutrir","Enviar comparativa de valor premium"]
  ]);

  appendRows(aforos, [
    ["AF-005","2026-05-25 20:00","O2CW Sexta Avenida","ZONE","dirigida","91","86","Saturado","Abrir clase espejo 20:30 si se repite"],
    ["AF-006","2026-05-25 19:30","O2CW Boutique Madrid","Pilates Reformer","dirigida","96","88","Saturado","Priorizar lista de espera y franja 14:30"],
    ["AF-007","2026-05-25 18:00","O2CW Huelva","Piscina cursos","piscina","89","84","Tension","Revisar cupos familiares y monitor apoyo"],
    ["AF-008","2026-05-25 07:30","O2CW Parc del Migdia","Running club","outdoor","52","75","Oportunidad","Lanzar grupo martes jueves manana"],
    ["AF-009","2026-05-25 20:00","O2CW Manuel Becerra","ZONE","dirigida","93","86","Saturado","Mensaje SoyO2 con clase alternativa"],
    ["AF-010","2026-05-25 18:30","O2CW Boutique Barcelona","Body&Soul","dirigida","69","78","Controlado","Recomendar clase alternativa si sube demanda"],
    ["AF-011","2026-05-25 18:30","O2CW Parc del Migdia","Cycling","dirigida","64","80","Controlado","Sin accion"],
    ["AF-012","2026-05-25 19:30","O2CW Sexta Avenida","Sala fitness","fitness","87","84","Tension","Refuerzo tecnico en zona fuerza"],
    ["AF-013","2026-05-25 18:00","O2CW Boutique Girona","Yoga","dirigida","73","80","Controlado","Mantener cupo y monitorizar waitlist"],
    ["AF-014","2026-05-25 18:45","O2CW Boutique Barcelona","Sauna","spa","78","80","Controlado","Sin accion"]
  ]);

  appendRows(mantenimiento, [
    ["M-501","O2CW Sexta Avenida","Sistema climatizacion ZONE","1260","1400","78","Preventivo","Revision filtros y caudal","2026-05-30"],
    ["M-502","O2CW Boutique Madrid","Reformer 07","860","920","72","Preventivo","Cambio muelles y check seguridad","2026-05-29"],
    ["M-503","O2CW Granada","Iluminacion pista padel 3","540","620","69","Observacion","Inspeccion electrica","2026-05-31"],
    ["M-504","O2CW Huelva","Filtro piscina infantil","1010","1080","81","Preventivo","Lavado y repuesto antes del sabado","2026-05-28"],
    ["M-505","O2CW Parc del Migdia","Bicicletas cycling bloque B","740","1000","51","Normal","Mantenimiento mensual","2026-06-06"],
    ["M-506","O2CW Boutique Girona","Sauna boutique","390","520","58","Normal","Seguimiento temperatura","2026-06-03"]
  ]);

  appendRows(tareas, [
    ["T-843","Retencion","O2CW Malaga","Experiencia","Alta","Hoy","Contactar a Lucia Marin por caida de accesos y dolor spa.","2026-05-25"],
    ["T-844","Natacion","O2CW Sexta Avenida","Coordinacion","Alta","Hoy","Resolver lista de espera infantil y alternativas familiares.","2026-05-25"],
    ["T-845","Comercial","O2CW Boutique Madrid","Ventas","Media","Pendiente","Enviar disponibilidad real de Pilates Reformer a Beatriz Galan.","2026-05-25"],
    ["T-846","Aforo","O2CW Manuel Becerra","Operaciones","Media","Ahora","Recomendar clase ZONE alternativa por saturacion 20:00.","2026-05-25"],
    ["T-847","Mantenimiento","O2CW Huelva","Tecnico","Alta","Programada","Revisar filtro piscina infantil antes de actividad familiar.","2026-05-25"],
    ["T-848","CX","O2CW Granada","Recepcion","Media","Nueva","Unificar guion de disponibilidad de padel y waitlist.","2026-05-25"],
    ["T-849","Producto","O2CW Parc del Migdia","Club manager","Baja","Nueva","Probar running club por la manana con segmento outdoor.","2026-05-25"],
    ["T-850","Comercial","O2CW Sexta Avenida","Ventas","Media","Pendiente","Nutrir lead low-cost con comparativa de valor premium.","2026-05-25"]
  ]);

  appendRows(autos, [
    ["A-004","Encuesta NPS","E-004","Natacion infantil Sexta Avenida NPS 5","En curso","2026-05-25 10:00","","Tarea a coordinacion natacion"],
    ["A-005","Reservas fallidas","S-3201","5 intentos de padel sin hueco","Completado","2026-05-25 20:00","2026-05-25 20:01","Franja alternativa propuesta"],
    ["A-006","Lead scoring","C-2422","Dia de prueba Recovery Plus intent 93","Completado","2026-05-24 18:30","2026-05-24 18:31","Alta probable y cita fisio"]
  ]);

  appendRows(impacto, [
    ["2026-05-25","ingreso protegido","retencion","O2CW Malaga","S-2602","3560","en riesgo","lifetime","churn","Recovery Plus con caida de accesos"],
    ["2026-05-25","ingreso protegido","retencion","O2CW Sexta Avenida","S-3521","3980","accion hoy","lifetime","churn","Plan familiar cerca de renovacion"],
    ["2026-05-26","coste evitado","mantenimiento","O2CW Huelva","M-504","2200","preventivo","mantenimiento","maintenance","Evitar cierre piscina infantil"],
    ["2026-05-25","pipeline","comercial","O2CW Malaga","C-2422","1560","alta probable","ventas","sales","Recovery Plus con intencion 93"],
    ["2026-05-25","experiencia","aforo","O2CW Boutique Madrid","AF-006","1200","saturado","operaciones","capacity","Pilates Reformer al 96%"]
  ]);

  if (def) {
    try { ss.deleteSheet(def); } catch(e) {}
  }

  SpreadsheetApp.flush();
}

function appendAutomation(ss, trigger, entidad, detalle, resultado) {
  var autos = ss.getSheetByName("automatizaciones");
  var id = getNextSequentialId(autos, "A-");
  var now = nowFormatted();
  autos.appendRow([id, trigger, entidad, detalle, "Completado", now, now, resultado]);
  return id;
}

function appendTask(ss, categoria, club, responsable, prioridad, descripcion) {
  var tareas = ss.getSheetByName("tareas");
  var id = getNextSequentialId(tareas, "T-");
  tareas.appendRow([id, categoria, club, responsable, prioridad, "Nueva", descripcion, todayIso()]);
  return id;
}

function handleTrigger(action, ss) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    if (action === "churn") {
      appendTask(ss, "Retencion", "O2CW Manuel Becerra", "Responsable experiencia", "Alta", "Activar playbook Clara Valera: llamada, WhatsApp personalizado, invitacion y rutina de vuelta.");
      if (ss.getSheetByName("comunicaciones")) ss.getSheetByName("comunicaciones").appendRow([getNextSequentialId(ss.getSheetByName("comunicaciones"), "COM-"), todayIso(), "S-1748", "O2CW Manuel Becerra", "WhatsApp + llamada", "Recuperacion de habito", "-42", "Pendiente", "Invitacion spa franja valle"]);
      if (ss.getSheetByName("habitos_uso")) ss.getSheetByName("habitos_uso").appendRow([getNextSequentialId(ss.getSheetByName("habitos_uso"), "H-"), "S-1748", "Ultimos 30 dias", "O2CW Manuel Becerra", "3", "2 no-shows", "Spa; fuerza", "Caida critica", "Activar retencion"]);
      appendAutomation(ss, "Churn score", "S-1748", "Riesgo sube a 86/100 cruzando accesos, cuotas, servicios y comunicaciones", "Playbook de retencion y valor protegido actualizado.");
      ss.getSheetByName("agenda_impacto").appendRow([todayIso(), "ingreso protegido", "retencion", "O2CW Manuel Becerra", "S-1748", "3240", "accion hoy", "lifetime", "churn", "Playbook activado"]);
      return json({ status: "ok", version: VERSION, action: action, mensaje: "Socio en riesgo registrado y playbook de retencion creado." });
    }

    if (action === "voice") {
      var voiceId = getNextSequentialId(ss.getSheetByName("voz_cliente"), "V-");
      ss.getSheetByName("voz_cliente").appendRow([voiceId, todayIso(), "Google Reviews + encuesta", "O2CW Malaga", "2", "-88", "Sauna y bano turco", "Alta", "Nueva", "Pago un club premium y la sauna vuelve a estar cerrada sin aviso.", "Responder, abrir mantenimiento y marcar area de mejora"]);
      if (ss.getSheetByName("encuestas")) ss.getSheetByName("encuestas").appendRow([getNextSequentialId(ss.getSheetByName("encuestas"), "E-"), todayIso(), "anonimo", "O2CW Malaga", "4", "Baja", "Sauna cerrada sin aviso", "Spa y comunicacion preventiva", "Plan preventivo + aviso SoyO2"]);
      appendTask(ss, "Reclamacion", "O2CW Malaga", "Club manager", "Alta", "Gestionar resena 2 estrellas sobre sauna y confirmar plan preventivo.");
      appendAutomation(ss, "Voz cliente", voiceId, "Resena y encuesta clasificadas como Spa - sentimiento -88", "Tarea, area de mejora y respuesta sugerida creadas.");
      return json({ status: "ok", version: VERSION, action: action, mensaje: "Resena clasificada, tarea creada y sentimiento actualizado." });
    }

    if (action === "sales") {
      var salesId = getNextSequentialId(ss.getSheetByName("entrevistas_comerciales"), "C-");
      ss.getSheetByName("entrevistas_comerciales").appendRow([salesId, todayIso(), "Carlos Medina", "O2CW Manuel Becerra", "Llamada + WhatsApp", "Piscina, fuerza y recuperacion de espalda", "Precio; parking; compromiso", "88", "Alta probable", "Enviar comparativa de valor premium y cita con fisioterapeuta"]);
      if (ss.getSheetByName("comunicaciones")) ss.getSheetByName("comunicaciones").appendRow([getNextSequentialId(ss.getSheetByName("comunicaciones"), "COM-"), todayIso(), "lead", "O2CW Manuel Becerra", "WhatsApp comercial", "Resolver objecion precio y parking", "24", "Abierto", "Enviar prueba piscina + fisioterapia"]);
      appendTask(ss, "Comercial", "O2CW Manuel Becerra", "Equipo ventas", "Alta", "Enviar propuesta Well Living a Carlos Medina con prueba de piscina y fisio.");
      appendAutomation(ss, "Entrevista comercial", salesId, "Objeciones precio, parking y compromiso detectadas", "Resumen IA y siguiente accion creados.");
      return json({ status: "ok", version: VERSION, action: action, mensaje: "Entrevista comercial resumida y siguiente accion asignada." });
    }

    if (action === "maintenance") {
      appendTask(ss, "Mantenimiento", "O2CW Malaga", "Tecnico externo", "Alta", "Revision sauna seca antes de apertura de tarde; riesgo 93/100.");
      appendAutomation(ss, "Mantenimiento predictivo", "M-447", "Sauna seca sube a riesgo 93/100", "Orden preventiva creada.");
      ss.getSheetByName("mantenimiento").appendRow(["M-499", "O2CW Malaga", "Sauna seca", "402", "420", "93", "Critico", "Parada preventiva 07:00 + repuesto resistencia", isoOffsetDate(1)]);
      return json({ status: "ok", version: VERSION, action: action, mensaje: "Orden preventiva creada para sauna Malaga." });
    }

    if (action === "capacity") {
      appendTask(ss, "Aforo", "O2CW Malaga", "Operaciones", "Media", "Activar recomendacion de franja alternativa para padel y mensaje SoyO2.");
      appendAutomation(ss, "Aforo saturado", "AF-001", "Padel Malaga al 97%", "Mensaje SoyO2 y lista de espera preparados.");
      ss.getSheetByName("aforos").appendRow(["AF-099", nowFormatted(), "O2CW Malaga", "Padel", "padel", "97", "85", "Saturado", "Derivar reservas a franja 21:00 y abrir lista de espera"]);
      if (ss.getSheetByName("habitos_uso")) ss.getSheetByName("habitos_uso").appendRow([getNextSequentialId(ss.getSheetByName("habitos_uso"), "H-"), "segmento-padel", "Hora punta", "O2CW Malaga", "alto", "97% ocupacion", "Padel", "Cambio de tendencia a saturacion", "Redistribuir demanda"]);
      return json({ status: "ok", version: VERSION, action: action, mensaje: "Aforo saturado registrado y plan operativo creado." });
    }

    return json({ status: "error", version: VERSION, mensaje: "Accion no reconocida." });
  } finally {
    lock.releaseLock();
  }
}

function buildStatePayload(ss, detailFull) {
  var socios = ss.getSheetByName("socios");
  var voz = ss.getSheetByName("voz_cliente");
  var entrevistas = ss.getSheetByName("entrevistas_comerciales");
  var comunicaciones = ss.getSheetByName("comunicaciones");
  var encuestas = ss.getSheetByName("encuestas");
  var habitos = ss.getSheetByName("habitos_uso");
  var necesidades = ss.getSheetByName("necesidades_o2");
  var aforos = ss.getSheetByName("aforos");
  var mantenimiento = ss.getSheetByName("mantenimiento");
  var tareas = ss.getSheetByName("tareas");
  var autos = ss.getSheetByName("automatizaciones");
  var impacto = ss.getSheetByName("agenda_impacto");

  var sociosData = socios ? socios.getDataRange().getValues() : [[]];
  var active = Math.max(0, sociosData.length - 1);
  var churnScores = sociosData.slice(1).map(function(row) { return Number(row[8] || 0); });
  var avgChurn = churnScores.length ? churnScores.reduce(function(a, b){ return a + b; }, 0) / churnScores.length : 0;

  var tareasData = tareas ? tareas.getDataRange().getValues() : [[]];
  var openTasks = tareasData.slice(1).filter(function(row) { return String(row[5]).toLowerCase() !== "completada"; }).length;

  var result = {
    status: "ok",
    version: VERSION,
    timestamp: new Date().toISOString(),
    resumen: {
      socios_muestra: active,
      churn_medio: Math.round(avgChurn),
      tareas_abiertas: openTasks,
      feedback_total: voz ? voz.getLastRow() - 1 : 0,
      entrevistas_total: entrevistas ? entrevistas.getLastRow() - 1 : 0,
      comunicaciones_total: comunicaciones ? comunicaciones.getLastRow() - 1 : 0,
      encuestas_total: encuestas ? encuestas.getLastRow() - 1 : 0,
      habitos_total: habitos ? habitos.getLastRow() - 1 : 0,
      aforos_total: aforos ? aforos.getLastRow() - 1 : 0,
      mantenimiento_total: mantenimiento ? mantenimiento.getLastRow() - 1 : 0,
      necesidades_cubiertas: necesidades ? necesidades.getLastRow() - 1 : 0
    }
  };

  if (detailFull) {
    result.snapshot = {
      socios: sheetToObjects(socios),
      voz_cliente: sheetToObjects(voz),
      entrevistas_comerciales: sheetToObjects(entrevistas),
      comunicaciones: sheetToObjects(comunicaciones),
      encuestas: sheetToObjects(encuestas),
      habitos_uso: sheetToObjects(habitos),
      necesidades_o2: sheetToObjects(necesidades),
      aforos: sheetToObjects(aforos),
      mantenimiento: sheetToObjects(mantenimiento),
      tareas: sheetToObjects(tareas),
      automatizaciones: sheetToObjects(autos),
      agenda_impacto: sheetToObjects(impacto)
    };
  }

  return result;
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action ? e.parameter.action : "state";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "warmup") {
    return json({ status: "ok", version: VERSION, action: "warmup", timestamp: new Date().toISOString() });
  }

  if (action === "reset" || action === "setup") {
    setupSheet();
    return json({ status: "ok", version: VERSION, action: action, mensaje: "Hoja O2 reiniciada con datos demo." });
  }

  if (action === "state") {
    var detail = e && e.parameter && e.parameter.detail ? e.parameter.detail : "";
    return json(buildStatePayload(ss, detail === "full"));
  }

  if (["churn", "voice", "sales", "maintenance", "capacity"].indexOf(action) !== -1) {
    return handleTrigger(action, ss);
  }

  return json({ status: "error", version: VERSION, mensaje: "Usa action=state|reset|warmup|churn|voice|sales|maintenance|capacity" });
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    if (e && e.parameter) body = e.parameter;
  }
  var action = body.action || "state";
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "reset" || action === "setup") {
    setupSheet();
    return json({ status: "ok", version: VERSION, action: action, mensaje: "Hoja O2 reiniciada con datos demo." });
  }

  if (["churn", "voice", "sales", "maintenance", "capacity"].indexOf(action) !== -1) {
    return handleTrigger(action, ss);
  }

  return json(buildStatePayload(ss, action === "state_full"));
}
