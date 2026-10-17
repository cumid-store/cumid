import React, { useState } from 'react';
import { MessageCircle, Copy, Check } from 'lucide-react';
import { trackEvent } from '../../lib/analytics';
import { SITE } from '../../config/site';

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
  };
  ctaPlacement?: 'hero' | 'featured_grid' | 'product_gallery' | 'product_detail' | 'footer' | 'nav' | 'faq';
  className?: string;
  showFallbackCopy?: boolean;
}

export const WhatsAppPreorderButton: React.FC<Props> = ({
  product,
  ctaPlacement = 'product_detail',
  className = '',
  showFallbackCopy = true,
}) => {
  const [copied, setCopied] = useState(false);

  const canonicalProductUrl = `${SITE.canonicalUrl}/products/${product.slug}`;
  const messageText = `Hi CUMID! I’m interested in the ${product.name} diary, reference ${product.id}. Please share the confirmed price, specifications and next-batch availability. Product: ${canonicalProductUrl}`;
  const whatsappUrl = `${SITE.whatsappBaseUrl}?text=${encodeURIComponent(messageText)}`;

  const handleClick = () => {
    try {
      trackEvent('whatsapp_preorder_click', {
        productId: product.id,
        ctaPlacement,
      });
    } catch (e) {
      // Analytics failure must NEVER prevent WhatsApp from opening
      console.warn('Analytics event error:', e);
    }
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
      // Fallback prompt
      window.prompt('Copy enquiry message:', messageText);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Primary Accessible Link (100% works even if JS is disabled) */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`btn-whatsapp w-full ${className}`}
        aria-label={`Enquire about preorder for ${product.name} on WhatsApp`}
        id={`whatsapp-preorder-${product.id.toLowerCase()}`}
      >
        <MessageCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <span>Enquire about preorder on WhatsApp</span>
      </a>

      {showFallbackCopy && (
        <div className="flex items-center justify-between text-xs text-charcoal-700/70 px-2 pt-1">
          <span>Number: <strong className="font-semibold text-charcoal-800">{SITE.whatsappDisplayNumber}</strong></span>
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
      )}
    </div>
  );
};
export default WhatsAppPreorderButton;
