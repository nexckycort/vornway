export type Lang = 'es' | 'en';

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
  aiLayer: {
    id: string;
    badge: string;
    title: string;
    highlight: string;
    description: string;
    points: { title: string; description: string }[];
    callout: string;
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

const figmaHref =
  'https://www.figma.com/design/OCWhcikohJGEQoqBsVvEQx?node-id=31-20745';

const spanishContent: LandingContent = {
  layout: {
    title: 'Vornway - lista para descargar',
    description:
      'Vornway ya esta disponible para descargar y te ayuda a organizar gastos, balances y metas compartidas desde una sola app.',
    ogImageAlt: 'Vornway - lista para descargar',
    twitterImageAlt: 'Vornway - lista para descargar',
  },
  brand: {
    name: 'Vornway',
    tagline: 'Tu dinero, en sintonia',
  },
  navbar: {
    links: [
      { label: 'Funciones', href: '#features' },
      { label: 'Agentes', href: '#mcp' },
      { label: 'Como funciona', href: '#how-it-works' },
      { label: 'Metas', href: '#goals' },
    ],
    loginLabel: 'Ver diseno',
    primaryCta: 'Descargar app',
    menuLabel: 'Abrir menu',
  },
  hero: {
    title: 'Vornway ya esta lista para',
    highlight: 'descargar',
    description:
      'La app ya esta disponible para que organices gastos compartidos, balances del grupo y metas de viaje desde un solo lugar. Descargala en tu tienda preferida y empieza a usarla hoy.',
    primaryCta: 'Descargar app',
    primaryHref: '#cta',
    secondaryCta: 'Ver diseno en Figma',
    secondaryHref: figmaHref,
    scrollHint: 'Descubre mas',
    stats: [
      { value: 'Disponible ahora', label: 'Lanzamiento activo' },
      { value: 'Descarga directa', label: 'Lista para empezar' },
      { value: 'Todo en uno', label: 'Gastos, balances y metas' },
    ],
    recentLabel: 'Lo que ya puedes hacer',
    recentExpenses: [
      { name: 'Registrar gastos', amount: 'Disponible', icon: 'Receipt' },
      { name: 'Ver balances', amount: 'Disponible', icon: 'Balance' },
      { name: 'Crear metas', amount: 'Disponible', icon: 'Goals' },
    ],
    balanceLabel: 'Estado de la app',
    balanceValue: 'Lista para usar',
    balanceMeta: 'Disponible para tu grupo desde hoy',
    welcomeLabel: 'Hoy',
    welcomeName: 'Vornway disponible',
    floatingCards: [
      {
        title: 'Descarga inmediata',
        subtitle: 'Encuentrala en tu tienda preferida',
        icon: '✦',
      },
      {
        title: 'Lista para viajar',
        subtitle: 'Usala con tu grupo desde el primer dia',
        icon: '⚙',
      },
    ],
  },
  problem: {
    title: 'Viajar en grupo no deberia ser',
    highlight: 'complicado',
    description:
      'Coordinar pagos, balances y decisiones en varias apps crea friccion donde deberia haber claridad.',
    items: [
      {
        icon: 'help',
        title: 'Quien pago que',
        description:
          'Perder el rastro de los gastos compartidos genera discusiones y decisiones lentas.',
      },
      {
        icon: 'calculator',
        title: 'Cuanto debo',
        description:
          'Calcular deudas a mano toma tiempo y multiplica los errores cuando el grupo crece.',
      },
      {
        icon: 'globe',
        title: 'Diferentes monedas',
        description:
          'Convertir gastos entre divisas en medio del viaje agrega una capa extra de caos.',
      },
      {
        icon: 'layers',
        title: 'Apps separadas',
        description:
          'Una app para gastos, otra para notas y otra para ahorro: demasiado cambio de contexto.',
      },
    ],
  },
  solution: {
    badge: 'Lo que ya tienes disponible',
    title: 'Vornway ya esta',
    highlight: 'lista para tu grupo',
    description:
      'Vornway ya reune en una sola experiencia lo que antes terminaba repartido entre chats, calculadoras y varias apps: gastos, balances y metas compartidas.',
    benefits: [
      { label: 'Gastos compartidos claros desde el primer movimiento' },
      { label: 'Balances listos sin cuentas manuales' },
      { label: 'Soporte para multiples monedas' },
      { label: 'Metas dentro de la misma experiencia' },
      { label: 'Grupos organizados en un solo lugar' },
      { label: 'Una sola app en vez de varios parches' },
    ],
    tripName: 'Tu proximo viaje',
    participants: 'Grupo listo',
    stats: [
      { label: 'Base', value: 'Gastos' },
      { label: 'Seguimiento', value: 'Balances' },
      { label: 'Planeacion', value: 'Metas' },
    ],
    balancesTitle: 'Lo que resuelve hoy',
    balances: [
      { name: 'Gastos', balance: 'Ordenados', positive: true },
      { name: 'Balances', balance: 'Claros', positive: true },
      { name: 'Metas', balance: 'Integradas', positive: true },
      { name: 'Grupo', balance: 'Conectado', positive: true },
    ],
  },
  features: {
    id: 'features',
    badge: 'Disponible hoy',
    title: 'Esto es lo que ya',
    highlight: 'puedes usar',
    tabs: [
      {
        id: 'expenses',
        icon: 'wallet',
        label: 'Gastos grupales',
        title: 'Gastos compartidos sin enredos',
        description:
          'Registra gastos, reparte con claridad y manten trazabilidad para que todo el grupo entienda quien pago, cuanto y por que.',
        items: [
          { label: 'Cena restaurante', value: 'EUR 120.00' },
          { label: 'Dividir entre', value: '4 personas' },
          { label: 'Por persona', value: 'EUR 30.00' },
        ],
      },
      {
        id: 'currency',
        icon: 'globe',
        label: 'Multi-moneda',
        title: 'Multi-moneda lista para viajar',
        description:
          'Convierte y entiende gastos en distintas divisas sin rehacer balances ni depender de calculos externos.',
        items: [
          { label: 'USD -> EUR', value: '1.08' },
          { label: 'GBP -> EUR', value: '1.17' },
          { label: 'JPY -> EUR', value: '0.0062' },
        ],
      },
      {
        id: 'participants',
        icon: 'users',
        label: 'Participantes',
        title: 'Grupos con contexto claro',
        description:
          'Cada viaje o grupo queda organizado con participantes, movimientos y balances en un solo espacio.',
        items: [
          { label: 'Carlos', value: '+EUR 85.00', positive: true },
          { label: 'Maria', value: '-EUR 42.50', positive: false },
          { label: 'Pedro', value: '+EUR 127.50', positive: true },
        ],
      },
    ],
  },
  goals: {
    id: 'goals',
    badge: 'Tambien disponible',
    title: 'Las metas no van',
    highlight: 'por separado',
    description:
      'Ahorrar para el viaje y organizar los gastos del grupo viven dentro de la misma app, para que no tengas que saltar entre herramientas.',
    points: [
      {
        icon: 'trending',
        title: 'Progreso visual',
        description:
          'Barras y metricas simples para entender cuanto falta sin abrir otra herramienta.',
      },
      {
        icon: 'sparkles',
        title: 'Recordatorios inteligentes',
        description:
          'Pequenos empujes para mantener el ritmo del ahorro antes de la salida.',
      },
    ],
    cta: 'Descarga la app y empieza a usarlas',
    items: [
      { name: 'Viaje a Japon', current: 1500, target: 3000, emoji: 'JP' },
      { name: 'Eurotrip verano', current: 800, target: 1200, emoji: 'EU' },
      { name: 'Escapada fin de semana', current: 280, target: 300, emoji: 'WK' },
    ],
  },
  howItWorks: {
    id: 'how-it-works',
    badge: 'Empieza en minutos',
    title: 'Como funciona',
    highlight: 'Vornway',
    description:
      'Tres pasos simples para empezar a usar la app con tu grupo desde hoy.',
    steps: [
      {
        number: '01',
        icon: 'map',
        title: 'Descarga la app',
        description:
          'Encuentra Vornway en tu tienda preferida, instalala y entra en minutos.',
      },
      {
        number: '02',
        icon: 'receipt',
        title: 'Crea tu grupo',
        description:
          'Invita a las personas con las que compartes gastos, viajes o metas y organiza todo en un mismo lugar.',
      },
      {
        number: '03',
        icon: 'chart',
        title: 'Empieza a registrar',
        description:
          'Carga gastos, revisa balances y sigue tus metas sin depender de hojas manuales ni chats perdidos.',
      },
    ],
  },
  assistant: {
    badge: 'Todo conectado en una sola app',
    title: 'Una interfaz que',
    highlight: 'mantiene todo conectado',
    description:
      'Vornway conecta gastos, metas y coordinacion del grupo dentro del mismo sistema para que todo avance con claridad desde el primer uso.',
    chips: [
      { icon: 'Money', label: 'Gastos' },
      { icon: 'Goals', label: 'Ahorros' },
      { icon: 'People', label: 'Grupos' },
      { icon: 'FX', label: 'Monedas' },
      { icon: 'Trips', label: 'Viajes' },
      { icon: 'Stats', label: 'Balances' },
    ],
  },
  aiLayer: {
    id: 'mcp',
    badge: 'AI-first, pero no chat-first',
    title: 'No queremos otra app con',
    highlight: 'una caja de chat',
    description:
      'La gente ya usa ChatGPT y otros agentes para pensar, organizarse y decidir. Vornway se enfoca en resolver gastos, balances y metas con acciones reales, no en repetir una interfaz de chat.',
    points: [
      {
        title: 'Vornway conectado a tu agente de referencia',
        description:
          'Cada persona puede conectar Vornway con el agente que ya usa para pensar, organizarse y tomar decisiones, sin aprender otra interfaz.',
      },
      {
        title: 'Acciones reales desde el agente',
        description:
          'Eso significa pedir graficas a demanda, crear grupos, abrir metas, consultar el estado del grupo y accionar Vornway desde tu agente.',
      },
      {
        title: 'Contexto util, no solo conversacion',
        description:
          'Mientras otros agregan un chat mas, Vornway apunta a convertirse en la capa de contexto y acciones para organizar grupos, gastos y metas de verdad.',
      },
    ],
    callout:
      'AI-first no significa otra UI de chat. Significa contexto util y acciones reales sobre grupos, gastos y metas cuando las necesitas.',
  },
  manifesto: {
    badge: 'Cómo lo construimos',
    title: 'Cómo construimos',
    highlight: 'con intención',
    lead: 'En la era de la IA construir se volvió radicalmente más fácil. Podríamos vaicodear toda esta app en cuestión de días.',
    paragraphs: [
      'Pero la pregunta no es qué tan rápido se puede hacer. La pregunta es otra: ¿dejarías que alguien juegue tu videojuego favorito mientras tú solo miras? ¿Dejarías que otra persona salga de fiesta por ti y luego te lo cuente? ¿Dejarías que alguien viva tu actividad favorita mientras tú te quedas sentado observando?',
      'Programar se parece cada vez más a restaurar un auto clásico: no se trata solo de llegar al resultado final, sino de tocar cada pieza, entenderla, ajustarla y disfrutar el proceso. Así vamos a construir Vornway: escribiendo cuidadosamente cada parte, empezando por diseñarlo completo en Figma y luego llevándolo a una app real, pantalla por pantalla.',
    ],
    quote:
      'La razón es simple: diversión, dopamina, obsesión por el detalle. Llámalo como quieras. Pero Vornway no se va a construir solo por velocidad, sino por el placer de hacerlo bien.',
    figmaLabel: 'Ver diseño en Figma',
    figmaHref: figmaHref,
  },
  comparison: {
    brandLabel: 'Vornway',
    badge: 'La diferencia en uso real',
    title: 'Lo que Vornway evita',
    highlight: 'desde hoy',
    description:
      'Vornway evita el caos de repartir el flujo entre herramientas sueltas, chats, calculadoras y parches desde el primer uso.',
    summary:
      'La meta es resolverlo todo en una sola experiencia coherente, no en una coleccion de herramientas separadas.',
    rows: [
      {
        feature: 'Dividir gastos',
        splitway: true,
        alternatives: 'Division de cuentas',
      },
      {
        feature: 'Objetivos financieros',
        splitway: true,
        alternatives: 'Planificacion financiera',
      },
      {
        feature: 'Multi-moneda',
        splitway: true,
        alternatives: 'Conversion de divisas',
      },
      {
        feature: 'Gestion de grupo',
        splitway: true,
        alternatives: 'Coordinacion manual',
      },
      { feature: 'Todo en uno', splitway: true, alternatives: false },
    ],
  },
  cta: {
    title: 'Vornway ya esta lista para',
    highlight: 'descargar',
    description:
      'Instalala desde tu tienda preferida y empieza a organizar gastos compartidos, balances y metas del grupo en una sola app.',
    primaryCta: 'Descargar app',
    primaryHref: '#',
    secondaryCta: 'Ver diseno',
    secondaryHref: figmaHref,
    footnote:
      'Disponible ahora para quienes quieren ordenar mejor sus viajes y planes compartidos.',
  },
  footer: {
    columns: [
      {
        title: 'Producto',
        links: [
          { label: 'Funciones', href: '#features' },
          { label: 'Como funciona', href: '#how-it-works' },
          { label: 'Metas', href: '#goals' },
        ],
      },
      {
        title: 'Soporte',
        links: [
          { label: 'Centro de ayuda', href: '#' },
          { label: 'Contacto', href: '#' },
          { label: 'FAQ', href: '#' },
          { label: 'Comunidad', href: '#' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacidad', href: '#' },
          { label: 'Terminos', href: '#' },
          { label: 'Cookies', href: '#' },
        ],
      },
    ],
    copyright: '© 2026 Vornway. Todos los derechos reservados.',
    signature: 'Lista para ayudarte a viajar y organizarte sin caos.',
    social: [
      { label: 'Twitter', href: '#' },
      { label: 'Instagram', href: '#' },
      { label: 'LinkedIn', href: '#' },
    ],
  },
};

export const landingContent: Record<Lang, LandingContent> = {
  es: spanishContent,
  en: spanishContent,
};
