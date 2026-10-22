import { useEffect, useState } from 'react';
import { PRODUCTS } from '../../data/products';
import { SITE } from '../../config/site';
import { DIARY_PRICING } from '../../config/pricing';
import { PREORDER, preorderTotal, preorderMessage } from '../../config/preorder';
import { CONSENT_TEXT, TERMS_VERSION } from '../../config/commerce';

export default function PreorderForm() {
  const available = PRODUCTS.filter(p => !p.isSoldOut);
  const [productId, setProductId] = useState(available[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [pincode, setPincode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const selected = new URLSearchParams(location.search).get('product');
    if (available.some(p => p.id === selected)) setProductId(selected!);
  }, []);
  const product = available.find(p => p.id === productId);
  const draft = product ? `${preorderMessage(product, quantity)}\nName: ${name.trim()}\nDelivery PIN: ${pincode}\n${CONSENT_TEXT}\nAccepted terms: ${TERMS_VERSION}. Typed name: ${name.trim()}` : '';
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || !accepted || !name.trim()) { setMessage('Enter your full name and accept the terms to continue.'); return; }
    // Navigate only: no personal details are saved locally or logged to analytics.
    location.assign(`${SITE.whatsappBaseUrl}?text=${encodeURIComponent(draft)}`);
  }
  if (!product) return <p>Preorders are currently closed. Contact <a href={SITE.whatsappBaseUrl}>CUMID on WhatsApp</a>.</p>;
  return <div>
    <p className="small">No account needed. Choose your cover, review the total and send your request on WhatsApp.</p>
    <form onSubmit={submit}>
      <label>Choose your cover<select value={productId} onChange={e => setProductId(e.target.value)} required>{available.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{DIARY_PRICING.saleRupees}</option>)}</select></label>
      <div className="form-grid">
        <img src={product.images[0].src} alt={`${product.name} cover design preview`} width={240} height={240} className="preorder-cover" />
        <div><p><strong>{product.name}</strong></p><p>Square pocket diary · Top spiral</p><p className="small">Digital cover preview. Final paper, page count and dimensions are confirmed with you before payment.</p>
          <label>Quantity<select value={quantity} onChange={e => setQuantity(Number(e.target.value))}>{Array.from({length:10},(_,i)=>i+1).map(q=><option key={q} value={q}>{q}</option>)}</select></label></div>
      </div>
      <div className="notice" aria-live="polite">
        <p>Diaries: ₹{DIARY_PRICING.saleRupees} × {quantity} = ₹{DIARY_PRICING.saleRupees * quantity}</p>
        <p>Shipping: ₹{PREORDER.shippingRupees} per order</p>
        <p className="text-xl"><strong>Total: ₹{preorderTotal(quantity)}</strong></p>
        <p>{PREORDER.deliveryText}. Manufacturing and shipping are included in this timeline.</p>
      </div>
      <div className="form-grid">
        <label>Your full name<input name="name" autoComplete="name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)} /></label>
        <label>Delivery PIN code<input name="pincode" autoComplete="postal-code" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={pincode} onChange={e=>setPincode(e.target.value)} /></label>
      </div>
      <p className="small">We’ll confirm PIN-code serviceability and collect your full delivery address in WhatsApp before payment.</p>
      <label className="check"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)} /><span>{CONSENT_TEXT} <a href="/terms" target="_blank" rel="noreferrer">Terms</a> · <a href="/shipping" target="_blank" rel="noreferrer">Shipping</a> · <a href="/returns-cancellations" target="_blank" rel="noreferrer">Returns</a> · <a href="/privacy" target="_blank" rel="noreferrer">Privacy</a></span></label>
      <button className="btn-primary" type="submit">Continue on WhatsApp · ₹{preorderTotal(quantity)}</button>
      <p className="small">Send the prepared message in WhatsApp to reach us. Opening WhatsApp does not place or confirm an order. We confirm your specifications, payment and order reference before the 14-day delivery window begins.</p>
      <button type="button" className="underline text-sm" disabled={!accepted || !name.trim() || !/^[1-9][0-9]{5}$/.test(pincode)} onClick={async()=>{try{await navigator.clipboard.writeText(draft);setMessage('Message copied. Send it to '+SITE.whatsappDisplayNumber);}catch{setMessage('Please contact '+SITE.whatsappDisplayNumber+' or '+SITE.supportEmail+' to preorder.');}}}>Copy preorder message instead</button>
      {message && <p role="status">{message}</p>}
    </form>
    <p className="small">Questions? <a href={SITE.whatsappBaseUrl}>{SITE.whatsappDisplayNumber}</a> · <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></p>
  </div>;
}
