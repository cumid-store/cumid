import { DIARY_PRICING } from "../../config/pricing";
export default function ProductPrice({
  price = DIARY_PRICING.saleRupees,
  mrp = DIARY_PRICING.mrpRupees,
}: {
  price?: number;
  mrp?: number;
}) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <strong
        className="text-charcoal-900"
        aria-label={`Selling price ${price} rupees`}
      >
        ₹{price}
      </strong>
      <span className="text-charcoal-600 text-xs">
        MRP <del>₹{mrp}</del>
      </span>
      {mrp > price && (
        <span className="text-sage-800 text-xs">
          Save ₹{Number((mrp - price).toFixed(2))}
        </span>
      )}
    </span>
  );
}
