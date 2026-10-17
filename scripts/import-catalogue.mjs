import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
const generated = 'C:/Users/M S I/.codex/generated_images/01a14671-cf73-7dd1-b8b9-a65de905ca24/';
const old = 'C:/Users/M S I/Documents/New project/outputs/';
// Original approved artwork, retained without compositional edits. Web derivatives only.
const rows = [
 ['CUMID-FL-001','lavender-bloom','Lavender Bloom','floral','Purple flowers, a crescent moon and a lavender sky.','For your late-night notes.',old+'floral-cover/purple-floral-cover.png'],
 ['CUMID-HG-001','kal-se-productive','Kal Se Productive','hinglish','A blue clock cover with a familiar promise: “Kal se productive. Pakka.”','Tomorrow looks productive.','exec-5b353b15-4293-4fc3-9661-40608b76a483.png','03-kal-se.png'],
 ['CUMID-CT-001','low-battery','Low Battery','cute','Peach artwork and a tired battery. “Plans bade. Battery low.”','Big plans. Very little charge.','exec-d49eb628-6a7a-4e14-aebb-69027ce59d25.png','04-plans-battery.png'],
 ['CUMID-CT-002','complicated-thoughts','Complicated Thoughts','cute','A yellow cat cover that reads “Cute cover. Complicated thoughts.”','A place for the overthinking.','exec-45cd9ca7-fa91-4cfc-bf48-2caf8f749c3d.png','01-cute-complicated.png'],
 ['CUMID-CJ-001','grounded-temporarily','Grounded, Temporarily','cars-and-jets','An aircraft against an icy blue background. “Grounded. Temporarily.”','For the next takeoff.','exec-b0beb815-e837-494b-b47f-71f1aea1d3af.png','06-jet-grounded.png'],
 ['CUMID-CJ-002','plans-in-overdrive','Plans in Overdrive','cars-and-jets','An orange sports car on a green cover, with racing-inspired lettering.','Ideas in the fast lane.','exec-61ef87b7-05ad-455f-9a08-d5b5ff7a26e9.png','05-car-overdrive.png'],
 ['CUMID-CT-003','soft-looks-strong-opinions','Soft Looks, Strong Opinions','cute','A lavender bunny cover with the words “Soft looks. Strong opinions.”','Sweet cover. Clear opinions.','exec-3f1d2be9-0b84-4aba-8031-e3568b7c3cf1.png','02-soft-strong.png'],
 ['CUMID-CJ-003','afterburner','Afterburner','cars-and-jets','Jet-themed artwork from the aviation cover series.','A notebook for flight plans.','exec-d3e28fda-b0e0-4bfa-b5c2-bf34a83552ba.png'],
 ['CUMID-OR-001','desi-by-default','Desi by Default','originals','Chai, cricket, a kite and an auto-rickshaw surround bold orange lettering.','Everyday India, on your cover.','exec-a7190bb3-d797-4483-b571-08081b5b7cdb.png'],
 ['CUMID-OR-002','built-for-grit','Built for Grit','originals','Army-inspired cover artwork from the original catalogue.','For plans that take persistence.','exec-a0716a84-9ed4-45b5-beba-17ace38e8472.png'],
 ['CUMID-CT-004','boo-whatever','Boo. Whatever.','cute','A ghost-themed cover with a dry sense of humour.','A little spooky. Mostly unbothered.','exec-461b70e0-5af7-481a-a539-d5034df65d9c.png'],
 ['CUMID-OR-003','too-many-tabs','Too Many Tabs','originals','Doodle artwork for a brain with too many tabs open.','Write one thought down. Then the next.','exec-dae51e38-c0c2-4405-9913-66e26f38b947.png'],
 ['CUMID-OR-004','hero-in-progress','Hero in Progress','originals','A comic-style heroine, cosmic skies and an illustrated Indian city.','Still figuring out the superpowers.','exec-410c1353-2fa9-4310-b6bc-c6a5f481d2a1.png'],
];
const names = {floral:'Floral',cute:'Cute',hinglish:'Hinglish','cars-and-jets':'Cars & Jets',originals:'Originals'};
const products = [];
const minimalOptions = {
 'complicated-thoughts':'exec-b0960d89-5eca-41d0-be1d-ff462a458dd8.png',
 'soft-looks-strong-opinions':'exec-84746ed7-7d3c-41ce-9dcd-fa5446b52eee.png',
 'kal-se-productive':'exec-fa34e9b3-2bce-4906-9d8c-4bf01b2d2ae8.png',
 'low-battery':'exec-7ea865b6-9905-45cb-ac6e-628a4fe07438.png',
};
for (const [id,slug,name,collection,description,tagline,file,mockup] of rows) {
 const source = file.startsWith('C:') ? file : generated+file;
 const dir = `public/products/${slug}`;
 await mkdir(dir,{recursive:true});
 await sharp(source).resize({width:1200,withoutEnlargement:true}).webp({quality:88}).toFile(`${dir}/cover.webp`);
 await sharp(source).resize({width:600,withoutEnlargement:true}).webp({quality:82}).toFile(`${dir}/thumbnail.webp`);
 const images = [{src:`/products/${slug}/cover.webp`,alt:`${name} cover artwork. ${description}`,isPrimary:true}];
 if(mockup) {
  await sharp(old+'diary-cover-mockups/'+mockup).resize({width:1200,withoutEnlargement:true}).webp({quality:85}).toFile(`${dir}/mockup.webp`);
  images.push({src:`/products/${slug}/mockup.webp`,alt:`Concept mockup of ${name}, a square diary with top spiral binding`,isPrimary:false});
 }
 if(minimalOptions[slug]) {
  await sharp(generated+minimalOptions[slug]).resize({width:1200,withoutEnlargement:true}).webp({quality:88}).toFile(`${dir}/minimal.webp`);
  images.push({src:`/products/${slug}/minimal.webp`,alt:`Minimal cover option for ${name}; alternate artwork concept`,isPrimary:false});
 }
 products.push({id,slug,name,tagline,shortDescription:description,longDescription:description+' Planned as a square pocket diary with spiral binding along the top. Images show the cover concept; final materials and dimensions will be confirmed before ordering.',collection,collectionName:names[collection],images,isDesignPreview:true,confirmedSpecs:{format:'Square pocket diary',binding:'Spiral binding along top edge',orientation:'Top-flip notebook format'},price:null,currency:'INR',isSoldOut:true,availabilityStatus:'SoldOut',whatsappEnquiryEnabled:true,seoTitle:`${name} Pocket Diary | CUMID`,seoDescription:`${description} Square top-spiral pocket diary by CUMID. Sold out; ask about the next batch on WhatsApp.`,lastMeaningfulUpdate:'2026-10-17',personalityNote:tagline});
}
await writeFile('src/data/products.ts',`import type { Product } from '../types/product';\n\nexport const PRODUCTS: Product[] = ${JSON.stringify(products,null,2)};\n\nexport function getProductBySlug(slug: string) { return PRODUCTS.find(p => p.slug === slug); }\nexport function getProductsByCollection(slug: string) { return PRODUCTS.filter(p => p.collection === slug); }\nexport function getFeaturedProducts() { return ['lavender-bloom','soft-looks-strong-opinions','plans-in-overdrive','kal-se-productive','boo-whatever','desi-by-default'].map(slug => getProductBySlug(slug)!); }\n`);
await writeFile('docs/CATALOGUE_SOURCES.json',JSON.stringify(rows.map(r=>({id:r[0],slug:r[1],source:r[6].startsWith('C:')?r[6]:generated+r[6],mockup:r[7]?old+'diary-cover-mockups/'+r[7]:null})),null,2));
console.log(`Imported ${products.length} original cover concepts.`);
