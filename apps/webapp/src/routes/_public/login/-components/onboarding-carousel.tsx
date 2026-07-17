import { useEffect, useState } from 'react';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '#/components/ui/carousel';
import { cn } from '#/lib/utils';
import { getLoginMessages } from '#/routes/_public/login/-messages';

export function OnboardingCarousel() {
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

  return (
    <Carousel
      className="absolute inset-x-0 top-0 -bottom-6 overflow-hidden [&_[data-slot=carousel-content]]:h-full"
      opts={{ loop: true }}
      setApi={setApi}
    >
      <CarouselContent className="-ml-0 h-full">
        {slides.map((slide) => (
          <CarouselItem key={slide.title} className="h-full pl-0">
            <div className="relative h-full min-h-[280px] w-full overflow-hidden">
              <img
                src={slide.image}
                alt=""
                className="absolute inset-0 size-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-x-0 bottom-11 flex flex-col items-center gap-4 px-5 text-center text-white">
                <div className="flex max-w-[380px] flex-col gap-1">
                  <h2 className="text-2xl leading-8 font-semibold text-balance">
                    {slide.title}
                  </h2>
                  <p className="text-xs leading-4 text-balance text-[#bdbdbd]">
                    {slide.description}
                  </p>
                </div>

                <fieldset className="flex items-center gap-1.5">
                  <legend className="sr-only">{`${currentSlide + 1} de ${slides.length}`}</legend>
                  {slides.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => api?.scrollTo(index)}
                      aria-label={`Ir a la diapositiva ${index + 1}`}
                      aria-current={index === currentSlide ? 'true' : undefined}
                      className={cn(
                        'h-2 rounded-full bg-white/80 transition-[width,opacity] duration-200',
                        index === currentSlide ? 'w-10 opacity-100' : 'w-5',
                      )}
                    />
                  ))}
                </fieldset>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
