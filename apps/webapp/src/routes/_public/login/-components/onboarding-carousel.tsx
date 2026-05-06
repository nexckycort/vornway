'use client';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '#/components/ui/carousel';

const slides = [
  {
    image: '/images/login/slide-1.webp',
    title: 'Organiza tu viaje sin estrés',
    description:
      'Desde el itinerario hasta los gastos, todo tu viaje en un solo lugar para que te enfoques en disfrutar.',
  },
  {
    image: '/images/login/slide-2.webp',
    title: 'Gastos en diferentes monedas',
    description:
      'Agrega gastos, divide como quieras y olvídate de las cuentas complicadas, incluso viajando entre países.',
  },
  {
    image: '/images/login/slide-3.webp',
    title: 'Haz realidad tus metas',
    description:
      'Crea metas de ahorro, haz seguimiento y llega preparado a tu próximo destino.',
  },
];

export function OnboardingCarousel() {
  return (
    <Carousel className="h-full w-full">
      <CarouselContent className="-ml-0 h-full">
        {slides.map((slide) => (
          <CarouselItem key={slide.title} className="h-full pl-0">
            <div className="relative h-full min-h-[460px] w-full overflow-hidden">
              <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/10 via-black/25 to-black/70" />
              <div className="absolute inset-x-0 bottom-12 z-20 flex flex-col gap-2 px-6 text-center text-white">
                <h2 className="text-3xl leading-tight font-semibold text-balance drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  {slide.title}
                </h2>
                <p className="text-sm leading-relaxed text-white/95 text-balance drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
                  {slide.description}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="h-1 w-8 rounded-full bg-white" />
                  <span className="size-2 rounded-full bg-white/80" />
                  <span className="size-2 rounded-full bg-white/80" />
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <CarouselPrevious className="left-3" />
      <CarouselNext className="right-3" />
    </Carousel>
  );
}
