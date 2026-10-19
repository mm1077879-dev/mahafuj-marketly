import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '../../types';

interface WishlistState {
  productIds: string[];
}

interface WishlistSelectorState {
  wishlist: WishlistState;
  products: { products: Product[] };
}

export const getProductIdentifiers = (product: Pick<Product, 'id' | 'legacyId'>): string[] =>
  [...new Set([product.id, product.legacyId].filter((id): id is string => Boolean(id)))];

export const isProductWishlisted = (
  wishlistIds: string[],
  product: Pick<Product, 'id' | 'legacyId'>
): boolean => getProductIdentifiers(product).some((id) => wishlistIds.includes(id));

const loadWishlist = (): string[] => {
  try {
    const saved = localStorage.getItem('marketly_wishlist');
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const productIds = [
          ...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)),
        ];
        if (JSON.stringify(productIds) !== JSON.stringify(parsed)) {
          try {
            localStorage.setItem('marketly_wishlist', JSON.stringify(productIds));
          } catch (e) {
            console.error('Failed to normalize wishlist storage', e);
          }
        }
        return productIds;
      }
    }
  } catch (e) {
    console.error('Failed to load wishlist', e);
  }
  return [];
};

const initialState: WishlistState = {
  productIds: loadWishlist(),
};

export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    toggleWishlist: (state, action: PayloadAction<{ id: string; identifiers?: string[] }>) => {
      const { id } = action.payload;
      const identifiers = new Set([id, ...(action.payload.identifiers || [])]);
      if ([...identifiers].some((identifier) => state.productIds.includes(identifier))) {
        state.productIds = state.productIds.filter((pId) => !identifiers.has(pId));
      } else {
        state.productIds.push(id);
      }
      state.productIds = [...new Set(state.productIds)];
      try {
        localStorage.setItem('marketly_wishlist', JSON.stringify(state.productIds));
      } catch (e) {
        console.error('Failed to save wishlist', e);
      }
    },
    removeFromWishlist: (state, action: PayloadAction<string>) => {
      state.productIds = state.productIds.filter((pId) => pId !== action.payload);
      try {
        localStorage.setItem('marketly_wishlist', JSON.stringify(state.productIds));
      } catch (e) {
        console.error('Failed to save wishlist', e);
      }
    },
  },
});

export const { toggleWishlist, removeFromWishlist } = wishlistSlice.actions;
export const selectWishlistIds = (state: WishlistSelectorState) => state.wishlist.productIds;
export const selectWishlistCount = (state: WishlistSelectorState) => {
  const savedIds = new Set(state.wishlist.productIds);
  const validProductIds = new Set<string>();
  for (const product of state.products.products) {
    if (isProductWishlisted([...savedIds], product)) validProductIds.add(product.id);
  }
  return validProductIds.size;
};

export default wishlistSlice.reducer;
