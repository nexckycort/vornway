export type Lang = 'en' | 'es';

export const translations = {
  en: {
    layout: {
      title: 'Splitway - Money between friends, made obvious',
      description:
        'Stop the awkward money talk. Splitway turns expense chaos into crystal-clear group balances.',
      ogImageAlt: 'Splitway - Money between friends, made obvious',
      twitterImageAlt: 'Splitway - group expense sharing made clear',
    },
    header: {
      navLinks: [
        { id: 'how-it-works', label: 'How it works' },
        { id: 'features', label: 'Features' },
        { id: 'proof', label: 'My commitment' },
        { id: 'faq', label: 'FAQ' },
      ],
      cta: 'Login',
      homeAria: 'Splitway home',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      languageLabel: 'Language',
      english: 'EN',
      spanish: 'ES',
    },
    hero: {
      chips: [
        'Taxi $48',
        'Dinner $120',
        'Who paid??',
        'You owe me',
        'Hotel $340',
        'Groceries $67',
        'Goal +$200',
        'Gas $42',
        "I'll pay later",
        'Museum $25',
      ],
      titleStart: 'Groups, expenses and goals',
      titleHighlight: 'in one place.',
      subtitle:
        'Track expenses, manage metas, settle debts, and invite everyone with one link.',
      cta: 'Create your first group',
      scrollHint: 'Scroll to untangle',
    },
    transformation: {
      badge: 'The shift',
      titleStart: 'From',
      titleChaos: 'chaos',
      titleMiddle: 'to',
      titleClarity: 'clarity',
      titleEnd: 'with clear balances and goals.',
      showcase: {
        title: 'How Splitway feels in real use',
        description:
          'From Home to group creation and group details, this is the real flow users follow in Splitway.',
        tagExpenseQuick: 'See your group overview instantly',
        tagLiveUpdates: 'Create a group in seconds',
        tagSyncBalances: 'Share one link and start together',
        tagSettleSuggestions: 'Track balances and details clearly',
        screenGroupTitle: 'Home',
        screenActivityTitle: 'Create Group',
        screenSettleTitle: 'Group Details',
      },
      beforeTitle: 'Before Splitway',
      afterTitle: 'Live activity + goals',
      settled: 'logged',
      pending: 'pending',
      everyoneSquare: 'Everyone sees the same updates',
      transfers: 'Updates in real time',
      beforeItems: [
        {
          person: 'Alex',
          amount: '$48',
          note: 'Taxi to airport',
          statusKey: 'unpaid',
          statusLabel: 'unpaid',
        },
        {
          person: 'Jamie',
          amount: '$1,000',
          note: 'Trip savings goal',
          statusKey: 'disputed',
          statusLabel: 'disputed',
        },
        {
          person: 'Sam',
          amount: '$340',
          note: 'Hotel 2 nights',
          statusKey: 'unclear',
          statusLabel: 'unclear',
        },
        {
          person: 'You',
          amount: '$67',
          note: 'Groceries',
          statusKey: 'forgot',
          statusLabel: 'forgot',
        },
      ],
      afterItems: [
        { from: 'Jamie', to: 'Group', amount: '$120', settled: true },
        { from: 'Sam', to: 'Goal', amount: '$200', settled: true },
        { from: 'You', to: 'Goal', amount: '$80', settled: false },
      ],
    },
    featureBlocks: {
      badge: 'Features',
      title: 'Built for real group flows in Splitway.',
      feedActionAdded: 'added',
      feedActionSettled: 'settled',
      paidBy: 'Paid by',
      skip: 'Skip',
      swipeHint: 'swipe to manage',
      inviteLink: 'splitway.app/join/beach-trip',
      totalCurrencyLabel: 'Total in your currency',
      feedItems: [
        {
          avatar: 'S',
          name: 'Sam',
          action: 'added',
          item: 'Flight tickets',
          amount: '$480',
          time: '2m ago',
          color: 'hsl(240 47% 47%)',
        },
        {
          avatar: 'J',
          name: 'Jamie',
          action: 'settled',
          item: 'Dinner split',
          amount: '$30',
          time: '5m ago',
          color: '#56E1E9',
        },
        {
          avatar: 'A',
          name: 'Alex',
          action: 'added',
          item: 'Uber to hotel',
          amount: '$22',
          time: '12m ago',
          color: 'hsl(240 33% 56%)',
        },
        {
          avatar: 'Y',
          name: 'You',
          action: 'settled',
          item: 'Coffee run',
          amount: '$16',
          time: '1h ago',
          color: '#56E1E9',
        },
        {
          avatar: 'S',
          name: 'Sam',
          action: 'added',
          item: 'Souvenirs',
          amount: '$35',
          time: '2h ago',
          color: 'hsl(240 47% 47%)',
        },
      ],
      swipeCards: [
        {
          label: 'Hotel booking',
          amount: '$340',
          person: 'Sam',
          action: 'Approve',
        },
        {
          label: 'Group dinner',
          amount: '$120',
          person: 'Jamie',
          action: 'Split equally',
        },
        {
          label: 'Taxi ride',
          amount: '$48',
          person: 'Alex',
          action: 'Settle up',
        },
      ],
      features: [
        {
          tag: 'Groups',
          title: 'Create and manage shared groups.',
          description:
            'Start a group in seconds and keep everyone in sync with shared balances.',
          slot: 'groups',
          reversed: false,
        },
        {
          tag: 'Expenses',
          title: 'Track expenses without friction.',
          description:
            'Add, edit, and remove expenses with full context of who paid and who owes.',
          slot: 'expenses',
          reversed: true,
        },
        {
          tag: 'Goals',
          title: 'Run shared metas with contributions.',
          description:
            'Create goal spaces, define target amount, and track each contribution progress.',
          slot: 'goals',
          reversed: false,
        },
        {
          tag: 'Activity',
          title: 'See every move in one feed.',
          description:
            'Expenses, participant changes, and goal updates stay visible for all members.',
          slot: 'activity',
          reversed: true,
        },
        {
          tag: 'Participants',
          title: 'Control who is in each space.',
          description:
            'Add known users or people without account, then manage roles as your group grows.',
          slot: 'participants',
          reversed: false,
        },
        {
          tag: 'Settle',
          title: 'Settle debts partially or fully.',
          description:
            'Record settle-up payments and keep balances updated with exact amounts and currency.',
          slot: 'settle',
          reversed: true,
        },
      ],
    },
    trust: {
      badge: 'From the builder',
      title: 'What I promise as I keep building Splitway.',
      stats: [
        {
          value: 100,
          suffix: '%',
          prefix: '',
          displayValue: 'Forever',
          label: 'Core features stay free forever',
          sublabel: 'What you can do today will never be paywalled.',
        },
        {
          value: 0,
          suffix: '',
          prefix: '',
          displayValue: 'Never',
          label: 'Ads in essential flows',
          sublabel: 'No ads in the core experience: track, split, and settle.',
        },
        {
          value: 1,
          suffix: '',
          prefix: '',
          displayValue: 'Intact',
          label: 'Your data comes first',
          sublabel:
            'Even if the interface evolves, your information stays intact and is never lost.',
        },
      ],
    },
    faq: {
      badge: 'FAQ',
      title: 'Answers before you jump in',
      subtitle:
        'Straight answers about roadmap, open source, and what to expect while Splitway keeps evolving.',
      items: [
        {
          question: 'Will Splitway have a mobile app?',
          answer:
            'Yes. I am currently juggling other projects and a few planned trips, so progress is not constant every week. I plan to start building the first app version in June or July 2026 and publish it in that same period.',
        },
        {
          question: 'Will the project be 100% open source?',
          answer:
            'Yes. I still need to make a few adjustments before opening the repository, but the project will be public.',
        },
        {
          question: 'Where can I report bugs or request features?',
          answer:
            'Directly from the app. You will be able to report bugs and request features without leaving Splitway.',
        },
        {
          question: 'Why did I build Splitway?',
          answer:
            'I built it because I needed it for trips, and because building is fun for me. With AI it became even easier, and creating things gives me dopamine. I will probably keep rebuilding tools I need just for fun. I could keep it private, but I use it with some friends, and maybe if you run into it, it helps you too.',
        },
        {
          question: 'Will there be self-hosting when it becomes open source?',
          answer:
            'Yes. Anyone will be able to self-host their own Splitway instance in a very simple way.',
        },
      ],
    },
    finalCta: {
      titleTop: 'Less awkward money talk.',
      titleBottom: 'More shared moments.',
      description:
        'Splitway is ready for your next trip, dinner, or home expenses, now with shared metas.',
      button: 'Start your first group',
    },
    footer: {
      tagline: 'Fair splits, fewer awkward conversations.',
      links: ['Privacy', 'Terms', 'Cookie Policy'],
      rights: '2026 Splitway. All rights reserved.',
    },
  },
  es: {
    layout: {
      title: 'Splitway - Dinero entre amigos, sin confusiones',
      description:
        'Evita conversaciones incomodas sobre dinero. Splitway convierte el caos de gastos en balances grupales claros.',
      ogImageAlt: 'Splitway - Dinero entre amigos, sin confusiones',
      twitterImageAlt: 'Splitway - gastos en grupo con total claridad',
    },
    header: {
      navLinks: [
        { id: 'how-it-works', label: 'Como funciona' },
        { id: 'features', label: 'Funciones' },
        { id: 'proof', label: 'Mi compromiso' },
        { id: 'faq', label: 'Preguntas' },
      ],
      cta: 'Iniciar sesion',
      homeAria: 'Inicio de Splitway',
      openMenu: 'Abrir menu',
      closeMenu: 'Cerrar menu',
      languageLabel: 'Idioma',
      english: 'EN',
      spanish: 'ES',
    },
    hero: {
      chips: [
        'Taxi $48',
        'Cena $120',
        'Quien pago??',
        'Me debes',
        'Hotel $340',
        'Supermercado $67',
        'Meta +$200',
        'Gasolina $42',
        'Te pago luego',
        'Museo $25',
      ],
      titleStart: 'Grupos, gastos y metas',
      titleHighlight: 'en un solo lugar.',
      subtitle:
        'Registra gastos, gestiona metas, liquida deudas e invita a todos con un solo enlace.',
      cta: 'Crea tu primer grupo',
      scrollHint: 'Desliza para ordenar',
    },
    transformation: {
      badge: 'El cambio',
      titleStart: 'De',
      titleChaos: 'caos',
      titleMiddle: 'a',
      titleClarity: 'claridad',
      titleEnd: 'con balances claros y metas.',
      showcase: {
        title: 'Asi se ve Splitway',
        description: 'Desde Home, crear grupo y ver sus detalles.',
        tagExpenseQuick: 'Ve el resumen de tus grupos al instante',
        tagLiveUpdates: 'Crea un grupo en segundos',
        tagSyncBalances: 'Comparte un enlace y comiencen juntos',
        tagSettleSuggestions: 'Sigue balances y detalles con claridad',
        screenGroupTitle: 'Home',
        screenActivityTitle: 'Crear grupo',
        screenSettleTitle: 'Detalle del grupo',
      },
      beforeTitle: 'Antes de Splitway',
      afterTitle: 'Actividad + metas en vivo',
      settled: 'registrado',
      pending: 'pendiente',
      everyoneSquare: 'Todo el grupo ve las mismas actualizaciones',
      transfers: 'Actualizaciones al instante',
      beforeItems: [
        {
          person: 'Alex',
          amount: '$48',
          note: 'Taxi al aeropuerto',
          statusKey: 'unpaid',
          statusLabel: 'impago',
        },
        {
          person: 'Jamie',
          amount: '$1,000',
          note: 'Meta de viaje',
          statusKey: 'disputed',
          statusLabel: 'discutido',
        },
        {
          person: 'Sam',
          amount: '$340',
          note: 'Hotel 2 noches',
          statusKey: 'unclear',
          statusLabel: 'confuso',
        },
        {
          person: 'Tu',
          amount: '$67',
          note: 'Supermercado',
          statusKey: 'forgot',
          statusLabel: 'olvidado',
        },
      ],
      afterItems: [
        { from: 'Jamie', to: 'Grupo', amount: '$120', settled: true },
        { from: 'Sam', to: 'Meta', amount: '$200', settled: true },
        { from: 'Tu', to: 'Meta', amount: '$80', settled: false },
      ],
    },
    featureBlocks: {
      badge: 'Funciones',
      title: 'Creado para los flujos reales de Splitway.',
      feedActionAdded: 'agrego',
      feedActionSettled: 'soldo',
      paidBy: 'Pago',
      skip: 'Omitir',
      swipeHint: 'desliza para gestionar',
      inviteLink: 'splitway.app/join/viaje-playa',
      totalCurrencyLabel: 'Total en tu moneda',
      feedItems: [
        {
          avatar: 'S',
          name: 'Sam',
          action: 'agrego',
          item: 'Boletos de vuelo',
          amount: '$480',
          time: 'hace 2m',
          color: 'hsl(240 47% 47%)',
        },
        {
          avatar: 'J',
          name: 'Jamie',
          action: 'soldo',
          item: 'Division de cena',
          amount: '$30',
          time: 'hace 5m',
          color: '#56E1E9',
        },
        {
          avatar: 'A',
          name: 'Alex',
          action: 'agrego',
          item: 'Uber al hotel',
          amount: '$22',
          time: 'hace 12m',
          color: 'hsl(240 33% 56%)',
        },
        {
          avatar: 'T',
          name: 'Tu',
          action: 'soldo',
          item: 'Cafe',
          amount: '$16',
          time: 'hace 1h',
          color: '#56E1E9',
        },
        {
          avatar: 'S',
          name: 'Sam',
          action: 'agrego',
          item: 'Souvenirs',
          amount: '$35',
          time: 'hace 2h',
          color: 'hsl(240 47% 47%)',
        },
      ],
      swipeCards: [
        {
          label: 'Reserva de hotel',
          amount: '$340',
          person: 'Sam',
          action: 'Aprobar',
        },
        {
          label: 'Cena grupal',
          amount: '$120',
          person: 'Jamie',
          action: 'Dividir igual',
        },
        {
          label: 'Viaje en taxi',
          amount: '$48',
          person: 'Alex',
          action: 'Saldar',
        },
      ],
      features: [
        {
          tag: 'Grupos',
          title: 'Crea y gestiona grupos compartidos.',
          description:
            'Inicia un grupo en segundos y mantengan todos el mismo balance.',
          slot: 'groups',
          reversed: false,
        },
        {
          tag: 'Gastos',
          title: 'Registra gastos sin friccion.',
          description:
            'Agrega, edita y elimina gastos con contexto claro de quien pago y quien debe.',
          slot: 'expenses',
          reversed: true,
        },
        {
          tag: 'Metas',
          title: 'Gestiona metas con aportes.',
          description:
            'Crea espacios de meta, define objetivo y sigue el progreso por aporte.',
          slot: 'goals',
          reversed: false,
        },
        {
          tag: 'Actividad',
          title: 'Todo el movimiento en un feed.',
          description:
            'Gastos, cambios de participantes y acciones de metas visibles para todos.',
          slot: 'activity',
          reversed: true,
        },
        {
          tag: 'Participantes',
          title: 'Controla quien entra a cada espacio.',
          description:
            'Agrega usuarios conocidos o personas sin cuenta y administra roles facilmente.',
          slot: 'participants',
          reversed: false,
        },
        {
          tag: 'Liquidaciones',
          title: 'Liquida deudas parcial o total.',
          description:
            'Registra abonos y mantén balances actualizados con montos y moneda exacta.',
          slot: 'settle',
          reversed: true,
        },
      ],
    },
    trust: {
      badge: 'Compromiso personal',
      title: 'Lo que te prometo mientras sigo construyendo Splitway.',
      stats: [
        {
          value: 100,
          suffix: '%',
          prefix: '',
          displayValue: 'Siempre',
          label: 'Las funciones core se quedan gratis para siempre',
          sublabel:
            'Lo que hoy puedes hacer nunca se ira detras de un paywall.',
        },
        {
          value: 0,
          suffix: '',
          prefix: '',
          displayValue: 'Nunca',
          label: 'Publicidad en los flujos esenciales',
          sublabel:
            'Cero anuncios en la experiencia core: registrar, dividir y liquidar.',
        },
        {
          value: 1,
          suffix: '',
          prefix: '',
          displayValue: 'Intacta',
          label: 'Tus datos van primero',
          sublabel:
            'Aunque la interfaz evolucione, tu informacion se mantiene intacta y no se pierde.',
        },
      ],
    },
    faq: {
      badge: 'Preguntas',
      title: 'Respuestas claras antes de empezar',
      subtitle:
        'Respuestas directas sobre roadmap, open source y que puedes esperar mientras Splitway evoluciona.',
      items: [
        {
          question: 'Splitway tendra app movil?',
          answer:
            'Si. En este momento estoy trabajando en otros proyectos y tengo varios viajes planeados, por eso no avanzo de forma constante todas las semanas. Planeo comenzar a construir la primera version en junio o julio de 2026 y publicarla en ese mismo periodo.',
        },
        {
          question: 'El proyecto sera 100% open source?',
          answer:
            'Si. Todavia necesito hacer un par de ajustes antes de abrir el repositorio, pero el proyecto sera publico.',
        },
        {
          question: 'Donde puedo reportar bugs o pedir funcionalidades?',
          answer:
            'Directamente desde la app. Podras reportar bugs y pedir funcionalidades sin salir de Splitway.',
        },
        {
          question: 'Por que construi Splitway?',
          answer:
            'La construi porque la necesito para viajar y porque construir siempre ha sido divertido para mi. Con IA se volvio aun mas simple, y crear cosas me da dopamina. Seguramente seguire reconstruyendo apps que necesite solo por diversion. Podria tenerla privada, pero la uso con algunos amigos, y capaz te la cruzas por ahi y te sirve.',
        },
        {
          question: 'Se podra hacer self-host cuando sea open source?',
          answer:
            'Si. Cualquier persona podra alojar su propio Splitway de manera muy simple.',
        },
      ],
    },
    finalCta: {
      titleTop: 'Menos conversaciones incomodas de dinero.',
      titleBottom: 'Mas momentos compartidos.',
      description:
        'Splitway ya esta listo para tu proximo viaje, cena o gastos del hogar, ahora con metas compartidas.',
      button: 'Crea tu primer grupo',
    },
    footer: {
      tagline: 'Divisiones justas, menos conversaciones incomodas.',
      links: ['Privacidad', 'Terminos', 'Cookies'],
      rights: '2026 Splitway. Todos los derechos reservados.',
    },
  },
} as const;

export type LandingCopy = (typeof translations)[Lang];

export function resolveLang(value?: string | null): Lang {
  return value === 'es' ? 'es' : 'en';
}

export function otherLangPath(lang: Lang): string {
  return lang === 'es' ? '/' : '/es/';
}
