// ================= OPEN MODAL =================

function openEnquiry() {
  document.getElementById("enquiryModal")
    .classList.add("active");
}

function closeEnquiry() {
  document.getElementById("enquiryModal")
    .classList.remove("active");
}

// ================= SUBMIT FORM =================

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("enquiryForm");

  if (!form) return;

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    const res = await fetch("/api/enquiry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    alert("✅ Enquiry Submitted");

    form.reset();
    closeEnquiry();
  });

});
