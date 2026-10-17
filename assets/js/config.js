// Single place to edit prices, availability and where forms are sent.
window.SITE_CONFIG = {
  // POST endpoint that accepts JSON (Formspree, Basin, a HoneyBook/Dubsado webhook, etc.).
  // Leave empty to run forms in preview mode: they validate and show the success state but send nothing.
  formEndpoint: "",

  // Shown on the enquiry confirmation.
  replyWindow: "within one business day",

  // Dates already booked (YYYY-MM-DD). EXAMPLES ONLY: replace with Jason's real calendar.
  bookedDates: ["2027-05-22", "2027-06-12", "2027-06-26", "2027-09-18", "2027-10-09"],

  // Prices from the current Investment page.
  prices: {
    coverage: {
      classic: { name: "The Classic Coverage", price: 2500 },
      signature: { name: "The Signature Coverage", price: 3500 }
    },
    extras: {
      engagement: { name: "Engagement session", price: 750 },
      second: { name: "Second photographer", price: 900 },
      event: { name: "Event add-on", price: 750 }
    },
    film: {
      v1: { name: "V1. The Keepsake", price: 2300, was: 2600 },
      v2: { name: "V2. The Narrative", price: 3200, was: 3500 },
      v3: { name: "V3. The Legacy", price: 4500, was: 4800 }
    },
    extraVideographer: { name: "Additional videographer", price: 500 },
    senior: {
      essentials: { name: "Essentials Senior Portraits", price: 400 },
      signature: { name: "Signature Senior Portraits", price: 700 },
      elite: { name: "Elite Senior Portraits", price: 1000 }
    },
    family: {
      mini: { name: "Family Mini-Session", price: 250 },
      standard: { name: "Family Photography", price: 500 },
      deluxe: { name: "Deluxe Family Photography", price: 750 }
    }
  }
};
