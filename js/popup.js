// ================= OPEN MODAL =================

function openEnquiry() {
  document.getElementById("enquiryModal")
    ?.classList.add("active");
}

function closeEnquiry() {
  document.getElementById("enquiryModal")
    ?.classList.remove("active");
}

// ================= SUBMIT FORM =================

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("enquiryForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {

      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Submission Failed");
      }

      alert("✅ Enquiry Submitted Successfully");

      form.reset();
      closeEnquiry();

    } catch (error) {

      console.error("Enquiry Error:", error);
      alert("❌ Error: " + error.message);

    } finally {

      if (submitBtn) submitBtn.disabled = false;
    }

  });

});
