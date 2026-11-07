// Booking notice: a modal dialog
const notice = document.querySelector('.notice');
document.querySelector('.book').addEventListener('click', () => notice.showModal());
notice.querySelector('.close').addEventListener('click', () => notice.close());

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
