import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    // const storagedCart = Buscar dados do localStorage
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      const [product] = cart.filter((item) => item.id === productId);

      if (product) {
        updateProductAmount({ productId, amount: product.amount + 1 })
      } else {
        let response = await api.get(`/products/${productId}`);
        const productToAdd = response.data;

        response = await api.get(`/stock/${productId}`);
        const amountInStock = response.data.amount;

        if (amountInStock < 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        productToAdd.amount = 1
        const newProducts = [...cart, productToAdd];
        await setCart(newProducts);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newProducts));
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);

      if (productIndex === -1) {
        toast.error('Erro na remoção do produto');
        return;
      }

      if (cart.length) {
        const newCart = cart.filter(product => product.id !== productId)
        setCart(newCart)

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else
        toast.error('Erro na remoção do produto');

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const response = await api.get(`stock/${productId}`)

      const amountInStock = response.data.amount;

      // const [productToEdit] = cart.filter(product => product.id === productId);
      // const newAmount = productToEdit.amount + amount;

      if (amount > amountInStock || amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productsToUpdate = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      })

      setCart(productsToUpdate);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsToUpdate));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
