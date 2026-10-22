import { useEffect, useState } from "react";
import { api } from "../../lib/api";
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
      <p>
        {new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(product.price_paise / 100)}{" "}
        · Shipping shown at checkout
      </p>
      <a
        className="btn-primary w-full"
        href={"/checkout?product=" + encodeURIComponent(productId)}
      >
        Order this diary
      </a>
      <p className="text-xs">{product.sale_description}</p>
    </div>
  ) : (
    <p className="text-sm">
      Online orders are not open for this cover yet. Enquire about the next
      batch below.
    </p>
  );
}
