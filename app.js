// Dynamically set API URL based on environment
// For production, change the second URL to your Azure backend App Service URL
const API = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000/api/images"
  : "https://tarekpix-backend-api-c3egh3hbbrghc2dp.polandcentral-01.azurewebsites.net/api/images";

const LOGIN_API = API.replace('/images', '/login');

let likes = {};
let currentUser = null; // null if not logged in, otherwise the email string

// UI State Management
function showLogin() {
    document.getElementById("login-box").style.display = "block";
    document.getElementById("gallery").style.display = "none";
    document.querySelector(".hero").style.display = "none";
    document.getElementById("upload-box").style.display = "none";
}

function showHome() {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("gallery").style.display = "grid";
    document.querySelector(".hero").style.display = "block";
    if (currentUser) {
        document.getElementById("upload-box").style.display = "block";
        document.getElementById("nav-login-btn").style.display = "none";
        document.getElementById("nav-logout-btn").style.display = "block";
    } else {
        document.getElementById("upload-box").style.display = "none";
        document.getElementById("nav-login-btn").style.display = "block";
        document.getElementById("nav-logout-btn").style.display = "none";
    }
}

// Initialize session
const storedToken = localStorage.getItem("tarekpix_token");
const storedEmail = localStorage.getItem("tarekpix_email");
if (storedToken && storedEmail) {
    currentUser = storedEmail;
}

window.addEventListener('DOMContentLoaded', () => {
    showHome();
});

async function login() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(LOGIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = data.email;
      localStorage.setItem("tarekpix_token", data.token);
      localStorage.setItem("tarekpix_email", data.email);
      
      document.getElementById("login-email").value = "";
      document.getElementById("login-password").value = "";
      
      showHome();
      loadImages();
    } else {
      alert("Invalid credentials!");
    }
  } catch (error) {
    console.error("Login failed:", error);
    alert("Login failed.");
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("tarekpix_token");
  localStorage.removeItem("tarekpix_email");
  showHome();
  loadImages();
}

async function loadImages() {
  try {
    const res = await fetch(API);
    const images = await res.json();

    const gallery = document.getElementById("gallery");
    gallery.innerHTML = "";

    images.forEach((img) => {
      if (!likes[img.id]) likes[img.id] = 0;

      const imageSrc = img.imageUrl || img.url;

      const div = document.createElement("div");
      div.className = "card";

      // Escape quotes for inline JS parameters
      const safeTitle = img.title ? img.title.replace(/'/g, "\\'") : "";
      const safeCategory = img.category ? img.category.replace(/'/g, "\\'") : "";

      let adminButtons = "";
      if (currentUser !== null) {
        adminButtons = `
          <div style="display: flex; gap: 10px; margin-top: 10px;">
              <button onclick="editImage('${img.id}', '${safeTitle}', '${safeCategory}')" style="background: linear-gradient(90deg, #10b981, #059669); padding: 8px;">Edit</button>
              <button onclick="deleteImage('${img.id}')" style="background: linear-gradient(90deg, #ef4444, #dc2626); padding: 8px;">Delete</button>
          </div>
        `;
      }

      let metadataHtml = "";
      if (img.uploadedBy || img.uploadedTime) {
         const timeString = img.uploadedTime ? new Date(img.uploadedTime).toLocaleString() : "Unknown Time";
         const byString = img.uploadedBy || "Unknown User";
         metadataHtml = `<div style="font-size: 0.8rem; margin-top: 5px; color: #aaa;">By: ${byString} <br/> On: ${timeString}</div>`;
      }

      div.innerHTML = `
        <img src="${imageSrc}" alt="${img.title}" onclick="openLightbox('${imageSrc}')" />
        <div class="like" onclick="likeImage('${img.id}', event)">❤️ ${likes[img.id]}</div>
        <div class="overlay">
          <h3>${img.title}</h3>
          <p>${img.category}</p>
          ${metadataHtml}
          ${adminButtons}
        </div>
      `;

      gallery.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading images:", error);
  }
}

async function uploadImage() {
  if (!currentUser) {
    alert("You must be logged in to upload.");
    return;
  }

  try {
    const title = document.getElementById("title").value;
    const category = document.getElementById("category").value;
    const image = document.getElementById("image");

    if (!title || !category || !image.files[0]) {
      alert("Please fill all fields and choose an image.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("category", category);
    formData.append("image", image.files[0]);
    formData.append("uploadedBy", currentUser); // Include uploader identity

    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("tarekpix_token")}`
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    document.getElementById("title").value = "";
    document.getElementById("category").value = "";
    document.getElementById("image").value = "";

    loadImages();
  } catch (error) {
    console.error("Error uploading image:", error);
    alert("Upload failed. Check backend and console.");
  }
}

async function editImage(id, currentTitle, currentCategory) {
  if (!currentUser) return;

  const newTitle = prompt("Enter new title:", currentTitle);
  const newCategory = prompt("Enter new category:", currentCategory);
  
  if (newTitle !== null && newCategory !== null) {
      try {
          const res = await fetch(`${API}/${id}`, {
              method: "PUT",
              headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${localStorage.getItem("tarekpix_token")}`
              },
              body: JSON.stringify({ title: newTitle, category: newCategory })
          });
          if (res.ok) {
            loadImages();
          } else {
            alert("Failed to update image.");
          }
      } catch (error) {
          console.error("Error updating image:", error);
      }
  }
}

async function deleteImage(id) {
  if (!currentUser) return;

  try {
    if(confirm("Are you sure you want to delete this image?")) {
        await fetch(`${API}/${id}`, { 
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("tarekpix_token")}`
            }
        });
        loadImages();
    }
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

function likeImage(id, e) {
  e.stopPropagation();
  likes[id] = (likes[id] || 0) + 1;
  loadImages();
}

function openLightbox(url) {
  document.getElementById("lightbox").style.display = "flex";
  document.getElementById("lightbox-img").src = url;
}

function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
}

function toggleMode() {
  document.body.classList.toggle("light-mode");
}

loadImages();