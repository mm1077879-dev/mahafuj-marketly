import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TopAnnouncementBar } from './TopAnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomMobileNav } from './BottomMobileNav';
import { MobileDrawer } from './MobileDrawer';
import { CartDrawer } from '../cart/CartDrawer';
import { CartFlyAnimation } from '../common/CartFlyAnimation';
import { GlobalLoadingOverlay } from '../common/GlobalLoadingOverlay';
import { Dialog } from '../common/Dialog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { api } from '../../services/api';
import { setCatalogLoadError, setProducts } from '../../store/slices/productSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { closeConfirmation, selectConfirmationDialog } from '../../store/slices/uiSlice';

export const Layout: React.FC = () => {
  const dispatch = useAppDispatch();
  const confirmation = useAppSelector(selectConfirmationDialog);

  useEffect(() => {
    let active = true;
    api.getProducts()
      .then((products) => {
        if (active) dispatch(setProducts(products));
      })
      .catch((error: unknown) => {
        if (!active) return;
        dispatch(setCatalogLoadError());
        dispatch(addNotification({
          type: 'error',
          title: 'Catalog Unavailable',
          message: error instanceof Error ? error.message : 'Could not load the product catalog.',
          duration: 4000,
        }));
      });

    return () => {
      active = false;
    };
  }, [dispatch]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Banner */}
      <TopAnnouncementBar />

      {/* Main Top Header */}
      <Header />

      {/* Page Body */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Sticky Navigation */}
      <BottomMobileNav />

      {/* Overlays & Drawers */}
      <GlobalLoadingOverlay />
      <MobileDrawer />
      <CartDrawer />
      <CartFlyAnimation />

      {/* Reusable Confirmation Dialog */}
      {confirmation && (
        <Dialog
          isOpen={confirmation.isOpen}
          onClose={() => dispatch(closeConfirmation())}
          title={confirmation.title}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{confirmation.message}</p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => dispatch(closeConfirmation())}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {confirmation.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  dispatch(closeConfirmation());
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
              >
                {confirmation.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
