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
    question: 'Why are all pocket diaries marked as sold out?',
    answer: 'No ready stock is available. These are proposed cover designs for our first batch. You can enquire on WhatsApp about confirmed specifications, pricing and future availability. A sold-out label here does not imply that a previous batch has already sold.',
  },
  {
    id: 'how-enquiry-works',
    category: 'preorders',
    question: 'How does a preorder enquiry on WhatsApp work?',
    answer: 'Clicking "Enquire about preorder on WhatsApp" opens a pre-composed message directly to our official WhatsApp (+91 9201871597) with the product name, stable reference ID, and page link. Once you send the message, our team will share confirmed pricing, manufacturing specifications, and the estimated timeline for the next batch.',
  },
  {
    id: 'enquiry-commitment',
    category: 'preorders',
    question: 'Does sending an enquiry reserve stock or commit me to buying?',
    answer: 'No. Sending an enquiry does not reserve stock, does not create an order, and does not obligate you to purchase. It is simply a direct conversation with us so you can review verified specifications and availability before making any decision.',
  },
  {
    id: 'online-payments',
    category: 'payments',
    question: 'Can I pay online through this website?',
    answer: 'No. This website does not collect payments. There are no credit/debit card forms, UPI links, or checkout gateways here. When a batch is ready for confirmed booking, payment instructions will be verified directly via our official WhatsApp channel.',
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
    answer: 'Not at all. You can freely browse the entire catalog, read our journal, and save your favourite covers locally in your browser. WhatsApp is only used when you wish to get in touch to enquire about the next batch.',
  },
  {
    id: 'shipping-reach',
    category: 'shipping',
    question: 'Where will CUMID pocket diaries be shipped once batches open?',
    answer: 'We plan to serve customers in India. Share your delivery PIN code on WhatsApp so we can confirm serviceability, courier options and shipping costs before an order.',
  },
];
