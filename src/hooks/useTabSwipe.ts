import { useLocation, useNavigate } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';
import { useMotionValue, animate } from 'framer-motion';
import { useUIStore } from '../stores/uiStore';
import { tabs } from '../components/layout/MobileTabBar';

const TAB_ROUTES = tabs.map((t) => t.to);

/**
 * Hook that provides horizontal swipe-to-change-tabs on mobile.
 *
 * Disabled when:
 * - Any modal is fully open (not collapsed)
 * - Current route is not one of the 4 main tabs
 * - On desktop (viewport >= 1024px)
 * - Drag originates from an element with `data-no-swipe` (e.g. DayView timeline)
 */
export function useTabSwipe() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const modalCollapsed = useUIStore((s) => s.modalCollapsed);
  const bookingFormOpen = useUIStore((s) => s.bookingFormOpen);
  const quickBookingOpen = useUIStore((s) => s.quickBookingOpen);
  const searchOpen = useUIStore((s) => s.searchOpen);
  const createClientFormOpen = useUIStore((s) => s.createClientFormOpen);
  const editingClientId = useUIStore((s) => s.editingClientId);
  const selectedBookingId = useUIStore((s) => s.selectedBookingId);

  const anyModalOpen =
    bookingFormOpen ||
    quickBookingOpen ||
    searchOpen ||
    createClientFormOpen ||
    editingClientId !== null ||
    selectedBookingId !== null;

  const currentIndex = TAB_ROUTES.indexOf(pathname);

  const dragX = useMotionValue(0);

  const bindSwipe = useDrag(
    ({ movement: [mx], velocity: [vx], direction: [dx], first, last, cancel, event }) => {
      // Desktop guard
      if (window.innerWidth >= 1024) {
        cancel();
        return;
      }

      // Not on a main tab route
      if (currentIndex === -1) {
        cancel();
        return;
      }

      // Modal fully open blocks swipe
      if (anyModalOpen && !modalCollapsed) {
        cancel();
        return;
      }

      // Check for nested horizontal gesture handlers
      if (first) {
        const target = (event?.target ?? null) as HTMLElement | null;
        if (target?.closest('[data-no-swipe]')) {
          cancel();
          return;
        }
      }

      const canGoLeft = currentIndex > 0; // swipe right to go left in tabs
      const canGoRight = currentIndex < TAB_ROUTES.length - 1; // swipe left to go right

      // During drag: apply translation with rubber-band at edges
      if (mx > 0 && !canGoLeft) {
        dragX.set(mx * 0.15);
      } else if (mx < 0 && !canGoRight) {
        dragX.set(mx * 0.15);
      } else {
        dragX.set(mx);
      }

      if (last) {
        const swipedRight = dx > 0 && (mx > 80 || vx > 0.3) && canGoLeft;
        const swipedLeft = dx < 0 && (mx < -80 || vx > 0.3) && canGoRight;

        if (swipedLeft || swipedRight) {
          const targetIndex = swipedLeft ? currentIndex + 1 : currentIndex - 1;
          navigate(TAB_ROUTES[targetIndex]);
        }

        // Spring back to 0 in all cases
        animate(dragX, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    },
    { axis: 'x', filterTaps: true, threshold: 15, pointer: { touch: true } }
  );

  return { bindSwipe, dragX };
}
