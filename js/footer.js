"use strict";

/* ======================================================
   footer.js — Global footer renderer (defer, runs before script.js)
   Finds footer[data-footer] and fills canonical footer HTML.
====================================================== */

(function () {
  var footer = document.querySelector("footer[data-footer]");
  if (!footer) return;

  footer.innerHTML =
    '<div class="footer-inner">' +
      '<div class="footer-enquiry">' +
        '<p class="footer-title">Enquiry</p>' +
        '<p class="footer-text">' +
          'Amit Ku Yadav<br />' +
          'Phone: <a href="tel:+919523528114">+91 95235 28114</a><br />' +
          'Office: Bhagalpur, India<br />' +
          'Mail: <a href="mailto:kingofyadav.in@gmail.com">kingofyadav.in@gmail.com</a>' +
        '</p>' +
        '<div class="social-icons" id="socialLinks"></div>' +
      '</div>' +
      '<div class="footer-right">' +
        '<div id="footerClock">--:--</div>' +
        '<div>Bhagalpur, India</div>' +
        '<div id="status">STATUS: --</div>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '© <span id="year"></span> · All rights reserved' +
    '</div>';
})();
