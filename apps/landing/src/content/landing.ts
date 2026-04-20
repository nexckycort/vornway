export type Lang = "es" | "en";

export type NavItem = {
  label: string;
  href: string;
};

export type Stat = {
  value: string;
  label: string;
};

export type PainPoint = {
  icon: string;
  title: string;
  description: string;
};

export type Benefit = {
  label: string;
};

export type SolutionStat = {
  label: string;
  value: string;
};

export type BalanceItem = {
  name: string;
  balance: string;
  positive: boolean;
};

export type FeatureTab = {
  id: string;
  icon: string;
  label: string;
  title: string;
  description: string;
  items: {
    label: string;
    value: string;
    positive?: boolean;
  }[];
};

export type Goal = {
  name: string;
  current: number;
  target: number;
  emoji: string;
};

export type Step = {
  number: string;
  icon: string;
  title: string;
  description: string;
};

export type ComparisonRow = {
  feature: string;
  splitway: boolean;
  alternatives: string | false;
};

export type LinkGroup = {
  title: string;
  links: NavItem[];
};

export type LandingContent = {
  layout: {
    title: string;
    description: string;
    ogImageAlt: string;
    twitterImageAlt: string;
  };
  brand: {
    name: string;
    tagline: string;
  };
  navbar: {
    links: NavItem[];
    loginLabel: string;
    primaryCta: string;
    menuLabel: string;
  };
  hero: {
    badge?: string;
    title: string;
    highlight: string;
    description: string;
    primaryCta: string;
    primaryHref?: string;
    secondaryCta: string;
    secondaryHref?: string;
    scrollHint: string;
    stats: Stat[];
    recentLabel?: string;
    recentExpenses: { name: string; amount: string; icon: string }[];
    balanceLabel: string;
    balanceValue: string;
    balanceMeta: string;
    welcomeLabel: string;
    welcomeName: string;
    floatingCards: { title: string; subtitle: string; icon: string }[];
  };
  problem: {
    title: string;
    highlight: string;
    description: string;
    items: PainPoint[];
  };
  solution: {
    badge: string;
    title: string;
    highlight: string;
    description: string;
    benefits: Benefit[];
    tripName: string;
    participants: string;
    stats: SolutionStat[];
    balancesTitle: string;
    balances: BalanceItem[];
  };
  features: {
    id: string;
    badge: string;
    title: string;
    highlight: string;
    tabs: FeatureTab[];
  };
  goals: {
    id: string;
    badge: string;
    title: string;
    highlight: string;
    description: string;
    points: { icon: string; title: string; description: string }[];
    cta: string;
    items: Goal[];
  };
  howItWorks: {
    id: string;
    badge: string;
    title: string;
    highlight: string;
    description: string;
    steps: Step[];
  };
  assistant: {
    badge: string;
    title: string;
    highlight: string;
    description: string;
    chips: { icon: string; label: string }[];
  };
  manifesto: {
    badge: string;
    title: string;
    highlight: string;
    lead: string;
    paragraphs: string[];
    quote: string;
    figmaLabel: string;
    figmaHref: string;
  };
  comparison: {
    brandLabel: string;
    badge: string;
    title: string;
    highlight: string;
    description: string;
    summary: string;
    rows: ComparisonRow[];
  };
  cta: {
    title: string;
    highlight: string;
    description: string;
    primaryCta: string;
    primaryHref?: string;
    secondaryCta: string;
    secondaryHref?: string;
    footnote: string;
  };
  footer: {
    columns: LinkGroup[];
    copyright: string;
    signature: string;
    social: NavItem[];
  };
};

