// Opening hours: a small panel that closes on Escape or a click outside
const hoursButton = document.querySelector('.hours-button');
const hours = document.querySelector('.hours');
hoursButton.addEventListener('click', (event) => {
  event.stopPropagation();
  hours.hidden = !hours.hidden;
});
document.addEventListener('click', (event) => {
  if (!hours.contains(event.target)) hours.hidden = true;
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hours.hidden = true;
});

// Booking notice: a modal window that keeps focus inside it
const notice = document.querySelector('.notice');
const backdrop = document.querySelector('.backdrop');
let openedFrom = null;

function focusables() {
  return notice.querySelectorAll('a, button, input');
}

function openNotice() {
  openedFrom = document.activeElement;
  notice.hidden = false;
  backdrop.hidden = false;
  for (const element of document.body.children) {
    if (element !== notice && element !== backdrop) element.inert = true;
  }
  focusables()[0].focus();
}

function closeNotice() {
  notice.hidden = true;
  backdrop.hidden = true;
  for (const element of document.body.children) element.inert = false;
  openedFrom.focus();
}

document.querySelector('.book').addEventListener('click', openNotice);
notice.querySelector('.close').addEventListener('click', closeNotice);
notice.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeNotice();
  if (event.key !== 'Tab') return;
  const items = focusables();
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

// Email: check the address before the form is sent
const form = document.querySelector('.notify');
const email = document.querySelector('#email');
const error = document.querySelector('.error');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (email.value === '') {
    error.textContent = 'Please enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+$/.test(email.value)) {
    error.textContent = 'Please enter a valid email address.';
  } else {
    error.hidden = true;
    closeNotice();
    return;
  }
  error.hidden = false;
  email.focus();
});

// Links: fade the page out before going to another page
for (const link of document.querySelectorAll('a[href$=".html"]')) {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(() => {
      location.href = link.href;
    }, 200);
  });
}
