export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'preorders' | 'product' | 'shipping' | 'payments';
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'why-sold-out',
    category: 'preorders',
    question: 'How can I check which diaries are available?',
    answer: 'Our current catalogue designs are open for preorder at ₹149 each, plus ₹50 shipping per order. These are made-to-order diaries, with delivery within 14 days of payment confirmation. Digital mockups are not photographs of ready stock.',
  },
  {
    id: 'how-enquiry-works',
    category: 'preorders',
    question: 'How do I preorder a diary?',
    answer: 'Choose a cover and click Preorder this diary. Select your quantity, enter your name and delivery PIN, review the total and terms, then continue on WhatsApp. Send the prepared message to +91 9201871597. We confirm specifications, serviceability and payment instructions. No account is needed for WhatsApp preorders.',
  },
  {
    id: 'enquiry-commitment',
    category: 'preorders',
    question: 'Does sending an enquiry reserve stock or commit me to buying?',
    answer: 'Sending a WhatsApp request does not create a paid order. Your preorder is confirmed when we verify payment and issue an order reference. Delivery is within 14 days of payment confirmation.',
  },
  {
    id: 'online-payments',
    category: 'payments',
    question: 'Can I pay online through this website?',
    answer: 'Preorders currently continue on WhatsApp, where we confirm your specifications, delivery PIN and payment instructions before you pay. If secure online checkout is enabled, Razorpay handles the payment. Never share a UPI PIN or OTP with CUMID. Opening WhatsApp is not an order confirmation.',
  },
  {
    id: 'product-format',
    category: 'product',
    question: 'What is the format and binding of CUMID pocket diaries?',
    answer: 'The planned format is square and pocket-sized, with spiral binding along the top edge. Final dimensions, paper and page count will be shared before ordering.',
  },
  {
    id: 'design-preview-label',
    category: 'product',
    question: 'What does the "Design preview" badge mean on cover images?',
    answer: 'Cover graphics marked "Design preview" represent digital artwork concepts and layout previews. They showcase our creative direction and cover graphics, but are not intended as photographic proof of final paper texture, binding shade, or print finish. Confirmed material specifications are provided prior to batch production.',
  },
  {
    id: 'whatsapp-requirement',
    category: 'preorders',
    question: 'Do I need a WhatsApp account to browse or save favourites?',
    answer: 'Not at all. You can freely browse the entire catalog, read our journal, and save your favourite covers locally in your browser. WhatsApp is used to send your preorder request and confirm the details with us.',
  },
  {
    id: 'shipping-reach',
    category: 'shipping',
    question: 'How much is shipping, and when will my diary arrive?',
    answer: 'Shipping is ₹50 per order to serviceable PIN codes in India. One ₹149 diary totals ₹199 including shipping; two total ₹348. Delivery is within 14 calendar days of payment confirmation, including manufacturing and shipping. We confirm your PIN code before payment.',
  },
];
