import { m } from '#/paraglide/messages.js';

export function getConverterMessages() {
  return {
    common: {
      back: m['common.back'](),
    },
    title: m['converter.title'](),
    subtitle: m['converter.subtitle'](),
    loading: m['converter.loading'](),
    loadErrorTitle: m['converter.loadErrorTitle'](),
    loadErrorCopy: m['converter.loadErrorCopy'](),
    header: m['converter.header'](),
    conversion: m['converter.conversion'](),
    lastUpdated: (value: string) => m['converter.lastUpdated']({ value }),
    noRecentUpdates: m['converter.noRecentUpdates'](),
    approximate: m['converter.approximate'](),
    amount: m['converter.amount'](),
    from: m['converter.from'](),
    to: m['converter.to'](),
    fromFallback: m['converter.fromFallback'](),
    toFallback: m['converter.toFallback'](),
    result: m['converter.result'](),
    noRateAvailable: m['converter.noRateAvailable'](),
    sameCurrency: m['converter.sameCurrency'](),
    ratePair: (from: string, amount: string) =>
      m['converter.ratePair']({ from, amount }),
    missingRatePair: (from: string, to: string) =>
      m['converter.missingRatePair']({ from, to }),
  };
}
