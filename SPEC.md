# Wedding RSVP Site: Rochelle & Alex

Status: ready-for-agent

## Problem Statement

Rochelle Flores and Alexander Haddow-Mendes are getting married on 12 April 2028 at Sundowners, Zambales, Philippines. They need guests to tell them, household by household, who is coming, what each person eats, and to give guests somewhere to read event information. They want to track responses without running a server, without exposing their guest list to the public, and without paying for hosting.

## Solution

A small static website hosted free on GitHub Pages, with a relaxed, playful beach-sunset feel. A guest types their full name (spelt correctly) to open their household's RSVP, answers Coming / Can't make it and dietary requirements for each member, and submits. Responses land in a Google Sheet owned by the couple. An info page gives event details, with an accommodation section left empty for a booking link later. Guest list and lookup live only in Google Apps Script, so the list is never in the page source.

## User Stories

1. As a guest, I want to type my full name to find my invitation, so that I don't need a code or account.
2. As a guest, I want the name match to ignore capital letters and extra spaces, so that small typing differences don't lock me out.
3. As a guest, I want a clear, friendly message if my name isn't found, so that I know to check the spelling or contact the couple.
4. As a guest, I want to see only my own household's members after lookup, so that other guests' details stay private.
5. As a guest, I want to answer Coming or Can't make it separately for each person in my household, so that partial attendance is recorded accurately.
6. As a guest, I want a dietary requirements box for each person, so that everyone's needs are recorded.
7. As a guest, I want a household note box, so that I can mention anything else the couple should know.
8. As a guest, I want to give a contact email, so that the couple can reach me if needed.
9. As a guest, I want a confirmation after submitting, so that I know my answer was saved.
10. As a guest, I want to come back later, type my name again and see my previous answers prefilled, so that I can change them.
11. As a guest, I want my latest submission to be the one that counts, so that old answers don't confuse the couple.
12. As a guest, I want an info page with the date, venue, schedule, dress code and contacts, so that I can plan the trip.
13. As a guest, I want an accommodation section that tells me more is coming, so that I know to check back.
14. As a guest, I want the site to work on my phone, so that I can reply from anywhere.
15. As a guest, I want a relaxed, playful, beach-themed look, so that the site matches the wedding.
16. As a couple, I want responses written to a Google Sheet, so that I can sort, filter and share them.
17. As a couple, I want each person on one row with household, status, dietary needs, note, email and timestamp, so that headcount and catering are easy to read.
18. As a couple, I want every submission logged with a timestamp, so that no earlier answer is lost.
19. As a couple, I want to manage the guest list in the Sheet, so that I can add households and members without editing code.
20. As a couple, I want to add extra rows for nicknames or alternative spellings that point to the same household, so that guests who spell a name differently can still get in.
21. As a couple, I want guests unable to add people, so that headcount stays firm.
22. As a couple, I want the guest list kept out of the website code, so that anyone viewing the page source cannot read it.
23. As a couple, I want the site on free GitHub Pages now, so that it costs nothing.
24. As a couple, I want to move to a custom domain later without changing the site, so that I can upgrade when ready.
25. As a couple, I want info page placeholders clearly marked in one place, so that I can fill them in later.
26. As a couple, I want no RSVP deadline for now, so that I can add one later if needed.
27. As a couple, I want step-by-step instructions to deploy the Apps Script and publish the site, so that I can do it myself.
28. As a couple, I want a hero image slot that is easy to fill, so that I can add photos later.

## Implementation Decisions

- Static site: plain HTML, CSS and JavaScript, no build step, following the approach of rampatra's wedding-website (static page plus Google Apps Script writing to a Google Sheet).
- Pages: a home/RSVP page and an info page. Info page sections: date and schedule, venue (Sundowners, Zambales), getting there, accommodation (empty, "coming soon"), dress code and weather, contact. Only the date and venue are filled in. Everything else is a clearly marked placeholder in one editable area, and nothing unverified is invented (no travel times, directions or prices).
- Language: English only.
- Style: relaxed, playful; retro travel-postcard look built on a full-screen illustrated hero, with page colours taken from it (teal, sage, butter, apricot, burnt orange, mauve, deep jungle green and cream); capital title with bold supporting lines; responsive.
- Backend: one Google Apps Script web app, owned by the couple's wedding Google account. It exposes two actions to the site:
  - `lookup(name)`: normalises the name (case-insensitive, trimmed, collapsed whitespace), requires an otherwise exact match against the guest list, and returns only the matching household's members plus any previously saved answers. No match returns a not-found result and no other data.
  - `submit(household, answers, note, email)`: validates the household and member names against the guest list, ignores any unknown people, writes the latest answer per person to a Responses tab (overwriting that person's previous answer), and appends every submission to a timestamped Log tab.
- Sheet layout: a Guests tab (one row per person: household id, full name, plus extra alias rows pointing to the same household), a Responses tab (latest state per person: household, person, Coming / Can't make it, dietary, household note, email, last updated), and a Log tab (append-only history).
- Guest list lives only in the Sheet and is never included in the site's files.
- Guests cannot add people. Households are fixed by the couple in advance.
- Resubmission is allowed. The latest answer per person wins and the Log keeps history.
- No RSVP deadline, no accommodation question in the form, and no plus-one flow.
- Hosting: GitHub Pages, repository named `rochelle-and-alex-2028`. A custom domain can be added later without code changes beyond the site's base address.
- Deliverables include a short setup guide covering Sheet creation, Apps Script deployment, setting the web app URL in the site, and publishing to GitHub Pages.

## Testing Decisions

- A good test checks external behaviour only: inputs and outputs of the two Apps Script actions, not internal helpers.
- Single seam: the Apps Script `lookup` and `submit` actions. The core logic (name normalisation, matching, validation, overwrite-latest) is kept in plain functions that run without Google services, so it can be tested locally with a simple test runner. The Sheet read/write layer stays thin and is checked by hand after deployment.
- `lookup` tests: exact match, different capitalisation, extra spaces, alias row, wrong spelling rejected, empty input rejected, and the response never contains other households.
- `submit` tests: valid per-person answers saved, unknown names ignored, resubmission overwrites the latest answer, every submission appended to the log, and missing required fields rejected.
- The static pages are verified by hand in a browser at phone and desktop widths. There is no automated front-end test.
- Prior art: none (new project).

## Out of Scope

- Accommodation booking (a link will be added in future).
- RSVP deadline and reminders.
- Guests adding plus-ones or children themselves.
- Other languages.
- Custom domain.
- Photos and a gallery.
- Email confirmations.
- Payment or gifts.

## Further Notes

- The couple deploy the Apps Script and push the repo themselves. Claude cannot sign in to their accounts.
- Name-based access is light privacy, not strong security. Anyone who guesses a full guest name sees that household's member names. The couple accept this in exchange for no codes.
- Placeholders on the info page must be easy to find and replace before the site is shared.
