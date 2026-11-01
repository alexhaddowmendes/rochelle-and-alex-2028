(function () {
  const findForm = document.getElementById('find-form');
  const householdForm = document.getElementById('household-form');
  const confirmation = document.getElementById('confirmation');
  const membersBox = document.getElementById('members');
  const memberTemplate = document.getElementById('member-template');
  const message = document.getElementById('message');
  const subtitle = document.getElementById('rsvp-sub');
  const FIND_PROMPT = "Enter your full name and we'll find your household.";
  const noteInput = document.getElementById('note');
  const emailInput = document.getElementById('email');

  let household = null;

  // Sent as text/plain: JSON would trigger a CORS preflight, which Apps Script
  // cannot answer.
  async function callApi(body) {
    const response = await fetch(window.RSVP_CONFIG.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
    return response.json();
  }

  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }

  function showOnly(section) {
    [findForm, householdForm, confirmation].forEach(function (candidate) {
      candidate.hidden = candidate !== section;
    });
    showMessage('');
    if (section === findForm) subtitle.textContent = FIND_PROMPT;
    if (section === confirmation) subtitle.textContent = 'Thank you! Your answers are saved.';
  }

  function setBusy(form, busy, label) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = busy;
    if (busy) {
      button.dataset.label = button.textContent;
      button.textContent = label;
    } else {
      button.textContent = button.dataset.label;
    }
  }

  function renderMember(member, index) {
    const fragment = memberTemplate.content.cloneNode(true);
    fragment.querySelector('legend').textContent = member.name;

    fragment.querySelectorAll('input[type="radio"]').forEach(function (radio) {
      radio.name = 'status-' + index;
      radio.checked = radio.value === member.status;
    });

    const dietary = fragment.querySelector('.dietary');
    dietary.id = 'dietary-' + index;
    dietary.value = member.dietary;
    fragment.querySelector('.dietary-label').htmlFor = dietary.id;

    fragment.querySelector('.member').dataset.name = member.name;
    return fragment;
  }

  function showHousehold(result) {
    household = result.household;
    membersBox.replaceChildren();
    result.members.forEach(function (member, index) {
      membersBox.appendChild(renderMember(member, index));
    });
    noteInput.value = result.note;
    emailInput.value = result.email;

    const answeredBefore = result.members.some(function (member) {
      return member.status;
    });
    showOnly(householdForm);
    subtitle.textContent = answeredBefore
      ? "Welcome back! Here's what you told us last time. Change anything you like and send it again."
      : 'We found you! Let us know who can make it.';
  }

  function readAnswers() {
    return Array.from(membersBox.querySelectorAll('.member')).map(function (member) {
      const chosen = member.querySelector('input[type="radio"]:checked');
      return {
        name: member.dataset.name,
        status: chosen ? chosen.value : '',
        dietary: member.querySelector('.dietary').value,
      };
    });
  }

  function showConfirmation(answers) {
    const list = document.getElementById('confirmation-list');
    list.replaceChildren();
    answers.forEach(function (answer) {
      const item = document.createElement('li');
      item.textContent = answer.name + ': ' + answer.status;
      list.appendChild(item);
    });
    showOnly(confirmation);
  }

  findForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const name = document.getElementById('guest-name').value;
    if (!name.trim()) {
      showMessage('Please type your full name.');
      return;
    }

    setBusy(findForm, true, 'Looking...');
    showMessage('');
    try {
      const result = await callApi({ action: 'lookup', name: name });
      if (result.found) {
        showHousehold(result);
      } else {
        showMessage(
          "We couldn't find you, try entering your name as it's spelt on the invitation. Reach out to Alex or Rochelle if you have any problems."
        );
      }
    } catch (error) {
      showMessage("Sorry, we couldn't reach the guest book just now. Please try again in a moment.");
    } finally {
      setBusy(findForm, false);
    }
  });

  householdForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const answers = readAnswers();

    setBusy(householdForm, true, 'Sending...');
    showMessage('');
    try {
      const result = await callApi({
        action: 'submit',
        household: household,
        answers: answers,
        note: noteInput.value,
        email: emailInput.value,
      });
      if (result.ok) {
        showConfirmation(answers);
      } else {
        showMessage(result.error);
      }
    } catch (error) {
      showMessage("Sorry, your answers didn't send. Please try again in a moment.");
    } finally {
      setBusy(householdForm, false);
    }
  });

  document.getElementById('start-over').addEventListener('click', function () {
    household = null;
    findForm.reset();
    showOnly(findForm);
  });

  document.getElementById('change-answers').addEventListener('click', function () {
    showOnly(householdForm);
  });
})();
