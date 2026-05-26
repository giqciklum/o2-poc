(() => {
  const STORAGE_KEY = "o2_runtime_v4";
  const BACKEND_URL = "https://script.google.com/macros/s/AKfycbx3QE-JVcP1dSmnqcy6LUbQhMboZ9MbNf_LlRzrinVzBJXuDOXYNMSvM3KKgk15wiDycw/exec";
  const BACKEND_TIMEOUT = 10000;
  const POLL_INTERVAL = 15000;
  const IS_PRESENT_MODE = new URLSearchParams(window.location.search).get("mode") === "present";

  const byId = (id) => document.getElementById(id);
  const euro = (value) => new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value || 0);
  const pct = (value) => `${Math.round(value || 0)}%`;
  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const debounce = (fn, ms) => {
    let timer;
    return function (...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), ms);
    };
  };

  // Sparkline helpers
  function spark(values, w = 80, h = 28, stroke = "#009de0", fill = "rgba(0,157,224,0.14)") {
    if (!Array.isArray(values) || values.length < 2) return "";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = w / (values.length - 1);
    const points = values.map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const area = `M0,${h} L${points.join(" L")} L${w},${h} Z`;
    const line = `M${points.join(" L")}`;
    return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${area}" fill="${fill}" />
      <path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
  }

  // Animated counter (count-up)
  function animateNumber(el, target, options = {}) {
    if (!el) return;
    const duration = options.duration || 900;
    const formatter = options.formatter || ((v) => Math.round(v).toLocaleString("es-ES"));
    const start = performance.now();
    const initial = parseFloat(el.dataset.currentValue || "0") || 0;
    const diff = target - initial;
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = initial + diff * eased;
      el.textContent = formatter(value);
      if (progress < 1) window.requestAnimationFrame(tick);
      else {
        el.dataset.currentValue = String(target);
      }
    }
    window.requestAnimationFrame(tick);
  }

  // Scenario icons (inline SVG)
  const scenarioIcons = {
    churn: '<svg viewBox="0 0 24 24"><path d="M19 9l-7-6-7 6"/><path d="M5 9v11h14V9"/><path d="M9 14h6"/></svg>',
    voice: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    sales: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    maintenance: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    capacity: '<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>'
  };

  // 9 clubs of O2 (synthetic state, with sparkline visits trend)
  const baseClubs = [
    { id: "MB", name: "Manuel Becerra", city: "Madrid", state: "danger", visits: 1240, visitsTrend: [98, 96, 92, 86, 78, 71], retention: 81, alerts: 4, churn: 38, openTasks: 6 },
    { id: "SA", name: "Sexta Avenida", city: "Madrid", state: "warn", visits: 1080, visitsTrend: [94, 95, 92, 90, 86, 84], retention: 86, alerts: 2, churn: 22, openTasks: 4 },
    { id: "BM", name: "Boutique Madrid", city: "Madrid", state: "ok", visits: 720, visitsTrend: [88, 89, 90, 91, 93, 95], retention: 92, alerts: 0, churn: 12, openTasks: 1 },
    { id: "MA", name: "Málaga", city: "Málaga", state: "danger", visits: 980, visitsTrend: [101, 99, 95, 90, 84, 79], retention: 78, alerts: 5, churn: 41, openTasks: 7 },
    { id: "GR", name: "Granada", city: "Granada", state: "warn", visits: 910, visitsTrend: [92, 93, 91, 89, 87, 85], retention: 84, alerts: 3, churn: 28, openTasks: 3 },
    { id: "HU", name: "Huelva", city: "Huelva", state: "ok", visits: 640, visitsTrend: [82, 83, 84, 86, 87, 89], retention: 89, alerts: 1, churn: 18, openTasks: 2 },
    { id: "PM", name: "Parc del Migdia", city: "Girona", state: "ok", visits: 580, visitsTrend: [80, 81, 82, 83, 85, 86], retention: 90, alerts: 0, churn: 16, openTasks: 1 },
    { id: "BG", name: "Boutique Girona", city: "Girona", state: "ok", visits: 410, visitsTrend: [78, 80, 81, 82, 84, 86], retention: 91, alerts: 0, churn: 14, openTasks: 0 },
    { id: "BB", name: "Boutique Barcelona", city: "Barcelona", state: "warn", visits: 760, visitsTrend: [88, 87, 88, 90, 91, 88], retention: 87, alerts: 2, churn: 24, openTasks: 3 }
  ];

  const mapPositions = {
    SA: [18, 22],
    MB: [50, 16],
    BM: [82, 22],
    BG: [90, 44],
    PM: [82, 66],
    BB: [78, 86],
    MA: [45, 90],
    GR: [26, 78],
    HU: [13, 56]
  };
  const mapLinks = [
    ["SA", "MB"], ["MB", "BM"], ["BM", "BG"], ["BG", "PM"], ["PM", "BB"],
    ["BB", "MA"], ["MA", "GR"], ["GR", "HU"], ["HU", "SA"],
    ["MB", "MA"], ["SA", "PM"], ["BM", "GR"]
  ];

  const baseState = {
    currentTab: "dashboard",
    currentScenario: null,
    selectedMemberId: "S-1748",
    kpis: {
      activeMembers: 18420,
      churnRisk: 14.8,
      sentiment: 82,
      occupancy: 71,
      maintenanceRisk: 18,
      pipeline: 286000,
      protectedRevenue: 42800,
      nps: 61
    },
    sparklines: {
      activeMembers: [17900, 18020, 18180, 18260, 18320, 18420],
      churnRisk: [12.1, 12.6, 13.2, 13.8, 14.2, 14.8],
      sentiment: [86, 85, 84, 83, 82, 82],
      pipeline: [218, 232, 248, 261, 272, 286]
    },
    heroProof: [
      ["Fuentes socio", "8 conectadas"],
      ["Necesidades O2", "5 cubiertas"],
      ["Red viva", "9 clubs premium"],
      ["Huella", "Demo + Sheet"]
    ],
    dataSources: [
      { label: "Accesos", detail: "Frecuencia, recencia y franjas de uso", strength: 96 },
      { label: "Cuotas", detail: "Plan, ciclo de cobro y valor protegido", strength: 88 },
      { label: "Servicios", detail: "Spa, piscina, clases, fisio, pádel y SoyO2", strength: 92 },
      { label: "Acciones comerciales", detail: "Leads, visitas, objeciones y seguimiento", strength: 84 },
      { label: "WhatsApp / teléfono", detail: "Motivos, sentimiento y siguiente mejor acción", strength: 76 },
      { label: "Sugerencias y reclamaciones", detail: "Tema, sede, prioridad y responsable", strength: 91 },
      { label: "Encuestas", detail: "Satisfacción, NPS y puntos de dolor", strength: 79 },
      { label: "Aforos y reservas", detail: "Cambios de tendencia por zona y hora", strength: 86 }
    ],
    coverage: [
      {
        need: "Predicción de riesgo de deserción",
        output: "Churn explicable + LTV protegido + playbook de recuperación",
        signals: ["accesos", "cuotas", "servicios", "comunicaciones"],
        owner: "Experiencia / club"
      },
      {
        need: "Satisfacción y puntos de dolor",
        output: "Sentimiento por sede + temas críticos + prioridad operativa",
        signals: ["reseñas", "reclamaciones", "encuestas", "WhatsApp"],
        owner: "CX / dirección"
      },
      {
        need: "Áreas de mejora en el servicio",
        output: "Ranking de temas recurrentes: spa, vestuarios, pádel, clases",
        signals: ["sugerencias", "aforos", "mantenimiento", "recepción"],
        owner: "Operaciones"
      },
      {
        need: "Hábitos de uso y cambios de tendencia",
        output: "Radar de frecuencia, reservas, no-shows y migración de franjas",
        signals: ["accesos", "SoyO2", "reservas", "servicios utilizados"],
        owner: "Club manager"
      },
      {
        need: "Análisis de estrategias comerciales",
        output: "Objeciones agregadas + intención de compra + eficacia por canal",
        signals: ["CRM", "llamadas", "WhatsApp", "visitas comerciales"],
        owner: "Comercial"
      }
    ],
    retentionTrend: {
      labels: ["Dic", "Ene", "Feb", "Mar", "Abr", "May"],
      visits: [12, 11, 10, 8, 6, 4],
      churn: [16, 19, 24, 32, 48, 68]
    },
    clubs: deepClone(baseClubs),
    members: [
      {
        id: "S-1748",
        name: "Clara Valera",
        club: "O2CW Manuel Becerra",
        plan: "Well Living Plus",
        status: "Riesgo alto",
        churnScore: 79,
        visits30: 3,
        visitsPrev: 11,
        ltv: 3240,
        nextAction: "Llamada de recuperación + invitación a circuito spa en franja valle",
        reason: "Caída fuerte de frecuencia, dos clases no asistidas y una reseña reciente sobre saturación de vestuarios.",
        drivers: [
          ["Accesos y reservas", "3 accesos frente a 11; dos no-shows en clases SoyO2", 92],
          ["Satisfacción / dolor", "Encuesta 6/10 + comentario sobre vestuarios y spa en hora punta", 82],
          ["Servicios utilizados", "Sin fisioterapia, nutrición ni spa en 45 días pese a plan premium", 68],
          ["Comunicaciones", "WhatsApp abierto sin respuesta y llamada anterior no registrada como resuelta", 58]
        ]
      },
      {
        id: "S-0832",
        name: "Javier Antón",
        club: "O2CW Granada",
        plan: "Family Wellness",
        status: "Riesgo medio",
        churnScore: 62,
        visits30: 5,
        visitsPrev: 8,
        ltv: 2860,
        nextAction: "Oferta de pack pádel + seguimiento de nutrición",
        reason: "Menor asistencia en pádel y dos cancelaciones tardías en clases de ciclo.",
        drivers: [
          ["Hábito de uso", "Baja del 42% en reservas de pádel y cambio a franja valle", 74],
          ["Cancelaciones", "2 cancelaciones tardías en ciclo y pádel", 61],
          ["Canal preferido", "Responde mejor a WhatsApp que a email", 54],
          ["Valor protegido", "LTV alto por plan familiar", 68]
        ]
      },
      {
        id: "S-2214",
        name: "Marta Roca",
        club: "Boutique Barcelona",
        plan: "Boutique Women",
        status: "Estable",
        churnScore: 31,
        visits30: 13,
        visitsPrev: 12,
        ltv: 1980,
        nextAction: "Mantener recomendación de Zone Her y Body&Soul",
        reason: "Uso recurrente, feedback positivo y progresión constante.",
        drivers: [
          ["Frecuencia", "13 accesos en 30 días y tendencia estable", 22],
          ["Comunidad", "Alta afinidad con clases boutique", 18],
          ["Feedback", "Promotora en encuesta y reseña positiva sobre Body&Soul", 15],
          ["Servicios", "Usa app SoyO2 y clases ilimitadas", 24]
        ]
      }
    ],
    voice: [
      {
        id: "V-104",
        channel: "Google Reviews",
        rating: "2 estrellas",
        club: "O2CW Málaga",
        topic: "Sauna y baño turco",
        sentiment: -72,
        priority: "Alta",
        status: "Abierta",
        text: "La zona de sauna estaba fuera de servicio otra vez y nadie avisó antes de entrar.",
        action: "Crear tarea preventiva y respuesta pública en menos de 2 horas."
      },
      {
        id: "V-098",
        channel: "Hoja de sugerencias",
        rating: "Sugerencia",
        club: "O2CW Granada",
        topic: "Pistas de pádel",
        sentiment: 26,
        priority: "Media",
        status: "En curso",
        text: "Ampliar huecos de reserva en tarde porque las pistas se llenan muy rápido.",
        action: "Cruzar aforo con reservas y proponer redistribución de turnos."
      },
      {
        id: "V-091",
        channel: "Encuesta post-clase",
        rating: "Promotor",
        club: "Boutique Madrid",
        topic: "Clases Body&Soul",
        sentiment: 88,
        priority: "Baja",
        status: "Completada",
        text: "La clase de movilidad ha sido excelente y quiero repetir con la misma instructora.",
        action: "Usar como señal de retención y recomendación personalizada."
      },
      {
        id: "V-088",
        channel: "WhatsApp",
        rating: "Neutro",
        club: "O2CW Manuel Becerra",
        topic: "Cambio de horario",
        sentiment: -18,
        priority: "Media",
        status: "Nueva",
        text: "Desde que cambiaron la clase de las 19:30 me cuesta venir entre semana.",
        action: "Detectar cambio de tendencia y sugerir alternativa de clase o franja."
      }
    ],
    topicScores: [
      ["Spa", 34],
      ["Vestuarios", 28],
      ["Pádel", 19],
      ["Clases", 11],
      ["Recepción", 8]
    ],
    sales: [
      {
        id: "C-2401",
        name: "Inés Romero",
        club: "O2CW Sexta Avenida",
        channel: "Día de prueba",
        intent: 86,
        status: "Visita agendada",
        motivation: "Quiere combinar fuerza, piscina y fisioterapia por lesión previa.",
        objections: ["Precio", "Horario después de oficina"],
        nextAction: "Enviar plan de 14 días con piscina + fisioterapia inicial."
      },
      {
        id: "C-2388",
        name: "Álvaro Seguí",
        club: "O2CW Huelva",
        channel: "WhatsApp comercial",
        intent: 72,
        status: "Contactado",
        motivation: "Busca club familiar con piscina y pádel.",
        objections: ["Disponibilidad pádel"],
        nextAction: "Proponer visita en franja valle y mostrar disponibilidad real de pádel."
      },
      {
        id: "C-2362",
        name: "Nuria Ferrer",
        club: "Boutique Girona",
        channel: "Instagram",
        intent: 91,
        status: "Alta probable",
        motivation: "Quiere gimnasio femenino, yoga, pilates y sauna.",
        objections: ["Compromiso anual"],
        nextAction: "Cerrar alta mensual con upgrade a programa Body&Soul."
      }
    ],
    salesFunnel: {
      labels: ["Lead", "Contactado", "Visita", "Alta"],
      values: [164, 112, 68, 41]
    },
    occupancy: [
      { club: "O2CW Málaga", zone: "Pádel", now: 94, threshold: 85, status: "Saturado", action: "Abrir lista de espera dinámica y sugerir franja 21:00" },
      { club: "O2CW Manuel Becerra", zone: "Spa", now: 88, threshold: 80, status: "Tensión", action: "Aviso app antes de entrada y refuerzo de limpieza" },
      { club: "O2CW Granada", zone: "Piscina", now: 76, threshold: 82, status: "Controlado", action: "Mantener monitorización" },
      { club: "Boutique Barcelona", zone: "Body&Soul", now: 69, threshold: 78, status: "Controlado", action: "Recomendar clase alternativa si sube demanda" },
      { club: "O2CW Huelva", zone: "Sala fitness", now: 82, threshold: 84, status: "Tensión", action: "Refuerzo de técnico 19:00-20:30" },
      { club: "O2CW Parc del Migdia", zone: "Cycling", now: 64, threshold: 80, status: "Controlado", action: "Sin acción" }
    ],
    maintenance: [
      { id: "M-447", club: "O2CW Málaga", asset: "Sauna seca", risk: 84, hours: 392, threshold: 420, status: "Preventivo", action: "Revisión resistencia y sensor antes del viernes" },
      { id: "M-441", club: "O2CW Granada", asset: "Duchas vestuario", risk: 68, hours: 1180, threshold: 1300, status: "Observación", action: "Inspección de caudal y juntas" },
      { id: "M-430", club: "O2CW Huelva", asset: "Cinta Technogym 04", risk: 42, hours: 780, threshold: 1100, status: "Normal", action: "Mantenimiento programado" },
      { id: "M-422", club: "Manuel Becerra", asset: "Bomba hidromasaje", risk: 73, hours: 610, threshold: 680, status: "Preventivo", action: "Cambio de filtro y check vibración" }
    ],
    tasks: [
      { id: "T-801", category: "Retención", club: "O2CW Manuel Becerra", owner: "Customer Success", priority: "Alta", status: "Hoy", text: "Llamar a Clara Valera con propuesta de spa + reajuste de rutina." },
      { id: "T-790", category: "Experiencia", club: "O2CW Málaga", owner: "Club manager", priority: "Alta", status: "En curso", text: "Responder reseña sobre sauna y validar mantenimiento preventivo." },
      { id: "T-772", category: "Aforo", club: "O2CW Málaga", owner: "Operaciones", priority: "Media", status: "Pendiente", text: "Redistribuir reservas de pádel en hora punta." }
    ],
    impact: [
      ["Revenue protegido", 42800, "Socios con LTV alto priorizados antes de baja."],
      ["Averías evitables", 6, "Activos con uso cerca del umbral preventivo."],
      ["Horas recuperadas", 38, "Menos trabajo manual en triage y seguimiento."],
      ["Reviews críticas", 4, "Casos abiertos con respuesta pendiente."]
    ],
    artifacts: [],
    timeline: [
      { time: "Listo", title: "POC preparada", detail: "Base local con datos sintéticos O2 y runtime preparado para backend Apps Script." }
    ],
    urgent: {
      visible: false,
      key: "default",
      text: "Clara Valera · Manuel Becerra · Riesgo 79/100 · LTV 3.240 €",
      tab: "lifetime"
    }
  };

  function enrichWithProductionSeed(seed) {
    seed.kpis = {
      ...seed.kpis,
      activeMembers: 22480,
      churnRisk: 13.6,
      sentiment: 81,
      occupancy: 74,
      maintenanceRisk: 22,
      pipeline: 412000,
      protectedRevenue: 92400,
      nps: 58
    };
    seed.sparklines.activeMembers = [21680, 21840, 21960, 22120, 22290, 22480];
    seed.sparklines.churnRisk = [11.9, 12.4, 13.0, 13.7, 14.1, 13.6];
    seed.sparklines.sentiment = [84, 83, 82, 81, 80, 81];
    seed.sparklines.pipeline = [296, 312, 344, 371, 392, 412];
    seed.heroProof = [
      ["Fuentes socio", "11 conectadas"],
      ["Socios muestra", "24 perfiles"],
      ["Eventos demo", "146 señales"],
      ["Sedes O2", "9 clubs"]
    ];
    seed.dataSources = [
      ...seed.dataSources,
      { label: "App SoyO2", detail: "Reservas, retos, recordatorios y engagement", strength: 89 },
      { label: "MOVERGY / Wellness Passport", detail: "Tendencia de actividad y progreso", strength: 74 },
      { label: "Máquinas y ZONE", detail: "Uso conectado, intensidad y recurrencia", strength: 71 }
    ];
    seed.topicScores = [
      ["Spa", 48],
      ["Vestuarios", 42],
      ["Pádel", 36],
      ["Clases", 31],
      ["App SoyO2", 24],
      ["Recepción", 18],
      ["Fisioterapia", 14]
    ];
    seed.salesFunnel = {
      labels: ["Lead", "Contactado", "Visita", "Prueba", "Alta"],
      values: [386, 264, 151, 93, 57]
    };
    seed.retentionTrend = {
      labels: ["Dic", "Ene", "Feb", "Mar", "Abr", "May"],
      visits: [13, 12, 10, 8, 6, 4],
      churn: [14, 18, 25, 37, 52, 71]
    };

    seed.members.push(
      {
        id: "S-2602",
        name: "Lucía Marín",
        club: "O2CW Málaga",
        plan: "Well Living Plus",
        status: "Riesgo alto",
        churnScore: 74,
        visits30: 4,
        visitsPrev: 12,
        ltv: 3560,
        nextAction: "Sesión recovery + revisión de rutina en piscina",
        reason: "Baja de accesos tras dos incidencias de spa y caída de reservas en natación.",
        drivers: [
          ["Accesos", "4 accesos vs 12 previos; última visita hace 11 días", 86],
          ["Punto de dolor", "2 comentarios sobre sauna y duchas", 81],
          ["Servicios", "Sin uso de recovery ni fisio en 38 días", 66],
          ["SoyO2", "Abre recordatorios pero no reserva", 58]
        ]
      },
      {
        id: "S-1189",
        name: "Óscar Vidal",
        club: "O2CW Sexta Avenida",
        plan: "Corporate Wellness",
        status: "Riesgo medio",
        churnScore: 57,
        visits30: 6,
        visitsPrev: 9,
        ltv: 4120,
        nextAction: "Reactivar con ZONE en horario ejecutivo",
        reason: "Pérdida de hábito por cambio de franja laboral y menor asistencia a ZONE.",
        drivers: [
          ["Franja", "Pasa de 07:30 a 20:30 y baja asistencia", 68],
          ["Clases", "3 huecos ZONE cancelados", 61],
          ["Comercial", "Empresa renovable en julio", 52],
          ["Valor", "LTV alto por plan corporate", 74]
        ]
      },
      {
        id: "S-3077",
        name: "Ainhoa Pérez",
        club: "O2CW Parc del Migdia",
        plan: "Family Wellness",
        status: "Riesgo bajo",
        churnScore: 24,
        visits30: 15,
        visitsPrev: 14,
        ltv: 2680,
        nextAction: "Invitar a reto SoyO2 familiar",
        reason: "Uso estable, familia activa y alta respuesta a retos.",
        drivers: [
          ["Accesos", "15 accesos y 9 reservas confirmadas", 18],
          ["App", "Completa retos y recibe recordatorios", 16],
          ["Satisfacción", "NPS 10 en encuesta familiar", 12],
          ["Servicios", "Piscina y clases aqua recurrentes", 21]
        ]
      },
      {
        id: "S-2334",
        name: "Rafael Torres",
        club: "O2CW Huelva",
        plan: "Well Living",
        status: "Riesgo alto",
        churnScore: 71,
        visits30: 2,
        visitsPrev: 7,
        ltv: 1840,
        nextAction: "Llamada de retorno + plan de espalda con fisio",
        reason: "Dolor lumbar, baja de uso de sala y abandono de fisioterapia.",
        drivers: [
          ["Salud", "Encuesta indica dolor lumbar recurrente", 79],
          ["Frecuencia", "2 accesos en 30 días", 84],
          ["Servicios", "Fisio recomendado no contratado", 70],
          ["Teléfono", "Llamada perdida sin seguimiento", 62]
        ]
      },
      {
        id: "S-2718",
        name: "Marina Soler",
        club: "Boutique Girona",
        plan: "Boutique Women",
        status: "Estable",
        churnScore: 29,
        visits30: 11,
        visitsPrev: 10,
        ltv: 2260,
        nextAction: "Recomendar Pilates Reformer y sauna",
        reason: "Patrón estable y satisfacción alta en clases bodymind.",
        drivers: [
          ["Clases", "Yoga y Pilates constantes", 20],
          ["Satisfacción", "NPS 9 y comentario positivo", 16],
          ["Servicios", "Uso mensual de sauna", 24],
          ["Comunidad", "Alta participación en masterclass", 18]
        ]
      },
      {
        id: "S-3092",
        name: "Teresa Navarro",
        club: "Boutique Madrid",
        plan: "Boutique Premium",
        status: "Riesgo medio",
        churnScore: 54,
        visits30: 7,
        visitsPrev: 11,
        ltv: 3020,
        nextAction: "Ajustar agenda de clases bodymind",
        reason: "Cambio de tendencia en clases preferidas y menor interacción con app.",
        drivers: [
          ["SoyO2", "Baja de reservas en app del 36%", 59],
          ["Clases", "Pierde huecos de Pilates", 63],
          ["Comunicación", "Pide alternativas por WhatsApp", 51],
          ["Valor", "Plan premium con alto margen", 56]
        ]
      },
      {
        id: "S-3201",
        name: "Hugo Salas",
        club: "O2CW Granada",
        plan: "Padel & Wellness",
        status: "Riesgo medio",
        churnScore: 59,
        visits30: 8,
        visitsPrev: 13,
        ltv: 2440,
        nextAction: "Ofrecer huecos de pádel fuera de pico",
        reason: "Reservas rechazadas por saturación y baja de uso de spa.",
        drivers: [
          ["Pádel", "5 intentos de reserva sin hueco", 72],
          ["Aforo", "Pico 20:00 supera 90%", 67],
          ["Spa", "Sin uso desde abril", 44],
          ["WhatsApp", "Pregunta por disponibilidad de pistas", 49]
        ]
      },
      {
        id: "S-3380",
        name: "Noelia Castro",
        club: "O2CW Manuel Becerra",
        plan: "Well Living",
        status: "Estable",
        churnScore: 33,
        visits30: 10,
        visitsPrev: 9,
        ltv: 2050,
        nextAction: "Recomendar reto ZONE Games",
        reason: "Uso saludable, interés por retos y buena recurrencia.",
        drivers: [
          ["ZONE", "4 sesiones en 30 días", 22],
          ["App", "Alta interacción con retos", 18],
          ["Encuesta", "NPS 9", 14],
          ["Frecuencia", "Tendencia positiva", 19]
        ]
      },
      {
        id: "S-3521",
        name: "Bruno Escudero",
        club: "O2CW Sexta Avenida",
        plan: "Family Wellness",
        status: "Riesgo alto",
        churnScore: 76,
        visits30: 3,
        visitsPrev: 10,
        ltv: 3980,
        nextAction: "Reunión familiar + plan natación infantil",
        reason: "Baja de asistencia familiar y queja sobre disponibilidad de natación infantil.",
        drivers: [
          ["Familia", "2 miembros dejan de reservar", 78],
          ["Natación", "Lista de espera infantil", 73],
          ["Cuota", "Renovación en 21 días", 69],
          ["Reclamación", "Petición abierta en recepción", 64]
        ]
      },
      {
        id: "S-3604",
        name: "Irene Costa",
        club: "O2CW Málaga",
        plan: "Recovery Plus",
        status: "Riesgo bajo",
        churnScore: 27,
        visits30: 12,
        visitsPrev: 11,
        ltv: 3180,
        nextAction: "Mantener seguimiento de fisioterapia",
        reason: "Uso consistente de recovery y fisioterapia.",
        drivers: [
          ["Recovery", "6 sesiones en 30 días", 17],
          ["Fisio", "Plan activo y asistencia completa", 13],
          ["App", "Registra progreso semanal", 20],
          ["Satisfacción", "Comentario positivo sobre equipo", 15]
        ]
      },
      {
        id: "S-3742",
        name: "Mateo Puig",
        club: "O2CW Parc del Migdia",
        plan: "Well Living",
        status: "Riesgo medio",
        churnScore: 52,
        visits30: 6,
        visitsPrev: 10,
        ltv: 1920,
        nextAction: "Reactivar con grupo de running",
        reason: "Desplazamiento a exterior y menos reservas indoor.",
        drivers: [
          ["Outdoor", "Interés en running fuera del club", 48],
          ["Accesos", "Baja de accesos indoor", 55],
          ["Clases", "No reserva desde hace 18 días", 58],
          ["App", "Consulta contenidos On Demand", 39]
        ]
      },
      {
        id: "S-3888",
        name: "Carla Benítez",
        club: "O2CW Huelva",
        plan: "Aqua Wellness",
        status: "Estable",
        churnScore: 22,
        visits30: 14,
        visitsPrev: 13,
        ltv: 2160,
        nextAction: "Invitar a masterclass Aquawellness",
        reason: "Patrón fuerte en piscina y satisfacción alta.",
        drivers: [
          ["Natación", "8 reservas aqua completadas", 18],
          ["Encuesta", "NPS 10", 10],
          ["Rutina", "Tendencia semanal estable", 15],
          ["Comunidad", "Participa en eventos del club", 14]
        ]
      }
    );

    seed.members.push(
      {
        id: "S-4011",
        name: "Valentina Rius",
        club: "Boutique Barcelona",
        plan: "Boutique Premium",
        status: "Estable",
        churnScore: 26,
        visits30: 12,
        visitsPrev: 12,
        ltv: 2860,
        nextAction: "Recomendar masterclass Body&Soul",
        reason: "Alta recurrencia en bodymind y uso mensual de sauna.",
        drivers: [["Clases", "10 reservas completadas", 18], ["Spa", "Uso recurrente de sauna", 21], ["Encuesta", "NPS 9", 14], ["App", "Alta interacción SoyO2", 19]]
      },
      {
        id: "S-4056",
        name: "Andrés Molina",
        club: "O2CW Manuel Becerra",
        plan: "Well Living Plus",
        status: "Riesgo medio",
        churnScore: 61,
        visits30: 5,
        visitsPrev: 9,
        ltv: 3340,
        nextAction: "Plan de fuerza 3 semanas + recordatorios SoyO2",
        reason: "Pierde hábito de fuerza y no responde a email, pero sí abre WhatsApp.",
        drivers: [["Fuerza", "Baja de 7 a 2 sesiones", 70], ["WhatsApp", "Canal preferido", 48], ["Cuota", "Plan premium renovable", 58], ["Recencia", "Último acceso hace 8 días", 64]]
      },
      {
        id: "S-4080",
        name: "Mónica Vega",
        club: "O2CW Sexta Avenida",
        plan: "Corporate Wellness",
        status: "Estable",
        churnScore: 30,
        visits30: 9,
        visitsPrev: 8,
        ltv: 3720,
        nextAction: "Invitar a evento corporate wellness",
        reason: "Uso estable y buena respuesta a eventos corporativos.",
        drivers: [["Corporate", "Empresa activa", 22], ["Eventos", "Asiste a masterclass", 20], ["NPS", "Promotora", 15], ["Zona", "Fuerza + ZONE", 24]]
      },
      {
        id: "S-4122",
        name: "Diego Ramos",
        club: "O2CW Granada",
        plan: "Padel & Wellness",
        status: "Riesgo alto",
        churnScore: 73,
        visits30: 3,
        visitsPrev: 12,
        ltv: 2580,
        nextAction: "Resolver reservas fallidas de pádel y proponer liga interna",
        reason: "Alta frustración por pistas sin disponibilidad y caída brusca de visitas.",
        drivers: [["Pádel", "6 reservas fallidas", 82], ["Accesos", "-75% vs mes anterior", 86], ["Recepción", "Queja abierta", 62], ["Comunidad", "Interés en liga interna", 45]]
      },
      {
        id: "S-4190",
        name: "Elena Prieto",
        club: "O2CW Parc del Migdia",
        plan: "Outdoor & Aqua",
        status: "Estable",
        churnScore: 28,
        visits30: 11,
        visitsPrev: 10,
        ltv: 2040,
        nextAction: "Recomendar running club + Aqua yoga",
        reason: "Combina outdoor, piscina y contenidos On Demand.",
        drivers: [["Outdoor", "3 salidas running", 19], ["Aqua", "5 reservas", 17], ["On Demand", "Uso semanal", 24], ["Encuesta", "NPS 9", 14]]
      },
      {
        id: "S-4255",
        name: "Carmen Ruiz",
        club: "O2CW Málaga",
        plan: "Recovery Plus",
        status: "Riesgo medio",
        churnScore: 56,
        visits30: 6,
        visitsPrev: 9,
        ltv: 3460,
        nextAction: "Check de recuperación y seguimiento de fisio",
        reason: "Interrumpe fisioterapia tras mejora inicial y reduce reservas de recovery.",
        drivers: [["Fisio", "2 sesiones perdidas", 63], ["Recovery", "Baja de uso", 57], ["Salud", "Dolor recurrente leve", 51], ["LTV", "Plan alto valor", 60]]
      },
      {
        id: "S-4310",
        name: "Nicolás Serra",
        club: "Boutique Madrid",
        plan: "Boutique Premium",
        status: "Riesgo bajo",
        churnScore: 21,
        visits30: 16,
        visitsPrev: 15,
        ltv: 2940,
        nextAction: "Mantener recomendación de HIIT boutique",
        reason: "Uso intenso de clases y alta afinidad con experiencia boutique.",
        drivers: [["Clases", "16 accesos en 30 días", 12], ["HIIT", "6 sesiones", 18], ["Satisfacción", "NPS 10", 9], ["Comunidad", "Participa en eventos", 15]]
      }
    );

    seed.voice.push(
      { id: "V-121", channel: "Encuesta NPS", rating: "Detractor", club: "O2CW Sexta Avenida", topic: "Natación infantil", sentiment: -64, priority: "Alta", status: "Abierta", text: "Llevamos semanas sin hueco para el curso infantil y nadie nos da alternativa clara.", action: "Escalar a coordinación de natación y proponer lista preferente." },
      { id: "V-122", channel: "WhatsApp", rating: "Neutro", club: "Boutique Madrid", topic: "Pilates Reformer", sentiment: -22, priority: "Media", status: "Nueva", text: "Me interesa seguir, pero nunca encuentro huecos de Pilates después del trabajo.", action: "Cruzar reservas fallidas y proponer franja alternativa." },
      { id: "V-123", channel: "Recepción", rating: "Queja", club: "O2CW Manuel Becerra", topic: "Vestuarios", sentiment: -51, priority: "Alta", status: "En curso", text: "Los vestuarios se saturan tras ZONE y el spa pierde sensación premium.", action: "Refuerzo de limpieza y aviso de franjas de menor ocupación." },
      { id: "V-124", channel: "Google Reviews", rating: "5 estrellas", club: "Boutique Girona", topic: "Bodymind", sentiment: 91, priority: "Baja", status: "Completada", text: "Yoga, sauna y el ambiente del centro están muy por encima de otros gimnasios.", action: "Usar como promotor para campañas boutique." },
      { id: "V-125", channel: "App SoyO2", rating: "Sugerencia", club: "O2CW Huelva", topic: "Recordatorios", sentiment: 18, priority: "Media", status: "Nueva", text: "Estaría bien recibir recordatorios personalizados de natación y eventos.", action: "Segmentar recordatorios por hábito de uso." },
      { id: "V-126", channel: "Teléfono", rating: "Queja", club: "O2CW Granada", topic: "Pádel", sentiment: -47, priority: "Media", status: "Abierta", text: "Llamo para preguntar por pistas y no hay visibilidad de huecos reales.", action: "Unificar disponibilidad de pádel y guion de recepción." },
      { id: "V-127", channel: "Encuesta post-fisio", rating: "Promotor", club: "O2CW Málaga", topic: "Fisioterapia", sentiment: 84, priority: "Baja", status: "Completada", text: "El fisio me ayudó a volver a entrenar con seguridad.", action: "Convertir en argumento comercial para Recovery Plus." },
      { id: "V-128", channel: "Hoja sugerencias", rating: "Sugerencia", club: "O2CW Parc del Migdia", topic: "Running club", sentiment: 33, priority: "Baja", status: "Nueva", text: "Más salidas de running por la mañana ayudarían a mantener rutina.", action: "Test de grupo outdoor martes/jueves." }
    );

    seed.sales.push(
      { id: "C-2420", name: "Beatriz Galán", club: "Boutique Madrid", channel: "Instagram", intent: 82, status: "Visita agendada", motivation: "Busca boutique, Pilates y spa sin ambiente masificado.", objections: ["Disponibilidad de Pilates", "Precio"], nextAction: "Mostrar huecos reales y valor de servicio boutique." },
      { id: "C-2421", name: "Daniel Bosch", club: "O2CW Parc del Migdia", channel: "Referral socio", intent: 78, status: "Contactado", motivation: "Quiere natación y plan de fuerza para triatlón.", objections: ["Distancia", "Horario piscina"], nextAction: "Enviar plan combinado piscina + fuerza + On Demand." },
      { id: "C-2422", name: "Sandra Rivas", club: "O2CW Málaga", channel: "Día de prueba", intent: 93, status: "Alta probable", motivation: "Recuperación de lesión y spa post-entreno.", objections: ["Compromiso"], nextAction: "Cita con fisio y plan mensual Recovery Plus." },
      { id: "C-2423", name: "Pablo Nieto", club: "O2CW Granada", channel: "WhatsApp comercial", intent: 69, status: "Seguimiento", motivation: "Pádel y sala fitness con amigos.", objections: ["Saturación pistas"], nextAction: "Enviar disponibilidad real de pádel fuera de pico." },
      { id: "C-2424", name: "Laura Esteve", club: "O2CW Huelva", channel: "Web", intent: 74, status: "Visita agendada", motivation: "Plan familiar con piscina infantil.", objections: ["Curso natación"], nextAction: "Proponer Family Wellness con cupo de curso." },
      { id: "C-2425", name: "Marc Oliva", club: "Boutique Barcelona", channel: "Evento corporativo", intent: 67, status: "Contactado", motivation: "Entrenamiento funcional cerca de oficina.", objections: ["Contrato empresa"], nextAction: "Preparar propuesta corporate flexible." },
      { id: "C-2426", name: "Elena Moya", club: "O2CW Manuel Becerra", channel: "Teléfono", intent: 81, status: "Alta probable", motivation: "Fuerza, ZONE y fisioterapia preventiva.", objections: ["Parking"], nextAction: "Invitación ZONE + sesión inicial de fisio." },
      { id: "C-2427", name: "Víctor Sancho", club: "O2CW Sexta Avenida", channel: "Google Ads", intent: 58, status: "Nutrir", motivation: "Cambio desde low-cost a experiencia premium.", objections: ["Precio", "Permanencia"], nextAction: "Enviar comparativa de valor y beneficios de socio." }
    );

    seed.occupancy.push(
      { club: "O2CW Sexta Avenida", zone: "ZONE", now: 91, threshold: 86, status: "Saturado", action: "Abrir clase espejo 20:30 si se repite 3 días" },
      { club: "Boutique Madrid", zone: "Pilates Reformer", now: 96, threshold: 88, status: "Saturado", action: "Priorizar lista de espera y proponer franja 14:30" },
      { club: "O2CW Huelva", zone: "Piscina cursos", now: 89, threshold: 84, status: "Tensión", action: "Revisar cupos familiares y monitor de apoyo" },
      { club: "O2CW Parc del Migdia", zone: "Running club", now: 52, threshold: 75, status: "Oportunidad", action: "Lanzar grupo martes/jueves mañana" },
      { club: "O2CW Sexta Avenida", zone: "Sala fitness", now: 87, threshold: 84, status: "Tensión", action: "Refuerzo técnico en zona fuerza" },
      { club: "Boutique Girona", zone: "Yoga", now: 73, threshold: 80, status: "Controlado", action: "Mantener cupo y monitorizar waitlist" },
      { club: "O2CW Manuel Becerra", zone: "ZONE", now: 93, threshold: 86, status: "Saturado", action: "Mensaje SoyO2 con clase alternativa" },
      { club: "Boutique Barcelona", zone: "Sauna", now: 78, threshold: 80, status: "Controlado", action: "Sin acción" }
    );

    seed.maintenance.push(
      { id: "M-501", club: "O2CW Sexta Avenida", asset: "Sistema climatización ZONE", risk: 78, hours: 1260, threshold: 1400, status: "Preventivo", action: "Revisión filtros y caudal antes de masterclass" },
      { id: "M-502", club: "Boutique Madrid", asset: "Reformer 07", risk: 72, hours: 860, threshold: 920, status: "Preventivo", action: "Cambio de muelles y check seguridad" },
      { id: "M-503", club: "O2CW Granada", asset: "Iluminación pista pádel 3", risk: 69, hours: 540, threshold: 620, status: "Observación", action: "Inspección eléctrica esta semana" },
      { id: "M-504", club: "O2CW Huelva", asset: "Filtro piscina infantil", risk: 81, hours: 1010, threshold: 1080, status: "Preventivo", action: "Lavado y repuesto antes del sábado" },
      { id: "M-505", club: "O2CW Parc del Migdia", asset: "Bicicletas cycling bloque B", risk: 51, hours: 740, threshold: 1000, status: "Normal", action: "Mantenimiento mensual" },
      { id: "M-506", club: "Boutique Girona", asset: "Sauna boutique", risk: 58, hours: 390, threshold: 520, status: "Normal", action: "Seguimiento de temperatura" }
    );

    seed.tasks.push(
      { id: "T-843", category: "Retención", club: "O2CW Málaga", owner: "Experiencia", priority: "Alta", status: "Hoy", text: "Contactar a Lucía Marín por caída de accesos y dolor spa." },
      { id: "T-844", category: "Natación", club: "O2CW Sexta Avenida", owner: "Coordinación", priority: "Alta", status: "Hoy", text: "Resolver lista de espera infantil y comunicar alternativas familiares." },
      { id: "T-845", category: "Comercial", club: "Boutique Madrid", owner: "Ventas", priority: "Media", status: "Pendiente", text: "Enviar disponibilidad real de Pilates Reformer a Beatriz Galán." },
      { id: "T-846", category: "Aforo", club: "O2CW Manuel Becerra", owner: "Operaciones", priority: "Media", status: "Ahora", text: "Recomendar clase ZONE alternativa por saturación 20:00." },
      { id: "T-847", category: "Mantenimiento", club: "O2CW Huelva", owner: "Técnico", priority: "Alta", status: "Programada", text: "Revisar filtro piscina infantil antes de actividad familiar." },
      { id: "T-848", category: "CX", club: "O2CW Granada", owner: "Recepción", priority: "Media", status: "Nueva", text: "Unificar guion de disponibilidad de pádel y waitlist." },
      { id: "T-849", category: "Producto", club: "O2CW Parc del Migdia", owner: "Club manager", priority: "Baja", status: "Nueva", text: "Probar running club por la mañana con segmento outdoor." },
      { id: "T-850", category: "Comercial", club: "O2CW Sexta Avenida", owner: "Ventas", priority: "Media", status: "Pendiente", text: "Nutrir lead low-cost con comparativa de valor premium." }
    );

    seed.impact = [
      ["Revenue protegido", 92400, "24 perfiles priorizados por churn, LTV y fricción reciente."],
      ["Averías evitables", 12, "Activos de spa, piscina, ZONE y pádel cerca de umbral."],
      ["Horas recuperadas", 74, "Menos triage manual en reseñas, llamadas y tareas."],
      ["Reviews críticas", 9, "Casos abiertos con respuesta y responsable asignado."],
      ["Pipeline accionable", 412000, "Leads con motivación, objeción y siguiente mejor acción."]
    ];
  }

  enrichWithProductionSeed(baseState);

  const scenarios = {
    churn: {
      label: "Socio en riesgo",
      badge: "Lifetime",
      summary: "Cruza accesos, servicios, cuotas y comunicaciones para anticipar deserción con LTV protegido.",
      action: "churn",
      apply(next) {
        next.kpis.churnRisk = 12.9;
        next.kpis.protectedRevenue = 61200;
        next.selectedMemberId = "S-1748";
        next.members[0].churnScore = 86;
        next.members[0].status = "Riesgo crítico";
        next.members[0].nextAction = "Llamada hoy + WhatsApp personalizado + circuito spa en franja valle";
        next.members[0].drivers[1] = ["Punto de dolor", "Encuesta 5/10 y WhatsApp sobre saturación de vestuarios", 88];
        next.tasks.unshift({
          id: "T-820",
          category: "Retención",
          club: "O2CW Manuel Becerra",
          owner: "Responsable experiencia",
          priority: "Alta",
          status: "Hoy",
          text: "Activar playbook Clara Valera: llamada, WhatsApp personalizado, invitación y rutina de vuelta."
        });
        next.impact[0][1] = 61200;
        next.clubs.find((c) => c.id === "MB").alerts = 6;
        next.clubs.find((c) => c.id === "MB").openTasks = 8;
        next.urgent = { visible: true, key: "churn", text: "Activar playbook Clara Valera · Llamada hoy · 3.240 € protegidos", tab: "lifetime" };
      },
      artifacts: [
        {
          id: "a-churn-playbook",
          kind: "Playbook",
          title: "Retención Clara Valera",
          summary: "Motivo probable, mensaje recomendado y valor protegido.",
          meta: ["LTV 3.240 €", "Riesgo 86", "Acción hoy"],
          body: [
            "El modelo detecta caída de frecuencia, fricción en hora punta, comunicaciones abiertas y abandono de servicios premium.",
            "Acción recomendada: llamada humana desde el club, WhatsApp personalizado, invitación a circuito spa fuera de pico y rutina de retorno de 14 días.",
            "Impacto esperado: reducir probabilidad de baja y recuperar hábito semanal antes del próximo ciclo de cobro."
          ]
        }
      ],
      timeline: [
        { time: "09:02", title: "Frecuencia anómala", detail: "Clara baja de 11 a 3 visitas en 30 días." },
        { time: "09:03", title: "Riesgo explicado", detail: "El sistema cruza accesos, cuotas, no-shows, WhatsApp, encuesta y bajo uso de servicios." },
        { time: "09:04", title: "Tarea creada", detail: "Responsable de experiencia recibe acción concreta y guion de llamada." },
        { time: "09:05", title: "LTV protegido", detail: "La dirección ve el impacto económico estimado en el dashboard." }
      ]
    },
    voice: {
      label: "Reseña negativa",
      badge: "Voz cliente",
      summary: "Unifica reseñas, reclamaciones, sugerencias, encuestas y WhatsApp para detectar puntos de dolor.",
      action: "voice",
      apply(next) {
        next.kpis.sentiment = 76;
        next.kpis.nps = 54;
        next.topicScores[0][1] = 46;
        next.voice.unshift({
          id: "V-117",
          channel: "Google Reviews + encuesta",
          rating: "2 estrellas",
          club: "O2CW Málaga",
          topic: "Sauna y baño turco",
          sentiment: -88,
          priority: "Alta",
          status: "Nueva",
          text: "Pago un club premium y la sauna vuelve a estar cerrada sin aviso.",
          action: "Responder, abrir mantenimiento y marcar Spa como área de mejora en Málaga."
        });
        next.tasks.unshift({
          id: "T-825",
          category: "Reclamación",
          club: "O2CW Málaga",
          owner: "Club manager",
          priority: "Alta",
          status: "Ahora",
          text: "Gestionar reseña 2 estrellas sobre sauna y confirmar plan preventivo."
        });
        next.impact[3][1] = 5;
        next.clubs.find((c) => c.id === "MA").alerts = 7;
        next.urgent = { visible: true, key: "voice", text: "Responder reseña 2★ sauna Málaga · sentimiento -88 · plan preventivo", tab: "voice" };
      },
      artifacts: [
        {
          id: "a-voice-ticket",
          kind: "Ticket",
          title: "Voz cliente: sauna Málaga",
          summary: "Triage automático, respuesta sugerida y tarea enlazada.",
          meta: ["Sentimiento -88", "Tema Spa", "Alta prioridad"],
          body: [
            "La reseña y la encuesta quedan clasificadas como problema de instalación premium, no como queja genérica.",
            "Respuesta sugerida: disculpa concreta, confirmación de revisión y canal directo para compensación si procede.",
            "La misma señal alimenta mantenimiento, reputación online, satisfacción y áreas de mejora por sede."
          ]
        }
      ],
      timeline: [
        { time: "11:14", title: "Nuevo dolor detectado", detail: "Google Review 2 estrellas + encuesta de satisfacción sobre sauna en O2CW Málaga." },
        { time: "11:14", title: "NLP clasifica tema", detail: "Tema: Spa. Sentimiento: -88. Prioridad: alta." },
        { time: "11:15", title: "Tarea a club", detail: "Club manager recibe acción y respuesta sugerida." },
        { time: "11:16", title: "Dashboard cambia", detail: "Baja el sentimiento y sube el peso del tema Spa." }
      ]
    },
    sales: {
      label: "Entrevista comercial",
      badge: "Captación",
      summary: "Analiza llamadas, WhatsApp y acciones comerciales para entender qué estrategias convierten mejor.",
      action: "sales",
      apply(next) {
        next.kpis.pipeline = 318000;
        next.sales.unshift({
          id: "C-2418",
          name: "Carlos Medina",
          club: "O2CW Manuel Becerra",
          channel: "Llamada + WhatsApp",
          intent: 88,
          status: "Alta probable",
          motivation: "Quiere piscina, fuerza y recuperación por espalda.",
          objections: ["Precio", "Parking"],
          nextAction: "Enviar comparativa de valor premium y cita con fisioterapeuta."
        });
        next.salesFunnel.values = [172, 124, 76, 49];
        next.tasks.unshift({
          id: "T-831",
          category: "Comercial",
          club: "O2CW Manuel Becerra",
          owner: "Equipo ventas",
          priority: "Alta",
          status: "Hoy",
          text: "Enviar propuesta Well Living a Carlos Medina con prueba de piscina y fisio."
        });
        next.urgent = { visible: true, key: "sales", text: "Enviar propuesta Well Living a Carlos Medina · Intent 88 · piscina + fisio", tab: "sales" };
      },
      artifacts: [
        {
          id: "a-sales-summary",
          kind: "Resumen IA",
          title: "Entrevista Carlos Medina",
          summary: "Motivación, objeciones, probabilidad de alta y próximo paso.",
          meta: ["Intent 88", "Objeción precio", "Cita fisio"],
          body: [
            "Motivación principal: recuperar espalda y volver a entrenar sin dolor.",
          "Objeciones: precio frente a gimnasio low-cost, aparcamiento en hora punta y dudas por compromiso.",
          "Siguiente acción: vender valor premium con fisioterapia, piscina y rutina segura de retorno."
          ]
        }
      ],
      timeline: [
        { time: "12:06", title: "Audio procesado", detail: "La llamada se transcribe y resume en menos de un minuto." },
        { time: "12:07", title: "Objeciones detectadas", detail: "Precio, parking y compromiso aparecen como frenos de cierre." },
        { time: "12:08", title: "Siguiente acción", detail: "Propuesta personalizada con fisioterapia y piscina." },
        { time: "12:09", title: "Pipeline actualizado", detail: "La oportunidad pasa a alta probable." }
      ]
    },
    maintenance: {
      label: "Avería anticipada",
      badge: "Mantenimiento",
      summary: "Horas de uso de sauna cerca del umbral generan orden preventiva antes de la queja.",
      action: "maintenance",
      apply(next) {
        next.kpis.maintenanceRisk = 27;
        next.maintenance[0].risk = 93;
        next.maintenance[0].status = "Crítico";
        next.maintenance[0].action = "Parada preventiva 07:00 + repuesto de resistencia";
        next.tasks.unshift({
          id: "T-836",
          category: "Mantenimiento",
          club: "O2CW Málaga",
          owner: "Técnico externo",
          priority: "Alta",
          status: "Programada",
          text: "Revisión sauna seca antes de apertura de tarde; riesgo 93/100."
        });
        next.impact[1][1] = 7;
        next.clubs.find((c) => c.id === "MA").alerts = 6;
        next.urgent = { visible: true, key: "maintenance", text: "Parada preventiva sauna Málaga 07:00 · riesgo 93/100 · evita cierre", tab: "operations" };
      },
      artifacts: [
        {
          id: "a-maintenance-order",
          kind: "Orden",
          title: "Preventivo sauna Málaga",
          summary: "Umbral de horas, piezas sugeridas y ventana de intervención.",
          meta: ["Riesgo 93", "392 h uso", "Viernes 07:00"],
          body: [
            "La instalación acumula uso cercano al umbral y feedback negativo asociado.",
            "Orden preventiva: revisar resistencia, sensor de temperatura y ventilación antes del pico de tarde.",
            "El objetivo es evitar cierre no planificado y proteger la promesa premium del spa."
          ]
        }
      ],
      timeline: [
        { time: "15:21", title: "Umbral detectado", detail: "Sauna seca Málaga llega a zona de riesgo por horas de uso y feedback." },
        { time: "15:22", title: "Orden creada", detail: "Mantenimiento recibe pieza, ventana y prioridad." },
        { time: "15:23", title: "Experiencia protegida", detail: "El club puede avisar o actuar antes de que el socio se queje." }
      ]
    },
    capacity: {
      label: "Aforo saturado",
      badge: "Aforos",
      summary: "Detecta cambios de tendencia en hábitos de uso: pádel y spa superan umbral en hora punta.",
      action: "capacity",
      apply(next) {
        next.kpis.occupancy = 78;
        next.occupancy[0].now = 97;
        next.occupancy[1].now = 92;
        next.occupancy[0].action = "Derivar reservas a franja 21:00 y abrir huecos de espera";
        next.tasks.unshift({
          id: "T-841",
          category: "Aforo",
          club: "O2CW Málaga",
          owner: "Operaciones",
          priority: "Media",
          status: "Ahora",
          text: "Activar recomendación de franja alternativa para pádel y mensaje SoyO2."
        });
        next.urgent = { visible: true, key: "capacity", text: "Redistribuir pádel Málaga 97% · mensaje SoyO2 y lista de espera", tab: "operations" };
      },
      artifacts: [
        {
          id: "a-capacity-plan",
          kind: "Plan operativo",
          title: "Redistribución hora punta",
          summary: "Zonas saturadas, mensajes SoyO2 y refuerzo propuesto.",
          meta: ["Pádel 97%", "Spa 92%", "App SoyO2"],
          body: [
            "La demo detecta cambios de hábito y saturación en pádel y spa antes de que se traduzcan en mala experiencia.",
            "Acción: sugerir franja alternativa en SoyO2, abrir lista de espera y reforzar limpieza en spa.",
            "La dirección ve el impacto por club sin tener que revisar logs de acceso manualmente."
          ]
        }
      ],
      timeline: [
        { time: "18:42", title: "Pico de aforo", detail: "Pádel Málaga sube a 97% y Spa Manuel Becerra a 92%." },
        { time: "18:43", title: "Mensaje SoyO2", detail: "Se prepara recomendación de franja alternativa." },
        { time: "18:44", title: "Operación avisada", detail: "Tarea de refuerzo y redistribución creada." }
      ]
    }
  };

  let state = loadState();
  let narrativeTimer = null;
  let pollTimer = null;
  const charts = {};
  const backend = {
    mode: BACKEND_URL ? "syncing" : "local",
    version: null,
    lastError: null
  };

  function loadState() {
    if (IS_PRESENT_MODE) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      return deepClone(baseState);
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      // If structure looks stale (no clubs/sparklines field), reset
      if (!parsed || !parsed.clubs || !parsed.sparklines || !parsed.urgent || !parsed.coverage || !parsed.dataSources) {
        return deepClone(baseState);
      }
      return parsed;
    } catch (_) {
      return deepClone(baseState);
    }
  }

  function saveState() {
    if (IS_PRESENT_MODE) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function resetState() {
    if (narrativeTimer) {
      window.clearTimeout(narrativeTimer);
      narrativeTimer = null;
    }
    state = deepClone(baseState);
    saveState();
    renderAll();
    toast("Demo reiniciada", "Vuelve al estado base de la red O2.");
  }

  function setTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active", view.id === tab);
    });
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tab);
    });
    saveState();
    window.setTimeout(renderCharts, 50);
  }

  function scoreClass(value) {
    if (value >= 75) return "danger";
    if (value >= 55) return "warn";
    return "ok";
  }

  function priorityClass(value) {
    const raw = String(value || "").toLowerCase();
    if (raw.includes("alta") || raw.includes("crítico") || raw.includes("critico") || raw.includes("ahora") || raw.includes("hoy")) return "high";
    if (raw.includes("media") || raw.includes("observ") || raw.includes("tensi")) return "medium";
    return "low";
  }

  function renderMetrics() {
    const metricGrid = byId("metric-grid");
    const metrics = [
      {
        label: "Socios activos",
        value: state.kpis.activeMembers,
        formatter: (v) => Math.round(v).toLocaleString("es-ES"),
        detail: "Red O2 sintética",
        delta: "+2,1% mes",
        deltaClass: "",
        spark: state.sparklines.activeMembers
      },
      {
        label: "Churn en riesgo",
        value: state.kpis.churnRisk,
        formatter: (v) => `${v.toFixed(1)}%`,
        detail: "Acción de retención disponible",
        delta: state.kpis.churnRisk < 14 ? "Mejora" : "Sube",
        deltaClass: state.kpis.churnRisk < 14 ? "" : "warn",
        spark: state.sparklines.churnRisk,
        sparkStroke: "#d84b55",
        sparkFill: "rgba(216,75,85,0.12)"
      },
      {
        label: "Sentimiento",
        value: state.kpis.sentiment,
        formatter: (v) => `${Math.round(v)}%`,
        detail: `NPS ${state.kpis.nps}`,
        delta: state.kpis.sentiment >= 80 ? "Saludable" : "Vigilar",
        deltaClass: state.kpis.sentiment >= 80 ? "" : "warn",
        spark: state.sparklines.sentiment,
        sparkStroke: "#2f9d62",
        sparkFill: "rgba(47,157,98,0.12)"
      },
      {
        label: "Pipeline comercial",
        value: state.kpis.pipeline,
        formatter: (v) => euro(v),
        detail: "Oportunidades con siguiente acción",
        delta: "+12% vs prev",
        deltaClass: "",
        spark: state.sparklines.pipeline,
        sparkStroke: "#d4a857",
        sparkFill: "rgba(212,168,87,0.16)"
      }
    ];

    metricGrid.innerHTML = metrics.map((m, i) => `
      <article class="metric-card">
        <div>
          <span>${m.label}</span>
          <strong data-metric-num="${i}" data-current-value="0">${m.formatter(0)}</strong>
        </div>
        <div>
          ${spark(m.spark || [], 180, 36, m.sparkStroke || "#009de0", m.sparkFill || "rgba(0,157,224,0.12)")}
          <div class="delta ${m.deltaClass}">${m.delta}</div>
          <span style="font-size:.72rem; color: var(--muted); margin-top: 4px; display:block;">${m.detail}</span>
        </div>
      </article>
    `).join("");

    metrics.forEach((m, i) => {
      const el = metricGrid.querySelector(`[data-metric-num="${i}"]`);
      animateNumber(el, m.value, { formatter: m.formatter });
    });

    byId("hero-proof").innerHTML = state.heroProof.map(([label, value]) => `
      <div class="proof-item">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `).join("");
  }

  function renderNetwork() {
    const grid = byId("network-grid");
    if (!grid) return;
    renderNetworkMap();
    grid.innerHTML = state.clubs.map((club) => `
      <div class="network-cell ${club.state}" data-club="${club.id}" title="Club ${club.name}">
        <div class="nc-top">
          <strong>${club.name}</strong>
          <span class="nc-dot" aria-hidden="true"></span>
        </div>
        <div class="nc-stats">
          <span>Retención <b>${club.retention}%</b></span>
          <span>Churn <b>${club.churn}</b></span>
        </div>
        ${spark(club.visitsTrend, 160, 28, club.state === "danger" ? "#d84b55" : club.state === "warn" ? "#ef9b3a" : "#2f9d62", club.state === "danger" ? "rgba(216,75,85,0.10)" : club.state === "warn" ? "rgba(239,155,58,0.12)" : "rgba(47,157,98,0.10)")}
        <div class="nc-stats">
          <span>Tareas <b>${club.openTasks}</b></span>
          <span>Alertas <b style="color: ${club.alerts > 3 ? "var(--danger)" : club.alerts > 0 ? "var(--warning)" : "var(--ok)"}">${club.alerts}</b></span>
        </div>
      </div>
    `).join("");

    const summary = byId("network-summary");
    if (summary) {
      const totalAlerts = state.clubs.reduce((s, c) => s + c.alerts, 0);
      const totalTasks = state.clubs.reduce((s, c) => s + c.openTasks, 0);
      summary.textContent = `${totalAlerts} alertas · ${totalTasks} tareas abiertas`;
      summary.className = `status-pill ${totalAlerts > 8 ? "high" : totalAlerts > 3 ? "medium" : "low"}`;
    }
  }

  function renderNetworkMap() {
    const map = byId("network-map");
    const brief = byId("network-brief");
    if (!map || !brief) return;
    const lines = mapLinks.map(([from, to]) => {
      const a = mapPositions[from];
      const b = mapPositions[to];
      return a && b ? `<line x1="${a[0]}%" y1="${a[1]}%" x2="${b[0]}%" y2="${b[1]}%" />` : "";
    }).join("");
    const nodes = state.clubs.map((club) => {
      const pos = mapPositions[club.id] || [50, 50];
      return `
        <button class="map-node ${club.state}" type="button" data-tab-jump="operations" style="left:${pos[0]}%; top:${pos[1]}%" title="${club.name} · ${club.city}">
          <strong>${club.name}</strong>
          <span>${club.city} · ${club.alerts} alertas</span>
        </button>
      `;
    }).join("");
    map.innerHTML = `
      <svg class="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
      <div class="map-core" aria-hidden="true">
        <strong>O₂</strong>
        <span>Well-living Core</span>
        <small>5 señales vivas</small>
      </div>
      ${nodes}
    `;

    const totalAlerts = state.clubs.reduce((sum, club) => sum + club.alerts, 0);
    const critical = state.clubs.filter((club) => club.state === "danger").length;
    const retentionAvg = Math.round(state.clubs.reduce((sum, club) => sum + club.retention, 0) / state.clubs.length);
    brief.innerHTML = `
      <article class="brief-tile">
        <span>Red O2</span>
        <strong>${state.clubs.length} clubs</strong>
        <p>Madrid, Málaga, Granada, Huelva, Girona y Barcelona conectados en una sola lectura.</p>
      </article>
      <article class="brief-tile">
        <span>Prioridad ahora</span>
        <strong>${critical} críticos</strong>
        <p>${totalAlerts} alertas vivas con responsable y siguiente acción.</p>
      </article>
      <article class="brief-tile">
        <span>Retención media</span>
        <strong>${retentionAvg}%</strong>
        <p>Frecuencia, sentimiento y aforo cruzados por club.</p>
      </article>
    `;
  }

  function renderTasks() {
    const tasks = state.tasks.slice(0, 6);
    byId("open-task-count").textContent = `${state.tasks.length} abiertas`;
    byId("task-list").innerHTML = tasks.map((task) => `
      <article class="task-row">
        <div class="task-top">
          <div>
            <strong>${task.category} · ${task.club}</strong>
            <span>${task.owner} · ${task.status}</span>
          </div>
          <span class="status-pill ${priorityClass(task.priority)}">${task.priority}</span>
        </div>
        <p style="color: var(--muted); line-height: 1.5; margin-top: 10px; font-size: 0.88rem;">${task.text}</p>
      </article>
    `).join("");
  }

  function renderZones() {
    const topZones = state.occupancy.slice().sort((a, b) => b.now - a.now).slice(0, 4);
    byId("zone-grid").innerHTML = topZones.map((zone) => {
      const tone = zone.now >= zone.threshold + 5 ? "danger" : zone.now >= zone.threshold - 3 ? "warn" : "ok";
      return `
        <article class="zone-cell ${tone}">
          <div>
            <span class="tag">${zone.club.replace("O2CW ", "")}</span>
            <h3 style="margin-top: 10px;">${zone.zone}</h3>
          </div>
          <div>
            <strong>${zone.now}%</strong>
            <span style="display:block;color:var(--muted);font-size:.74rem;font-weight:600;margin-top:2px;">Umbral ${zone.threshold}%</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderImpact() {
    byId("impact-grid").innerHTML = state.impact.map(([label, value, detail]) => {
      const rendered = typeof value === "number" && value > 1000 ? euro(value) : value;
      return `
        <article class="insight-card">
          <span style="color: var(--muted); font-size: .76rem; font-weight: 600; letter-spacing: 0;">${label}</span>
          <strong style="display:block; font-family: Fraunces, serif; font-size: 1.8rem; margin: 8px 0; font-weight: 700; letter-spacing: 0; color: var(--ink);">${rendered}</strong>
          <p style="color: var(--muted); line-height: 1.45; font-size: 0.85rem;">${detail}</p>
        </article>
      `;
    }).join("");
  }

  function renderCoverage() {
    const coverageGrid = byId("coverage-grid");
    const sourceGrid = byId("source-grid");
    if (!coverageGrid || !sourceGrid) return;

    coverageGrid.innerHTML = state.coverage.map((item, index) => `
      <article class="coverage-card">
        <div class="coverage-index">${String(index + 1).padStart(2, "0")}</div>
        <div>
          <strong>${item.need}</strong>
          <p>${item.output}</p>
          <div class="chip-row">
            ${item.signals.map((signal) => `<span class="tag">${signal}</span>`).join("")}
          </div>
          <span class="coverage-owner">${item.owner}</span>
        </div>
      </article>
    `).join("");

    sourceGrid.innerHTML = state.dataSources.map((source) => `
      <article class="source-card">
        <div class="source-top">
          <strong>${source.label}</strong>
          <span>${source.strength}%</span>
        </div>
        <p>${source.detail}</p>
        <div class="progress"><i style="width:${source.strength}%"></i></div>
      </article>
    `).join("");
  }

  function renderMembers() {
    byId("member-grid").innerHTML = state.members.map((member) => `
      <article class="member-card ${member.id === state.selectedMemberId ? "active" : ""}" data-member-card="${member.id}">
        <div class="member-top">
          <div>
            <strong>${member.name}</strong>
            <span>${member.club} · ${member.plan}</span>
          </div>
          <span class="score ${scoreClass(member.churnScore)}">${member.churnScore}</span>
        </div>
        <div class="progress"><i style="width:${member.churnScore}%"></i></div>
        <p style="color: #4b667b; line-height: 1.5; margin-top: 10px; font-size: 0.88rem; font-weight: 600;">${member.reason}</p>
      </article>
    `).join("");

    const selected = state.members.find((member) => member.id === state.selectedMemberId) || state.members[0];
    byId("playbook-status").textContent = selected.status;
    byId("playbook-status").className = `status-pill ${priorityClass(selected.status)}`;
    byId("playbook-detail").innerHTML = `
      <article class="insight-card">
        <span class="tag">${selected.club}</span>
        <h3 style="margin-top: 12px;">${selected.nextAction}</h3>
        <p style="color: var(--muted); line-height: 1.6; margin-top: 12px; font-size: 0.92rem;">${selected.reason}</p>
        <div class="metric-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 14px;">
          <div class="proof-item"><span>Visitas 30d</span><strong>${selected.visits30}</strong></div>
          <div class="proof-item"><span>Mes anterior</span><strong>${selected.visitsPrev}</strong></div>
          <div class="proof-item"><span>LTV estimado</span><strong>${euro(selected.ltv)}</strong></div>
        </div>
      </article>
    `;

    byId("drivers-table").innerHTML = `
      <thead><tr><th>Variable</th><th>Lectura</th><th>Peso</th></tr></thead>
      <tbody>
        ${selected.drivers.map(([name, detail, weight]) => `
          <tr><td><strong>${name}</strong></td><td>${detail}</td><td><span class="status-pill ${priorityClass(weight > 70 ? "alta" : weight > 50 ? "media" : "baja")}">${weight}</span></td></tr>
        `).join("")}
      </tbody>
    `;
  }

  function renderVoice() {
    byId("voice-feed").innerHTML = state.voice.map((item) => `
      <article class="feed-item">
        <div class="feed-top">
          <div>
            <strong>${item.topic}</strong>
            <span>${item.channel} · ${item.club} · ${item.rating}</span>
          </div>
          <span class="status-pill ${priorityClass(item.priority)}">${item.priority}</span>
        </div>
        <p style="color: var(--ink-soft); line-height: 1.55; margin-top: 10px; font-size: 0.94rem;">"${item.text}"</p>
        <p style="color: var(--muted); line-height: 1.45; margin-top: 10px; font-size: 0.86rem;"><strong style="color: var(--blue-deep);">Acción:</strong> ${item.action}</p>
      </article>
    `).join("");

    const chips = byId("voice-chips");
    if (chips) {
      const tones = state.voice.reduce((acc, item) => {
        const key = item.sentiment > 30 ? "Positivos" : item.sentiment < -30 ? "Negativos" : "Neutros";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      chips.innerHTML = Object.entries(tones).map(([k, v]) => `<span class="tag">${k}: ${v}</span>`).join("");
    }
  }

  function renderSales() {
    byId("sales-feed").innerHTML = state.sales.map((item) => `
      <article class="feed-item">
        <div class="feed-top">
          <div>
            <strong>${item.name}</strong>
            <span>${item.club} · ${item.channel} · ${item.status}</span>
          </div>
          <span class="score ${scoreClass(item.intent)}">${item.intent}</span>
        </div>
        <p style="color: var(--ink-soft); line-height: 1.55; margin-top: 10px; font-size: 0.92rem;">${item.motivation}</p>
        <div class="chip-row" style="margin-top: 10px;">
          ${item.objections.map((objection) => `<span class="tag">${objection}</span>`).join("")}
        </div>
        <p style="color: var(--muted); line-height: 1.45; margin-top: 10px; font-size: 0.86rem;"><strong style="color: var(--blue-deep);">Siguiente:</strong> ${item.nextAction}</p>
      </article>
    `).join("");

    const objections = new Map();
    state.sales.forEach((item) => item.objections.forEach((objection) => {
      objections.set(objection, (objections.get(objection) || 0) + 1);
    }));
    byId("objection-chips").innerHTML = Array.from(objections.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => `<span class="tag">${label}: ${count}</span>`)
      .join("");
  }

  function renderOperations() {
    const occupancyRows = state.occupancy.map((zone) => ({
      kind: "aforo",
      label: zone.zone,
      club: zone.club,
      status: zone.status,
      score: zone.now - zone.threshold,
      reading: `${zone.now}% ocupado · umbral ${zone.threshold}%`,
      action: zone.action
    }));
    const maintenanceRows = state.maintenance.map((item) => ({
      kind: "mantenimiento",
      label: item.asset,
      club: item.club,
      status: item.status,
      score: item.risk - 60,
      reading: `Riesgo ${item.risk}/100 · ${item.hours}h uso`,
      action: item.action
    }));
    const priorityRows = occupancyRows.concat(maintenanceRows)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    byId("operations-table").innerHTML = `
      <thead><tr><th>Ámbito</th><th>Club</th><th>Lectura</th><th>Acción</th></tr></thead>
      <tbody>
        ${priorityRows.map((item) => `
          <tr>
            <td><span class="status-pill ${priorityClass(item.status === "Saturado" ? "alta" : item.status === "Tensión" ? "media" : item.status)}">${item.label}</span></td>
            <td>${item.club.replace("O2CW ", "")}</td>
            <td>${item.reading}</td>
            <td>${item.action}</td>
          </tr>
        `).join("")}
      </tbody>
    `;
  }

  function renderScenarios() {
    byId("scenario-grid").innerHTML = Object.entries(scenarios).map(([id, scenario], idx) => `
      <button class="scenario-card ${state.currentScenario === id ? "active" : ""}" type="button" data-scenario="${id}" aria-label="Lanzar escena ${scenario.label}">
        <div class="scenario-icon">${scenarioIcons[id] || ""}</div>
        <small>${scenario.badge} · <span class="kbd">${idx + 1}</span></small>
        <h3>${scenario.label}</h3>
        <p>${scenario.summary}</p>
      </button>
    `).join("");
  }

  function renderArtifacts() {
    const grid = byId("artifact-grid");
    if (!state.artifacts.length) {
      grid.innerHTML = `<div class="empty">Los artefactos de la escena aparecerán aquí: <strong>playbook</strong>, <strong>ticket</strong>, <strong>resumen comercial</strong>, <strong>orden preventiva</strong> o <strong>plan operativo</strong>. Pulsa una escena del simulador o usa atajos 1-5.</div>`;
      return;
    }
    grid.innerHTML = state.artifacts.map((artifact) => `
      <button class="artifact-card" type="button" data-artifact="${artifact.id}">
        <div class="artifact-top">
          <div>
            <strong>${artifact.title}</strong>
            <span>${artifact.kind}</span>
          </div>
          <span class="tag">Abrir →</span>
        </div>
        <p style="color: var(--muted); line-height: 1.5; margin-top: 10px; font-size: 0.88rem;">${artifact.summary}</p>
        <div class="chip-row" style="margin-top: 10px;">
          ${artifact.meta.map((meta) => `<span class="tag">${meta}</span>`).join("")}
        </div>
      </button>
    `).join("");
  }

  function renderTimeline() {
    byId("timeline").innerHTML = state.timeline.map((item) => `
      <article class="timeline-item">
        <time>${item.time}</time>
        <div>
          <strong>${item.title}</strong>
          <p>${item.detail}</p>
        </div>
      </article>
    `).join("");
  }

  function renderUrgent() {
    const bar = byId("urgent-bar");
    if (!bar) return;
    if (!state.urgent || !state.urgent.visible) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    byId("urgent-text").textContent = state.urgent.text;
    bar.dataset.tab = state.urgent.tab || "lifetime";
  }

  function chartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            boxWidth: 10,
            color: "#1e3a52",
            font: { size: 12, family: "Inter", weight: "600" },
            padding: 14
          }
        },
        tooltip: {
          backgroundColor: "#0a1a2a",
          padding: 10,
          cornerRadius: 8,
          titleFont: { family: "Inter", size: 12, weight: "700" },
          bodyFont: { family: "Inter", size: 12 }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#5b768a", font: { family: "Inter", size: 11 } } },
        y: { grid: { color: "rgba(184, 200, 214, 0.35)" }, ticks: { color: "#5b768a", font: { family: "Inter", size: 11 } } }
      }
    };
  }

  function makeChart(id, config) {
    const canvas = byId(id);
    if (!canvas || typeof Chart === "undefined") return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(canvas, config);
  }

  function gradientFor(canvasId, from, to) {
    const canvas = byId(canvasId);
    if (!canvas) return from;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    g.addColorStop(0, from);
    g.addColorStop(1, to);
    return g;
  }

  function renderCharts() {
    makeChart("retention-chart", {
      type: "line",
      data: {
        labels: state.retentionTrend.labels,
        datasets: [
          {
            label: "Visitas medias / socio",
            data: state.retentionTrend.visits,
            borderColor: "#009de0",
            backgroundColor: gradientFor("retention-chart", "rgba(0,157,224,0.28)", "rgba(0,157,224,0)"),
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#009de0",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            borderWidth: 2.4
          },
          {
            label: "Churn score (eje derecho)",
            data: state.retentionTrend.churn,
            borderColor: "#d84b55",
            backgroundColor: "rgba(216, 75, 85, 0.08)",
            tension: 0.4,
            yAxisID: "y1",
            pointRadius: 3,
            pointBackgroundColor: "#d84b55",
            borderWidth: 2.2,
            borderDash: [4, 4]
          }
        ]
      },
      options: {
        ...chartOptions(),
        scales: {
          x: { grid: { display: false }, ticks: { color: "#5b768a", font: { family: "Inter", size: 11 } } },
          y: { min: 0, max: 14, grid: { color: "rgba(184, 200, 214, 0.35)" }, ticks: { color: "#5b768a", font: { family: "Inter", size: 11 } }, title: { display: true, text: "Visitas", color: "#5b768a" } },
          y1: { min: 0, max: 100, position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#5b768a", font: { family: "Inter", size: 11 } }, title: { display: true, text: "Churn", color: "#5b768a" } }
        }
      }
    });

    makeChart("sentiment-chart", {
      type: "doughnut",
      data: {
        labels: ["Promotor", "Neutro", "Crítico"],
        datasets: [{
          data: [state.kpis.sentiment, Math.max(8, 100 - state.kpis.sentiment - 12), 12],
          backgroundColor: ["#2f9d62", "#d4a857", "#d84b55"],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        plugins: {
          legend: { position: "bottom", labels: { font: { family: "Inter", size: 12, weight: "600" }, padding: 14 } },
          tooltip: { backgroundColor: "#0a1a2a", padding: 10, cornerRadius: 8 }
        }
      }
    });

    makeChart("voice-chart", {
      type: "bar",
      data: {
        labels: state.topicScores.map((item) => item[0]),
        datasets: [{
          label: "Casos ponderados",
          data: state.topicScores.map((item) => item[1]),
          backgroundColor: gradientFor("voice-chart", "#009de0", "rgba(0,157,224,0.4)"),
          borderRadius: 8,
          maxBarThickness: 28
        }]
      },
      options: { ...chartOptions(), indexAxis: "y", plugins: { ...chartOptions().plugins, legend: { display: false } } }
    });

    makeChart("sales-chart", {
      type: "bar",
      data: {
        labels: state.salesFunnel.labels,
        datasets: [{
          label: "Oportunidades",
          data: state.salesFunnel.values,
          backgroundColor: ["#0a1a2a", "#006f9f", "#009de0", "#5fb866"],
          borderRadius: 8,
          maxBarThickness: 48
        }]
      },
      options: { ...chartOptions(), plugins: { ...chartOptions().plugins, legend: { display: false } } }
    });

    const occupancyClubLabel = (club) => club
      .replace("O2CW ", "")
      .replace("Manuel Becerra", "Manuel B.")
      .replace("Boutique Barcelona", "Boutique BCN")
      .replace("Parc del Migdia", "Parc Migdia");
    const occupancyIsCompact = window.innerWidth < 720;
    const occupancyScaleText = "rgba(234, 247, 255, 0.78)";
    const occupancyGrid = "rgba(218, 241, 250, 0.22)";
    const occupancyScales = occupancyIsCompact ? {
      x: {
        min: 0,
        max: 110,
        grid: { color: occupancyGrid },
        ticks: {
          color: occupancyScaleText,
          font: { family: "Inter", size: 11, weight: "700" },
          padding: 6
        }
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "rgba(234, 247, 255, 0.88)",
          font: { family: "Inter", size: 11, weight: "800" },
          padding: 8
        }
      }
    } : {
      x: {
        grid: { display: false },
        ticks: {
          color: occupancyScaleText,
          font: { family: "Inter", size: 11, weight: "700" },
          maxRotation: 0,
          minRotation: 0,
          padding: 8
        }
      },
      y: {
        min: 0,
        max: 110,
        grid: { color: occupancyGrid },
        ticks: {
          color: occupancyScaleText,
          font: { family: "Inter", size: 11, weight: "700" },
          padding: 6
        }
      }
    };

    makeChart("occupancy-chart", {
      type: "bar",
      data: {
        labels: state.occupancy.map((item) => [item.zone, occupancyClubLabel(item.club)]),
        datasets: [
          {
            label: "Ocupación",
            data: state.occupancy.map((item) => item.now),
            backgroundColor: state.occupancy.map((it) => it.now >= it.threshold + 5 ? "#d84b55" : it.now >= it.threshold - 3 ? "#ef9b3a" : "#009de0"),
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: occupancyIsCompact ? 28 : 48
          },
          {
            label: "Umbral",
            data: state.occupancy.map((item) => item.threshold),
            backgroundColor: "rgba(255, 255, 255, 0.14)",
            borderColor: "rgba(255, 255, 255, 0.22)",
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: occupancyIsCompact ? 28 : 48
          }
        ]
      },
      options: {
        ...chartOptions(),
        indexAxis: occupancyIsCompact ? "y" : "x",
        plugins: {
          ...chartOptions().plugins,
          legend: {
            position: "top",
            labels: {
              boxWidth: 12,
              color: "rgba(234, 247, 255, 0.92)",
              font: { size: 12, family: "Inter", weight: "800" },
              padding: 18
            }
          }
        },
        scales: occupancyScales
      }
    });

    makeChart("maintenance-chart", {
      type: "bar",
      data: {
        labels: state.maintenance.map((item) => item.asset),
        datasets: [{
          label: "Riesgo técnico",
          data: state.maintenance.map((item) => item.risk),
          backgroundColor: state.maintenance.map((it) => it.risk >= 80 ? "#d84b55" : it.risk >= 60 ? "#ef9b3a" : "#2f9d62"),
          borderRadius: 8,
          maxBarThickness: 28
        }]
      },
      options: {
        ...chartOptions(),
        indexAxis: "y",
        plugins: { ...chartOptions().plugins, legend: { display: false } },
        scales: {
          x: { min: 0, max: 100, grid: { color: "rgba(184, 200, 214, 0.35)" }, ticks: { color: "#5b768a", font: { family: "Inter", size: 11 } } },
          y: { grid: { display: false }, ticks: { color: "#5b768a", font: { family: "Inter", size: 11 } } }
        }
      }
    });
  }

  function renderBackendBadge() {
    const badge = byId("backend-badge");
    if (!badge) return;
    badge.className = `backend-badge ${backend.mode === "live" ? "live" : backend.mode === "syncing" ? "syncing" : ""}`;
    if (backend.mode === "live") {
      badge.textContent = `Backend vivo${backend.version ? ` · ${backend.version}` : ""}`;
    } else if (backend.mode === "syncing") {
      badge.textContent = "Conectando backend";
    } else {
      badge.textContent = "Modo local";
    }
  }

  function renderAll() {
    renderMetrics();
    renderCoverage();
    renderNetwork();
    renderTasks();
    renderZones();
    renderImpact();
    renderMembers();
    renderVoice();
    renderSales();
    renderOperations();
    renderScenarios();
    renderArtifacts();
    renderTimeline();
    renderBackendBadge();
    renderUrgent();
    setTab(state.currentTab || "dashboard");
    renderCharts();
  }

  function dedupeBy(items, key) {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    return items.filter((item) => {
      const value = item && item[key];
      if (!value) return true;
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function mergeArtifacts(existing, incoming) {
    const merged = new Map();
    [...(existing || []), ...(incoming || [])].forEach((artifact) => {
      if (artifact && artifact.id) merged.set(artifact.id, artifact);
    });
    return [...merged.values()];
  }

  function applyScenario(id) {
    const scenario = scenarios[id];
    if (!scenario) return;
    const priorArtifacts = deepClone(state.artifacts || []);
    const priorTimeline = deepClone(state.timeline || []);
    const next = deepClone(state && state.clubs ? state : baseState);
    next.currentScenario = id;
    next.currentTab = state.currentTab === "simulator" ? "simulator" : state.currentTab;
    scenario.apply(next);
    next.tasks = dedupeBy(next.tasks, "id");
    next.voice = dedupeBy(next.voice, "id");
    next.sales = dedupeBy(next.sales, "id");
    next.artifacts = mergeArtifacts(priorArtifacts, deepClone(scenario.artifacts));
    next.timeline = priorTimeline.concat(deepClone(scenario.timeline));
    state = next;
    saveState();
    renderAll();
    toast(scenario.label, scenario.summary);
    fireBackendTrigger(id, scenario);
  }

  function playNarrative() {
    if (narrativeTimer) {
      window.clearTimeout(narrativeTimer);
      narrativeTimer = null;
      toast("Narrativa cancelada", "Detenida la reproducción automática.");
      return;
    }
    const order = ["churn", "voice", "sales", "maintenance", "capacity"];
    let idx = 0;
    toast("Narrativa en marcha", "Las 5 escenas se reproducirán en cascada cada 4 segundos.");
    function step() {
      if (idx >= order.length) {
        narrativeTimer = null;
        toast("Narrativa completada", "Has visto las 5 escenas de la red O2.");
        return;
      }
      const sid = order[idx++];
      applyScenario(sid);
      narrativeTimer = window.setTimeout(step, 4200);
    }
    step();
  }

  function toast(title, text) {
    const toastEl = byId("toast");
    if (!toastEl) return;
    toastEl.innerHTML = `<strong>${title}</strong><p>${text}</p>`;
    toastEl.classList.add("visible");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => toastEl.classList.remove("visible"), 3600);
  }

  function openArtifact(id) {
    const artifact = state.artifacts.find((item) => item.id === id);
    if (!artifact) return;
    byId("modal-kind").textContent = artifact.kind;
    byId("modal-title").textContent = artifact.title;
    byId("modal-body").innerHTML = `
      <p><strong>${artifact.summary}</strong></p>
      ${artifact.body.map((paragraph) => `<p>${paragraph}</p>`).join("")}
      <div class="chip-row">${artifact.meta.map((meta) => `<span class="tag">${meta}</span>`).join("")}</div>
    `;
    byId("artifact-modal").hidden = false;
    byId("artifact-modal").dataset.artifactId = id;
  }

  function copyModalContent() {
    const modal = byId("artifact-modal");
    if (!modal || modal.hidden) return;
    const id = modal.dataset.artifactId;
    const artifact = state.artifacts.find((item) => item.id === id);
    if (!artifact) return;
    const lines = [
      `O2 Centro Wellness · ${artifact.kind}: ${artifact.title}`,
      "",
      artifact.summary,
      "",
      ...artifact.body,
      "",
      "Metadatos: " + artifact.meta.join(" · ")
    ];
    const text = lines.join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast("Copiado", "Artefacto listo para pegar en email, Slack o ticket.");
      }).catch(() => {
        toast("Sin permiso", "No se pudo copiar al portapapeles automáticamente.");
      });
    }
  }

  function closeModal() {
    byId("artifact-modal").hidden = true;
  }

  function backendFetch(params) {
    if (!BACKEND_URL) return Promise.resolve(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), BACKEND_TIMEOUT);
    const url = `${BACKEND_URL}?${new URLSearchParams(params).toString()}`;
    return fetch(url, { signal: controller.signal, cache: "no-store" })
      .then((resp) => {
        window.clearTimeout(timer);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .catch((error) => {
        window.clearTimeout(timer);
        backend.mode = "local";
        backend.lastError = error.message;
        renderBackendBadge();
        return null;
      });
  }

  function probeBackend() {
    if (!BACKEND_URL) {
      backend.mode = "local";
      renderBackendBadge();
      return;
    }
    backend.mode = "syncing";
    renderBackendBadge();
    // Warmup first then state
    backendFetch({ action: "warmup", t: Date.now() }).finally(() => {
      backendFetch({ action: "state", t: Date.now() }).then((data) => {
        if (!data || data.status !== "ok") return;
        backend.mode = "live";
        backend.version = data.version || null;
        renderBackendBadge();
      });
    });
  }

  function startPolling() {
    if (!BACKEND_URL) return;
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = window.setInterval(() => {
      backendFetch({ action: "state", t: Date.now() }).then((data) => {
        if (!data || data.status !== "ok") return;
        backend.mode = "live";
        backend.version = data.version || backend.version;
        renderBackendBadge();
      });
    }, POLL_INTERVAL);
  }

  function fireBackendTrigger(id, scenario) {
    if (!BACKEND_URL) return;
    backendFetch({ action: scenario.action || id, t: Date.now() }).then((data) => {
      if (!data || data.status !== "ok") return;
      state.timeline = state.timeline.concat([{
        time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        title: "Backend confirmado",
        detail: data.mensaje || "Acción registrada en Google Sheets."
      }]);
      saveState();
      renderTimeline();
      backend.mode = "live";
      backend.version = data.version || backend.version;
      renderBackendBadge();
    });
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const tabButton = event.target.closest("[data-tab]");
      if (tabButton) setTab(tabButton.dataset.tab);

      const jump = event.target.closest("[data-tab-jump]");
      if (jump) setTab(jump.dataset.tabJump);

      const reset = event.target.closest("[data-reset]");
      if (reset) resetState();

      const scenario = event.target.closest("[data-scenario]");
      if (scenario) applyScenario(scenario.dataset.scenario);

      const artifact = event.target.closest("[data-artifact]");
      if (artifact) openArtifact(artifact.dataset.artifact);

      const close = event.target.closest("[data-close-modal]");
      if (close) closeModal();

      const copy = event.target.closest("[data-copy-modal]");
      if (copy) copyModalContent();

      const narrative = event.target.closest("[data-narrative]");
      if (narrative) playNarrative();

      const closeUrgent = event.target.closest("[data-close-urgent]");
      if (closeUrgent) {
        state.urgent.visible = false;
        saveState();
        renderUrgent();
      }

      const urgentAct = event.target.closest("[data-urgent-act]");
      if (urgentAct && state.urgent && state.urgent.tab) setTab(state.urgent.tab);

      const club = event.target.closest("[data-club]");
      if (club) {
        toast(`Club ${club.dataset.club}`, "En el piloto, este filtro segmenta KPIs, tareas y voz por sede.");
      }

      const member = event.target.closest("[data-member-card]");
      if (member) {
        state.selectedMemberId = member.dataset.memberCard;
        saveState();
        renderMembers();
      }

      const modal = byId("artifact-modal");
      if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;
      const sceneKeys = { "1": "churn", "2": "voice", "3": "sales", "4": "maintenance", "5": "capacity" };
      if (sceneKeys[event.key]) {
        event.preventDefault();
        applyScenario(sceneKeys[event.key]);
      }
      if (event.key.toLowerCase() === "n") playNarrative();
      if (event.key.toLowerCase() === "d") setTab("dashboard");
      if (event.key.toLowerCase() === "s") setTab("simulator");
    });

    window.addEventListener("resize", debounce(renderCharts, 180));
  }

  function applyPresentMode() {
    if (!IS_PRESENT_MODE) return;
    document.documentElement.classList.add("present-mode");
    const mark = document.createElement("div");
    mark.className = "present-watermark";
    mark.textContent = "Modo presentación · O2 × Ciklum";
    document.body.appendChild(mark);
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  }

  bindEvents();
  applyPresentMode();
  renderAll();
  probeBackend();
  startPolling();
  registerServiceWorker();
})();
