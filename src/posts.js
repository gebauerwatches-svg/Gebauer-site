/**
 * Blog posts. Add new ones at the top.
 * To publish a new post: add an object here, push to GitHub, done.
 *
 * Fields:
 *   slug     - URL-friendly name (used in /blog/my-post-slug)
 *   title    - Post title
 *   date     - Date string (e.g. "April 12, 2026")
 *   excerpt  - Short preview shown on the blog list
 *   author   - Defaults to "Liam" if omitted
 *   content  - Full post body. Use \n\n for paragraphs.
 */

const posts = [
  {
    slug: 'why-wood',
    title: 'Why We Put Real Wood on a Watch Dial',
    date: 'April 12, 2026',
    author: 'Liam',
    excerpt: 'Every watch brand uses metal or ceramic. We went with something nobody else would try.',
    content: `Every watch brand uses metal or ceramic dials. We went with something nobody else would try.

When I first started designing Gebauer, I knew the dial had to be different. Not different for the sake of it, but different because it actually means something. Metal is metal. It looks the same on day one as it does on day a thousand. That's fine for most brands. Not for us.

Wood changes. Padauk starts fiery orange and darkens to burgundy over years. Ebony stays jet black forever. Hinoki has a golden grain that Japanese temples have been built with for over a thousand years. Each one tells a different story.

The grain on your dial doesn't exist on anyone else's. That's not marketing. That's how wood works. Grain doesn't repeat. Ever.

We source three species. Each one was chosen because it does something no other material can do. Padauk transforms. Ebony endures. Hinoki carries a thousand years of history on your wrist.

The manufacturing is harder. Wood is unpredictable. It expands, it contracts, it has to be sealed and stabilized before it can sit inside a watch case. Our partner in Japan has the precision to make it work. That's why we went to Japan in the first place.

This is the part of Gebauer that nobody else can copy. You can copy a case shape. You can copy a movement. You can't copy a wood grain.`
  },
  {
    slug: 'first-post',
    title: 'We Started a Watch Company',
    date: 'April 8, 2026',
    author: 'Liam',
    excerpt: "I'm 16 and building a watch brand from Steamboat Springs. Here's why.",
    content: `I'm 16 and I started a watch company. That sounds ridiculous and I know it.

It started in Milan. I was 15 and I'd saved up for months to buy my first real watch. A Seiko. 310 euros. The most expensive thing I'd ever owned. The second it was on my wrist I understood something I hadn't before: this was different from everything else I owned. My phone would be outdated in two years. My headphones would break. But this watch was going to be with me for a long time.

I looked around and realized nobody was making watches like that for people my age. Every brand that made something with real weight to it was designed by old guys, for old guys. Everything aimed at teens was plastic and disposable.

So I started learning. Two hours a day after school. Movements, materials, case construction, manufacturing. I interviewed over 60 teens about what they'd actually want on their wrist. I pitched factories until one in Japan said yes.

Now we have three wood variants locked, a manufacturer producing technical drawings, and 300 watches on the way for December 2026. I'm the youngest founder in the High Country Accelerator. My siblings Roman, Fiona, and Eric are building this with me.

This is the first chapter. The people who get in now are the reason any of the chapters after this one exist.

Welcome to Gebauer.`
  },
]

export default posts