const spanishContent: LandingContent = {
  layout: {
    title: "Vornway — Your money, in sync",
    description:
      "Vornway keeps your money, balances and shared flows in sync in one clean experience.",
    ogImageAlt: "Vornway — Your money, in sync",
    twitterImageAlt: "Vornway — Your money, in sync",
  },
  brand: {
    name: "Vornway",
    tagline: "Your money, in sync",
  },
  navbar: {
    links: [
      { label: "Funciones", href: "#features" },
      { label: "Cómo funciona", href: "#how-it-works" },
      { label: "Metas", href: "#goals" },
    ],
    loginLabel: "Ver diseño",
    primaryCta: "Seguir construcción",
    menuLabel: "Abrir menú",
  },
  hero: {
    title: "Estamos construyendo",
    highlight: "Vornway",
    description:
      "Vornway todavía no está listo. Estamos diseñándolo y construyéndolo desde cero, con calma, criterio y atención real al detalle antes de abrirlo al mundo.",
    primaryCta: "Seguir construcción",
    primaryHref: "#manifesto",
    secondaryCta: "Ver diseño en Figma",
    secondaryHref: "https://www.figma.com/design/OCWhcikohJGEQoqBsVvEQx?node-id=31-20745",
    scrollHint: "Descubre más",
    stats: [
      { value: "Build 0.1", label: "Estado actual" },
      { value: "Figma first", label: "Diseño antes de código" },
      { value: "MVP", label: "En construcción" },
    ],
    recentLabel: "Frentes activos",
    recentExpenses: [
      { name: "Arquitectura base", amount: "En curso", icon: "🧱" },
      { name: "Flujo de balances", amount: "Diseño", icon: "📐" },
      { name: "MVP y alcance", amount: "Definiendo", icon: "🗺️" },
    ],
    balanceLabel: "Progreso del producto",
    balanceValue: "Build 0.1",
    balanceMeta: "Diseño + producto + código",
    welcomeLabel: "Ahora mismo",
    welcomeName: "Construyendo Vornway",
    floatingCards: [
      { title: "Diseño activo", subtitle: "Sistema y flujos en Figma", icon: "✦" },
      { title: "Código manual", subtitle: "Cada parte se escribe con intención", icon: "⚙" },
    ],
  },
  problem: {
    title: "Viajar en grupo no debería ser",
    highlight: "complicado",
    description:
      "Coordinar pagos, balances y decisiones en varias apps crea fricción donde debería haber claridad.",
    items: [
      {
        icon: "help",
        title: "¿Quién pagó qué?",
        description:
          "Perder el rastro de los gastos compartidos genera discusiones y decisiones lentas.",
      },
      {
        icon: "calculator",
        title: "¿Cuánto debo?",
        description:
          "Calcular deudas a mano toma tiempo y multiplica los errores cuando el grupo crece.",
      },
      {
        icon: "globe",
        title: "Diferentes monedas",
        description:
          "Convertir gastos entre divisas en medio del viaje es una capa extra de caos.",
      },
      {
        icon: "layers",
        title: "Apps separadas",
        description:
          "Una app para gastos, otra para notas, otra para ahorro: demasiado cambio de contexto.",
      },
    ],
  },
  solution: {
    badge: "Lo que estamos diseñando",
    title: "Vornway está tomando",
    highlight: "forma",
    description:
      "No estamos enseñando una app terminada, sino la estructura del producto que estamos armando: un núcleo claro para gastos, balances y metas sin pegar herramientas desconectadas.",
    benefits: [
      { label: "Diseño del flujo completo antes del código" },
      { label: "Base preparada para múltiples monedas" },
      { label: "Modelo claro de gastos y balances" },
      { label: "Metas dentro del mismo producto" },
      { label: "Arquitectura pensada para escalar" },
      { label: "Un solo sistema, no cinco parches" },
    ],
    tripName: "Vornway MVP",
    participants: "3 frentes activos",
    stats: [
      { label: "Núcleo", value: "Gastos" },
      { label: "Segundo bloque", value: "Balances" },
      { label: "Tercero", value: "Metas" },
    ],
    balancesTitle: "Bloques del MVP",
    balances: [
      { name: "Gastos", balance: "Primero", positive: true },
      { name: "Balances", balance: "Después", positive: true },
      { name: "Metas", balance: "Integrado", positive: true },
      { name: "Grupo", balance: "Conectado", positive: true },
    ],
  },
  features: {
    id: "features",
    badge: "Alcance inicial",
    title: "Esto es lo primero que",
    highlight: "entra al producto",
    tabs: [
      {
        id: "expenses",
        icon: "wallet",
        label: "Gastos grupales",
        title: "Gastos como base del sistema",
        description:
          "El primer bloque del producto será registrar gastos bien, repartirlos con claridad y dejar trazabilidad desde el inicio.",
        items: [
          { label: "Cena restaurante", value: "€120.00" },
          { label: "Dividir entre", value: "4 personas" },
          { label: "Por persona", value: "€30.00" },
        ],
      },
      {
        id: "currency",
        icon: "globe",
        label: "Multi-moneda",
        title: "Multi-moneda desde la base",
        description:
          "La estructura se está pensando para soportar distintas divisas sin que luego toque rehacer balances ni cálculos.",
        items: [
          { label: "USD → EUR", value: "1.08" },
          { label: "GBP → EUR", value: "1.17" },
          { label: "JPY → EUR", value: "0.0062" },
        ],
      },
      {
        id: "participants",
        icon: "users",
        label: "Participantes",
        title: "Grupos con contexto claro",
        description:
          "Cada viaje o grupo debe tener contexto, participantes y balances sin depender de hojas manuales o chats perdidos.",
        items: [
          { label: "Carlos", value: "+€85.00", positive: true },
          { label: "María", value: "-€42.50", positive: false },
          { label: "Pedro", value: "+€127.50", positive: true },
        ],
      },
    ],
  },
  goals: {
    id: "goals",
    badge: "También entra al MVP",
    title: "Las metas no van",
    highlight: "aparte",
    description:
      "Las metas forman parte del producto desde el principio porque ahorrar y gastar viven en el mismo contexto, no en apps distintas.",
    points: [
      {
        icon: "trending",
        title: "Progreso visual",
        description:
          "Barras y métricas simples para entender cuánto falta sin abrir otra herramienta.",
      },
      {
        icon: "sparkles",
        title: "Recordatorios inteligentes",
        description:
          "Pequeños empujes para mantener el ritmo del ahorro antes de la salida.",
      },
    ],
    cta: "Ver cómo lo estamos planteando",
    items: [
      { name: "Viaje a Japón", current: 1500, target: 3000, emoji: "🇯🇵" },
      { name: "Eurotrip verano", current: 800, target: 1200, emoji: "🌍" },
      { name: "Escapada fin de semana", current: 280, target: 300, emoji: "🏖️" },
    ],
  },
  howItWorks: {
    id: "how-it-works",
    badge: "Así lo estamos haciendo",
    title: "Cómo vamos a construir",
    highlight: "Vornway",
    description:
      "Tres pasos para llevar Vornway de idea a producto real sin improvisar el proceso.",
    steps: [
      {
        number: "01",
        icon: "map",
        title: "Diseñamos el sistema",
        description:
          "Primero se ordenan flujos, pantallas y decisiones en Figma antes de escribir una sola línea seria de producto.",
      },
      {
        number: "02",
        icon: "receipt",
        title: "Definimos el MVP",
        description:
          "Luego cerramos alcance: qué entra, qué no entra y cuál es la secuencia correcta para construir sin ruido.",
      },
      {
        number: "03",
        icon: "chart",
        title: "Lo convertimos en app",
        description:
          "Después sí: código, integración y producto, pantalla por pantalla y pieza por pieza.",
      },
    ],
  },
  assistant: {
    badge: "El sistema que estamos armando",
    title: "Una interfaz que",
    highlight: "mantiene todo conectado",
    description:
      "Vornway se está diseñando para conectar gastos, metas y coordinación del grupo dentro del mismo sistema, desde el primer release.",
    chips: [
      { icon: "💸", label: "Gastos" },
      { icon: "🎯", label: "Ahorros" },
      { icon: "👥", label: "Grupos" },
      { icon: "💱", label: "Monedas" },
      { icon: "✈️", label: "Viajes" },
      { icon: "📊", label: "Balances" },
    ],
  },
  manifesto: {
    badge: "Cómo vamos a construirlo",
    title: "Construir Vornway",
    highlight: "con intención",
    lead:
      "En la era de la IA construir se volvió radicalmente más fácil. Podríamos vaicodear toda esta app en cuestión de días.",
    paragraphs: [
      "Pero la pregunta no es si se puede hacer rápido. La pregunta es otra: ¿dejarías que alguien se pase tu juego favorito mientras tú solo miras? ¿Dejarías que otra persona se vaya de fiesta y luego te la cuente? ¿Dejarías que alguien haga tu actividad favorita mientras tú simplemente estás sentado viendo?",
      "Programar se parece cada vez más a restaurar un auto viejo: no se trata solo de llegar al final, sino de tocar cada pieza, entenderla, ajustarla y disfrutar el proceso. Así vamos a construir Vornway: escribiendo cuidadosamente cada parte, empezando por diseñarlo completo en Figma y luego llevándolo a una app real, pantalla por pantalla.",
    ],
    quote:
      "La razón es simple: diversión, dopamina, obsesión por el detalle. Llámalo como quieras. Pero Vornway no se va a construir solo por velocidad, sino por el placer de hacerlo bien.",
    figmaLabel: "Ver diseño en Figma",
    figmaHref: "https://www.figma.com/design/OCWhcikohJGEQoqBsVvEQx?node-id=31-20745",
  },
  comparison: {
    brandLabel: "Vornway",
    badge: "La dirección del producto",
    title: "Lo que estamos evitando",
    highlight: "desde el día uno",
    description:
      "No queremos construir otra app aislada. Queremos evitar desde el inicio el caos de repartir el flujo entre notas, chats, calculadoras y parches.",
    summary: "La meta es una sola experiencia coherente, no otra colección de herramientas sueltas.",
    rows: [
      { feature: "Dividir gastos", splitway: true, alternatives: "Splitwise" },
      { feature: "Metas de ahorro", splitway: true, alternatives: "Apps bancarias" },
      { feature: "Multi-moneda", splitway: true, alternatives: "Calculadoras" },
      { feature: "Gestión de grupo", splitway: true, alternatives: "WhatsApp / Notas" },
      { feature: "Todo en uno", splitway: true, alternatives: false },
    ],
  },
  cta: {
    title: "Vornway todavía no está",
    highlight: "Vornway",
    description:
      "Pero ya puedes seguir cómo lo estamos pensando, ver el diseño y entender la dirección del producto antes de que salga.",
    primaryCta: "Seguir construcción",
    primaryHref: "#manifesto",
    secondaryCta: "Abrir Figma",
    secondaryHref: "https://www.figma.com/design/OCWhcikohJGEQoqBsVvEQx?node-id=31-20745",
    footnote: "Ahora mismo estamos diseñando, definiendo MVP y construyendo con calma.",
  },
  footer: {
    columns: [
      {
        title: "Producto",
        links: [
          { label: "Funciones", href: "#features" },
          { label: "Cómo funciona", href: "#how-it-works" },
          { label: "Metas", href: "#goals" },
        ],
      },
      {
        title: "Soporte",
        links: [
          { label: "Centro de ayuda", href: "#" },
          { label: "Contacto", href: "#" },
          { label: "FAQ", href: "#" },
          { label: "Comunidad", href: "#" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Privacidad", href: "#" },
          { label: "Términos", href: "#" },
          { label: "Cookies", href: "#" },
        ],
      },
    ],
    copyright: "© 2026 Vornway. Todos los derechos reservados.",
    signature: "Hecho para viajes compartidos sin caos.",
    social: [
      { label: "Twitter", href: "#" },
      { label: "Instagram", href: "#" },
      { label: "LinkedIn", href: "#" },
    ],
  },
};

export const landingContent: Record<Lang, LandingContent> = {
  es: spanishContent,
  en: spanishContent,
};
