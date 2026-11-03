import type { DateRange } from 'react-day-picker';
import { Button } from '#/components/ui/button';
import { Calendar } from '#/components/ui/calendar';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';

type Messages = ReturnType<typeof getGroupDetailMessages>;

type CategoryDateDrawersProps = {
  t: Messages;
  timeZone: string;
  selectedDay: Date | undefined;
  isDayDrawerOpen: boolean;
  onDayDrawerOpenChange: (open: boolean) => void;
  onSelectDay: (value: Date | undefined) => void;
  isRangeDrawerOpen: boolean;
  onRangeDrawerOpenChange: (open: boolean) => void;
  draftRange: DateRange | undefined;
  onDraftRangeChange: (value: DateRange | undefined) => void;
  rangeCalendarMonths: number;
  onApplyRange: () => void;
};

export function CategoryDateDrawers({
  t,
  timeZone,
  selectedDay,
  isDayDrawerOpen,
  onDayDrawerOpenChange,
  onSelectDay: applyDayFilter,
  isRangeDrawerOpen,
  onRangeDrawerOpenChange,
  draftRange,
  onDraftRangeChange,
  rangeCalendarMonths,
  onApplyRange: applyRangeFilter,
}: CategoryDateDrawersProps) {
  return (
    <>
      <Drawer open={isDayDrawerOpen} onOpenChange={onDayDrawerOpenChange}>
        <DrawerContent className="gap-4 p-0">
          <DrawerHeader>
            <DrawerTitle>{t.reports.selectDayTitle}</DrawerTitle>
            <DrawerDescription>
              {t.reports.selectDayDescription}
            </DrawerDescription>
          </DrawerHeader>
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={applyDayFilter}
            captionLayout="dropdown"
            timeZone={timeZone}
            className="mx-auto mb-5 rounded-2xl border border-[#e2e8f0]"
          />
        </DrawerContent>
      </Drawer>

      <Drawer open={isRangeDrawerOpen} onOpenChange={onRangeDrawerOpenChange}>
        <DrawerContent className="max-h-[85vh] gap-0 overflow-hidden p-0">
          <DrawerHeader>
            <DrawerTitle>{t.reports.selectRangeTitle}</DrawerTitle>
            <DrawerDescription>
              {t.reports.selectRangeDescription}
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={onDraftRangeChange}
              captionLayout="dropdown"
              numberOfMonths={rangeCalendarMonths}
              timeZone={timeZone}
              className="mx-auto rounded-2xl border border-[#e2e8f0]"
            />
          </div>
          <DrawerFooter className="border-t border-[#e2e8f0] bg-background px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="h-12 w-full rounded-full"
              onClick={applyRangeFilter}
            >
              {t.reports.applyRange}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
