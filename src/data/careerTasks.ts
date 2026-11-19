export const DEFAULT_TASK_ROUND_DEADLINE_TEXT = "15 December 2026, 11:59 PM IST";
export const DEFAULT_TASK_ROUND_DEADLINE_INPUT = "2026-12-15T23:59";
export const DEFAULT_TASK_ROUND_DEADLINE_ISO = "2026-12-15T18:29:00.000Z";
export const GOOGLE_FORM_TASK_SUBMISSION_URL = "https://forms.gle/N5PXNTiNbRtZeH7f7";

export interface CareerTaskDefinition {
  role: string;
  title: string;
  subtitle: string;
  objective: string;
  instructions: string[];
  deliverables: string[];
  submissionTips: string[];
}

export const CAREER_TASKS: Record<string, CareerTaskDefinition> = {
  "Content & social media": {
    role: "Content & social media",
    title: "Brand Engagement Reel (Using AI or Open-Source Content)",
    subtitle: "Create a 15–45s short-form video (Reel / Short) designed to build traction, aesthetic appeal, and community curiosity around CUMID.",
    objective:
      "Craft a scroll-stopping short-form video that resonates with Indian youth, stationery collectors, journaling enthusiasts, and students. It does not have to be a standard product launch reel (though it can feature launch elements); the core focus is driving brand attraction, aesthetic curiosity, or relatable humor around CUMID pocket diaries.",
    instructions: [
      "Medium & Tools: You are encouraged to use AI video/visual generators (Runway, Kling, Midjourney, Luma, Pika), AI voiceover (ElevenLabs), open-source / royalty-free stock clips and music (Pexels, Pixabay, Unsplash), or CapCut / Premiere.",
      "Vibe & Aesthetic: CUMID's identity centers on square pocket diaries with top spiral binding—'Small diaries. A little more you.' Highlight relatable everyday thoughts, aesthetic desk setups, quick doodling, venting, study sessions, or humorous Indian student/work-life realities.",
      "Format & Duration: Vertical 9:16 aspect ratio (1080x1920), 15 to 45 seconds long.",
      "The Hook: Design the first 2-3 seconds to immediately capture attention and stop users from scrolling past.",
      "Caption & Audio: Include a recommended caption with 4-5 relevant hashtags and suggested trending/aesthetic background audio."
    ],
    deliverables: [
      "A public or viewable link to the video (Google Drive / Dropbox link with 'Anyone with the link can view' permission, or an unlisted YouTube / Instagram link).",
      "A short concept note (in the submission notes) sharing the rationale behind the hook, audio choice, and target audience."
    ],
    submissionTips: [
      "No raw video file uploads required—simply paste your Google Drive or video link.",
      "Ensure link sharing access is enabled so the hiring team can review without requesting permission."
    ]
  },

  "Design & illustration": {
    role: "Design & illustration",
    title: "Signature Pocket Diary Cover Art & Mockup",
    subtitle: "Design an original square cover art concept tailored for CUMID's signature top-spiral pocket diary format.",
    objective:
      "Create a compelling front cover artwork that feels personal, collectible, and expressive, fitting into one of CUMID's signature collections (Originals, Floral, Cute, Hinglish/Witty, Cars & Jets) or introducing a fresh, relatable theme.",
    instructions: [
      "Canvas Format: Square 1:1 aspect ratio artwork suitable for print (e.g. 1500x1500px or vector format).",
      "Binding Consideration: Account for the top-spiral wire binding along the top edge (keep essential design elements and typography away from the top punch margin).",
      "Visual Personality: Use vibrant color palettes, thoughtful illustration, typography, or cultural motifs that make someone want to carry this diary in their pocket every day.",
      "Mockup Representation: Provide a simple 2D or 3D mockup showing how the artwork looks applied onto a top-spiral square pocket notebook."
    ],
    deliverables: [
      "A Figma view link, Behance project link, or Google Drive folder link containing the high-res artwork (PNG/PDF) and the notebook mockup presentation."
    ],
    submissionTips: [
      "Ensure Figma or Drive links have 'Anyone with the link can view' permissions.",
      "Share your design inspiration and color palette choices in the submission notes."
    ]
  },

  "Web development": {
    role: "Web development",
    title: "Interactive UI Feature / Micro-Experience",
    subtitle: "Build or prototype an engaging frontend component or interaction for cumid.store.",
    objective:
      "Design and develop a modern, delightful frontend feature that elevates the customer browsing, personalization, or purchasing experience on CUMID's digital storefront.",
    instructions: [
      "Feature Ideas (Choose one or propose your own):",
      "  • Interactive 3D/CSS Diary Cover Previewer: Rotate, flip, or preview pocket diaries dynamically.",
      "  • Mood-Based Cover Matcher: A mini interactive quiz recommending the best diary design based on user mood.",
      "  • Interactive Journaling / Doodle Canvas: A scratchpad allowing visitors to test drawing or jotting a thought.",
      "  • Dynamic Cart & Micro-Interaction Polish: Smooth page transitions, animated favourite hearts, or toast notifications.",
      "Tech Stack: React / TypeScript / Tailwind CSS / Astro / Canvas. Must be responsive across mobile and desktop.",
      "Code Quality: Clean code structure, semantic HTML, and attention to micro-animations and accessibility."
    ],
    deliverables: [
      "GitHub repository link containing the source code.",
      "Live deployment preview link (Vercel, Netlify, Cloudflare Pages, or CodeSandbox) or a Loom video walkthrough."
    ],
    submissionTips: [
      "Provide clear instructions in your repo README or submission notes on how to test the feature."
    ]
  },

  "Marketing & sales": {
    role: "Marketing & sales",
    title: "Organic Growth & Preorder Traction Strategy",
    subtitle: "Develop an actionable, low-budget growth plan to drive preorder volume and campus traction.",
    objective:
      "Craft a strategic marketing campaign to generate 500+ organic preorders for CUMID pocket diaries across college campuses, creative youth communities, and stationery lovers in India.",
    instructions: [
      "Audience Segmentation: Identify high-intent customer segments (e.g. engineering/design college students, aesthetic desk creators, bullet journalers).",
      "Campaign Concept: Outline a low-budget viral campaign, campus ambassador program, or collaborative challenge (e.g. #CarryYourThoughts, #100DaysOfDoodling).",
      "Channel Strategy: Map out specific initiatives for Instagram, WhatsApp broadcast communities, college fest partnerships, and micro-influencer gifting.",
      "Execution Plan: Provide a 14-day launch roadmap, estimated customer acquisition cost (CAC), and organic conversion tactics."
    ],
    deliverables: [
      "A Google Docs, Google Slides, or Notion link (viewable) detailing your growth strategy and 14-day execution timeline."
    ],
    submissionTips: [
      "Focus on practical, authentic execution rather than high-cost paid ads.",
      "Make sure link permissions are set to 'Anyone with the link can view'."
    ]
  }
};
