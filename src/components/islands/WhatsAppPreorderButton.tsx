import React, { useState } from 'react';
import { MessageCircle, Copy, Check, Mail, Plus, Minus } from 'lucide-react';
import { trackEvent } from '../../lib/analytics';
import { logPreorderEnquiry } from '../../lib/enquiries';
import { SITE } from '../../config/site';
import { preorderMessage } from '../../config/preorder';

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
  };
  ctaPlacement?: 'hero' | 'featured_grid' | 'product_gallery' | 'product_detail' | 'footer' | 'nav' | 'faq';
  className?: string;
  showFallbackCopy?: boolean;
  showQuantity?: boolean;
}

export const WhatsAppPreorderButton: React.FC<Props> = ({
  product,
  ctaPlacement = 'product_detail',
  className = '',
  showFallbackCopy = true,
  showQuantity = true,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quantityText = quantity === 1 ? '1 diary' : `${quantity} diaries`;
  const messageText = preorderMessage(product, quantity);
  const whatsappUrl = `${SITE.whatsappBaseUrl}?text=${encodeURIComponent(messageText)}`;

  const handleClick = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 2000);

    // Track analytics event (failure must NEVER prevent WhatsApp navigation)
    try {
      trackEvent('whatsapp_preorder_click', {
        productId: product.id,
        ctaPlacement,
        quantity,
      });
    } catch (e) {
      console.warn('Analytics event error:', e);
    }

    // Silently log preorder enquiry in database/store system
    try {
      void logPreorderEnquiry({
        productId: product.id,
        productName: product.name,
        quantity,
        notes: `Enquiry generated from ${ctaPlacement} with quantity ${quantity}`,
      });
    } catch {}
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(
        `WhatsApp: ${SITE.whatsappDisplayNumber}\n\nMessage:\n${messageText}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      window.prompt('Copy enquiry message:', messageText);
    }
  };

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText('support@cumid.store');
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 3000);
    } catch {
      window.prompt('Copy support email:', 'support@cumid.store');
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Optional Quantity Selector */}
      {showQuantity && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-ivory-100 border border-charcoal-800/10">
          <span className="text-xs font-semibold text-charcoal-900">Quantity:</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-lg bg-ivory-200 border border-charcoal-800/10 text-charcoal-800 flex items-center justify-center hover:bg-ivory-300 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-600 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-bold text-charcoal-900" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              disabled={quantity >= 10}
              className="w-8 h-8 rounded-lg bg-ivory-200 border border-charcoal-800/10 text-charcoal-800 flex items-center justify-center hover:bg-ivory-300 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-600 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Accessible WhatsApp Preorder Link */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`btn-whatsapp w-full ${className}`}
        aria-label={`Enquire about preorder for ${quantityText} of ${product.name} on WhatsApp`}
        id={`whatsapp-preorder-${product.id.toLowerCase()}`}
      >
        <MessageCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span>{showQuantity ? 'Preorder on WhatsApp' : 'Questions? Chat on WhatsApp'}</span>
      </a>

      {showFallbackCopy && (
        <div className="space-y-1.5 px-2 pt-1 text-xs text-charcoal-700/70">
          <div className="flex items-center justify-between">
            <span>WhatsApp: <strong className="font-semibold text-charcoal-800">{SITE.whatsappDisplayNumber}</strong></span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 hover:text-charcoal-900 focus-visible:outline-none focus-visible:underline"
              title="Copy pre-composed message"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-700" />
                  <span className="text-green-700 font-medium">Copied message!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy message text</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-charcoal-800/5">
            <a
              href="mailto:support@cumid.store?subject=CUMID%20Preorder%20Enquiry%20-%20"
              className="inline-flex items-center gap-1 hover:text-charcoal-900 underline underline-offset-2"
              title="Send email to support@cumid.store"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Or email support@cumid.store</span>
            </a>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1 hover:text-charcoal-900"
              title="Copy email address"
            >
              {copiedEmail ? (
                <span className="text-green-700 font-medium">Copied email!</span>
              ) : (
                <span>Copy email</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppPreorderButton;
