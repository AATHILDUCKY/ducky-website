/** Apply the journal direction only to the original template copy; keep custom edits intact. */
export function journalHomepage(value, profile) {
  const data = structuredClone(value);
  const replace = (object, key, before, after) => {
    if (object[key] === before) object[key] = after;
  };
  const oldOrder = ['hero', 'highlights', 'about', 'experience', 'tools', 'writeups', 'contact'];
  if (JSON.stringify(data.order) === JSON.stringify(oldOrder)) {
    data.order = ['hero', 'writeups', 'tools', 'about', 'highlights', 'experience', 'contact'];
  }
  const hero = data.hero;
  replace(
    hero,
    'eyebrow',
    'Cybersecurity enthusiast · Security Engineer',
    'A PERSONAL LEARNING JOURNAL',
  );
  replace(hero, 'heading', 'I’m ' + profile.handle + '.', 'Learning in public.');
  replace(hero, 'accentHeading', 'Security Engineer.', 'One note at a time.');
  replace(
    hero,
    'description',
    'At **' +
      profile.company +
      '**, I focus on **penetration testing, IAM, and IAG security**. I build practical tools and automate repetitive tasks to make security work more effective.',
    'I document what I learn about **security, software, and the systems behind them**. Practical notes, experiments, and lessons from building and breaking things.',
  );
  const toolsButton = hero.buttons.find((button) => button.id === 'hero-tools');
  if (toolsButton?.href === '/tools' && toolsButton.label === 'Explore my tools') {
    Object.assign(toolsButton, { label: 'Read the writeups', href: '/blog', icon: 'book' });
  }
  const aboutButton = hero.buttons.find((button) => button.id === 'hero-about');
  if (aboutButton?.href === '/about' && aboutButton.label === 'A little about me') {
    Object.assign(aboutButton, { label: 'Explore my tools', href: '/tools', icon: 'code' });
  }
  replace(hero.portrait, 'topLabel', 'THE PERSON BEHIND THE WORK', 'THE PERSON BEHIND THE NOTES');
  replace(data.writeups, 'eyebrow', '04 / FIELD NOTES', '01 / THE LEARNING LOG');
  replace(
    data.writeups,
    'heading',
    'Research, notes &\nthings worth sharing.',
    'Fresh from the notebook.',
  );
  replace(
    data.writeups,
    'description',
    'A few recent writeups on security, software, and what I’m learning.',
    'Things I’ve explored, problems I’ve worked through, and ideas worth keeping.',
  );
  replace(data.writeups.link, 'label', 'See more writeups', 'Browse all writeups');
  replace(data.tools, 'eyebrow', '03 / ONLINE TOOLS', '02 / BUILT ALONG THE WAY');
  replace(
    data.tools,
    'heading',
    'Small tools.\nPractical security work.',
    'From learning to making.',
  );
  replace(data.about, 'eyebrow', '01 / ABOUT', '03 / A LITTLE CONTEXT');
  replace(data.about, 'heading', 'Security Engineer\n& Developer.', 'The work behind\nthe words.');
  replace(data.experience, 'eyebrow', '02 / EXPERIENCE', '04 / THE JOURNEY SO FAR');
  replace(
    data.experience,
    'heading',
    'An engineering foundation.\nA focus on security.',
    'Built on experience.\nDriven by curiosity.',
  );
  replace(data.contact, 'heading', "Let's build", 'Good ideas start');
  replace(data.contact, 'accentHeading', 'something useful.', 'with a conversation.');
  replace(
    data.contact,
    'description',
    "Have a security question, a collaboration idea, or a development project? I'd be happy to hear from you.",
    'Have a question about a writeup, something to add, or an idea to explore together? I’d love to hear it.',
  );
  return data;
}
