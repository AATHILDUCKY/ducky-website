import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
export async function installReference(db) {
  const source = JSON.parse(
    await readFile(new URL('../reference/site.json', import.meta.url), 'utf8'),
  );
  const previous = (await db.query("SELECT value FROM settings WHERE key='reference.site'")).rows[0]
    ?.value;
  let baseline = previous?.baseline;
  if (!baseline) {
    const profile = (await db.query("SELECT value FROM settings WHERE key='profile'")).rows[0]
      .value;
    const image = await readFile(new URL('../public/reference/portrait.webp', import.meta.url));
    if (image.length >= 50000) throw new Error('The reference portrait must be below 50 KB.');
    const meta = await sharp(image).metadata();
    const media = await db.query(
      'INSERT INTO media(data,alt,width,height) VALUES($1,$2,$3,$4) RETURNING id',
      [image, profile.name, meta.width, meta.height],
    );
    profile.portrait = '/media/' + media.rows[0].id;
    await db.query("UPDATE settings SET value=$1,updated_at=now() WHERE key='profile'", [
      JSON.stringify(profile),
    ]);
    baseline = {
      profile,
    };
  }
  await db.query(
    "INSERT INTO settings(key,value) VALUES('reference.site',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",
    [
      JSON.stringify({
        ...previous,
        ...source,
        pages: { ...previous?.pages, ...source.pages },
        defaults: { ...previous?.defaults, ...source.defaults },
        baseline,
      }),
    ],
  );
}
