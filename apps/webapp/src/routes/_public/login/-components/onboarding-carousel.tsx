import { type ReactNode, useEffect, useState } from 'react';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '#/components/ui/carousel';
import { cn } from '#/lib/utils';
import { getLoginMessages } from '#/routes/_public/login/-messages';

type OnboardingCarouselProps = {
  actions: ReactNode;
};

export function OnboardingCarousel({ actions }: OnboardingCarouselProps) {
  const t = getLoginMessages();
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      image: '/images/login/slide-1.webp',
      title: t.onboarding.travelTitle,
      description: t.onboarding.travelDescription,
    },
    {
      image: '/images/login/slide-2.webp',
      title: t.onboarding.expensesTitle,
      description: t.onboarding.expensesDescription,
    },
    {
      image: '/images/login/slide-3.webp',
      title: t.onboarding.goalsTitle,
      description: t.onboarding.goalsDescription,
    },
  ];

  useEffect(() => {
    if (!api) return;

    const updateCurrentSlide = () => setCurrentSlide(api.selectedScrollSnap());

    updateCurrentSlide();
    api.on('select', updateCurrentSlide);
    api.on('reInit', updateCurrentSlide);

    return () => {
      api.off('select', updateCurrentSlide);
      api.off('reInit', updateCurrentSlide);
    };
  }, [api]);

  const current = slides[currentSlide] ?? slides[0];

  return (
    <div className="relative size-full overflow-hidden">
      <Carousel
        className="absolute inset-0 overflow-hidden [&_[data-slot=carousel-content]]:h-full"
        opts={{ loop: true }}
        setApi={setApi}
      >
        <CarouselContent className="-ml-0 h-full">
          {slides.map((slide) => (
            <CarouselItem key={slide.title} className="relative h-full pl-0">
              <img
                src={slide.image}
                alt=""
                className="absolute inset-0 size-full object-cover object-center"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="pointer-events-none absolute inset-0 bg-black/50" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-4 px-6 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))] text-left text-white">
        <div className="flex flex-col gap-1">
          <h1 className="text-[clamp(2rem,8.75vw,2.25rem)] leading-10 font-semibold text-balance">
            {current.title}
          </h1>
          <p className="text-base leading-6 text-[#bdbdbd]">
            {current.description}
          </p>
        </div>

        <fieldset className="pointer-events-auto flex items-center gap-1.5">
          <legend className="sr-only">
            {t.slideProgress(currentSlide + 1, slides.length)}
          </legend>
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => api?.scrollTo(index)}
              aria-label={t.goToSlide(index + 1)}
              aria-current={index === currentSlide ? 'true' : undefined}
              className={cn(
                'h-2 rounded-full bg-white/80 transition-[width,opacity] duration-200',
                index === currentSlide ? 'w-10 opacity-100' : 'w-5',
              )}
            />
          ))}
        </fieldset>

        <div className="pointer-events-auto mt-0.5">{actions}</div>
      </div>
    </div>
  );
}
