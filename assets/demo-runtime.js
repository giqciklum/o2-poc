(() => {
  const STORAGE_KEY = "o2_runtime_v1";
  const BACKEND_URL = "";
  const BACKEND_TIMEOUT = 10000;
  const IS_PRESENT_MODE = new URLSearchParams(window.location.search).get("mode") === "present";

  const byId = (id) => document.getElementById(id);
  const euro = (value) => new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value || 0);
  const pct = (value) => `${Math.round(value || 0)}%`;
  const deepClone = (value) => JSON.parse(JSON.stringify(value));

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
    heroProof: [
      ["Cliente", "O2 Centro Wellness"],
      ["Red demo", "9 clubs premium"],
      ["Foco", "Vida del socio"],
      ["Formato", "Demo viva + Sheet"]
    ],
    retentionTrend: {
      labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      visits: [11, 10, 9, 6, 4, 3],
      churn: [18, 22, 29, 42, 63, 79]
    },
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
        nextAction: "Llamada de recuperacion + invitacion a circuito spa en franja valle",
        reason: "Caida fuerte de frecuencia, dos clases no asistidas y una resena reciente sobre saturacion de vestuarios.",
        drivers: [
          ["Frecuencia 30 dias", "3 visitas frente a 11 el mes anterior", 92],
          ["Saturacion percibida", "Vestuarios y spa en hora punta", 78],
          ["Servicios premium", "Sin uso de fisioterapia ni nutricion en 45 dias", 64],
          ["Momento vital", "Objetivo embarazo/postparto indicado en onboarding", 58]
        ]
      },
      {
        id: "S-0832",
        name: "Javier Anton",
        club: "O2CW Granada",
        plan: "Family Wellness",
        status: "Riesgo medio",
        churnScore: 62,
        visits30: 5,
        visitsPrev: 8,
        ltv: 2860,
        nextAction: "Oferta de pack de padel + seguimiento de nutricion",
        reason: "Menor asistencia en padel y dos cancelaciones tardias en clases de ciclo.",
        drivers: [
          ["Uso de padel", "Baja del 42% en reservas", 74],
          ["Cancelaciones", "2 cancelaciones tardias", 61],
          ["Canal preferido", "Responde mejor a WhatsApp", 54],
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
        nextAction: "Mantener recomendacion de Zone Her y Body&Soul",
        reason: "Uso recurrente, feedback positivo y progresion constante.",
        drivers: [
          ["Frecuencia", "13 visitas en 30 dias", 22],
          ["Comunidad", "Alta afinidad con clases boutique", 18],
          ["Feedback", "Promotora en ultima encuesta", 15],
          ["Servicios", "Usa app y clases ilimitadas", 24]
        ]
      }
    ],
    voice: [
      {
        id: "V-104",
        channel: "Google Reviews",
        rating: "2 estrellas",
        club: "O2CW Malaga",
        topic: "Sauna y bano turco",
        sentiment: -72,
        priority: "Alta",
        status: "Abierta",
        text: "La zona de sauna estaba fuera de servicio otra vez y nadie aviso antes de entrar.",
        action: "Crear tarea preventiva y respuesta publica en menos de 2 horas."
      },
      {
        id: "V-098",
        channel: "Hoja de sugerencias",
        rating: "Sugerencia",
        club: "O2CW Granada",
        topic: "Pistas de padel",
        sentiment: 26,
        priority: "Media",
        status: "En curso",
        text: "Ampliar huecos de reserva en tarde porque las pistas se llenan muy rapido.",
        action: "Cruzar aforo con reservas y proponer redistribucion de turnos."
      },
      {
        id: "V-091",
        channel: "Recepcion",
        rating: "Promotor",
        club: "Boutique Madrid",
        topic: "Clases Body&Soul",
        sentiment: 88,
        priority: "Baja",
        status: "Completada",
        text: "La clase de movilidad ha sido excelente y quiero repetir con la misma instructora.",
        action: "Usar como senal de retencion y recomendacion personalizada."
      }
    ],
    topicScores: [
      ["Spa", 34],
      ["Vestuarios", 28],
      ["Padel", 19],
      ["Clases", 11],
      ["Recepcion", 8]
    ],
    sales: [
      {
        id: "C-2401",
        name: "Ines Romero",
        club: "O2CW Sexta Avenida",
        channel: "Dia de prueba",
        intent: 86,
        status: "Visita agendada",
        motivation: "Quiere combinar fuerza, piscina y fisioterapia por lesion previa.",
        objections: ["Precio", "Horario despues de oficina"],
        nextAction: "Enviar plan de 14 dias con piscina + fisioterapia inicial."
      },
      {
        id: "C-2388",
        name: "Alvaro Segui",
        club: "O2CW Huelva",
        channel: "Formulario web",
        intent: 72,
        status: "Contactado",
        motivation: "Busca club familiar con piscina y padel.",
        objections: ["Disponibilidad padel"],
        nextAction: "Proponer visita en franja valle y mostrar reservas de padel."
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
      { club: "O2CW Malaga", zone: "Padel", now: 94, threshold: 85, status: "Saturado", action: "Abrir lista de espera dinamica y sugerir franja 21:00" },
      { club: "O2CW Manuel Becerra", zone: "Spa", now: 88, threshold: 80, status: "Tension", action: "Aviso app antes de entrada y refuerzo de limpieza" },
      { club: "O2CW Granada", zone: "Piscina", now: 76, threshold: 82, status: "Controlado", action: "Mantener monitorizacion" },
      { club: "Boutique Barcelona", zone: "Body&Soul", now: 69, threshold: 78, status: "Controlado", action: "Recomendar clase alternativa si sube demanda" },
      { club: "O2CW Huelva", zone: "Sala fitness", now: 82, threshold: 84, status: "Tension", action: "Refuerzo de tecnico 19:00-20:30" },
      { club: "O2CW Parc del Migdia", zone: "Cycling", now: 64, threshold: 80, status: "Controlado", action: "Sin accion" }
    ],
    maintenance: [
      { id: "M-447", club: "O2CW Malaga", asset: "Sauna seca", risk: 84, hours: 392, threshold: 420, status: "Preventivo", action: "Revision resistencia y sensor antes del viernes" },
      { id: "M-441", club: "O2CW Granada", asset: "Duchas vestuario", risk: 68, hours: 1180, threshold: 1300, status: "Observacion", action: "Inspeccion de caudal y juntas" },
      { id: "M-430", club: "O2CW Huelva", asset: "Cinta Technogym 04", risk: 42, hours: 780, threshold: 1100, status: "Normal", action: "Mantenimiento programado" },
      { id: "M-422", club: "Manuel Becerra", asset: "Bomba hidromasaje", risk: 73, hours: 610, threshold: 680, status: "Preventivo", action: "Cambio de filtro y check vibracion" }
    ],
    tasks: [
      { id: "T-801", category: "Retencion", club: "O2CW Manuel Becerra", owner: "Customer Success", priority: "Alta", status: "Hoy", text: "Llamar a Clara Valera con propuesta de spa + reajuste de rutina." },
      { id: "T-790", category: "Experiencia", club: "O2CW Malaga", owner: "Club manager", priority: "Alta", status: "En curso", text: "Responder resena sobre sauna y validar mantenimiento preventivo." },
      { id: "T-772", category: "Aforo", club: "O2CW Malaga", owner: "Operaciones", priority: "Media", status: "Pendiente", text: "Redistribuir reservas de padel en hora punta." }
    ],
    impact: [
      ["Revenue protegido", 42800, "Socios con LTV alto priorizados antes de baja."],
      ["Averias evitables", 6, "Activos con uso cerca del umbral preventivo."],
      ["Horas recuperadas", 38, "Menos trabajo manual en triage y seguimiento."],
      ["Reviews criticas", 4, "Casos abiertos con respuesta pendiente."]
    ],
    artifacts: [],
    timeline: [
      { time: "Listo", title: "POC preparada", detail: "Base local con datos sinteticos O2 y runtime preparado para backend Apps Script." }
    ]
  };

  const scenarios = {
    churn: {
      label: "Socio en riesgo",
      badge: "Lifetime",
      summary: "Detecta una caida de frecuencia y propone una accion de retencion con LTV protegido.",
      action: "churn",
      apply(next) {
        next.kpis.churnRisk = 12.9;
        next.kpis.protectedRevenue = 61200;
        next.selectedMemberId = "S-1748";
        next.members[0].churnScore = 86;
        next.members[0].status = "Riesgo critico";
        next.members[0].nextAction = "Llamada hoy + pase invitado + circuito spa en franja valle";
        next.tasks.unshift({
          id: "T-820",
          category: "Retencion",
          club: "O2CW Manuel Becerra",
          owner: "Responsable experiencia",
          priority: "Alta",
          status: "Hoy",
          text: "Activar playbook Clara Valera: llamada, invitacion y rutina de vuelta."
        });
        next.impact[0][1] = 61200;
      },
      artifacts: [
        {
          id: "a-churn-playbook",
          kind: "Playbook",
          title: "Retencion Clara Valera",
          summary: "Motivo probable, mensaje recomendado y valor protegido.",
          meta: ["LTV 3.240 EUR", "Riesgo 86", "Accion hoy"],
          body: [
            "El modelo detecta caida de frecuencia, friccion en hora punta y abandono de servicios premium.",
            "Accion recomendada: llamada humana desde el club, invitacion a circuito spa fuera de pico y rutina de retorno de 14 dias.",
            "Impacto esperado: reducir probabilidad de baja y recuperar habito semanal antes del proximo ciclo de cobro."
          ]
        }
      ],
      timeline: [
        { time: "09:02", title: "Frecuencia anomala", detail: "Clara baja de 11 a 3 visitas en 30 dias." },
        { time: "09:03", title: "Riesgo explicado", detail: "El sistema cruza no-shows, saturacion de vestuario y bajo uso de servicios." },
        { time: "09:04", title: "Tarea creada", detail: "Responsable de experiencia recibe accion concreta y guion de llamada." },
        { time: "09:05", title: "LTV protegido", detail: "La direccion ve el impacto economico estimado en el dashboard." }
      ]
    },
    voice: {
      label: "Resena negativa",
      badge: "Voz cliente",
      summary: "Clasifica una resena sobre sauna, crea tarea y cambia el mapa de sentimiento del club.",
      action: "voice",
      apply(next) {
        next.kpis.sentiment = 76;
        next.kpis.nps = 54;
        next.topicScores[0][1] = 46;
        next.voice.unshift({
          id: "V-117",
          channel: "Google Reviews",
          rating: "2 estrellas",
          club: "O2CW Malaga",
          topic: "Sauna y bano turco",
          sentiment: -88,
          priority: "Alta",
          status: "Nueva",
          text: "Pago un club premium y la sauna vuelve a estar cerrada sin aviso.",
          action: "Responder con disculpa, explicar actuacion y abrir tarea de mantenimiento."
        });
        next.tasks.unshift({
          id: "T-825",
          category: "Reclamacion",
          club: "O2CW Malaga",
          owner: "Club manager",
          priority: "Alta",
          status: "Ahora",
          text: "Gestionar resena 2 estrellas sobre sauna y confirmar plan preventivo."
        });
        next.impact[3][1] = 5;
      },
      artifacts: [
        {
          id: "a-voice-ticket",
          kind: "Ticket",
          title: "Voz cliente: sauna Malaga",
          summary: "Triage automatico, respuesta sugerida y tarea enlazada.",
          meta: ["Sentimiento -88", "Tema Spa", "Alta prioridad"],
          body: [
            "La resena queda clasificada como problema de instalacion premium, no como queja generica.",
            "Respuesta sugerida: disculpa concreta, confirmacion de revision y canal directo para compensacion si procede.",
            "La misma senal alimenta mantenimiento, reputacion online y cuadro de direccion."
          ]
        }
      ],
      timeline: [
        { time: "11:14", title: "Nueva resena", detail: "Google Review 2 estrellas sobre sauna en O2CW Malaga." },
        { time: "11:14", title: "NLP clasifica tema", detail: "Tema: Spa. Sentimiento: -88. Prioridad: alta." },
        { time: "11:15", title: "Tarea a club", detail: "Club manager recibe accion y respuesta sugerida." },
        { time: "11:16", title: "Dashboard cambia", detail: "Baja el sentimiento y sube el peso del tema Spa." }
      ]
    },
    sales: {
      label: "Entrevista comercial",
      badge: "Captacion",
      summary: "Resume una conversacion, detecta objeciones y propone la siguiente mejor accion.",
      action: "sales",
      apply(next) {
        next.kpis.pipeline = 318000;
        next.sales.unshift({
          id: "C-2418",
          name: "Carlos Medina",
          club: "O2CW Manuel Becerra",
          channel: "Llamada grabada",
          intent: 88,
          status: "Alta probable",
          motivation: "Quiere piscina, fuerza y recuperacion por espalda.",
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
      },
      artifacts: [
        {
          id: "a-sales-summary",
          kind: "Resumen IA",
          title: "Entrevista Carlos Medina",
          summary: "Motivacion, objeciones, probabilidad de alta y proximo paso.",
          meta: ["Intento 88", "Objecion precio", "Cita fisio"],
          body: [
            "Motivacion principal: recuperar espalda y volver a entrenar sin dolor.",
            "Objeciones: precio frente a gimnasio low-cost y aparcamiento en hora punta.",
            "Siguiente accion: vender valor premium con fisioterapia, piscina y rutina segura de retorno."
          ]
        }
      ],
      timeline: [
        { time: "12:06", title: "Audio procesado", detail: "La llamada se transcribe y resume en menos de un minuto." },
        { time: "12:07", title: "Objeciones detectadas", detail: "Precio y parking aparecen como frenos de cierre." },
        { time: "12:08", title: "Siguiente accion", detail: "Propuesta personalizada con fisioterapia y piscina." },
        { time: "12:09", title: "Pipeline actualizado", detail: "La oportunidad pasa a alta probable." }
      ]
    },
    maintenance: {
      label: "Averia anticipada",
      badge: "Mantenimiento",
      summary: "Horas de uso de sauna cerca del umbral generan orden preventiva antes de la queja.",
      action: "maintenance",
      apply(next) {
        next.kpis.maintenanceRisk = 27;
        next.maintenance[0].risk = 93;
        next.maintenance[0].status = "Critico";
        next.maintenance[0].action = "Parada preventiva 07:00 + repuesto de resistencia";
        next.tasks.unshift({
          id: "T-836",
          category: "Mantenimiento",
          club: "O2CW Malaga",
          owner: "Tecnico externo",
          priority: "Alta",
          status: "Programada",
          text: "Revision sauna seca antes de apertura de tarde; riesgo 93/100."
        });
        next.impact[1][1] = 7;
      },
      artifacts: [
        {
          id: "a-maintenance-order",
          kind: "Orden",
          title: "Preventivo sauna Malaga",
          summary: "Umbral de horas, piezas sugeridas y ventana de intervencion.",
          meta: ["Riesgo 93", "392 h uso", "Viernes 07:00"],
          body: [
            "La instalacion acumula uso cercano al umbral y feedback negativo asociado.",
            "Orden preventiva: revisar resistencia, sensor de temperatura y ventilacion antes del pico de tarde.",
            "El objetivo es evitar cierre no planificado y proteger la promesa premium del spa."
          ]
        }
      ],
      timeline: [
        { time: "15:21", title: "Umbral detectado", detail: "Sauna seca Malaga llega a zona de riesgo por horas de uso y feedback." },
        { time: "15:22", title: "Orden creada", detail: "Mantenimiento recibe pieza, ventana y prioridad." },
        { time: "15:23", title: "Experiencia protegida", detail: "El club puede avisar o actuar antes de que el socio se queje." }
      ]
    },
    capacity: {
      label: "Aforo saturado",
      badge: "Aforos",
      summary: "Pistas de padel y spa superan umbral; la POC propone redistribucion y aviso en app.",
      action: "capacity",
      apply(next) {
        next.kpis.occupancy = 78;
        next.occupancy[0].now = 97;
        next.occupancy[1].now = 92;
        next.occupancy[0].action = "Derivar reservas a franja 21:00 y abrir huecos de espera";
        next.tasks.unshift({
          id: "T-841",
          category: "Aforo",
          club: "O2CW Malaga",
          owner: "Operaciones",
          priority: "Media",
          status: "Ahora",
          text: "Activar recomendacion de franja alternativa para padel y mensaje SoyO2."
        });
      },
      artifacts: [
        {
          id: "a-capacity-plan",
          kind: "Plan operativo",
          title: "Redistribucion hora punta",
          summary: "Zonas saturadas, mensajes SoyO2 y refuerzo propuesto.",
          meta: ["Padel 97%", "Spa 92%", "App SoyO2"],
          body: [
            "La demo detecta saturacion en padel y spa antes de que se traduzca en mala experiencia.",
            "Accion: sugerir franja alternativa en SoyO2, abrir lista de espera y reforzar limpieza en spa.",
            "La direccion ve el impacto por club sin tener que revisar logs de acceso manualmente."
          ]
        }
      ],
      timeline: [
        { time: "18:42", title: "Pico de aforo", detail: "Padel Malaga sube a 97% y Spa Manuel Becerra a 92%." },
        { time: "18:43", title: "Mensaje SoyO2", detail: "Se prepara recomendacion de franja alternativa." },
        { time: "18:44", title: "Operacion avisada", detail: "Tarea de refuerzo y redistribucion creada." }
      ]
    }
  };

  let state = loadState();
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
      return raw ? JSON.parse(raw) : deepClone(baseState);
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
    state = deepClone(baseState);
    saveState();
    renderAll();
    toast("Estado reiniciado", "La demo vuelve a la muestra base O2.");
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
    if (raw.includes("alta") || raw.includes("critico")) return "high";
    if (raw.includes("media") || raw.includes("observ")) return "medium";
    return "low";
  }

  function metricDeltaClass(value) {
    const raw = String(value || "").toLowerCase();
    if (raw.includes("riesgo") || raw.includes("critico") || raw.includes("sube")) return "warn";
    if (raw.includes("baja")) return "danger";
    return "";
  }

  function renderMetrics() {
    const metricGrid = byId("metric-grid");
    const metrics = [
      ["Socios activos", state.kpis.activeMembers.toLocaleString("es-ES"), "Muestra demo multisede", "Cadena premium"],
      ["Churn en riesgo", pct(state.kpis.churnRisk), "Baja si actua retencion", "Riesgo controlado"],
      ["Sentimiento", pct(state.kpis.sentiment), `NPS ${state.kpis.nps}`, "Voz cliente"],
      ["Pipeline comercial", euro(state.kpis.pipeline), "Oportunidades con siguiente accion", "Ventas"]
    ];

    metricGrid.innerHTML = metrics.map(([label, value, detail, delta]) => `
      <article class="metric-card">
        <div>
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
        <div>
          <span>${detail}</span>
          <div class="delta ${metricDeltaClass(delta)}">${delta}</div>
        </div>
      </article>
    `).join("");

    byId("hero-proof").innerHTML = state.heroProof.map(([label, value]) => `
      <div class="proof-item">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `).join("");
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
        <p style="color: var(--muted); line-height: 1.45; margin-top: 10px;">${task.text}</p>
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
            <span class="tag">${zone.club}</span>
            <h3 style="margin-top: 10px;">${zone.zone}</h3>
          </div>
          <div>
            <strong>${zone.now}%</strong>
            <span style="display:block;color:var(--muted);font-size:.82rem;">Umbral ${zone.threshold}%</span>
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
          <span style="color: var(--muted); font-size: .82rem;">${label}</span>
          <strong style="display:block; font-size: 1.65rem; margin: 8px 0;">${rendered}</strong>
          <p style="color: var(--muted); line-height: 1.42;">${detail}</p>
        </article>
      `;
    }).join("");
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
        <p style="color: var(--muted); line-height: 1.45; margin-top: 10px;">${member.reason}</p>
      </article>
    `).join("");

    const selected = state.members.find((member) => member.id === state.selectedMemberId) || state.members[0];
    byId("playbook-status").textContent = selected.status;
    byId("playbook-status").className = `status-pill ${priorityClass(selected.status)}`;
    byId("playbook-detail").innerHTML = `
      <article class="insight-card">
        <span class="tag">${selected.club}</span>
        <h3 style="margin-top: 12px;">${selected.nextAction}</h3>
        <p style="color: var(--muted); line-height: 1.6; margin-top: 12px;">${selected.reason}</p>
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
        <p style="color: var(--ink-soft); line-height: 1.5; margin-top: 10px;">${item.text}</p>
        <p style="color: var(--muted); line-height: 1.45; margin-top: 8px;"><strong>Accion:</strong> ${item.action}</p>
      </article>
    `).join("");
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
        <p style="color: var(--ink-soft); line-height: 1.5; margin-top: 10px;">${item.motivation}</p>
        <div class="chip-row" style="margin-top: 10px;">
          ${item.objections.map((objection) => `<span class="tag">${objection}</span>`).join("")}
        </div>
        <p style="color: var(--muted); line-height: 1.45; margin-top: 10px;"><strong>Siguiente:</strong> ${item.nextAction}</p>
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
    byId("operations-table").innerHTML = `
      <thead><tr><th>Ambito</th><th>Club</th><th>Lectura</th><th>Accion</th></tr></thead>
      <tbody>
        ${state.occupancy.slice(0, 4).map((zone) => `
          <tr>
            <td><span class="status-pill ${priorityClass(zone.status === "Saturado" ? "alta" : zone.status === "Tension" ? "media" : "baja")}">${zone.zone}</span></td>
            <td>${zone.club}</td>
            <td>${zone.now}% ocupado · umbral ${zone.threshold}%</td>
            <td>${zone.action}</td>
          </tr>
        `).join("")}
        ${state.maintenance.slice(0, 4).map((item) => `
          <tr>
            <td><span class="status-pill ${priorityClass(item.status)}">${item.asset}</span></td>
            <td>${item.club}</td>
            <td>Riesgo ${item.risk}/100 · ${item.hours}h uso</td>
            <td>${item.action}</td>
          </tr>
        `).join("")}
      </tbody>
    `;
  }

  function renderScenarios() {
    byId("scenario-grid").innerHTML = Object.entries(scenarios).map(([id, scenario]) => `
      <button class="scenario-card ${state.currentScenario === id ? "active" : ""}" type="button" data-scenario="${id}">
        <small>${scenario.badge}</small>
        <h3>${scenario.label}</h3>
        <p>${scenario.summary}</p>
      </button>
    `).join("");
  }

  function renderArtifacts() {
    const grid = byId("artifact-grid");
    if (!state.artifacts.length) {
      grid.innerHTML = `<div class="empty">Los artefactos de la escena apareceran aqui: playbook, ticket, resumen comercial, orden preventiva o plan operativo.</div>`;
      return;
    }
    grid.innerHTML = state.artifacts.map((artifact) => `
      <button class="artifact-card" type="button" data-artifact="${artifact.id}">
        <div class="artifact-top">
          <div>
            <strong>${artifact.title}</strong>
            <span>${artifact.kind}</span>
          </div>
          <span class="tag">Abrir</span>
        </div>
        <p style="color: var(--muted); line-height: 1.45; margin-top: 10px;">${artifact.summary}</p>
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

  function chartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            boxWidth: 10,
            color: "#26343d",
            font: { size: 12 }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#687985" } },
        y: { grid: { color: "rgba(175, 192, 203, 0.35)" }, ticks: { color: "#687985" } }
      }
    };
  }

  function makeChart(id, config) {
    const canvas = byId(id);
    if (!canvas || typeof Chart === "undefined") return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(canvas, config);
  }

  function renderCharts() {
    makeChart("retention-chart", {
      type: "line",
      data: {
        labels: state.retentionTrend.labels,
        datasets: [
          {
            label: "Visitas mensuales",
            data: state.retentionTrend.visits,
            borderColor: "#009de0",
            backgroundColor: "rgba(0, 157, 224, 0.14)",
            tension: 0.35,
            fill: true
          },
          {
            label: "Churn score",
            data: state.retentionTrend.churn,
            borderColor: "#d84b55",
            backgroundColor: "rgba(216, 75, 85, 0.08)",
            tension: 0.35,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        ...chartOptions(),
        scales: {
          x: { grid: { display: false }, ticks: { color: "#687985" } },
          y: { min: 0, max: 14, grid: { color: "rgba(175, 192, 203, 0.35)" }, ticks: { color: "#687985" } },
          y1: { min: 0, max: 100, position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#687985" } }
        }
      }
    });

    makeChart("sentiment-chart", {
      type: "doughnut",
      data: {
        labels: ["Promotor", "Neutro", "Critico"],
        datasets: [{ data: [state.kpis.sentiment, Math.max(8, 100 - state.kpis.sentiment - 12), 12], backgroundColor: ["#2f9d62", "#d6a94a", "#d84b55"], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" } } }
    });

    makeChart("voice-chart", {
      type: "bar",
      data: {
        labels: state.topicScores.map((item) => item[0]),
        datasets: [{ label: "Casos ponderados", data: state.topicScores.map((item) => item[1]), backgroundColor: "#009de0", borderRadius: 6 }]
      },
      options: { ...chartOptions(), indexAxis: "y" }
    });

    makeChart("sales-chart", {
      type: "bar",
      data: {
        labels: state.salesFunnel.labels,
        datasets: [{ label: "Oportunidades", data: state.salesFunnel.values, backgroundColor: ["#071016", "#006f9f", "#009de0", "#7ed957"], borderRadius: 6 }]
      },
      options: chartOptions()
    });

    makeChart("occupancy-chart", {
      type: "bar",
      data: {
        labels: state.occupancy.map((item) => `${item.zone} · ${item.club.replace("O2CW ", "")}`),
        datasets: [
          { label: "Ocupacion", data: state.occupancy.map((item) => item.now), backgroundColor: "#009de0", borderRadius: 6 },
          { label: "Umbral", data: state.occupancy.map((item) => item.threshold), backgroundColor: "rgba(7,16,22,.18)", borderRadius: 6 }
        ]
      },
      options: { ...chartOptions(), scales: { ...chartOptions().scales, y: { min: 0, max: 110, grid: { color: "rgba(175, 192, 203, 0.35)" } } } }
    });

    makeChart("maintenance-chart", {
      type: "bar",
      data: {
        labels: state.maintenance.map((item) => item.asset),
        datasets: [{ label: "Riesgo tecnico", data: state.maintenance.map((item) => item.risk), backgroundColor: ["#d84b55", "#f3a53b", "#2f9d62", "#f3a53b"], borderRadius: 6 }]
      },
      options: { ...chartOptions(), indexAxis: "y", scales: { x: { min: 0, max: 100, grid: { color: "rgba(175, 192, 203, 0.35)" } }, y: { grid: { display: false } } } }
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
    setTab(state.currentTab || "dashboard");
    renderCharts();
  }

  function applyScenario(id) {
    const scenario = scenarios[id];
    if (!scenario) return;
    const next = deepClone(baseState);
    next.currentScenario = id;
    next.currentTab = "simulator";
    scenario.apply(next);
    next.artifacts = deepClone(scenario.artifacts);
    next.timeline = deepClone(scenario.timeline);
    state = next;
    saveState();
    renderAll();
    toast(scenario.label, scenario.summary);
    fireBackendTrigger(id, scenario);
  }

  function toast(title, text) {
    const toastEl = byId("toast");
    if (!toastEl) return;
    toastEl.innerHTML = `<strong>${title}</strong><p>${text}</p>`;
    toastEl.classList.add("visible");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => toastEl.classList.remove("visible"), 3200);
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
    backendFetch({ action: "state", detail: "full", t: Date.now() }).then((data) => {
      if (!data || data.status !== "ok") return;
      backend.mode = "live";
      backend.version = data.version || null;
      renderBackendBadge();
    });
  }

  function fireBackendTrigger(id, scenario) {
    if (!BACKEND_URL) return;
    backendFetch({ action: scenario.action || id, t: Date.now() }).then((data) => {
      if (!data || data.status !== "ok") return;
      state.timeline = state.timeline.concat([{
        time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        title: "Backend confirmado",
        detail: data.mensaje || "Accion registrada en Google Sheets."
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
    });

    window.addEventListener("resize", () => {
      window.clearTimeout(renderCharts.resizeTimer);
      renderCharts.resizeTimer = window.setTimeout(renderCharts, 160);
    });
  }

  function applyPresentMode() {
    if (!IS_PRESENT_MODE) return;
    document.documentElement.classList.add("present-mode");
    const mark = document.createElement("div");
    mark.className = "present-watermark";
    mark.textContent = "Modo presentacion · O2 x Ciklum";
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
  registerServiceWorker();
})();
