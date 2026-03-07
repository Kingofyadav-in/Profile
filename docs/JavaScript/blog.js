/* ======================================================
   ELITE BLOG CMS ENGINE
   Auto Card Generation + Auto Post Rendering
   Author: Amit Ku Yadav
====================================================== */

document.addEventListener("DOMContentLoaded", async () => {

  const container = document.getElementById("blog-posts");
  const postContainer = document.getElementById("blog-post-content");

  /* ================= FETCH BLOG DATA ================= */

  const res = await fetch("/data/blog-data.json");
  const data = await res.json();

  if (!data || !data.posts) return;

  /* ================= GLOBAL FILTER ================= */

  const visiblePosts = data.posts
    .filter(post => !post.hidden)   // hide system
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  /* ======================================================
     IF BLOG LIST PAGE → GENERATE CARDS
  ====================================================== */

  if (container) {

    container.innerHTML = "";

    visiblePosts.forEach(post => {

      const card = document.createElement("article");
      card.className = "blog-card glass";

      card.innerHTML = `
        <a href="/blog/posts/${post.slug}.html" class="blog-link">

          <span class="blog-meta">
            ${post.category} · ${post.date}
          </span>

          <h2>${post.title}</h2>

          <p>${post.excerpt}</p>

          <div class="card-footer">
            <span class="read-more">Read Article →</span>
          </div>

        </a>
      `;

      container.appendChild(card);
    });
  }

  /* ======================================================
     IF POST PAGE → LOAD CONTENT AUTOMATICALLY
  ====================================================== */

  if (postContainer) {

    const slug = window.location.pathname
      .split("/")
      .pop()
      .replace(".html", "");

    const post = data.posts.find(p => p.slug === slug);

    if (!post) {
      postContainer.innerHTML = "<h2>Post Not Found</h2>";
      return;
    }

    document.title = post.title;

    postContainer.innerHTML = `
      <article class="blog-reader glass">

        <header>
          <span class="blog-meta">
            ${post.category} · ${post.date}
          </span>

          <h1>${post.title}</h1>
        </header>

        <section class="blog-body">
          ${post.content}
        </section>

      </article>
    `;
  }

});
/* ================= BLOG LIBRARY AUTO ================= */

const library = document.getElementById("blog-library-grid");

if (library) {

  library.innerHTML = "";

  visiblePosts.forEach(post => {

    const item = document.createElement("article");
    item.className = "blog-library-item glass";

    item.innerHTML = `
      <h3>${post.title}</h3>
      <span class="blog-meta">
        ${post.category} · ${post.date}
      </span>

      <p>${post.excerpt}</p>

      <a href="/blog/posts/${post.slug}.html"
         class="read-more">
        Read More →
      </a>
    `;

    library.appendChild(item);
  });

}
/* =====================================================
   GLOBAL ENQUIRY SYSTEM
===================================================== */

function openEnquiry() {
  document.body.classList.add("enquiry-active");
}

function closeEnquiry() {
  document.body.classList.remove("enquiry-active");
}

document.querySelector(".enquiry-form").reset();
  closeEnquiry();

document.getElementById("enquiryForm")?.addEventListener("submit", async function(e) {

  e.preventDefault();

  const formData = {
    name: this.name.value,
    email: this.email.value,
    subject: this.subject.value,
    message: this.message.value
  };

  try {

    const response = await fetch("https://your-backend-domain.com/api/enquiry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      alert("✅ Enquiry Submitted Successfully");
      this.reset();
      closeEnquiry();
    }

  } catch (error) {
    alert("❌ Submission Failed");
  }

});


