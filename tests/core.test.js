const test = require('node:test');
const assert = require('node:assert/strict');
const { lookup, submit } = require('../apps-script/Core.gs');

// Rows as they come back from the Guests tab: household, full name, alias.
const guests = [
  ['H1', 'Maria Santos', ''],
  ['H1', 'Jose Santos', ''],
  ['H1', 'Ria Santos', 'yes'],
  ['H2', 'Tom Baker', ''],
  ['', '', ''],
];

test('lookup finds a household by exact full name', () => {
  assert.deepEqual(lookup('Tom Baker', guests, []), {
    found: true,
    household: 'H2',
    members: [{ name: 'Tom Baker', status: '', dietary: '' }],
    note: '',
    email: '',
  });
});

test('lookup ignores capital letters', () => {
  assert.equal(lookup('tOM bAKER', guests, []).household, 'H2');
});

test('lookup ignores leading, trailing and repeated spaces', () => {
  assert.equal(lookup('  Tom    Baker ', guests, []).household, 'H2');
});

test('lookup by alias row opens the household, without listing the alias as a person', () => {
  const result = lookup('Ria Santos', guests, []);
  assert.equal(result.household, 'H1');
  assert.deepEqual(
    result.members.map((member) => member.name),
    ['Maria Santos', 'Jose Santos']
  );
});

test('lookup accepts numeric household ids from the Sheet', () => {
  const rows = [[1, 'Tom Baker', ''], [2, 'Ana Cruz', '']];
  assert.deepEqual(lookup('Tom Baker', rows, []).members.map((m) => m.name), ['Tom Baker']);
});

test('lookup rejects a wrong spelling with no other data', () => {
  assert.deepEqual(lookup('Tom Bakker', guests, []), { found: false });
});

test('lookup rejects a partial name', () => {
  assert.deepEqual(lookup('Tom', guests, []), { found: false });
});

test('lookup rejects empty input, even though the Guests tab has blank rows', () => {
  assert.deepEqual(lookup('', guests, []), { found: false });
  assert.deepEqual(lookup('   ', guests, []), { found: false });
  assert.deepEqual(lookup(undefined, guests, []), { found: false });
});

test('lookup never returns another household', () => {
  const responses = [['H1', 'Maria Santos', 'Coming', 'Vegan', 'Hi', 'maria@example.com', 'then']];
  const json = JSON.stringify(lookup('Tom Baker', guests, responses));
  for (const secret of ['Santos', 'Vegan', 'maria@example.com', 'H1']) {
    assert.ok(!json.includes(secret), `leaked ${secret}`);
  }
});

test('lookup returns previously saved answers', () => {
  const responses = [
    ['H1', 'Maria Santos', 'Coming', 'Vegan', 'See you there', 'maria@example.com', 'then'],
    ['H1', 'Jose Santos', "Can't make it", '', 'See you there', 'maria@example.com', 'then'],
  ];
  assert.deepEqual(lookup('maria santos', guests, responses), {
    found: true,
    household: 'H1',
    members: [
      { name: 'Maria Santos', status: 'Coming', dietary: 'Vegan' },
      { name: 'Jose Santos', status: "Can't make it", dietary: '' },
    ],
    note: 'See you there',
    email: 'maria@example.com',
  });
});

const NOW = '2026-11-01 18:00:00';
const LATER = '2026-11-02 09:30:00';

function santosPayload(overrides) {
  return {
    household: 'H1',
    answers: [
      { name: 'Maria Santos', status: 'Coming', dietary: 'Vegan' },
      { name: 'Jose Santos', status: "Can't make it", dietary: '' },
    ],
    note: 'See you there',
    email: 'maria@example.com',
    ...overrides,
  };
}

test('submit saves one row per person, including household note and email', () => {
  const { result, responses } = submit(santosPayload(), guests, [], NOW);
  assert.equal(result.ok, true);
  assert.deepEqual(responses, [
    ['H1', 'Maria Santos', 'Coming', 'Vegan', 'See you there', 'maria@example.com', NOW],
    ['H1', 'Jose Santos', "Can't make it", '', 'See you there', 'maria@example.com', NOW],
  ]);
});

test('submit ignores people who are not in the household', () => {
  const payload = santosPayload();
  payload.answers.push({ name: 'Tom Baker', status: 'Coming', dietary: '' });
  payload.answers.push({ name: 'Plus One', status: 'Coming', dietary: '' });
  const { result, responses } = submit(payload, guests, [], NOW);
  assert.equal(result.ok, true);
  assert.deepEqual(responses.map((row) => row[1]), ['Maria Santos', 'Jose Santos']);
});

test('submit stores the name from the guest list, not the spelling sent', () => {
  const payload = santosPayload();
  payload.answers[0].name = '  maria   SANTOS ';
  const { responses } = submit(payload, guests, [], NOW);
  assert.equal(responses[0][1], 'Maria Santos');
});

