import type { Homepage } from './homepage-schema';

/** Refresh template copy without replacing content customized in the editor. */
export function landingHomepage(saved: Homepage): Homepage {
  const data = structuredClone(saved);
  const journalOrder = [
    'hero',
    'writeups',
    'tools',
    'about',
    'highlights',
    'experience',
    'contact',
  ];
  const previousLandingOrder = [
    'hero',
    'tools',
    'about',
    'highlights',
    'experience',
    'writeups',
    'contact',
  ];
  const previousHighlightsOrder = [
    'hero',
    'highlights',
    'tools',
    'about',
    'experience',
    'writeups',
    'contact',
  ];
  if (
    [journalOrder, previousLandingOrder, previousHighlightsOrder].some(
      (order) => JSON.stringify(data.order) === JSON.stringify(order),
    )
  ) {
    data.order = ['hero', 'highlights', 'experience', 'tools', 'about', 'writeups', 'contact'];
  }
  const replace = <T extends object, K extends keyof T>(
    target: T,
    key: K,
    before: T[K],
    after: T[K],
  ) => {
    if (target[key] === before) target[key] = after;
  };
  replace(data.hero, 'eyebrow', 'A PERSONAL LEARNING JOURNAL', 'ETHICAL HACKER. BUILDER. CREATOR.');
  replace(data.hero, 'heading', 'Learning in public.', 'Breaking things.');
  replace(data.hero, 'accentHeading', 'One note at a time.', 'Building trust.');
  replace(
    data.hero,
    'description',
    'I document what I learn about **security, software, and the systems behind them**. Practical notes, experiments, and lessons from building and breaking things.',
    'I’m **Aathil Ducky** — a security engineer and content creator. I find the gaps, build useful things, and share what I learn. Making the internet a little safer, one discovery at a time.',
  );
  replace(data.writeups, 'eyebrow', '01 / THE LEARNING LOG', '04 / FROM THE FIELD');
  replace(data.writeups, 'eyebrow', '01 / FROM THE FIELD', '04 / FROM THE FIELD');
  replace(
    data.writeups,
    'heading',
    'Fresh from the notebook.',
    'Explore. Understand.\nStay curious.',
  );
  replace(
    data.writeups,
    'heading',
    'Explore. Understand. Stay curious.',
    'Explore. Understand.\nStay curious.',
  );
  replace(
    data.writeups,
    'description',
    'Things I’ve explored, problems I’ve worked through, and ideas worth keeping.',
    'Security deep dives, practical experiments, and lessons worth passing on.',
  );
  replace(data.tools, 'eyebrow', '02 / BUILT ALONG THE WAY', '02 / THE WORKBENCH');
  replace(data.tools, 'eyebrow', '01 / THE WORKBENCH', '02 / THE WORKBENCH');
  replace(data.tools, 'heading', 'From learning to making.', 'Less friction.\nMore finding.');
  replace(data.tools, 'heading', 'Less friction. More finding.', 'Less friction.\nMore finding.');
  replace(data.about, 'eyebrow', '03 / A LITTLE CONTEXT', '03 / BEHIND THE HANDLE');
  replace(data.about, 'eyebrow', '02 / BEHIND THE HANDLE', '03 / BEHIND THE HANDLE');
  replace(
    data.about,
    'heading',
    'The work behind\nthe words.',
    'A curious mind.\nA hands-on approach.',
  );
  replace(data.experience, 'eyebrow', '04 / THE JOURNEY SO FAR', '01 / THE JOURNEY');
  replace(data.experience, 'eyebrow', '04 / THE JOURNEY', '01 / THE JOURNEY');
  replace(data.experience, 'eyebrow', '03 / THE JOURNEY', '01 / THE JOURNEY');
  replace(data.contact, 'eyebrow', '05 / GET IN TOUCH', '05 / LET’S CONNECT');
  replace(data.contact, 'heading', 'Good ideas start', 'Something in mind?');
  replace(data.contact, 'accentHeading', 'with a conversation.', 'Let’s make it happen.');
  replace(
    data.contact,
    'description',
    'Have a question about a writeup, something to add, or an idea to explore together? I’d love to hear it.',
    'Security research, a useful tool, or a creative collaboration. Good things start with a conversation.',
  );
  return data;
}
