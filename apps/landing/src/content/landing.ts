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
  '#';

const spanishContent: LandingContent = {
  layout: {
    title: 'Vornway - gastos, balances y metas compartidas',
    description:
      'Vornway te ayuda a organizar gastos, balances y metas compartidas desde una sola app.',
    ogImageAlt: 'Vornway - gastos, balances y metas compartidas',
    twitterImageAlt: 'Vornway - gastos, balances y metas compartidas',
  },
  brand: {
    name: 'Vornway',
    tagline: 'Tu dinero, en sintonia',
  },
  navbar: {
    links: [
      { label: 'Inicio', href: '#top' },
      { label: 'Funcionalidades', href: '#features' },
      { label: 'Cómo funciona', href: '#how-it-works' },
      { label: 'Objetivos', href: '#goals' },
    ],
    loginLabel: 'Ver funcionalidades',
    primaryCta: 'Ver funcionalidades',
    menuLabel: 'Abrir menu',
  },
  hero: {
    title: 'Todo tu viaje',
    highlight: 'en un solo lugar',
    description:
      'Gestiona gastos, organiza tu viaje y alcanza tus metas sin complicaciones. La app todo-en-uno para viajeros modernos.',
    primaryCta: 'Ver funcionalidades',
    primaryHref: '#features',
    secondaryCta: 'Cómo funciona',
    secondaryHref: '#how-it-works',
    scrollHint: 'Descubre mas',
    stats: [
      { value: 'Disponible ahora', label: 'Lanzamiento activo' },
      { value: 'Lista para empezar', label: 'Uso inmediato' },
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
        title: 'Uso inmediato',
        subtitle: 'Empieza con tu grupo sin friccion',
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
    title: 'Viajar en grupo no debería ser',
    highlight: 'complicado',
    description:
      'Descubre cómo Vornway simplifica los momentos más caóticos de un viaje.',
    items: [
      {
        icon: 'help',
        title: 'Nunca sabemos',
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
    cta: 'Empieza a usarlas con tu grupo',
    items: [
      { name: 'Viaje a Japon', current: 1500, target: 3000, emoji: 'JP' },
      { name: 'Eurotrip verano', current: 800, target: 1200, emoji: 'EU' },
      { name: 'Escapada fin de semana', current: 280, target: 300, emoji: 'WK' },
    ],
  },
  howItWorks: {
    id: 'how-it-works',
    badge: 'Empieza en minutos',
    title: 'Empieza a organizar tu viaje',
    highlight: 'en minutos',
    description:
      'Sigue estos simples pasos y toma el control de tus gastos desde el primer día.',
    steps: [
      {
        number: 'Paso 1',
        icon: 'map',
        title: 'Crea tu viaje',
        description:
          'Inicia creando un grupo de viaje y define la moneda principal según tu destino.',
      },
      {
        number: 'Paso 2',
        icon: 'users',
        title: 'Agrega gastos y participantes',
        description:
          'Registra cada gasto fácilmente e invita a las personas que hacen parte del viaje.',
      },
      {
        number: 'Paso 3',
        icon: 'chart',
        title: 'Visualiza balances y ahorra',
        description:
          'Consulta quién debe, quién pagó y haz seguimiento a tus metas de ahorro.',
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
    highlight: 'Vornway',
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
    highlight: 'acompanar a tu grupo',
    description:
      'Empieza a organizar gastos compartidos, balances y metas del grupo en una sola app, con menos caos y mas claridad.',
    primaryCta: 'Descargar app',
    primaryHref: '#',
    secondaryCta: 'Ver diseno',
    secondaryHref: figmaHref,
    footnote:
      'Hecha para quienes quieren ordenar mejor sus viajes y planes compartidos.',
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