test('submit overwrites only that household on resubmission', () => {
  const tom = ['H2', 'Tom Baker', 'Coming', '', '', 'tom@example.com', 'earlier'];
  const first = submit(santosPayload(), guests, [tom], NOW);
  const second = submit(
    santosPayload({
      answers: [
        { name: 'Maria Santos', status: "Can't make it", dietary: '' },
        { name: 'Jose Santos', status: 'Coming', dietary: 'No nuts' },
      ],
      note: 'Plans changed',
    }),
    guests,
    first.responses,
    LATER
  );
  assert.deepEqual(second.responses, [
    tom,
    ['H1', 'Maria Santos', "Can't make it", '', 'Plans changed', 'maria@example.com', LATER],
    ['H1', 'Jose Santos', 'Coming', 'No nuts', 'Plans changed', 'maria@example.com', LATER],
  ]);
});

test('a saved submission shows up when the guest looks up again', () => {
  const { responses } = submit(santosPayload(), guests, [], NOW);
  const result = lookup('Jose Santos', guests, responses);
  assert.equal(result.members[0].dietary, 'Vegan');
  assert.equal(result.note, 'See you there');
});

test('submit logs every person on every submission, with a timestamp', () => {
  const first = submit(santosPayload(), guests, [], NOW);
  const second = submit(santosPayload({ note: 'Changed' }), guests, first.responses, LATER);
  assert.deepEqual(first.logRows, [
    [NOW, 'H1', 'Maria Santos', 'Coming', 'Vegan', 'See you there', 'maria@example.com'],
    [NOW, 'H1', 'Jose Santos', "Can't make it", '', 'See you there', 'maria@example.com'],
  ]);
  assert.deepEqual(second.logRows, [
    [LATER, 'H1', 'Maria Santos', 'Coming', 'Vegan', 'Changed', 'maria@example.com'],
    [LATER, 'H1', 'Jose Santos', "Can't make it", '', 'Changed', 'maria@example.com'],
  ]);
});

test('submit does not log ignored people', () => {
  const payload = santosPayload();
  payload.answers.push({ name: 'Plus One', status: 'Coming', dietary: '' });
  const { logRows } = submit(payload, guests, [], NOW);
  assert.equal(logRows.length, 2);
});

test('submit matches a numeric household id on resubmission', () => {
  const rows = [[1, 'Tom Baker', '']];
  const payload = {
    household: '1',
    answers: [{ name: 'Tom Baker', status: 'Coming', dietary: '' }],
    note: '',
    email: 'tom@example.com',
  };
  const first = submit(payload, rows, [], NOW);
  const second = submit({ ...payload, household: 1 }, rows, first.responses, LATER);
  assert.equal(second.responses.length, 1);
});

function assertRejected(payload, existing = []) {
  const { result, responses, logRows } = submit(payload, guests, existing, NOW);
  assert.equal(result.ok, false);
  assert.equal(typeof result.error, 'string');
  assert.deepEqual(responses, existing);
  assert.deepEqual(logRows, []);
}

test('submit rejects an unknown or missing household', () => {
  assertRejected(santosPayload({ household: 'H99' }));
  assertRejected(santosPayload({ household: '' }));
  assertRejected(santosPayload({ household: undefined }));
});

test('submit rejects a missing email', () => {
  assertRejected(santosPayload({ email: '' }));
  assertRejected(santosPayload({ email: '   ' }));
  assertRejected(santosPayload({ email: undefined }));
});

test('submit rejects missing answers', () => {
  assertRejected(santosPayload({ answers: [] }));
  assertRejected(santosPayload({ answers: undefined }));
  assertRejected(santosPayload({ answers: [null] }));
});

test('submit rejects answers from only unknown people', () => {
  assertRejected(santosPayload({ answers: [{ name: 'Plus One', status: 'Coming', dietary: '' }] }));
});

test('submit rejects a household member left unanswered', () => {
  assertRejected(santosPayload({ answers: [{ name: 'Maria Santos', status: 'Coming', dietary: '' }] }));
});

test("submit rejects a status other than Coming or Can't make it", () => {
  const payload = santosPayload();
  payload.answers[0].status = 'Maybe';
  assertRejected(payload);
  payload.answers[0].status = '';
  assertRejected(payload);
});

test('a rejected resubmission leaves saved answers alone', () => {
  const saved = [['H1', 'Maria Santos', 'Coming', '', '', 'maria@example.com', 'then']];
  assertRejected(santosPayload({ email: '' }), saved);
});

test('submit treats note and dietary as optional', () => {
  const { result, responses } = submit(
    { household: 'H2', answers: [{ name: 'Tom Baker', status: 'Coming' }], email: 'tom@example.com' },
    guests,
    [],
    NOW
  );
  assert.equal(result.ok, true);
  assert.deepEqual(responses, [['H2', 'Tom Baker', 'Coming', '', '', 'tom@example.com', NOW]]);
});

test('submit trims text answers', () => {
  const payload = santosPayload({ email: ' maria@example.com ', note: ' Hi ' });
  payload.answers[0].dietary = '  Vegan ';
  const { responses } = submit(payload, guests, [], NOW);
  assert.deepEqual(responses[0], ['H1', 'Maria Santos', 'Coming', 'Vegan', 'Hi', 'maria@example.com', NOW]);
});
