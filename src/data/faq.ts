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
    answer: 'CUMID operates in thoughtful, small-batch releases. We do not mass-produce stationery or keep large excess inventory sitting in warehouses. Our initial batch of candidate cover designs is currently sold out or in preview, and we are accepting preorder enquiries on WhatsApp for our next production run.',
  },
  {
    id: 'how-enquiry-works',
    category: 'preorders',
    question: 'How does a preorder enquiry on WhatsApp work?',
    answer: 'Clicking "Enquire about preorder on WhatsApp" opens a pre-composed message directly to our official WhatsApp (+91 7023987458) with the product name, stable reference ID, and page link. Once you send the message, our team will share confirmed pricing, manufacturing specifications, and the estimated timeline for the next batch.',
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
    answer: 'No. For safety and transparency, this website collects zero payments. There are no credit/debit card forms, UPI links, or checkout gateways here. When a batch is ready for confirmed booking, payment instructions will be verified directly via our official WhatsApp channel.',
  },
  {
    id: 'product-format',
    category: 'product',
    question: 'What is the format and binding of CUMID pocket diaries?',
    answer: 'Every CUMID pocket diary is built in a compact, square pocket format with spiral binding along the top edge. The top-edge coil ensures total writing comfort for both left-handed and right-handed writers without hand or wrist obstruction.',
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
    answer: 'CUMID ships across India. Accurate delivery timelines, courier options, and shipping costs will be confirmed when your preorder is finalized on WhatsApp.',
  },
];
