import {
  type ItinerarySeedPlace,
  normalizeLocationKey,
  offsetSeedCoordinates,
} from './itinerary-utils';

interface CitySeed {
  latitude: number;
  longitude: number;
  places: ItinerarySeedPlace[];
}

const CITY_SEEDS: Record<string, CitySeed> = {
  [normalizeLocationKey('Madrid', 'Spain')]: {
    latitude: 40.4168,
    longitude: -3.7038,
    places: [
      {
        name: 'Museo del Prado',
        type: 'Museo',
        latitude: 40.4138,
        longitude: -3.6921,
        description: 'Coleccion clasica y moderna imprescindible.',
        openingHours: '09:00-20:00',
        ticketRequired: true,
        price: 15,
        visitDurationMinutes: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1543340713-8f05d7f7f8dd?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Parque del Retiro',
        type: 'Parque',
        latitude: 40.4153,
        longitude: -3.6844,
        description: 'Gran parque urbano con lago y jardines.',
        openingHours: '06:00-22:00',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1520637836862-4d197d17c90a?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Palacio Real',
        type: 'Monumento',
        latitude: 40.4179,
        longitude: -3.7143,
        description: 'Residencia historica y salas de estado.',
        openingHours: '10:00-18:00',
        ticketRequired: true,
        price: 14,
        visitDurationMinutes: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1571047399553-3f10e7af8c39?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Mercado de San Miguel',
        type: 'Restaurante',
        latitude: 40.4155,
        longitude: -3.7094,
        description: 'Tapas y gastronomia local en espacio historico.',
        openingHours: '10:00-00:00',
        ticketRequired: false,
        price: 20,
        visitDurationMinutes: 75,
        imageUrl:
          'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Templo de Debod',
        type: 'Monumento',
        latitude: 40.424,
        longitude: -3.7174,
        description: 'Templo egipcio con vistas al atardecer.',
        openingHours: 'Cerrado lunes · 10:00-19:00',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 45,
        imageUrl:
          'https://images.unsplash.com/photo-1576749872435-ff88f4e0f8f1?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
  [normalizeLocationKey('Paris', 'France')]: {
    latitude: 48.8566,
    longitude: 2.3522,
    places: [
      {
        name: 'Torre Eiffel',
        type: 'Monumento',
        latitude: 48.8584,
        longitude: 2.2945,
        description: 'Icono principal de Paris.',
        openingHours: '09:30-23:45',
        ticketRequired: true,
        price: 29,
        visitDurationMinutes: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Museo del Louvre',
        type: 'Museo',
        latitude: 48.8606,
        longitude: 2.3376,
        description: 'Museo con la Mona Lisa y arte universal.',
        openingHours: 'Cerrado martes · 09:00-18:00',
        ticketRequired: true,
        price: 22,
        visitDurationMinutes: 150,
        imageUrl:
          'https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Jardin de Luxemburgo',
        type: 'Parque',
        latitude: 48.8462,
        longitude: 2.3372,
        description: 'Jardines clasicos y ambiente relajado.',
        openingHours: '07:30-20:30',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 75,
        imageUrl:
          'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Le Marais',
        type: 'Zona cultural',
        latitude: 48.8576,
        longitude: 2.3622,
        description: 'Barrio historico con cafes y galerias.',
        openingHours: '10:00-22:00',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Catedral Notre-Dame',
        type: 'Monumento',
        latitude: 48.853,
        longitude: 2.3499,
        description: 'Catedral gotica junto al Sena.',
        openingHours: '08:00-18:45',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
  [normalizeLocationKey('Bogota', 'Colombia')]: {
    latitude: 4.711,
    longitude: -74.0721,
    places: [
      {
        name: 'Monserrate',
        type: 'Monumento',
        latitude: 4.6057,
        longitude: -74.0568,
        description: 'Mirador principal de la ciudad.',
        openingHours: '08:00-18:00',
        ticketRequired: true,
        price: 8,
        visitDurationMinutes: 120,
        imageUrl:
          'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Museo del Oro',
        type: 'Museo',
        latitude: 4.6018,
        longitude: -74.0725,
        description: 'Coleccion de orfebreria prehispanica.',
        openingHours: 'Cerrado lunes · 09:00-18:00',
        ticketRequired: true,
        price: 2,
        visitDurationMinutes: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Parque Simon Bolivar',
        type: 'Parque',
        latitude: 4.6584,
        longitude: -74.0939,
        description: 'Zona verde amplia para caminar y descansar.',
        openingHours: '06:00-18:00',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 75,
        imageUrl:
          'https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'La Candelaria',
        type: 'Zona cultural',
        latitude: 4.5981,
        longitude: -74.0721,
        description: 'Centro historico con arquitectura colonial.',
        openingHours: '10:00-20:00',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Zona G',
        type: 'Restaurante',
        latitude: 4.653,
        longitude: -74.0578,
        description: 'Area gastronomica reconocida.',
        openingHours: '12:00-23:00',
        ticketRequired: false,
        price: 25,
        visitDurationMinutes: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
  [normalizeLocationKey('Barranquilla', 'Colombia')]: {
    latitude: 10.9685,
    longitude: -74.7813,
    places: [
      {
        name: 'Gran Malecon del Rio',
        type: 'Parque',
        latitude: 10.9935,
        longitude: -74.8016,
        description: 'Paseo ribereno con zonas culturales y miradores.',
        openingHours: '06:00-22:00',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Museo del Caribe',
        type: 'Museo',
        latitude: 10.9874,
        longitude: -74.7888,
        description: 'Espacio interactivo sobre identidad y cultura caribena.',
        openingHours: 'Cerrado lunes · 09:00-17:00',
        ticketRequired: true,
        price: 6,
        visitDurationMinutes: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1593341646782-e0b495cff86d?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Castillo de Salgar',
        type: 'Monumento',
        latitude: 11.049,
        longitude: -74.957,
        description: 'Fuerte historico frente al mar con vistas panoramicas.',
        openingHours: '09:00-18:00',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 75,
        imageUrl:
          'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Barrio El Prado',
        type: 'Zona cultural',
        latitude: 10.9973,
        longitude: -74.8027,
        description: 'Arquitectura tradicional y ambiente historico.',
        openingHours: '10:00-20:00',
        ticketRequired: false,
        price: 0,
        visitDurationMinutes: 60,
        imageUrl:
          'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Caiman del Rio',
        type: 'Restaurante',
        latitude: 10.9938,
        longitude: -74.8011,
        description: 'Zona gastronomica y cultural junto al malecon.',
        openingHours: '12:00-23:00',
        ticketRequired: false,
        price: 20,
        visitDurationMinutes: 90,
        imageUrl:
          'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
};

function buildFallback(city: string, country: string): CitySeed {
  const cityCenter: Record<string, { latitude: number; longitude: number }> = {
    [normalizeLocationKey('Barcelona', 'Spain')]: {
      latitude: 41.3874,
      longitude: 2.1686,
    },
    [normalizeLocationKey('Rome', 'Italy')]: {
      latitude: 41.9028,
      longitude: 12.4964,
    },
    [normalizeLocationKey('New York', 'United States')]: {
      latitude: 40.7128,
      longitude: -74.006,
    },
    [normalizeLocationKey('Barranquilla', 'Colombia')]: {
      latitude: 10.9685,
      longitude: -74.7813,
    },
    [normalizeLocationKey('Bogota', 'Colombia')]: {
      latitude: 4.711,
      longitude: -74.0721,
    },
  };

  const key = normalizeLocationKey(city, country);
  const base = cityCenter[key] ?? { latitude: 4.711, longitude: -74.0721 };

  const labels = [
    { name: `Centro historico de ${city}`, type: 'Zona cultural' },
    { name: `Museo principal de ${city}`, type: 'Museo' },
    { name: `Parque central de ${city}`, type: 'Parque' },
    { name: `Monumento iconico de ${city}`, type: 'Monumento' },
    { name: `Zona gastronomica de ${city}`, type: 'Restaurante' },
  ];

  const places: ItinerarySeedPlace[] = labels.map((entry, index) => {
    const coords = offsetSeedCoordinates(base.latitude, base.longitude, index);
    return {
      name: entry.name,
      type: entry.type,
      latitude: coords.latitude,
      longitude: coords.longitude,
      description: `Sugerencia popular en ${city}, ${country}.`,
      openingHours: '09:00-19:00',
      ticketRequired: entry.type === 'Museo' || entry.type === 'Monumento',
      price: entry.type === 'Restaurante' ? 18 : entry.type === 'Parque' ? 0 : 12,
      visitDurationMinutes: entry.type === 'Parque' ? 75 : 90,
      imageUrl:
        'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1200&q=80',
    };
  });

  return {
    latitude: base.latitude,
    longitude: base.longitude,
    places,
  };
}

export function getPopularPlacesForCity(
  city: string,
  country: string,
): { latitude: number; longitude: number; places: ItinerarySeedPlace[] } {
  const key = normalizeLocationKey(city, country);
  return CITY_SEEDS[key] ?? buildFallback(city, country);
}
