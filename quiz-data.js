// Config file for data, adjust accordingly

const QUESTIONS_PER_QUIZ = 10;

// The answer options. Every item uses these unless it has its own "choices".
const CHOICES = ["Top Left", "Top Right", "Bottom Left", "Bottom Right"];

// One entry per image.
//   img      = path to the picture (put pictures in an "images" folder)
//   category = the skill the image tests (used for the advice at the end)
//   answer   = the correct choice (must match a choice exactly)
const ITEMS = [
  { img: "resources/1.png", category: "skin_texture",       answer: "Bottom Right" },
  { img: "resources/2.png", category: "skin_texture",       answer: "Top Left" },
  { img: "resources/3.png", category: "natural_details",    answer: "Top Right" },
  { img: "resources/4.png", category: "facial_proportions", answer: "Top Left" },
  { img: "resources/5.png", category: "skin_texture",       answer: "Top Right" },
  { img: "resources/6.png", category: "eyes_teeth",         answer: "Top Right" },
  { img: "resources/7.png", category: "facial_proportions", answer: "Top Left" },
  { img: "resources/8.png", category: "skin_texture",       answer: "Bottom Right" },
  { img: "resources/9.png", category: "eyes_teeth",         answer: "Bottom Left" },
  { img: "resources/10.png", category: "eyes_skin",          answer: "Bottom Right" },
  { img: "resources/11.png", category: "lighting",           answer: "Bottom Left" },
  { img: "resources/12.png", category: "eyes_skin",          answer: "Top Right" },
  { img: "resources/13.png", category: "eyes_teeth",         answer: "Top Right" },
  { img: "resources/14.png", category: "eyes_skin",          answer: "Top Left" },
  { img: "resources/15.png", category: "skin_hair",          answer: "Bottom Right" },
  { img: "resources/16.png", category: "hair_details",       answer: "Top Right" },
  { img: "resources/17.png", category: "skin_teeth_hair",    answer: "Bottom Left" },
  { img: "resources/18.png", category: "glasses_teeth",      answer: "Top Right" },
  { img: "resources/19.png", category: "glasses_skin",       answer: "Bottom Right" },
  { img: "resources/20.png", category: "facial_details",     answer: "Top Right" }
];

// Advice per category. Shown when the person misses half or more of that category.
const CATEGORIES = {
  skin_texture:       { label: "Skin texture", advice: "Look for overly smooth, waxy, evenly colored skin or a lack of natural pores and imperfections." },
  natural_details:    { label: "Natural details", advice: "Real images often retain uneven texture, realistic reflections, individual strands of hair, and natural interactions." },
  facial_proportions: { label: "Facial proportions", advice: "Check whether features are naturally positioned and proportioned. Perfect symmetry or unusually balanced details can be a warning sign." },
  eyes_teeth:         { label: "Eyes and teeth", advice: "Check reflections in the eyes, teeth alignment, tooth shape, and whether the teeth blend unnaturally into the lips." },
  eyes_skin:          { label: "Eyes and skin", advice: "Look for missing eye reflections, overly soft skin, no visible pores or wrinkles, and unnatural-looking facial details." },
  lighting:           { label: "Lighting and shadows", advice: "Compare the lighting across the face. AI images may use overly even lighting or lack natural shadows and reflections." },
  skin_hair:          { label: "Skin and hair", advice: "Look for smooth or artificial-looking skin and hair strands that appear blurred, crowded or blended together." },
  hair_details:       { label: "Hair details", advice: "Zoom in on individual strands and curls. Blended, crowded or unusually shaped hair can indicate an artificial image." },
  skin_teeth_hair:    { label: "Skin, teeth and hair", advice: "Check the combined clues: overly smooth skin, distorted or uneven teeth, and unusual or artificial-looking hair texture." },
  glasses_teeth:      { label: "Glasses and teeth", advice: "Inspect reflections through glasses for distortion and look at the teeth for unevenness or an unnatural, glitched appearance." },
  glasses_skin:       { label: "Glasses and skin", advice: "Check eyeglass reflections for distortion and compare the skin around the face for overly smooth or missing natural texture." },
  facial_details:     { label: "Facial details", advice: "Look for polished skin, missing natural texture, distorted teeth and a smile that looks mechanically assembled or unnaturally glitched." }
};

const GENERAL_ADVICE = {
  first:  { advice: "Look for unnatural or overly smooth skin texture, but remember that real photos can also have makeup or retouching." },
  second: { advice: "Check the eyes and teeth for unusual reflections, shapes, alignment or details that merge together." },
  third:  { advice: "Inspect facial proportions, hair strands, lighting and shadows for patterns that appear too perfect or slightly distorted." },
  fourth: { advice: "Real photos show natural imperfections. If the image looks too smooth, too perfect or difficult to explain, verify the source before trusting or sharing it." }
};