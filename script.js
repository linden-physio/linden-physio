// Booking notice: a modal dialog
const notice = document.querySelector('.notice');
document.querySelector('.book').addEventListener('click', () => notice.showModal());
notice.querySelector('.close').addEventListener('click', () => notice.close());

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
    notice.close();
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
