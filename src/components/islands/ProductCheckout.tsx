import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import ProductPrice from "./ProductPrice";
import { PREORDER } from '../../config/preorder';
export default function ProductCheckout({ productId }: { productId: string }) {
  const [product, setProduct] = useState<any>(null);
  useEffect(() => {
    api("checkout/catalogue")
      .then((c) => {
        if (c.ready)
          setProduct(
            c.products.find((p: any) => p.id === productId && p.available),
          );
      })
      .catch(() => {});
  }, [productId]);
  return product ? (
    <div className="space-y-3">
      <ProductPrice price={product.price_paise / 100} />
      <p className="text-xs">₹50 shipping per order · {PREORDER.deliveryText}</p>
      <a
        className="btn-primary w-full"
        href={"/checkout?product=" + encodeURIComponent(productId)}
      >
        Order this diary
      </a>
      <p className="text-xs">{product.sale_description}</p>
    </div>
  ) : (
    <div className="space-y-3">
      <a className="btn-primary w-full" href={'/checkout?product='+encodeURIComponent(productId)}>Preorder this diary</a>
      <p className="text-xs">₹149 + ₹50 shipping = ₹199 for one diary. {PREORDER.deliveryText}.</p>
    </div>
  );
}
