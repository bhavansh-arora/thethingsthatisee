# The Things That I See Photography

A multi-page website for Jason Smith's wedding, engagement, family and senior photography studio in Centennial, Colorado. Built by Code Bunny.

Plain static HTML, CSS and JavaScript. No framework and no runtime dependencies, so it runs on GitHub Pages, Netlify, Vercel or any web host.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Home: hero with a live date check, intro, services, the faith section with the guide signup, gallery, testimonials, process, stories |
| `weddings.html` | Approach, gallery, Catholic and Christian ceremonies, timeline, collections, FAQ |
| `engagements.html`, `family.html`, `seniors.html` | Session pages with gallery, locations and packages |
| `portfolio.html` | Filterable gallery with a full-screen lightbox (keyboard and swipe) |
| `investment.html` | Live wedding estimate builder, senior and family pricing, full FAQ |
| `enquire.html` | The 60-second match: occasion, details with live date availability, recommended collection with price, contact, instant personal reply |
| `guide.html` | The Catholic wedding photography guide (lead magnet with email capture) |
| `stories.html` | Real weddings and guides, filterable |
| `about.html` | Jason's story and what shapes his work |

## Editing

The finished pages in the repo root are generated. Edit the sources, then rebuild:

```
python3 tools/build.py
```

- `src/pages/*.html` holds the content of each page
- `src/partials/` holds the shared head, header, footer and calls to action
- `src/images.json` lists every photo slot on the site
- `assets/css/site.css` is the design system
- `assets/js/config.js` holds **prices, booked dates and the form endpoint** in one place

### Adding photos

Every photo slot currently shows a labelled placeholder naming the intended shot. To fill a slot, add its URLs to `src/images.json` and rebuild:

```json
"hero-mass": { ..., "src": { "1000": "https://.../photo-1000.jpg", "1500": "https://.../photo-1500.jpg" } }
```

The build writes responsive `srcset`, width and height (no layout shift), lazy loading, and the lightbox's full-size link automatically.

### Design and motion

The look is "warm romantic film": cream and blush paper, espresso bands, film grain and drifting light leaks, Cormorant Garamond with Pinyon Script accents. Photographs appear as physical prints with white borders, tape and handwritten captions.

Signature pieces: the home hero collage of prints that drop onto the page, the moving film strip, the arched church-window photo, a flickable stack of prints (drag, swipe, tap, buttons or arrow keys), testimonials as taped notes, the "how it works" thread that draws itself as you scroll, the "Save the date" invitation with a wax seal, and the estimate builder's receipt.

Motion details: photographs develop from washed-out sepia into colour as they appear, script lines write themselves, accent words get a hand-drawn brush underline, hero prints float, follow the mouse in depth and can be picked up and dragged (desktop), prints tilt in 3D on hover, notes swing on their tape, the film strip speeds up with scrolling, a pen travels down the thread, and the invitation tips up as its wax seal stamps down.

Scrolling is native, with no smooth-scroll library and no pinned sections. `assets/js/motion.js` (no dependencies) handles the reveals, word-by-word headlines, dropping prints, light parallax and counters with IntersectionObserver and CSS transitions. `assets/js/site.js` runs the flick stack, header, forms, filters and lightbox. Motion is progressive: content is only hidden for animation once `<html class="motion">` is set in the head, and reduced-motion visitors or failed script loads get the full static site.

### Forms

Set `formEndpoint` in `assets/js/config.js` to any endpoint that accepts JSON POSTs (Formspree, Basin, or a HoneyBook or Dubsado webhook). While it's empty, forms run in preview mode: they validate and show the success state but send nothing.

### Availability

`bookedDates` in `assets/js/config.js` drives the date checker on the home page, the CTA and the enquiry form. The dates there now are **examples**: replace them with Jason's calendar.

## Deploying

GitHub Pages: Settings, Pages, deploy from the `main` branch root. A `.nojekyll` file is included. `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph tags and LocalBusiness structured data are generated for `https://www.thethingsthatisee.com`.

## To confirm with Jason before launch

- **Photos:** use of his photography on the site (see above).
- **Senior prices:** his Pricing page lists $400 / $700 / $1,000; his Senior page lists $250 / $400 / $750. This site uses the Pricing page figures.
- **Engagement sessions:** his FAQ says they're included in every wedding collection, while his Pricing page lists them as a $750 add-on. This site treats them as an add-on and the FAQ wording was adjusted to match.
- **Deluxe family session:** his site reads "Up to  hours" (the number is missing). This site says "Extended session".
- **Drafted copy:** the About page's "Four trades" lines, the Catholic wedding guide, and the location blurbs were written for this site from his own FAQ and bio. They need his review.
- **About photos:** the family photo and the portrait are assumed to be Jason and his family.
