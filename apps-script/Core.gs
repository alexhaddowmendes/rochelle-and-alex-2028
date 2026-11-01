// Core RSVP logic. Plain functions with no Google services, so `npm test` can
// run them locally. Rows are arrays, exactly as Sheet getValues() returns them:
//   Guests:    household, full name, alias (blank for a real person)
//   Responses: household, person, status, dietary, note, email, last updated
//   Log:       timestamp, household, person, status, dietary, note, email

const STATUSES = ['Coming', "Can't make it"];
const GUEST = { HOUSEHOLD: 0, NAME: 1, ALIAS: 2 };
const RESPONSE = { HOUSEHOLD: 0, PERSON: 1, STATUS: 2, DIETARY: 3, NOTE: 4, EMAIL: 5, UPDATED: 6 };

function cleanText(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function normaliseName(name) {
  return cleanText(name).replace(/\s+/g, ' ').toLowerCase();
}

function sameHousehold(a, b) {
  return String(a).trim() === String(b).trim();
}

function isResponseFor(row, household, name) {
  return (
    sameHousehold(row[RESPONSE.HOUSEHOLD], household) &&
    normaliseName(row[RESPONSE.PERSON]) === normaliseName(name)
  );
}

function householdMembers(guests, household) {
  return guests.filter(function (guest) {
    const isAlias = cleanText(guest[GUEST.ALIAS]) !== '';
    return (
      sameHousehold(guest[GUEST.HOUSEHOLD], household) &&
      normaliseName(guest[GUEST.NAME]) !== '' &&
      !isAlias
    );
  });
}

function lookup(name, guests, responses) {
  const wanted = normaliseName(name);
  const match = guests.find(function (guest) {
    return wanted !== '' && normaliseName(guest[GUEST.NAME]) === wanted;
  });
  if (!match) {
    return { found: false };
  }

  const household = match[GUEST.HOUSEHOLD];
  const members = householdMembers(guests, household).map(function (guest) {
    return {
      name: guest[GUEST.NAME],
      answer: responses.find(function (row) {
        return isResponseFor(row, household, guest[GUEST.NAME]);
      }),
    };
  });
  const answered = members.find(function (member) {
    return member.answer;
  });

  return {
    found: true,
    household: household,
    members: members.map(function (member) {
      return {
        name: member.name,
        status: member.answer ? member.answer[RESPONSE.STATUS] : '',
        dietary: member.answer ? member.answer[RESPONSE.DIETARY] : '',
      };
    }),
    note: answered ? answered.answer[RESPONSE.NOTE] : '',
    email: answered ? answered.answer[RESPONSE.EMAIL] : '',
  };
}

function submit(payload, guests, responses, now) {
  function rejected(error) {
    return { result: { ok: false, error: error }, responses: responses, logRows: [] };
  }

  const members = householdMembers(guests, payload.household);
  if (members.length === 0) {
    return rejected('We could not find that household.');
  }
  const email = cleanText(payload.email);
  if (email === '') {
    return rejected('Please give a contact email.');
  }

  // Keyed by normalised name, so answers for people outside the household are
  // never read and a repeated name keeps its last answer.
  const answerFor = new Map();
  (Array.isArray(payload.answers) ? payload.answers : []).forEach(function (answer) {
    if (answer) {
      answerFor.set(normaliseName(answer.name), answer);
    }
  });

  const unanswered = members.some(function (guest) {
    const answer = answerFor.get(normaliseName(guest[GUEST.NAME]));
    return !answer || STATUSES.indexOf(answer.status) === -1;
  });
  if (unanswered) {
    return rejected("Please choose Coming or Can't make it for everyone.");
  }

  const note = cleanText(payload.note);
  const rows = members.map(function (guest) {
    const answer = answerFor.get(normaliseName(guest[GUEST.NAME]));
    return [
      guest[GUEST.HOUSEHOLD],
      guest[GUEST.NAME],
      answer.status,
      cleanText(answer.dietary),
      note,
      email,
      now,
    ];
  });

  return {
    result: { ok: true },
    responses: mergeResponses(responses, rows),
    logRows: rows.map(function (row) {
      return [now].concat(row.slice(0, RESPONSE.UPDATED));
    }),
  };
}

// Replaces each person's row where it sits, so a sorted Sheet stays sorted.
function mergeResponses(responses, rows) {
  const merged = responses.slice();
  rows.forEach(function (row) {
    const existing = merged.findIndex(function (current) {
      return isResponseFor(current, row[RESPONSE.HOUSEHOLD], row[RESPONSE.PERSON]);
    });
    if (existing === -1) {
      merged.push(row);
    } else {
      merged[existing] = row;
    }
  });
  return merged;
}

if (typeof module !== 'undefined') {
  module.exports = { lookup: lookup, submit: submit };
}
