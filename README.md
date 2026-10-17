# The Things That I See Photography

A multi-page website for Jason Smith's wedding, engagement, family and senior photography studio in Centennial, Colorado. Built by Code Bunny.

Plain static HTML, CSS and JavaScript. No framework and no runtime dependencies, so it runs on GitHub Pages, Netlify, Vercel or any web host.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Home: hero slideshow, introduction, services bento with a live date check, recent stories, the sanctuary feature with the guide signup, process, testimonials, Instagram strip |
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
- `src/partials/` holds the shared head, header, footer, lightbox and icons
- `src/images.json` lists every photo slot on the site
- `assets/css/site.css` is the design system
- `assets/js/config.js` holds **prices, booked dates and the form endpoint** in one place

### Photos

Every photo on the site is Jason's own work, taken from his current website. Each slot in `src/images.json` has responsive WebP files in `assets/img/` and a `pos` crop point. The crop points come from face detection, so wherever a photo is cropped (hero, tiles, cards, story strips) the faces stay in frame. Photos where no face is visible (empty church interiors, rings, ceilings, couples seen from behind) are not used.

Use a photo in a page with `<x-img name="slot" sizes="..."></x-img>` (`eager` for above-the-fold images, `link cat="wedding"` to open it in the lightbox, `pos="50% 30%"` to override the crop). `{{src slot 480}}` gives a single image URL and `{{pos slot}}` its crop point, for background images. The build writes `srcset`, width and height (no layout shift) and lazy loading.

### Design and motion

The look is a light studio: warm ivory paper and espresso ink, with deep burgundy for buttons, accent words and the footer, and champagne gold for small details, Inter Tight with Instrument Serif italic accents and Geist Mono labels. The design system is in `assets/css/site.css`.

Signature pieces: a counting preloader with the eye-and-cross mark (first visit only), a curtain wipe between pages, the full-frame hero slideshow with a rotating word, a statement whose words light up as you scroll with photos set inline, a bento grid with count-up numbers and a live date checker, a pinned horizontal scroll of real stories (desktop), the "In the sanctuary" feature frame, process cards that stack and dim, a scroll-speed marquee, a custom cursor with labels, hover photo previews on the story list and Sessions menu, magnetic buttons, and a giant footer wordmark whose letters rise in.

`assets/js/motion.js` drives the scroll choreography with GSAP and ScrollTrigger (`assets/vendor/`). Scrolling stays native. `assets/js/site.js` handles the header, menu, headline splitting, reveals, FAQ, forms, filters and lightbox. Visitors with reduced motion, or if a script fails to load, get the full static site.

### Forms

Set `formEndpoint` in `assets/js/config.js` to any endpoint that accepts JSON POSTs (Formspree, Basin, or a HoneyBook or Dubsado webhook). While it's empty, forms run in preview mode: they validate and show the success state but send nothing.

### Availability

`bookedDates` in `assets/js/config.js` drives the date checker on the home page, the CTA and the enquiry form. The dates there now are **examples**: replace them with Jason's calendar.

## Deploying

GitHub Pages: Settings, Pages, deploy from the `main` branch root. A `.nojekyll` file is included. `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph tags and LocalBusiness structured data are generated for `https://www.thethingsthatisee.com`.

## To confirm with Jason before launch

- **Senior prices:** his Pricing page lists $400 / $700 / $1,000; his Senior page lists $250 / $400 / $750. This site uses the Pricing page figures.
- **Engagement sessions:** his FAQ says they're included in every wedding collection, while his Pricing page lists them as a $750 add-on. This site treats them as an add-on and the FAQ wording was adjusted to match.
- **Deluxe family session:** his site reads "Up to  hours" (the number is missing). This site says "Extended session".
- **Drafted copy:** the headlines, the About page's chapters and "Four trades" lines, the Catholic wedding guide, and the location blurbs were written for this site from his own FAQ and bio. They need his review.
- **A photo of Jason:** his site has no confirmed portrait of him, so the site doesn't show one. A headshot (and a family photo, if he'd like) would make the About page and the home introduction more personal.
- **Stat captions:** "20 years behind the lens" and "six children at home" come from his bio; confirm he's happy with how they're phrased.
