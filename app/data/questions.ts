export type Category = "Chaos" | "Absurd" | "Spicy" | "Mindfuck" | "Social";

export type Question = {
  id: string;
  category: Category;
  a: string;
  b: string;
};

export const categories: Category[] = ["Chaos", "Absurd", "Spicy", "Mindfuck", "Social"];

export const questions: Question[] = [
  { id: "q1", category: "Chaos", a: "Always have a wet sock", b: "Always feel like you forgot something" },
  { id: "q2", category: "Social", a: "Send the wrong screenshot to the person you screenshotted", b: "Accidentally like your ex’s photo from 2016" },
  { id: "q3", category: "Absurd", a: "Laugh at the wrong moment at a funeral", b: "Call your teacher 'mom' in a meeting" },
  { id: "q4", category: "Mindfuck", a: "Every message autocorrects into nonsense", b: "You can only text using voice dictation in public" },
  { id: "q5", category: "Absurd", a: "Always sneeze right when it gets quiet", b: "Always laugh 1 second too late" },
  { id: "q6", category: "Social", a: "Accidentally reply-all with 'lol'", b: "Accidentally like your boss’s old photo" },
  { id: "q7", category: "Chaos", a: "A constant itch you can’t reach", b: "A random loud hiccup once an hour" },
  { id: "q8", category: "Spicy", a: "Say what you think for 24 hours", b: "Only communicate using sarcasm for a week" },
  { id: "q9", category: "Mindfuck", a: "Always think you forgot to lock the door", b: "Always think you left the stove on" },
  { id: "q10", category: "Spicy", a: "Your thoughts appear as subtitles above your head", b: "Your search history auto-shares once a week" },
];
