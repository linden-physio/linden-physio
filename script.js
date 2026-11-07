// Booking notice: a modal dialog
const notice = document.querySelector('.notice');
document.querySelector('.book').addEventListener('click', () => notice.showModal());
notice.querySelector('.close').addEventListener('click', () => notice.close());
