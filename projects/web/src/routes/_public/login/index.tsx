import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';

export const Route = createFileRoute('/_public/login/')({
  component: RouteComponent,
});

type Slide = {
  image: string;
  title: string;
  description: string;
};

const slides: Slide[] = [
  {
    image:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
    title: 'Organiza tu viaje sin estres',
    description:
      'Desde el itinerario hasta los gastos, todo tu viaje en un solo lugar para que te enfoques en disfrutar.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
    title: 'Gastos en diferentes monedas',
    description:
      'Agrega gastos, divide como quieres y olvidate de las cuentas complicadas, incluso viajando entre paises.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=80',
    title: 'Haz realidad tus metas',
    description:
      'Crea metas de ahorro, haz seguimiento y llega preparado a tu proximo destino.',
  },
];

function RouteComponent() {
  const [activeSlide] = useState(0);
  const currentSlide = useMemo(
    () => slides[activeSlide] ?? slides[0],
    [activeSlide],
  );

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-200 p-6">
      <div className="w-full max-w-sm rounded-[20px] bg-neutral-100 shadow-xl">
        <p className="px-4 pt-4 text-sm font-medium text-neutral-500">
          Inicio 1.0
        </p>

        <div className="relative overflow-hidden rounded-[20px] bg-black">
          <img
            src={currentSlide.image}
            alt={currentSlide.title}
            className="h-[420px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />

          <div className="absolute right-4 left-4 bottom-28 text-center text-white">
            <h1 className="text-3xl font-semibold tracking-tight">
              {currentSlide.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              {currentSlide.description}
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              {slides.map((slide, index) => (
                <span
                  key={slide.title}
                  className={
                    index === activeSlide
                      ? 'h-1 w-8 rounded-full bg-white'
                      : 'h-1 w-4 rounded-full bg-white/50'
                  }
                />
              ))}
            </div>
          </div>

          <div className="absolute right-0 bottom-0 left-0 rounded-t-[28px] bg-white px-4 pt-5 pb-6">
            <div className="text-center">
              <p className="text-3xl leading-none">🧳</p>
              <p className="mt-1 text-4xl font-semibold text-black">Vornway</p>
            </div>

            <div className="mt-4 space-y-3">
              <Input
                placeholder="Tu nombre"
                className="h-11 rounded-full bg-white"
              />
              <Button className="h-11 w-full rounded-full text-base">
                Continuar
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-3 text-xs text-neutral-500">
              <div className="h-px flex-1 bg-neutral-200" />
              <span>o continuar con</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            <Button
              variant="outline"
              className="mt-4 h-11 w-full rounded-full border-neutral-200 bg-white text-base text-neutral-700"
            >
              <span className="mr-2 text-base font-semibold text-blue-500">
                G
              </span>
              Continuar con Google
            </Button>

            <p className="mt-4 text-center text-xs text-neutral-600">
              ¿Ya tienes una cuenta?{' '}
              <span className="font-semibold text-black">Iniciar Sesion</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
